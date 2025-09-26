import { useEffect, useState } from 'react'
import { api } from '../api/client'

type Match = {
  _id: string
  postAId: string
  postBId: string
  category: string
  round: number
  status: 'ongoing' | 'finished'
  winnerId?: string
}

export default function Admin() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null

  async function load() {
    try {
      setLoading(true)
      const res = await api.get('/matches/active', { headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {} })
      setMatches(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function finish(id: string) {
    await api.post(`/matches/${id}/finish`, undefined, { headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {} })
    await load()
  }

  if (!adminToken) return <div>Yetkisiz. Lütfen admin girişi yapınız.</div>
  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Admin</h2>
      {matches.length === 0 ? (
        <div className="text-sm text-neutral-600">Aktif eşleşme yok.</div>
      ) : (
        <div className="space-y-3">
          {matches.map(m => (
            <div key={m._id} className="rounded border bg-white p-4 flex items-center justify-between">
              <div className="text-sm">
                <div><span className="font-medium">Kategori:</span> {m.category}</div>
                <div><span className="font-medium">Tur:</span> {m.round}</div>
                <div><span className="font-medium">Durum:</span> {m.status}</div>
              </div>
              <button onClick={() => finish(m._id)} className="px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800">Bitir</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


