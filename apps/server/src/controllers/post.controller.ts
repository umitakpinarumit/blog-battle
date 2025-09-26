import { Request, Response } from 'express';
import { z } from 'zod';
import { Post } from '../models/Post';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';
import { Category } from '../models/Category';
import { Notification } from '../models/Notification';
import { sseService } from '../services/sse.service';

const createSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  category: z.string().min(2),
});

export async function listPosts(req: Request, res: Response) {
  const { authorId, includeAuthor } = (req.query || {}) as { authorId?: string; includeAuthor?: string };
  const filter: Record<string, unknown> = {};
  if (authorId) filter.authorId = authorId;
  const query = Post.find(filter).sort({ createdAt: -1 });
  if (includeAuthor && includeAuthor !== '0' && includeAuthor !== 'false') {
    query.populate('authorId', 'displayName email');
  }
  const posts = await query;
  return res.json(posts);
}

export async function getPost(req: Request, res: Response) {
  const { includeAuthor } = (req.query || {}) as { includeAuthor?: string };
  const query = Post.findById(req.params.id);
  if (includeAuthor && includeAuthor !== '0' && includeAuthor !== 'false') {
    query.populate('authorId', 'displayName email');
  }
  const post = await query;
  if (!post) return res.status(404).json({ error: 'Not found' });
  // Görüntülenme sayısını artır ve puanı güncelle (puan = views*1 + interactions*3)
  try {
    const updated = await Post.findByIdAndUpdate(post._id, { $inc: { views: 1, interactions: 1 } }, { new: true });
    if (updated) {
      const score = (updated.views || 0) * 1 + (updated.interactions || 0) * 3;
      await Post.findByIdAndUpdate(post._id, { engagementScore: score });
    }
  } catch {}
  return res.json(post);
}

export async function createPost(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // Kategori mevcut mu kontrol et
  const exists = await Category.findOne({ name: parsed.data.category });
  if (!exists) return res.status(400).json({ error: 'Geçersiz kategori' });
  const imageUrl = (req as any).file ? `/uploads/${(req as any).file.filename}` : undefined;
  const post = await Post.create({ ...parsed.data, imageUrl, authorId: req.user?.sub });
  // Bildirim: Yazı oluşturuldu
  try {
    await Notification.create({ userId: req.user!.sub as any, type: 'post', message: 'Yeni bir yazı oluşturdunuz.', meta: { postId: String(post._id) } });
    sseService.notifyUser(String(req.user!.sub), { type: 'post', message: 'Yeni bir yazı oluşturdunuz.', postId: String(post._id) });
  } catch {}
  // Bu kategori için taslak/başlamamış turnuva varsa ve yeterli katılımcı varsa ilk turu başlat
  try {
    const catName = parsed.data.category;
    const postsInCat = await Post.find({ category: catName }).select('_id');
    const participants = postsInCat.map(p => String(p._id));
    let t = await Tournament.findOne({ category: catName });
    if (!t) {
      t = await Tournament.create({ name: `${catName} Turnuvası`, category: catName, participants, rounds: [], currentRound: 0, status: 'draft', progressionMode: 'participation', threshold: 50 });
    } else {
      // Katılımcı listesini güncelle
      t.participants = postsInCat.map(p => p._id) as any;
      await t.save();
      // Otomatik: Turnuvayı yenile (admin "Yenile" ile aynı mantık)
      try {
        // Tüm maçları ve oyları sil
        const allMatchIds: string[] = (t.rounds || []).flat().map((x: any) => String(x));
        if (allMatchIds.length) {
          await Vote.deleteMany({ matchId: { $in: allMatchIds } });
          await Match.deleteMany({ _id: { $in: allMatchIds } });
        }
        // Round-1'i katılımcılardan yeniden oluştur
        const pids: string[] = (t.participants || []).map((p: any) => String(p));
        const shuffled = [...pids].sort(() => Math.random() - 0.5);
        const pairs: [string, string][] = [];
        for (let i = 0; i < shuffled.length; i += 2) if (shuffled[i + 1]) pairs.push([shuffled[i], shuffled[i + 1]]);
        const round1: string[] = [];
        for (const [a, b] of pairs) {
          const m = await Match.create({ postAId: a, postBId: b, category: t.category || catName, round: 1, status: 'ongoing' });
          round1.push(String(m._id));
          // Bildirim: yazarlar
          try {
            const pa = await Post.findById(a).select('authorId');
            const pb = await Post.findById(b).select('authorId');
            if (pa?.authorId) await Notification.create({ userId: pa.authorId as any, type: 'match', message: 'Yazınız şu an oylamada!', meta: { tournamentId: String(t._id), matchId: String(m._id) } });
            if (pb?.authorId) await Notification.create({ userId: pb.authorId as any, type: 'match', message: 'Yazınız şu an oylamada!', meta: { tournamentId: String(t._id), matchId: String(m._id) } });
          } catch {}
        }
        const byesRound: string[] = [];
        if (shuffled.length % 2 === 1) {
          const last = shuffled[shuffled.length - 1];
          byesRound.push(String(last));
          try {
            const pfree = await Post.findById(last).select('authorId');
            if (pfree?.authorId) await Notification.create({ userId: pfree.authorId as any, type: 'round', message: 'Yazınız bir sonraki tura taşınacak (bye).', meta: { tournamentId: String(t._id) } });
          } catch {}
        }
        t.rounds = [round1] as any;
        t.byes = [byesRound] as any;
        t.currentRound = 1;
        t.status = 'ongoing';
        t.currentRoundStartedAt = new Date();
        await t.save();
      } catch {}
    }
    if (participants.length >= 2 && (t.currentRound === 0 || !t.rounds || t.rounds.length === 0)) {
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const pairs: [string, string][] = [];
      for (let i = 0; i < shuffled.length; i += 2) if (shuffled[i+1]) pairs.push([shuffled[i], shuffled[i+1]]);
      const round1: string[] = [];
      for (const [a,b] of pairs) {
        const m = await Match.create({ postAId: a, postBId: b, category: catName, round: 1, status: 'ongoing' });
        round1.push(String(m._id));
      }
      const byesRound: string[] = [];
      if (shuffled.length % 2 === 1) {
        const last = shuffled[shuffled.length-1];
        byesRound.push(String(last));
      }
      t.rounds = [round1] as any;
      t.byes = [byesRound] as any;
      t.currentRound = 1;
      t.status = 'ongoing';
      t.currentRoundStartedAt = new Date();
      await t.save();
    } else if (t.status === 'ongoing' && (t.rounds && t.rounds.length > 0)) {
      // İLK TURDA güncelleme: yeni yazıyı round-1'e ekle
      const roundIdx = 0;
      const round1Ids: string[] = (t.rounds?.[roundIdx] || []).map((x: any) => String(x));
      const { Match } = await import('../models/Match');
      const ms = round1Ids.length ? await Match.find({ _id: { $in: round1Ids } }) : [];
      const usedIds = new Set<string>();
      for (const m of ms) { usedIds.add(String(m.postAId)); usedIds.add(String(m.postBId)); }
      const byesRound0 = (t.byes?.[roundIdx] || []).map((x: any) => String(x));
      for (const b of byesRound0) usedIds.add(String(b));
      const allParticipantIds = t.participants.map((p: any) => String(p));
      const free = allParticipantIds.filter(id => !usedIds.has(String(id)));

      const newId = String(post._id);
      const roundArr: string[] = (t.rounds?.[roundIdx] || []).map((x: any) => String(x));

      // 1) Eğer ilk turda bye varsa, yeni yazıyı o bye ile eşleştir
      if (byesRound0.length > 0) {
        const byeId = byesRound0.find(x => x !== newId) || byesRound0[0];
        if (byeId && byeId !== newId) {
          const m = await Match.create({ postAId: byeId, postBId: newId, category: t.category || catName, round: 1, status: 'ongoing' });
          roundArr.push(String(m._id));
          // bye listesinden çıkar
          const byes = [...(t.byes || [])];
          byes[roundIdx] = (byes[roundIdx] || []).filter((x: any) => String(x) !== String(byeId)) as any;
          t.byes = byes as any;
          // Bildirim
          try {
            const pa = await Post.findById(byeId).select('authorId');
            const pb = await Post.findById(newId).select('authorId');
            if (pa?.authorId) {
              await Notification.create({ userId: pa.authorId as any, type: 'match', message: 'Yazınız şu an oylamada!', meta: { tournamentId: String(t._id), matchId: String(m._id) } });
              sseService.notifyUser(String(pa.authorId), { type: 'match', message: 'Yazınız şu an oylamada!', tournamentId: String(t._id), matchId: String(m._id) });
            }
            if (pb?.authorId) {
              await Notification.create({ userId: pb.authorId as any, type: 'match', message: 'Yazınız şu an oylamada!', meta: { tournamentId: String(t._id), matchId: String(m._id) } });
              sseService.notifyUser(String(pb.authorId), { type: 'match', message: 'Yazınız şu an oylamada!', tournamentId: String(t._id), matchId: String(m._id) });
            }
          } catch {}
          (t.rounds as any)[roundIdx] = roundArr as any;
          await t.save();
          return;
        }
      }

      // 2) Bye yoksa, yeni yazıyı ilk turda kullanılmamış serbest bir yazıyla eşleştir
      const freeOthers = free.filter(id => String(id) !== newId);
      if (freeOthers.length >= 1) {
        const partner = freeOthers[0];
        const m = await Match.create({ postAId: partner, postBId: newId, category: t.category || catName, round: 1, status: 'ongoing' });
        roundArr.push(String(m._id));
        // Bildirim
        try {
          const pa = await Post.findById(partner).select('authorId');
          const pb = await Post.findById(newId).select('authorId');
          if (pa?.authorId) {
            await Notification.create({ userId: pa.authorId as any, type: 'match', message: 'Yazınız şu an oylamada!', meta: { tournamentId: String(t._id), matchId: String(m._id) } });
            sseService.notifyUser(String(pa.authorId), { type: 'match', message: 'Yazınız şu an oylamada!', tournamentId: String(t._id), matchId: String(m._id) });
          }
          if (pb?.authorId) {
            await Notification.create({ userId: pb.authorId as any, type: 'match', message: 'Yazınız şu an oylamada!', meta: { tournamentId: String(t._id), matchId: String(m._id) } });
            sseService.notifyUser(String(pb.authorId), { type: 'match', message: 'Yazınız şu an oylamada!', tournamentId: String(t._id), matchId: String(m._id) });
          }
        } catch {}
        (t.rounds as any)[roundIdx] = roundArr as any;
        await t.save();
        return;
      }

      // 3) Partner yoksa, yeni yazı bye olur (ilk turda tek kalmış o)
      const byes = [...(t.byes || [])];
      byes[roundIdx] = [...(byes[roundIdx] || []), newId] as any;
      t.byes = byes as any;
      try {
        const pnew = await Post.findById(newId).select('authorId');
        if (pnew?.authorId) await Notification.create({ userId: pnew.authorId as any, type: 'round', message: 'Yazınız bir sonraki tura taşınacak (bye).', meta: { tournamentId: String(t._id) } });
      } catch {}
      await t.save();
    }
  } catch {}
  return res.status(201).json(post);
}

export async function updatePost(req: Request, res: Response) {
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const imageUrl = (req as any).file ? `/uploads/${(req as any).file.filename}` : undefined;
  const updates: any = { ...parsed.data };
  if (imageUrl) updates.imageUrl = imageUrl;
  const post = await Post.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!post) return res.status(404).json({ error: 'Not found' });
  return res.json(post);
}

export async function deletePost(req: Request, res: Response) {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  return res.status(204).send();
}


