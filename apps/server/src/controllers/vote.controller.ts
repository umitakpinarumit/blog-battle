import { Request, Response } from 'express';
import { z } from 'zod';
import { Vote } from '../models/Vote';
import { sseService } from '../services/sse.service';
import { Match } from '../models/Match';
import { Post } from '../models/Post';
import { Notification } from '../models/Notification';

const voteSchema = z.object({
  matchId: z.string(),
  choice: z.enum(['A', 'B']),
});

export async function castVote(req: Request, res: Response) {
  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { matchId, choice } = parsed.data;
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const match = await Match.findById(matchId);
  if (!match || match.status !== 'ongoing') return res.status(400).json({ error: 'Match not available' });
  try {
    await Vote.create({ userId, matchId, choice });
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ error: 'Already voted' });
    throw err;
  }
  // Broadcast updated stats with fresh aggregate
  try {
    const mongoose = require('mongoose');
    const agg = await Vote.aggregate([
      { $match: { matchId: new mongoose.Types.ObjectId(matchId) } },
      { $group: { _id: '$choice', count: { $sum: 1 } } },
    ]);
    let votesA = 0, votesB = 0;
    for (const row of agg) {
      if (row._id === 'A') votesA = row.count;
      if (row._id === 'B') votesB = row.count;
    }
    const total = votesA + votesB;
    const percentA = total === 0 ? 0 : Math.round((votesA / total) * 100);
    const percentB = total === 0 ? 0 : Math.round((votesB / total) * 100);
    sseService.broadcast(matchId, { votesA, votesB, percentA, percentB });
    // Etkileşim sayısını artır (oylanan yazı)
    const match = await Match.findById(matchId);
    if (match) {
      const incA = choice === 'A' ? 1 : 0;
      const incB = choice === 'B' ? 1 : 0;
      if (incA) {
        const pa = await Post.findByIdAndUpdate(match.postAId, { $inc: { interactions: 1 } }, { new: true });
        if (pa) await Post.findByIdAndUpdate(pa._id, { engagementScore: (pa.views || 0) * 1 + (pa.interactions || 0) * 3 });
        // Bildirim: A postunun yazarına oy geldi
        try {
          await Notification.create({ userId: pa.authorId as any, type: 'vote', message: 'Yazınıza bir oy geldi.', meta: { postId: String(pa._id), matchId } });
        } catch {}
      }
      if (incB) {
        const pb = await Post.findByIdAndUpdate(match.postBId, { $inc: { interactions: 1 } }, { new: true });
        if (pb) await Post.findByIdAndUpdate(pb._id, { engagementScore: (pb.views || 0) * 1 + (pb.interactions || 0) * 3 });
        // Bildirim: B postunun yazarına oy geldi
        try {
          await Notification.create({ userId: pb.authorId as any, type: 'vote', message: 'Yazınıza bir oy geldi.', meta: { postId: String(pb._id), matchId } });
        } catch {}
      }
    }
  } catch {}
  // Bildirim: Oy kullanan kullanıcıya bilgilendirme
  try {
    await Notification.create({ userId: userId as any, type: 'vote', message: 'Bir eşleşmede oy kullandınız.', meta: { matchId } });
  } catch {}
  return res.status(201).json({ ok: true });
}

export async function listMyVotes(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const votes = await Vote.find({ userId }).sort({ createdAt: -1 }).limit(100);
  // Turnuva bazlı özet: kullanıcı bu turnuvanın aktif turundaki tüm eşleşmelere oy vermiş mi?
  try {
    const { Tournament } = require('../models/Tournament');
    const { Match } = require('../models/Match');
    const myMatchIds = new Set(votes.map(v => String(v.matchId)));
    const tournaments = await Tournament.find({ status: 'ongoing' });
    const summaries: Record<string, boolean> = {};
    for (const t of tournaments) {
      const roundIdx = (t.currentRound || 1) - 1;
      const mids: string[] = (t.rounds?.[roundIdx] || []).map((x: any) => String(x));
      if (!mids.length) { summaries[String(t._id)] = false; continue; }
      // Bye'ları (postA==postB) hariç tut ve bitmiş maçları tamamlanmış say
      const ms = await Match.find({ _id: { $in: mids } });
      const votable = ms.filter(m => String(m.postAId) !== String(m.postBId));
      const allDoneOrVoted = votable.every(m => m.status !== 'ongoing' || myMatchIds.has(String(m._id)));
      const allVoted = allDoneOrVoted;
      summaries[String(t._id)] = allVoted;
    }
    return res.json({ votes, summaries });
  } catch {
    return res.json({ votes });
  }
}

export async function resetMyVotes(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  await Vote.deleteMany({ userId });
  return res.json({ ok: true, deleted: true });
}

export async function resetAllVotes(_req: Request, res: Response) {
  const result = await Vote.deleteMany({});
  return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
}

export async function resetVotesByMatch(req: Request, res: Response) {
  const matchId = req.params.id;
  if (!matchId) return res.status(400).json({ error: 'matchId required' });
  const result = await Vote.deleteMany({ matchId });
  return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
}

export async function resetVotesByTournament(req: Request, res: Response) {
  const { Tournament } = require('../models/Tournament');
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const ids: string[] = (t.rounds || []).flat().map((x: any) => String(x));
  if (!ids.length) return res.json({ ok: true, deletedCount: 0 });
  const result = await Vote.deleteMany({ matchId: { $in: ids } });
  return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
}


