import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { adminApi } from '../api/admin'

type Match = { _id: string; postAId: string; postBId: string; category: string; round: number; status: 'ongoing'|'finished'; winnerId?: string }
type Stats = { votesA: number; votesB: number; percentA: number; percentB: number }
type Post = { _id: string; title: string; category: string; authorId?: { displayName: string } | string; imageUrl?: string }

export default function AdminMatchDetail() {
  const { id } = useParams()
  const [match, setMatch] = useState<Match | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [postA, setPostA] = useState<Post | null>(null)
  const [postB, setPostB] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let closed = false
    ;(async () => {
      try {
        setLoading(true)
        const mRes = await adminApi.get(`/matches/${id}`)
        if (closed) return
        setMatch(mRes.data.match)
        setStats(mRes.data.stats)
        const [a, b] = await Promise.all([
          adminApi.get(`/posts/${mRes.data.match.postAId}`, { params: { includeAuthor: 1 } }),
          adminApi.get(`/posts/${mRes.data.match.postBId}`, { params: { includeAuthor: 1 } }),
        ])
        if (closed) return
        setPostA(a.data)
        setPostB(b.data)
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Yüklenemedi')
      } finally {
        setLoading(false)
      }
    })()
    return () => { closed = true }
  }, [id])

  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!match || !postA || !postB || !stats) return <div>Bulunamadı</div>

  const isFinished = match.status === 'finished'
  const winner = match.winnerId === postA._id ? 'A' : match.winnerId === postB._id ? 'B' : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-neutral-600">Kategori: {match.category} • Tur {match.round}</div>
          <h2 className="text-xl font-semibold">Eşleşme Detayı</h2>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${isFinished ? 'bg-neutral-900 text-white' : 'bg-green-100 text-green-700'}`}>{isFinished ? 'Bitti' : 'Devam ediyor'}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded border bg-white overflow-hidden ${winner === 'A' ? 'ring-2 ring-green-500' : ''}`}>
          {postA.imageUrl && <img src={postA.imageUrl} alt="" className="h-40 w-full object-cover" />}
          <div className="p-4">
            <div className="font-medium">{postA.title}</div>
            <div className="text-xs text-neutral-600 mt-1">{typeof postA.authorId === 'string' ? postA.authorId : postA.authorId?.displayName}</div>
            <div className="mt-3">
              <div className="h-2 w-full bg-neutral-100 rounded">
                <div className="h-2 bg-blue-600 rounded" style={{ width: `${stats.percentA}%` }} />
              </div>
              <div className="mt-1 text-xs text-neutral-600">{stats.percentA}% • {stats.votesA} oy</div>
            </div>
          </div>
        </div>
        <div className={`rounded border bg-white overflow-hidden ${winner === 'B' ? 'ring-2 ring-green-500' : ''}`}>
          {postB.imageUrl && <img src={postB.imageUrl} alt="" className="h-40 w-full object-cover" />}
          <div className="p-4">
            <div className="font-medium">{postB.title}</div>
            <div className="text-xs text-neutral-600 mt-1">{typeof postB.authorId === 'string' ? postB.authorId : postB.authorId?.displayName}</div>
            <div className="mt-3">
              <div className="h-2 w-full bg-neutral-100 rounded">
                <div className="h-2 bg-blue-600 rounded" style={{ width: `${stats.percentB}%` }} />
              </div>
              <div className="mt-1 text-xs text-neutral-600">{stats.percentB}% • {stats.votesB} oy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


