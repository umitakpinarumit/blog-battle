import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../api/admin'

type Tournament = { _id: string; name: string; category?: string; status: 'draft'|'ongoing'|'finished'; rounds: string[][]; currentRound: number, participants?: string[], progressionMode?: 'time'|'participation', threshold?: number }
type Post = { _id: string; title: string; category: string }
type Category = { _id: string; name: string }

const ALL = '__ALL__'

function AdminTournaments() {
  const [list, setList] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('')
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [progressionMode, setProgressionMode] = useState<'time'|'participation'>('time')
  const [threshold, setThreshold] = useState<number>(3600)

  async function load() {
    try {
      setLoading(true)
      const [ts, ps, cs] = await Promise.all([
        adminApi.get('/tournaments'),
        adminApi.get('/posts'),
        adminApi.get('/categories'),
      ])
      setList(ts.data)
      setPosts(ps.data)
      setCategories(cs.data)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Yüklenemedi')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filteredPostIdsByCategory = useMemo(() => {
    if (category === ALL) return posts.map(p => p._id)
    if (!category) return []
    return posts.filter(p => p.category === category).map(p => p._id)
  }, [category, posts])

  useEffect(() => {
    // Kategori değişince otomatik seçim ve isim önerisi
    if (category) {
      setSelected(filteredPostIdsByCategory)
      if (!name) {
        const label = category === ALL ? 'Genel' : category
        setName(`${label} Turnuvası`)
      }
    } else {
      setSelected([])
    }
  }, [category, filteredPostIdsByCategory])

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function create() {
    if (!name || selected.length < 2) return
    try {
      setCreating(true)
      // Name from category if empty
      const finalName = name || (category && category !== ALL ? `${category} Turnuvası` : 'Turnuva')
      await adminApi.post('/tournaments', { name: finalName, category: category && category !== ALL ? category : undefined, participants: selected, progressionMode, threshold })
      setName(''); setCategory(''); setSelected([])
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Turnuva oluşturulamadı')
    } finally { setCreating(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Turnuva Oluştur</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border p-2" placeholder="Turnuva adı" value={name} onChange={e=>setName(e.target.value)} />
          <div className="grid grid-cols-1 gap-2">
            <label className="text-xs text-neutral-600">Turu sonuçlandırma</label>
            <select className="border p-2" value={progressionMode} onChange={e=>setProgressionMode(e.target.value as any)}>
              <option value="time">Süre</option>
              <option value="participation">Katılım yüzdesi</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <label className="text-xs text-neutral-600">{progressionMode==='time' ? 'Süre (saniye)' : 'Gerekli katılım (%)'}</label>
            <input type="number" className="border p-2" value={threshold} onChange={e=>setThreshold(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm text-neutral-600 mb-1">Katılımcılar (en az 2)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-64 overflow-auto border rounded p-2">
            {posts
              .filter(p => category === ALL || !category ? true : p.category === category)
              .map(p => (
              <label key={p._id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(p._id)} onChange={()=>toggle(p._id)} />
                <span className="truncate">{p.title}</span>
                <span className="ml-auto text-[11px] text-neutral-500">{p.category}</span>
              </label>
            ))}
          </div>
        </div>
        <button disabled={!name || selected.length < 2 || creating} onClick={create} className="mt-3 px-3 py-2 rounded bg-neutral-900 text-white disabled:opacity-60">{creating ? 'Oluşturuluyor...' : 'Turnuvayı Başlat'}</button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Turnuvalar</h2>
        {loading ? 'Yükleniyor...' : error ? <div className="text-red-600">{error}</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map(t => (
              <div key={t._id} className="rounded border bg-white p-4 hover:bg-neutral-50 flex items-center justify-between gap-3">
                <a href={`/admin/tournaments/${t._id}`} className="flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-neutral-600">Durum: {t.status} • Tur: {t.currentRound} {t.category ? `• ${t.category}` : ''}</div>
                  {t.metrics && t.metrics.mode === 'time' && (
                    <div className="text-[11px] text-neutral-500">Kalan: {t.metrics.remainingSeconds}s / {t.metrics.totalSeconds}s</div>
                  )}
                  {t.metrics && t.metrics.mode === 'participation' && (
                    <div className="text-[11px] text-neutral-500">Katılım: {t.metrics.voters} / {t.metrics.required}</div>
                  )}
                </a>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-neutral-500">Katılımcı: {t.participants?.length ?? 0}</div>
                  <button onClick={async ()=>{ if(!confirm('Turnuvayı aynı parametrelerle yeniden başlatmak istiyor musunuz? (Tüm oylar silinir)')) return; await adminApi.post(`/tournaments/${t._id}/reset`); await load(); }} className="px-3 py-1.5 rounded border text-xs hover:bg-neutral-50">Yenile</button>
                  {t.status !== 'finished' && (
                    <button onClick={async ()=>{ if(!confirm('Turnuvayı silmek istediğinize emin misiniz?')) return; await adminApi.post(`/tournaments/${t._id}/cancel`); await load(); }} className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 text-xs">Sil</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


export default AdminTournaments
