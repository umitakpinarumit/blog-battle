import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import EditPostModal from './components/EditPostModal';

type User = {
  _id?: string;
  id?: string;
  email: string;
  displayName: string;
  role?: string;
  level?: number;
  createdAt?: string;
};

type Post = {
  _id: string;
  title: string;
  content?: string;
  category: string;
  imageUrl?: string;
  createdAt: string;
};

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [winsByPost, setWinsByPost] = useState<Record<string, number>>({});
  const [totalWins, setTotalWins] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<any[]>([]);
  const [matchModal, setMatchModal] = useState<{ id: string; ourIsA: boolean; ourTitle: string; opponentTitle: string } | null>(null);
  const [matchStats, setMatchStats] = useState<{ percentA: number; percentB: number } | null>(null);
  const [myVotes, setMyVotes] = useState<any[]>([]);
  const [matchStatsMap, setMatchStatsMap] = useState<Record<string, { percentA: number; percentB: number }>>({});
  const [votedTournaments, setVotedTournaments] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    // Bildirim akışını, kullanıcı doğrulandıktan sonra başlatacağız
    (async () => {
      try {
        setLoading(true);
        const meRes = await api.get('/auth/me');
        const u: User = meRes.data.user;
        if (!mounted) return;
        setUser(u);
        setDisplayNameInput(u.displayName || '');
        const authorId = (u._id || u.id) as string | undefined;
        const postsRes = await api.get('/posts', { params: authorId ? { authorId } : {} });
        const userPosts = postsRes.data as Post[];
        setPosts(userPosts);
        // Her yazı için kazanılan eşleşme sayısı
        const winsEntries = await Promise.all(
          userPosts.map(async (p) => {
            const ms = await api.get(`/matches/by-post/${p._id}`);
            const wins = (ms.data as any[]).filter(m => m.status === 'finished' && String(m.winnerId) === String(p._id)).length;
            return [p._id, wins] as const;
          })
        );
        const winsMap: Record<string, number> = {};
        let winsTotal = 0;
        for (const [pid, w] of winsEntries) { winsMap[pid] = w; winsTotal += w; }
        setWinsByPost(winsMap);
        setTotalWins(winsTotal);
        // Bildirim geçmişi
        const notifs = await api.get('/notifications');
        setNotifications(notifs.data);
        // Kullanıcının verdiği son oylar
        try {
          const mv = await api.get('/votes/me');
          setMyVotes(mv.data?.votes || mv.data);
          const summaries: Record<string, boolean> = mv.data?.summaries || {};
          if (summaries && Object.keys(summaries).length) {
            try {
              const ts = await api.get('/tournaments');
              const voted = (ts.data || []).filter((t: any) => summaries[t._id]);
              setVotedTournaments(voted);
            } catch {}
          }
        } catch {}
        // Kullanıcıya ait tüm eşleşmeleri topla
        const matchesAll: any[] = [];
        const isValidId = (s: string | undefined) => !!s && /^[0-9a-fA-F]{24}$/.test(s)
        for (const p of userPosts) {
          const mm = await api.get(`/matches/by-post/${p._id}`);
          for (const m of mm.data as any[]) {
            const ourIsA = String(m.postAId) === String(p._id);
            const opponentTitle = ourIsA ? (m.postBTitle || 'Silinmiş yazı') : (m.postATitle || 'Silinmiş yazı');
            matchesAll.push({
              _id: m._id,
              status: m.status,
              category: m.category,
              round: m.round,
              opponentTitle,
              ourIsA,
              ourPostId: p._id,
              ourTitle: p.title,
            });
          }
        }
        // Aynı maç birden fazla kez eklenmiş olabilir (ör. kendi yazılarımız birbiriyle eşleşmişse)
        const uniqueById = Array.from(new Map(matchesAll.map(m => [m._id, m])).values());
        const ongoing = uniqueById.filter(x => x.status === 'ongoing');
        setActiveMatches(ongoing);
        setFinishedMatches(uniqueById.filter(x => x.status === 'finished'));
        // Aktif eşleşmeler için anlık istatistikleri getir
        try {
          const statsEntries = await Promise.all(
            ongoing.map(async (m) => {
              const r = await api.get(`/matches/${m._id}`);
              return [m._id, { percentA: r.data.stats.percentA, percentB: r.data.stats.percentB }] as const;
            })
          );
          const map: Record<string, { percentA: number; percentB: number }> = {};
          for (const [id, st] of statsEntries) map[id] = st;
          setMatchStatsMap(map);
        } catch {}
        // Artık SSE akışını başlat
        const tk = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (tk) {
          const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/me/stream?token=${encodeURIComponent(tk)}`;
          const es = new EventSource(url);
          es.onmessage = (e) => {
            try {
              const payload = JSON.parse(e.data);
              if (payload?.type === 'match' || payload?.type === 'tournament') {
                setNotifications((prev) => [
                  { _id: 'tmp_' + Date.now(), message: payload.message, createdAt: new Date().toISOString(), read: false },
                  ...prev,
                ]);
                setNotifOpen(true);
              }
            } catch {}
          };
        }
      } catch (err: any) {
        if (err?.response?.status === 401) setUnauthorized(true);
        setError(err?.response?.data?.error || 'Yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  if (loading) return <div>Yükleniyor...</div>;
  if (unauthorized) return <div>Oturum bulunamadı. Lütfen giriş yapın.</div>;
  if (error && !user) return <div className="text-red-600">{error}</div>;
  if (!user) return <div>Oturum bulunamadı.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4 relative">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">{user.displayName}</div>
            <div className="text-sm text-neutral-600 truncate">{user.email}</div>
          </div>
          <div className="flex items-center gap-3">
            {user.role && <span className="text-xs rounded bg-blue-50 text-blue-700 px-2 py-1">{user.role}</span>}
            <div className="relative">
              <button onClick={() => setNotifOpen(o=>!o)} className="relative px-3 py-2 rounded border hover:bg-neutral-50">
                🔔
                {notifications.some(n=>!n.read) && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[11px]">
                    {notifications.filter(n=>!n.read).length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-80 overflow-auto rounded-lg border bg-white shadow">
                  <div className="px-3 py-2 text-sm font-medium border-b">Bildirimler</div>
                  {notifications.length === 0 ? (
                    <div className="p-3 text-sm text-neutral-600">Bildirim yok.</div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map(n => (
                        <div key={n._id} className="p-3 text-sm flex items-start justify-between gap-2">
                          <div>
                            <div>{n.message}</div>
                            <div className="text-xs text-neutral-500">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                          {!n.read && (
                            <button onClick={async ()=>{ await api.put(`/notifications/${n._id}/read`); setNotifications(prev=>prev.map(x=>x._id===n._id?{...x, read:true}:x)); }} className="text-xs px-2 py-1 rounded bg-neutral-900 text-white">Okundu</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <form onSubmit={async (e)=>{e.preventDefault(); await api.put('/auth/me', { displayName: displayNameInput }); const me = await api.get('/auth/me'); setUser(me.data.user);}} className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs text-neutral-600 mb-1">Görünen Ad</label>
            <input value={displayNameInput} onChange={e=>setDisplayNameInput(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <button className="px-3 py-2 rounded bg-neutral-900 text-white">Kaydet</button>
        </form>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded border bg-white p-3 text-center">
            <div className="text-xs text-neutral-600">Toplam Yazı</div>
            <div className="text-2xl font-semibold">{posts.length}</div>
          </div>
          <div className="rounded border bg-white p-3 text-center">
            <div className="text-xs text-neutral-600">Kazanılan Eşleşme</div>
            <div className="text-2xl font-semibold">{totalWins}</div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-3">Gönderilerim</h3>
        {posts.length === 0 ? (
          <div className="text-sm text-neutral-600">Henüz bir gönderiniz yok.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map(p => (
              <div key={p._id} className="rounded-lg border bg-white overflow-hidden">
                {p.imageUrl && (
                  <img src={`${(p.imageUrl as string).startsWith('http') ? p.imageUrl : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + p.imageUrl}`} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-neutral-600 mt-1">{p.category}</div>
                  <div className="text-xs text-neutral-500 mt-1">{new Date(p.createdAt).toLocaleString()}</div>
                  <div className="mt-1 text-xs"><span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">Kazanma: {winsByPost[p._id] ?? 0}</span></div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link to={`/posts/${p._id}`} className="text-sm text-blue-700 hover:underline">Devamını oku</Link>
                    <button onClick={() => setEditing(p)} className="text-sm rounded border px-2 py-1 hover:bg-neutral-50">Düzenle</button>
                    <button onClick={async ()=>{ if (!confirm('Bu yazıyı silmek istiyor musunuz?')) return; await api.delete(`/posts/${p._id}`); setPosts(prev => prev.filter(x => x._id !== p._id)); }} className="text-sm rounded border px-2 py-1 hover:bg-red-50 text-red-600 border-red-200">Sil</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editing && (
        <EditPostModal post={editing} onClose={() => setEditing(null)} onSaved={(np)=>{ setPosts(prev => prev.map(x => x._id===np._id ? np : x)); setEditing(null) }} />
      )}
      <div>
        <h3 className="font-semibold mb-2">Aktif Eşleşmelerim</h3>
        {activeMatches.length === 0 ? (
          <div className="text-sm text-neutral-600">Aktif eşleşme yok.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeMatches.map(m => (
              <div key={m._id} className="rounded-lg border bg-white p-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate text-blue-700">{m.ourTitle}</div>
                    <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden mt-1">
                      <div className="h-2 bg-blue-600 transition-all duration-700" style={{ width: `${(matchStatsMap[m._id]?.percentA ?? 0)}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16 rounded-full" style={{ background: `conic-gradient(#2563eb ${(matchStatsMap[m._id]?.percentA ?? 0)}%, #10b981 0)` }}>
                      <div className="absolute inset-1 rounded-full bg-white flex items-center justify-center text-[10px] font-semibold">
                        %{matchStatsMap[m._id]?.percentA ?? 0}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-neutral-600">Anlık</div>
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="font-medium truncate text-neutral-800">{m.opponentTitle || 'Rakip yazı'}</div>
                    <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden mt-1">
                      <div className="h-2 bg-emerald-600 transition-all duration-700" style={{ width: `${(matchStatsMap[m._id]?.percentB ?? 0)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
                  <div>Kategori: {m.category} • Tur {m.round}</div>
                  <button onClick={async ()=>{ setMatchModal({ id: m._id, ourIsA: m.ourIsA, ourTitle: m.ourTitle, opponentTitle: m.opponentTitle || 'Rakip yazı' }); const r = await api.get(`/matches/${m._id}`); setMatchStats({ percentA: r.data.stats.percentA, percentB: r.data.stats.percentB }); }} className="rounded border px-2 py-1 hover:bg-neutral-50">Detay</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">Bitmiş Eşleşmelerim</h3>
        {finishedMatches.length === 0 ? (
          <div className="text-sm text-neutral-600">Bitmiş eşleşme yok.</div>
        ) : (
          <div className="space-y-2">
            {finishedMatches.map(m => (
              <div key={m._id} className="rounded border bg-white p-3 flex items-center justify-between">
                <div className="text-sm min-w-0 pr-3">
                  <div className="font-medium truncate">
                    <span className="text-blue-700">{m.ourTitle}</span>
                    <span className="mx-2 text-xs px-2 py-0.5 rounded bg-neutral-100">VS</span>
                    <span className="text-neutral-800">{m.opponentTitle || 'Rakip yazı'}</span>
                  </div>
                  <div className="text-xs text-neutral-600">Kategori: {m.category} • Tur {m.round}</div>
                </div>
                <button onClick={async ()=>{ setMatchModal({ id: m._id, ourIsA: m.ourIsA, ourTitle: m.ourTitle, opponentTitle: m.opponentTitle || 'Rakip yazı' }); const r = await api.get(`/matches/${m._id}`); setMatchStats({ percentA: r.data.stats.percentA, percentB: r.data.stats.percentB }); }} className="text-sm rounded border px-2 py-1 hover:bg-neutral-50 shrink-0">Sonuç</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">Oyladığım Turnuvalar (bu tur)</h3>
        {votedTournaments.length === 0 ? (
          <div className="text-sm text-neutral-600">Henüz tamamen oyladığınız bir turnuva yok.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {votedTournaments.map((t: any) => (
              <Link key={t._id} to={`/tournaments/${t._id}`} className="rounded border bg-white p-4 hover:bg-neutral-50">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-neutral-600">Durum: {t.status} • Tur: {t.currentRound} {t.category ? `• ${t.category}` : ''}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {matchModal && matchStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>{ setMatchModal(null); setMatchStats(null); }} />
          <div className="relative w-[90%] max-w-md rounded-lg bg-white shadow p-5">
            <div className="text-lg font-semibold mb-3 truncate">{matchModal.ourTitle} <span className="mx-2 text-xs px-2 py-0.5 rounded bg-neutral-100">VS</span> {matchModal.opponentTitle}</div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="space-y-1">
                <div className="text-sm text-neutral-600 truncate">{matchModal.ourIsA ? matchModal.ourTitle : matchModal.opponentTitle}</div>
                <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                  <div className="h-2 bg-blue-600 transition-all duration-700" style={{ width: `${matchStats.percentA}%` }} />
                </div>
                <div className="text-xs text-neutral-600">%{matchStats.percentA}</div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="relative w-28 h-28 rounded-full" style={{ background: `conic-gradient(#2563eb ${matchStats.percentA}%, #10b981 0)` }}>
                  <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center text-sm font-semibold">
                    %{matchStats.percentA} / %{matchStats.percentB}
                  </div>
                </div>
                <div className="mt-2 text-xs text-neutral-600">Anlık Durum</div>
              </div>

              <div className="space-y-1 text-right">
                <div className="text-sm text-neutral-600 truncate">{matchModal.ourIsA ? matchModal.opponentTitle : matchModal.ourTitle}</div>
                <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                  <div className="h-2 bg-emerald-600 transition-all duration-700" style={{ width: `${matchStats.percentB}%` }} />
                </div>
                <div className="text-xs text-neutral-600">%{matchStats.percentB}</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={()=>{ setMatchModal(null); setMatchStats(null); }} className="px-3 py-2 rounded bg-neutral-900 text-white">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


