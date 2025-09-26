import { Response } from 'express';

type MatchId = string;

class SseService {
  private streams: Map<MatchId, Set<Response>> = new Map();
  private userStreams: Map<string, Set<Response>> = new Map();

  addClient(matchId: MatchId, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(':ok\n\n');

    if (!this.streams.has(matchId)) this.streams.set(matchId, new Set());
    const set = this.streams.get(matchId)!;
    set.add(res);

    reqOnClose(res, () => {
      set.delete(res);
      if (set.size === 0) this.streams.delete(matchId);
    });
  }

  broadcast(matchId: MatchId, data: unknown) {
    const set = this.streams.get(matchId);
    if (!set) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      try { res.write(payload); } catch {}
    }
  }

  addUserClient(userId: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(':ok\n\n');
    if (!this.userStreams.has(userId)) this.userStreams.set(userId, new Set());
    const set = this.userStreams.get(userId)!;
    set.add(res);
    reqOnClose(res, () => {
      set.delete(res);
      if (set.size === 0) this.userStreams.delete(userId);
    });
  }

  notifyUser(userId: string, data: unknown) {
    const set = this.userStreams.get(userId);
    if (!set) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      try { res.write(payload); } catch {}
    }
  }
}

function reqOnClose(res: Response, cb: () => void) {
  const cleanup = () => cb();
  res.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('error', cleanup);
}

export const sseService = new SseService();


