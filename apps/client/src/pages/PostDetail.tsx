import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'

export default function PostDetail() {
  const { id } = useParams()
  const [post, setPost] = useState<any | null>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await api.get(`/posts/${id}`)
        setPost(res.data)
        const mm = await api.get(`/matches/by-post/${id}`)
        setMatches(mm.data)
        const rel = await api.get(`/posts/${id}/related`)
        setRelated(rel.data)
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Yüklenemedi')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!post) return <div>Bulunamadı</div>

  return (
    <div className="space-y-8">
      <article className="prose prose-neutral max-w-none">
        {post.imageUrl && <img src={`${post.imageUrl.startsWith('http') ? post.imageUrl : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + post.imageUrl}`} alt="" className="w-full rounded" />}
        <h1>{post.title}</h1>
        <p className="text-sm text-neutral-600">Kategori: {post.category}</p>
        <div className="whitespace-pre-wrap">{post.content}</div>
      </article>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Bu yazının eşleşmeleri</h3>
        {matches.length === 0 ? (
          <div className="text-sm text-neutral-600">Henüz eşleşme yok.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matches.map(m => (
              <div key={m._id} className="rounded border bg-white p-4 flex items-center justify-between">
                <div className="text-sm">
                  <div><span className="font-medium">Kategori:</span> {m.category}</div>
                  <div><span className="font-medium">Tur:</span> {m.round}</div>
                  <div><span className="font-medium">Durum:</span> {m.status === 'finished' ? 'Bitti' : 'Devam ediyor'}</div>
                </div>
                {m.status !== 'finished' && (
                  <Link to={`/vote?id=${m._id}`} className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">Oy ver</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Benzer yazılar</h3>
        {related.length === 0 ? (
          <div className="text-sm text-neutral-600">Benzer yazı bulunamadı.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((r: any) => (
              <a key={r._id} href={`/posts/${r._id}`} className="group rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="h-40 w-full bg-neutral-100">
                  {r.imageUrl ? (
                    <img src={`${r.imageUrl.startsWith('http') ? r.imageUrl : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + r.imageUrl}`} alt="" className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">{r.category}</span>
                    <span className="text-xs text-neutral-500">Puan: {r.engagementScore ?? 0}</span>
                  </div>
                  <div className="font-semibold line-clamp-2 group-hover:text-blue-700">{r.title}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}


