import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { adminApi } from '../api/admin'

type Post = { _id: string; title: string; content: string; category: string; imageUrl?: string; authorId: { displayName: string; email: string } | string }

export default function AdminPostDetail() {
  const { id } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await adminApi.get(`/posts/${id}`, { params: { includeAuthor: 1 } })
        setPost(res.data)
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

  const authorName = typeof post.authorId === 'string' ? post.authorId : `${post.authorId.displayName} (${post.authorId.email})`

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-600">Kategori: {post.category}</div>
      <h1 className="text-2xl font-semibold">{post.title}</h1>
      <div className="text-sm text-neutral-600">Yazar: {authorName}</div>
      {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full max-h-96 object-cover rounded" />}
      <article className="prose prose-neutral max-w-none whitespace-pre-wrap">
        {post.content}
      </article>
    </div>
  )
}


