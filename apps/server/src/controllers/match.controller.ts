import { Request, Response } from 'express';
import { z } from 'zod';
import { Match } from '../models/Match';
import { Post } from '../models/Post';
import { Vote } from '../models/Vote';
import { sseService } from '../services/sse.service';
import { Notification } from '../models/Notification';

export async function listActiveMatches(_req: Request, res: Response) {
  const matches = await Match.find({ status: 'ongoing' }).sort({ createdAt: -1 });
  // Yalnızca turnuva içinde yer alan eşleşmeleri döndür
  try {
    const { Tournament } = require('../models/Tournament');
    const filtered: any[] = [];
    for (const m of matches) {
      const exists = await Tournament.exists({ rounds: { $elemMatch: { $elemMatch: { $eq: String(m._id) } } } });
      if (exists) filtered.push(m);
    }
    return res.json(filtered);
  } catch {
    return res.json([]);
  }
}

const createSchema = z.object({
  postAId: z.string(),
  postBId: z.string(),
  category: z.string(),
  round: z.number().int().positive().optional().default(1),
});

export async function createMatch(req: Request, res: Response) {
  // Turnuva dışında manuel eşleşme artık yasak
  return res.status(400).json({ error: 'Turnuva dışında eşleşme oluşturulamaz' });
}

export async function getMatch(req: Request, res: Response) {
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'Not found' });
  const { votesA, votesB } = await aggregateVotes(String(match._id));
  // Include post titles/images to avoid extra client fetches and tolerate deleted posts
  try {
    const ids = [String(match.postAId), String(match.postBId)];
    const posts = await Post.find({ _id: { $in: ids } }).select('title imageUrl');
    const map: Record<string, { title: string; imageUrl?: string }> = {};
    for (const p of posts) map[String(p._id)] = { title: p.title || '', imageUrl: p.imageUrl };
    const a = map[String(match.postAId)] || { title: 'Silinmiş yazı' };
    const b = map[String(match.postBId)] || { title: 'Silinmiş yazı' };
    return res.json({ match, stats: { votesA, votesB, percentA: percent(votesA, votesB), percentB: percent(votesB, votesA) }, a, b });
  } catch {
    return res.json({ match, stats: { votesA, votesB, percentA: percent(votesA, votesB), percentB: percent(votesB, votesA) } });
  }
}

export async function streamMatch(req: Request, res: Response) {
  const matchId = req.params.id;
  const match = await Match.findById(matchId);
  if (!match) return res.status(404).json({ error: 'Not found' });
  sseService.addClient(matchId, res);
  const { votesA, votesB } = await aggregateVotes(matchId);
  sseService.broadcast(matchId, { votesA, votesB, percentA: percent(votesA, votesB), percentB: percent(votesB, votesA) });
}

export async function listMatchesByPost(req: Request, res: Response) {
  const postId = req.params.postId;
  const matches = await Match.find({
    $or: [{ postAId: postId }, { postBId: postId }],
  }).sort({ createdAt: -1 });
  // Titles map to avoid extra fetches client-side and tolerate deleted posts
  try {
    const ids = Array.from(new Set(matches.flatMap(m => [String(m.postAId), String(m.postBId)])));
    const posts = await Post.find({ _id: { $in: ids } }).select('title');
    const idToTitle: Record<string, string> = {};
    for (const p of posts) idToTitle[String(p._id)] = p.title || '';
    const withTitles = matches.map(m => ({
      ...m.toObject(),
      postATitle: idToTitle[String(m.postAId)] || 'Silinmiş yazı',
      postBTitle: idToTitle[String(m.postBId)] || 'Silinmiş yazı',
    }));
    return res.json(withTitles);
  } catch {
    return res.json(matches);
  }
}

export async function finishMatch(req: Request, res: Response) {
  const matchId = req.params.id;
  const match = await Match.findById(matchId);
  if (!match) return res.status(404).json({ error: 'Not found' });
  const { votesA, votesB } = await aggregateVotes(matchId);
  const winnerId = votesA >= votesB ? match.postAId : match.postBId;
  match.status = 'finished';
  match.winnerId = winnerId;
  await match.save();

  // Bildirim: kazanan yazı yazarına tur zaferi; kaybeden yazı yazarına elenme
  try {
    const winnerPost = await Post.findById(winnerId).select('authorId');
    const loserId = String(String(match.postAId) === String(winnerId) ? match.postBId : match.postAId);
    const loserPost = await Post.findById(loserId).select('authorId');
    if (winnerPost?.authorId) await Notification.create({ userId: winnerPost.authorId as any, type: 'round', message: 'Tebrikler! Bu turu kazandınız.', meta: { matchId: String(match._id) } });
    if (loserPost?.authorId) await Notification.create({ userId: loserPost.authorId as any, type: 'round', message: 'Üzgünüz, bu turda elendiniz.', meta: { matchId: String(match._id) } });
  } catch {}

  // Eğer bu maç bir turnuvanın turunda yer alıyorsa ve o turdaki tüm maçlar bitti ise otomatik ilerlet
  try {
    const { Tournament } = require('../models/Tournament');
    const t = await Tournament.findOne({ rounds: { $elemMatch: { $in: [matchId] } } });
    if (t && t.status === 'ongoing') {
      const roundIdx = t.rounds.findIndex((arr: string[]) => arr.includes(String(match._id)));
      if (roundIdx >= 0 && roundIdx === t.currentRound - 1) {
        const ids: string[] = t.rounds[roundIdx];
        const ms = await Match.find({ _id: { $in: ids } });
        const allFinished = ms.every(m => m.status === 'finished' && m.winnerId);
        if (allFinished) {
          const winners = ms.map(m => String(m.winnerId));
          if (winners.length < 2) {
            t.status = 'finished';
            // kazanan postu kaydet (madalya için)
            t.winnerPostId = winners[0] as any;
            await t.save();
          } else {
            // bir üst tur oluştur
            const nextPairs: [string, string][] = [];
            for (let i = 0; i < winners.length; i += 2) {
              if (winners[i + 1]) nextPairs.push([winners[i], winners[i + 1]]);
            }
            const nextRound: string[] = [];
            for (const [a, b] of nextPairs) {
              const nm = await Match.create({ postAId: a, postBId: b, category: t.category || 'Karma', round: t.currentRound + 1, status: 'ongoing' });
              nextRound.push(String(nm._id));
            }
            // tek sayıda kazanan varsa bye
            if (winners.length % 2 === 1) {
              const last = winners[winners.length - 1];
              const bye = await Match.create({ postAId: last, postBId: last, category: t.category || 'Karma', round: t.currentRound + 1, status: 'finished', winnerId: last });
              nextRound.push(String(bye._id));
            }
            t.rounds.push(nextRound);
            t.currentRound += 1;
            await t.save();
          }
        }
      }
    }
  } catch {}

  return res.json({ ok: true, winnerId });
}

async function aggregateVotes(matchId: string): Promise<{ votesA: number; votesB: number }> {
  const agg = await Vote.aggregate([
    { $match: { matchId: new (require('mongoose').Types.ObjectId)(matchId) } },
    { $group: { _id: '$choice', count: { $sum: 1 } } },
  ]);
  let votesA = 0, votesB = 0;
  for (const row of agg) {
    if (row._id === 'A') votesA = row.count;
    if (row._id === 'B') votesB = row.count;
  }
  return { votesA, votesB };
}

function percent(n: number, d: number): number {
  const total = n + d;
  return total === 0 ? 0 : Math.round((n / total) * 100);
}


