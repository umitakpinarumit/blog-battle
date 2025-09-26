import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import TournamentBracket from './components/TournamentBracket';

export default function Dashboard() {
  const [posts, setPosts] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchViews, setMatchViews] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [voteSummaries, setVoteSummaries] = useState<Record<string, boolean>>({});
  const [winnerIds, setWinnerIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [ps, ms, ts] = await Promise.all([
          api.get('/posts'),
          api.get('/matches/active'),
          api.get('/tournaments'),
        ]);
        if (!isMounted) return;
        setPosts(ps.data);
        setMatches(ms.data);
        const allTournaments = (ts.data || []);
        const tsData = allTournaments.filter((t: any) => t.status === 'ongoing');
        setTournaments(tsData);
        // Turnuva kazanan postlar (madalya için)
        const winners = new Set<string>();
        for (const t of allTournaments) {
          if (t.status === 'finished' && t.winnerPostId) winners.add(String(t.winnerPostId));
        }
        setWinnerIds(winners);
        // Turnuva bazlı oy özetini çek (giriş yapılmışsa)
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          if (token) {
            const mv = await api.get('/votes/me');
            if (!isMounted) return;
            setVoteSummaries(mv.data?.summaries || {});
          } else {
            setVoteSummaries({});
          }
        } catch { if (isMounted) setVoteSummaries({}); }
      } catch {}
    }
    // initial
    load();
    // periodic refresh to update metrics and auto-progress checks server-side
    const iv = setInterval(load, 5000);
    return () => { isMounted = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    async function hydrateMatches() {
      const views: any[] = [];
      for (const m of matches) {
        try {
          const [a, b, s] = await Promise.all([
            api.get(`/posts/${m.postAId}`),
            api.get(`/posts/${m.postBId}`),
            api.get(`/matches/${m._id}`),
          ]);
          views.push({
            _id: m._id,
            a: a.data,
            b: b.data,
            percentA: s.data.stats.percentA,
            percentB: s.data.stats.percentB,
          });
        } catch {}
      }
      setMatchViews(views);
    }
    if (matches.length) hydrateMatches(); else setMatchViews([]);
  }, [matches]);

  // Group active matches by tournament
  const matchesByTournament: Record<string, { tournament: any; items: any[] }> = {};
  for (const t of tournaments) {
    matchesByTournament[t._id] = { tournament: t, items: [] };
  }
  for (const m of matchViews) {
    const tid = tournaments.find((t: any) => (t.rounds || []).some((arr: string[]) => arr.includes(String(m._id))))?._id;
    if (tid) {
      matchesByTournament[tid] = matchesByTournament[tid] || { tournament: tournaments.find(t=>t._id===tid), items: [] } as any;
      matchesByTournament[tid].items.push(m);
    }
  }

  return (
    <div className="space-y-12">
      {/* Blog Yazıları */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Blog Yazıları</h2>
            <p className="text-sm text-neutral-600">Yeni ve popüler yazılar</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {posts.map(p => (
            <div key={p._id} className="group rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="h-48 w-full bg-neutral-100 relative">
                {winnerIds.has(String(p._id)) && (
                  <div className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-full bg-amber-400 text-white shadow-md w-8 h-8" title="Turnuva Şampiyonu">
                    <span className="text-lg">🥇</span>
                  </div>
                )}
                {p.imageUrl ? (
                  <img src={`${p.imageUrl.startsWith('http') ? p.imageUrl : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + p.imageUrl}`} alt="" className="h-48 w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
                )}
              </div>
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">{p.category}</span>
                  <span className="text-xs text-neutral-500">{new Date(p.createdAt).toLocaleDateString?.() || ''}</span>
                </div>
                <div className="font-semibold text-lg group-hover:text-blue-700 line-clamp-2">{p.title}</div>
                <div className="text-sm text-neutral-600 line-clamp-3">{p.content}</div>
                <div className="text-xs text-neutral-600">Puan: {p.engagementScore ?? 0}</div>
                <div className="pt-2">
                  <Link to={`/posts/${p._id}`} className="text-sm text-blue-700 hover:underline">Devamını oku →</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Turnuva Altında Aktif Eşleşmeler */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Aktif Turnuvalar ve Eşleşmeler</h2>
          <p className="text-sm text-neutral-600">Eşleşmeler turnuvalara göre gruplanmıştır</p>
        </div>
        {tournaments.length === 0 ? (
          <div className="text-sm text-neutral-600">Şu an aktif turnuva yok.</div>
        ) : (
          <div className="space-y-6">
            {tournaments.map(t => (
              <div key={t._id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <Link to={`/tournaments/${t._id}`} className="font-medium hover:underline">{t.name}</Link>
                      <div className="text-xs text-neutral-600">Durum: Devam ediyor • Tur: {t.currentRound} {t.category ? `• ${t.category}` : ''}</div>
                      {t.metrics?.mode === 'time' && (
                        <div className="text-[11px] text-neutral-500">Kalan: {t.metrics.remainingSeconds}s / {t.metrics.totalSeconds}s • Eşleşmeler: {t.metrics.currentActive}/{t.metrics.currentTotal}</div>
                      )}
                      {t.metrics?.mode === 'participation' && (
                        <div className="text-[11px] text-neutral-500">Katılım: {t.metrics.voters} / {t.metrics.required} • Eşleşmeler: {t.metrics.currentActive}/{t.metrics.currentTotal}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">Katılımcı: {t.participants?.length ?? 0}</div>
                </div>
                <div className="text-sm text-neutral-600">Bu turda {t.metrics?.currentTotal ?? 0} eşleşme var.</div>
                <div className="mt-3">
                  {voteSummaries && voteSummaries[t._id] ? (
                    <span className="inline-flex items-center px-3 py-2 rounded bg-neutral-200 text-neutral-600 text-sm cursor-not-allowed">Bu turda oy kullandınız</span>
                  ) : (
                    <Link to={`/tournaments/${t._id}/vote`} className="inline-flex items-center px-3 py-2 rounded bg-neutral-900 text-white hover:bg-neutral-800 text-sm">Turnuvayı Oyla</Link>
                  )}
                </div>
                {/* Bracket Görselleştirme */}
                <div className="mt-4">
                  <TournamentBracket tournamentId={t._id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


