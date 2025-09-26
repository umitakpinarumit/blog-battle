import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Vote() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const [data, setData] = useState<any | null>(null);
  const [percent, setPercent] = useState<{A:number;B:number}>({A:0,B:0});
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [postA, setPostA] = useState<any | null>(null);
  const [postB, setPostB] = useState<any | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Giriş yapmayanlar oylama sayfasına giremesin -> login'e yönlendir
    if (!token) {
      window.location.replace('/login');
      return;
    }
    if (!id) return;
    api.get(`/matches/${id}`).then(r => {
      const match = r.data.match;
      setData(match);
      setPercent({A:r.data.stats.percentA, B:r.data.stats.percentB});
      // Use embedded post meta to avoid extra calls and 404s
      setPostA({ title: r.data.a?.title || 'Silinmiş yazı', imageUrl: r.data.a?.imageUrl });
      setPostB({ title: r.data.b?.title || 'Silinmiş yazı', imageUrl: r.data.b?.imageUrl });
    });
    const es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/matches/${id}/stream`);
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (typeof payload.percentA === 'number' && typeof payload.percentB === 'number') {
          setPercent({A: payload.percentA, B: payload.percentB});
        }
      } catch {}
    };
    return () => es.close();
  }, [id]);

  async function vote(choice: 'A'|'B') {
    if (!id) return;
    if (!token) {
      window.location.replace('/login');
      return;
    }
    try {
      setHasVoted(true);
      await api.post('/votes', { matchId: id, choice });
    } catch (err: any) {
      const code = err?.response?.status;
      if (code === 409) setErrorMsg('Bu eşleşmeye zaten oy verdiniz.');
      else setErrorMsg(err?.response?.data?.error || 'Oy verilemedi');
    }
  }

  if (!id) return <div>ID bulunamadı</div>;
  if (!data || !postA || !postB) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oylama</h1>
          <p className="text-sm text-neutral-600">Seçimini yap, sonuçları anında izle</p>
        </div>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[{key:'A', post: postA, color:'blue'}, {key:'B', post: postB, color:'emerald'}].map((side) => (
            <div key={side.key} className="space-y-4">
              {side.post.imageUrl && (
                <img src={`${(side.post.imageUrl as string).startsWith('http') ? side.post.imageUrl : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + side.post.imageUrl}`} alt="" className="w-full h-48 object-cover rounded" />
              )}
              <h3 className="font-semibold text-neutral-800 line-clamp-2">{side.post.title}</h3>
              <p className="text-sm text-neutral-600 line-clamp-3">{side.post.content}</p>
              <button disabled={hasVoted} onClick={() => vote(side.key as 'A'|'B')} className={`inline-flex items-center rounded-lg bg-${side.color}-600 px-5 py-3 text-white hover:bg-${side.color}-700 transition disabled:opacity-60`}>
                Oy ver
              </button>
            </div>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-1 flex justify-between text-sm text-neutral-600"><span>{postA.title}</span><span>%{percent.A}</span></div>
            <div className="h-3 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-3 bg-blue-600 transition-all duration-700" style={{width: `${percent.A}%`}} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm text-neutral-600"><span>{postB.title}</span><span>%{percent.B}</span></div>
            <div className="h-3 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-3 bg-emerald-600 transition-all duration-700" style={{width: `${percent.B}%`}} />
            </div>
          </div>
        </div>
        {hasVoted && (
          <div className="mt-4 text-sm text-neutral-700">Oyun alındı. Sonuçlar canlı güncelleniyor...</div>
        )}
        {errorMsg && (
          <div className="mt-3 text-sm text-red-600">{errorMsg}</div>
        )}
      </div>
      {errorMsg && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-white border shadow px-3 py-2 text-sm text-red-700">
          {errorMsg}
          <button onClick={()=>setErrorMsg(null)} className="ml-2 text-neutral-600">Kapat</button>
        </div>
      )}
    </div>
  );
}



