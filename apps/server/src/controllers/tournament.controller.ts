import { Request, Response } from 'express';
import { z } from 'zod';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';
import { Vote } from '../models/Vote';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { sseService } from '../services/sse.service';
import { Post } from '../models/Post';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  participants: z.array(z.string()).min(2),
  progressionMode: z.enum(['time','participation']).optional(),
  threshold: z.number().optional(),
});

export async function createTournament(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  let { name, category, participants, progressionMode, threshold } = parsed.data;
  // Auto name from category
  if (!name && category) name = `${category} Turnuvası`;
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const pairs: [string, string][] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  // create round 1 matches; handle bye by carrying without self-match
  const round1: string[] = [];
  const byesRound: string[] = [];
  for (const [a, b] of pairs) {
    const m = await Match.create({ postAId: a, postBId: b, category: category || 'Karma', round: 1, status: 'ongoing' });
    round1.push(String(m._id));
  }
  if (shuffled.length % 2 === 1) {
    const last = shuffled[shuffled.length - 1];
    byesRound.push(String(last));
  }
  const t = await Tournament.create({ name, category, participants, rounds: [round1], byes: [byesRound], currentRound: 1, status: 'ongoing', progressionMode, threshold, currentRoundStartedAt: new Date() });
  return res.status(201).json({ tournament: t });
}

export async function getTournament(req: Request, res: Response) {
  let t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t = await ensureTournamentProgress(t);
  const metrics = await computeProgressMetrics(t);
  return res.json({ tournament: t, metrics });
}

export async function listTournaments(_req: Request, res: Response) {
  const ts = await Tournament.find().sort({ createdAt: -1 });
  const out: any[] = [];
  for (let t of ts) {
    t = await ensureTournamentProgress(t);
    const metrics = await computeProgressMetrics(t);
    out.push({ ...(t.toObject()), metrics });
  }
  return res.json(out);
}

export async function progressTournament(req: Request, res: Response) {
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const roundIdx = t.currentRound - 1;
  if (roundIdx < 0 || !t.rounds[roundIdx]) return res.status(400).json({ error: 'No active round' });
  const current = t.rounds[roundIdx];
  // Auto finalize ongoing matches in the round before progressing
  await autoFinalizeRound(t, roundIdx);
  let winners: string[] = [];
  for (const mid of current) {
    const m = await Match.findById(mid);
    if (!m || m.status !== 'finished' || !m.winnerId) return res.status(400).json({ error: 'Round not finished' });
    winners.push(String(m.winnerId));
  }
  // include carried byes from this round
  const byesThisRound: string[] = (t.byes?.[roundIdx] || []).map((x:any)=>String(x));
  if (byesThisRound.length) winners = winners.concat(byesThisRound);
  if (winners.length < 2) {
    t.status = 'finished';
    t.winnerPostId = winners[0] as any;
    await t.save();
    return res.json({ tournament: t, winner: winners[0] });
  }
  // create next round
  // Shuffle winners before pairing to avoid predictable brackets
  const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);
  const nextPairs: [string, string][] = [];
  for (let i = 0; i < shuffledWinners.length; i += 2) {
    if (shuffledWinners[i + 1]) nextPairs.push([shuffledWinners[i], shuffledWinners[i + 1]]);
  }
  const nextRound: string[] = [];
  for (const [a, b] of nextPairs) {
    const m = await Match.create({ postAId: a, postBId: b, category: t.category || 'Karma', round: t.currentRound + 1, status: 'ongoing' });
    nextRound.push(String(m._id));
  }
  // handle bye in next rounds
  const nextByes: string[] = [];
  if (shuffledWinners.length % 2 === 1) {
    const last = shuffledWinners[shuffledWinners.length - 1];
    nextByes.push(String(last));
  }
  t.rounds.push(nextRound);
  t.byes = [...(t.byes || []), nextByes] as any;
  t.currentRound += 1;
  t.currentRoundStartedAt = new Date();
  await t.save();
  await notifyRoundProgress(t);
  await notifyRoundStartedAllUsers(t);
  await notifyAuthorsForRound(t, t.currentRound - 1);
  return res.json({ tournament: t });
}

// Public-safe progress: only progresses if all matches are finished
export async function progressTournamentPublic(req: Request, res: Response) {
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const roundIdx = t.currentRound - 1;
  if (roundIdx < 0 || !t.rounds[roundIdx]) return res.status(400).json({ error: 'No active round' });
  const current = t.rounds[roundIdx];
  await autoFinalizeRound(t, roundIdx);
  const winners: string[] = [];
  for (const mid of current) {
    const m = await Match.findById(mid);
    if (!m || m.status !== 'finished' || !m.winnerId) return res.status(400).json({ error: 'Round not finished' });
    winners.push(String(m.winnerId));
  }
  if (winners.length < 2) {
    t.status = 'finished';
    t.winnerPostId = winners[0] as any;
    await t.save();
    return res.json({ tournament: t, winner: winners[0] });
  }
  const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);
  const nextPairs: [string, string][] = [];
  for (let i = 0; i < shuffledWinners.length; i += 2) {
    if (shuffledWinners[i + 1]) nextPairs.push([shuffledWinners[i], shuffledWinners[i + 1]]);
  }
  const nextRound: string[] = [];
  for (const [a, b] of nextPairs) {
    const m = await Match.create({ postAId: a, postBId: b, category: t.category || 'Karma', round: t.currentRound + 1, status: 'ongoing' });
    nextRound.push(String(m._id));
  }
  if (winners.length % 2 === 1) {
    const last = winners[winners.length - 1];
    const bye = await Match.create({ postAId: last, postBId: last, category: t.category || 'Karma', round: t.currentRound + 1, status: 'finished', winnerId: last as any });
    nextRound.push(String(bye._id));
  }
  t.rounds.push(nextRound);
  t.currentRound += 1;
  t.currentRoundStartedAt = new Date();
  await t.save();
  await notifyRoundProgress(t);
  await notifyRoundStartedAllUsers(t);
  await notifyAuthorsForRound(t, t.currentRound - 1);
  return res.json({ tournament: t });
}

async function computeProgressMetrics(t: any): Promise<any> {
  if (!t) return {};
  // Round counts
  const roundIdx = (t.currentRound || 1) - 1;
  const mids: string[] = t.rounds?.[roundIdx] || [];
  let currentTotal = 0;
  let currentActive = 0;
  if (mids.length) {
    const ms = await Match.find({ _id: { $in: mids } });
    currentTotal = ms.filter(m => String(m.postAId) !== String(m.postBId)).length; // bye hariç
    currentActive = ms.filter(m => m.status === 'ongoing' && String(m.postAId) !== String(m.postBId)).length;
  }
  if (t.progressionMode === 'time') {
    const totalSeconds = Number(t.threshold || 0);
    const started = t.currentRoundStartedAt ? new Date(t.currentRoundStartedAt).getTime() : Date.now();
    const remaining = Math.max(0, totalSeconds - Math.floor((Date.now() - started) / 1000));
    return { mode: 'time', remainingSeconds: remaining, totalSeconds, currentActive, currentTotal };
  }
  if (t.progressionMode === 'participation') {
    const required = await computeRequiredParticipants(t);
    const voters = await computeRoundVoterCount(t);
    return { mode: 'participation', voters, required, currentActive, currentTotal };
  }
  return { currentActive, currentTotal };
}

async function computeRequiredParticipants(t: any): Promise<number> {
  const totalUsers = await User.countDocuments({});
  const pct = Number(t.threshold || 0);
  return Math.max(1, Math.ceil((pct / 100) * totalUsers));
}

async function computeRoundVoterCount(t: any): Promise<number> {
  const roundIdx = (t.currentRound || 1) - 1;
  const mids: string[] = t.rounds?.[roundIdx] || [];
  if (!mids.length) return 0;
  const mongoose = require('mongoose');
  const ids = mids.map((x: any) => new mongoose.Types.ObjectId(String(x)));
  const voters = await Vote.distinct('userId', { matchId: { $in: ids } });
  return voters.length;
}

async function ensureTournamentProgress(t: any) {
  if (!t || t.status !== 'ongoing' || !t.progressionMode) return t;
  // Only progress automatically if the round is already finished
  const roundIdx = t.currentRound - 1;
  const mids: string[] = t.rounds?.[roundIdx] || [];
  const ms = mids.length ? await Match.find({ _id: { $in: mids } }) : [];
  const allFinished = ms.length > 0 && ms.every(m => m.status === 'finished' && m.winnerId);
  // If conditions met (time/participation) but matches not finished, try finalizing them
  if (!allFinished) {
    const canProgress = await conditionsSatisfied(t);
    if (!canProgress) return t;
    // Koruma: participation modunda, votable (bye olmayan ve ongoing) her maç en az 1 oy aldı mı?
    if (t.progressionMode === 'participation') {
      const ready = await everyMatchHasAtLeastOneVote(mids);
      if (!ready) return t;
    }
    await autoFinalizeRound(t, roundIdx);
  }
  if (t.progressionMode === 'time') {
    const totalSeconds = Number(t.threshold || 0);
    const started = t.currentRoundStartedAt ? new Date(t.currentRoundStartedAt).getTime() : 0;
    if (totalSeconds > 0 && started > 0) {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      if (elapsed >= totalSeconds) {
        await progressTournamentPublic({ params: { id: String(t._id) } } as any, { json: ()=>{}, status: ()=>({ json: ()=>{} }) } as any);
        t = await Tournament.findById(t._id);
      }
    }
  } else if (t.progressionMode === 'participation') {
    const required = await computeRequiredParticipants(t);
    const voters = await computeRoundVoterCount(t);
    if (voters >= required) {
      await progressTournamentPublic({ params: { id: String(t._id) } } as any, { json: ()=>{}, status: ()=>({ json: ()=>{} }) } as any);
      t = await Tournament.findById(t._id);
    }
  }
  return t;
}

async function everyMatchHasAtLeastOneVote(mids: string[]): Promise<boolean> {
  if (!mids.length) return false;
  const mongoose = require('mongoose');
  const ms = await Match.find({ _id: { $in: mids } });
  // Sadece votable (ongoing ve bye olmayan) maçlarda oy aranır
  const votableIds = ms.filter(m => m.status === 'ongoing' && String(m.postAId) !== String(m.postBId)).map(m => String(m._id));
  if (votableIds.length === 0) return true;
  const ids = votableIds.map((x: any) => new mongoose.Types.ObjectId(String(x)));
  const rows = await Vote.aggregate([
    { $match: { matchId: { $in: ids } } },
    { $group: { _id: '$matchId', c: { $sum: 1 } } },
  ]);
  const withVotes = new Set(rows.map((r: any) => String(r._id)));
  for (const mid of votableIds) {
    if (!withVotes.has(String(mid))) return false;
  }
  return true;
}

async function conditionsSatisfied(t: any): Promise<boolean> {
  if (t.progressionMode === 'time') {
    const totalSeconds = Number(t.threshold || 0);
    const started = t.currentRoundStartedAt ? new Date(t.currentRoundStartedAt).getTime() : 0;
    if (totalSeconds > 0 && started > 0) {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      return elapsed >= totalSeconds;
    }
    return false;
  }
  if (t.progressionMode === 'participation') {
    const required = await computeRequiredParticipants(t);
    const voters = await computeRoundVoterCount(t);
    return voters >= required;
  }
  return false;
}

async function autoFinalizeRound(t: any, roundIdx: number): Promise<void> {
  const mids: string[] = t.rounds?.[roundIdx] || [];
  for (const mid of mids) {
    const m = await Match.findById(mid);
    if (!m || m.status === 'finished') continue;
    const mongoose = require('mongoose');
    const agg = await Vote.aggregate([
      { $match: { matchId: new mongoose.Types.ObjectId(String(mid)) } },
      { $group: { _id: '$choice', count: { $sum: 1 } } },
    ]);
    let votesA = 0, votesB = 0;
    for (const row of agg) {
      if (row._id === 'A') votesA = row.count;
      if (row._id === 'B') votesB = row.count;
    }
    const winnerId = votesA >= votesB ? m.postAId : m.postBId; // tie -> A
    m.status = 'finished';
    m.winnerId = winnerId;
    await m.save();
  }
}

async function notifyRoundProgress(t: any) {
  try {
    const prevRoundIdx = (t.currentRound || 1) - 2;
    if (prevRoundIdx < 0) return;
    const mids: string[] = t.rounds?.[prevRoundIdx] || [];
    if (!mids.length) return;
    const mongoose = require('mongoose');
    const midObjs = mids.map((x:any)=> new mongoose.Types.ObjectId(String(x)));
    const voterIds: string[] = await Vote.distinct('userId', { matchId: { $in: midObjs } });
    for (const uid of voterIds) {
      await Notification.create({ userId: uid, type: 'tournament', message: 'Turnuva yeni tura geçti.', meta: { tournamentId: String(t._id), round: t.currentRound } });
      sseService.notifyUser(String(uid), { type: 'tournament', message: 'Turnuva yeni tura geçti.', tournamentId: String(t._id), round: t.currentRound });
    }
  } catch {}
}

async function notifyRoundStartedAllUsers(t: any) {
  try {
    const users = await User.find({}).select('_id');
    for (const u of users) {
      await Notification.create({ userId: u._id, type: 'round', message: 'Turnuvada yeni tur başladı.', meta: { tournamentId: String(t._id), round: t.currentRound } });
      sseService.notifyUser(String(u._id), { type: 'round', message: 'Turnuvada yeni tur başladı.', tournamentId: String(t._id), round: t.currentRound });
    }
  } catch {}
}

async function notifyTournamentResetAllUsers(t: any) {
  try {
    const users = await User.find({}).select('_id');
    for (const u of users) {
      await Notification.create({ userId: u._id, type: 'tournament', message: 'Turnuva yeniden başlatıldı. Yeni tur başladı.', meta: { tournamentId: String(t._id), round: t.currentRound } });
      sseService.notifyUser(String(u._id), { type: 'tournament', message: 'Turnuva yeniden başlatıldı. Yeni tur başladı.', tournamentId: String(t._id), round: t.currentRound });
    }
  } catch {}
}

async function notifyAuthorsForRound(t: any, roundIdx: number) {
  try {
    const mids: string[] = t.rounds?.[roundIdx] || [];
    if (!mids.length) return;
    const ms = await Match.find({ _id: { $in: mids } });
    const postIds = Array.from(new Set(ms.flatMap(m => [String(m.postAId), String(m.postBId)])));
    const posts = await Post.find({ _id: { $in: postIds } }).select('_id authorId');
    const map: Record<string, string> = {};
    for (const p of posts) map[String(p._id)] = String(p.authorId);
    const notified = new Set<string>();
    for (const m of ms) {
      const aid = map[String(m.postAId)];
      const bid = map[String(m.postBId)];
      if (aid && !notified.has(aid)) {
        notified.add(aid);
        await Notification.create({ userId: aid as any, type: 'match', message: 'Yazınız şu an oylamada!', meta: { tournamentId: String(t._id), matchId: String(m._id) } });
        sseService.notifyUser(String(aid), { type: 'match', message: 'Yazınız şu an oylamada!', tournamentId: String(t._id), matchId: String(m._id) });
      }
      if (bid && !notified.has(bid)) {
        notified.add(bid);
        await Notification.create({ userId: bid as any, type: 'match', message: 'Yazınız şu an oylamada!', meta: { tournamentId: String(t._id), matchId: String(m._id) } });
        sseService.notifyUser(String(bid), { type: 'match', message: 'Yazınız şu an oylamada!', tournamentId: String(t._id), matchId: String(m._id) });
      }
    }
  } catch {}
}

// Admin: Rebuild participants and round-1 from posts (for sync/repair)
export async function rebuildTournament(req: Request, res: Response) {
  const { category } = (req.body || {}) as { category?: string };
  const filter: any = category ? { category } : {};
  const tournaments = await Tournament.find(filter);
  const updated: any[] = [];
  for (let t of tournaments) {
    const posts = await Post.find({ category: t.category || t.name }).select('_id');
    const participants = posts.map(p => String(p._id));
    t.participants = posts.map(p => p._id) as any;
    if (participants.length >= 2 && (t.currentRound === 0 || !t.rounds || t.rounds.length === 0)) {
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const pairs: [string, string][] = [];
      for (let i = 0; i < shuffled.length; i += 2) if (shuffled[i+1]) pairs.push([shuffled[i], shuffled[i+1]]);
      const round1: string[] = [];
      for (const [a,b] of pairs) {
        const m = await Match.create({ postAId: a, postBId: b, category: t.category || 'Karma', round: 1, status: 'ongoing' });
        round1.push(String(m._id));
      }
      if (shuffled.length % 2 === 1) {
        const last = shuffled[shuffled.length-1];
        const bye = await Match.create({ postAId: last, postBId: last, category: t.category || 'Karma', round: 1, status: 'finished', winnerId: last as any });
        round1.push(String(bye._id));
      }
      t.rounds = [round1] as any;
      t.currentRound = 1;
      t.status = 'ongoing';
      t.currentRoundStartedAt = new Date();
    }
    await t.save();
    updated.push(t);
  }
  return res.json({ updated: updated.map(x => x._id) });
}

export async function cancelTournament(req: Request, res: Response) {
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  await Tournament.findByIdAndDelete(t._id);
  return res.json({ ok: true });
}

export async function deleteTournament(req: Request, res: Response) {
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  await Tournament.findByIdAndDelete(t._id);
  return res.status(204).send();
}

// Admin: reset tournament - delete all matches and votes, reseed round 1 with same parameters
export async function resetTournament(req: Request, res: Response) {
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  // Collect all match ids
  const allMatchIds: string[] = (t.rounds || []).flat().map((x: any) => String(x));
  if (allMatchIds.length) {
    await Vote.deleteMany({ matchId: { $in: allMatchIds } });
    await Match.deleteMany({ _id: { $in: allMatchIds } });
  }
  // Build fresh round1 from current participants
  const participants: string[] = (t.participants || []).map((p: any) => String(p));
  if (participants.length < 2) {
    t.rounds = [] as any;
    t.byes = [] as any;
    t.currentRound = 0;
    t.status = 'draft';
    await t.save();
    return res.json({ tournament: t });
  }
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const pairs: [string, string][] = [];
  for (let i = 0; i < shuffled.length; i += 2) if (shuffled[i + 1]) pairs.push([shuffled[i], shuffled[i + 1]]);
  const round1: string[] = [];
  for (const [a, b] of pairs) {
    const m = await Match.create({ postAId: a, postBId: b, category: t.category || 'Karma', round: 1, status: 'ongoing' });
    round1.push(String(m._id));
  }
  const byesRound: string[] = [];
  if (shuffled.length % 2 === 1) {
    const last = shuffled[shuffled.length - 1];
    byesRound.push(String(last));
  }
  t.rounds = [round1] as any;
  t.byes = [byesRound] as any;
  t.currentRound = 1;
  t.status = 'ongoing';
  t.currentRoundStartedAt = new Date();
  await t.save();
  await notifyTournamentResetAllUsers(t);
  await notifyAuthorsForRound(t, 0);
  return res.json({ tournament: t });
}


