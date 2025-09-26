import { useEffect, useState } from 'react'
import { adminApi } from '../api/admin'
import { Link } from 'react-router-dom'

type Post = { _id: string; title: string }
type Match = { _id: string; category: string; round: number; status: 'ongoing'|'finished' }

export default function AdminMatches() {
  const [active, setActive] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      const [m] = await Promise.all([
        adminApi.get('/matches/active'),
      ])
      setActive(m.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function finish(id: string) {
    await adminApi.post(`/matches/${id}/finish`)
    await load()
  }

  // Manuel eşleşme kaldırıldı; turnuva üzerinden yönetilir

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Aktif Eşleşmeler</h2>
        {loading ? 'Yükleniyor...' : error ? <div className="text-red-600">{error}</div> : (
          <div className="space-y-3 mt-3">
            {active.length === 0 ? <div className="text-sm text-neutral-600">Aktif eşleşme yok.</div> : active.map(m => (
              <div key={m._id} className="rounded border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Kategori:</span> {m.category}</div>
                    <div><span className="font-medium">Tur:</span> {m.round}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Durum:</span>
                      {m.status === 'finished' ? (
                        <span className="inline-flex items-center rounded-full bg-neutral-900 text-white px-2 py-0.5 text-xs">Bitti</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Devam ediyor</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/matches/${m._id}`} className="px-3 py-1.5 rounded border hover:bg-neutral-50">Detay</Link>
                    <button onClick={async ()=>{ if(!confirm('Bu eşleşmenin tüm oylarını sıfırlamak istiyor musunuz?')) return; await adminApi.post(`/votes/reset/match/${m._id}`); alert('Oylar sıfırlandı'); }} className="px-3 py-1.5 rounded border hover:bg-neutral-50">Oyları Sıfırla</button>
                    <button onClick={() => finish(m._id)} className="px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800">Bitir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded border bg-amber-50 text-amber-900 p-4">
        Eşleşme başlatma işlemleri artık turnuvalar üzerinden yapılır. Lütfen sol menüden Turnuvalar bölümünü kullanın.
      </div>
      {errorMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setErrorMsg(null)} />
          <div className="relative w-[90%] max-w-md rounded-lg bg-white shadow p-5">
            <div className="text-lg font-semibold mb-2">Eşleşme Hatası</div>
            <div className="text-sm text-red-600">{errorMsg}</div>
            <div className="mt-4 flex justify-end">
              <button onClick={()=>setErrorMsg(null)} className="px-3 py-2 rounded bg-neutral-900 text-white">Tamam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


