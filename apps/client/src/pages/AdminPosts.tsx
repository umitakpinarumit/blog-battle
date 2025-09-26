import { useEffect, useState } from 'react'
import { adminApi } from '../api/admin'
import { Link } from 'react-router-dom'
import ConfirmModal from './components/ConfirmModal'

type Post = { _id: string; title: string; content?: string; category: string; authorId: string | { _id: string; displayName: string; email: string }; imageUrl?: string; createdAt?: string }
type Category = { _id: string; name: string }

export default function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      const [res, cat] = await Promise.all([
        adminApi.get('/posts', { params: { includeAuthor: 1 } }),
        adminApi.get('/categories'),
      ])
      setPosts(res.data)
      setCategories(cat.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = posts.filter(p => {
    const matchesQuery = query.trim() === '' || p.title.toLowerCase().includes(query.toLowerCase()) || (p.content || '').toLowerCase().includes(query.toLowerCase())
    const matchesCat = !selectedCat || p.category === selectedCat
    return matchesQuery && matchesCat
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-xl font-semibold">Yazılar</h2>
        <div className="flex items-center gap-2">
          <input value={query} onChange={e=>setQuery(e.target.value)} className="border rounded px-3 py-2 text-sm w-64" placeholder="Başlık/içerik ara" />
          <select value={selectedCat} onChange={e=>setSelectedCat(e.target.value)} className="border rounded px-2 py-2 text-sm">
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-neutral-600">Yükleniyor...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-neutral-600">Sonuç bulunamadı.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p._id} className="group rounded-lg border overflow-hidden bg-white hover:shadow-md transition">
              <Link to={`/admin/posts/${p._id}`} className="block">
                <div className="h-36 w-full bg-neutral-100">
                  {p.imageUrl ? (
                    <img src={`${(p.imageUrl as string).startsWith('http') ? p.imageUrl : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + p.imageUrl}`} alt="" className="h-36 w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">{p.category}</span>
                    {p.createdAt && <span className="text-xs text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</span>}
                  </div>
                  <div className="font-medium line-clamp-1 group-hover:text-blue-700">{p.title}</div>
                  {p.content && <div className="text-sm text-neutral-600 line-clamp-2">{p.content}</div>}
                  <div className="text-xs text-neutral-500">Yazar: {typeof p.authorId === 'string' ? p.authorId : p.authorId.displayName}</div>
                </div>
              </Link>
              <div className="p-3 border-t flex items-center justify-end gap-2">
                <button onClick={() => setDeleteId(p._id)} title="Sil" className="text-sm px-2 py-1 rounded bg-red-600 text-white">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!deleteId}
        title="Yazıyı Sil"
        description="Bu yazıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="Vazgeç"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return
          await adminApi.delete(`/posts/${deleteId}`)
          setDeleteId(null)
          await load()
        }}
      />
    </div>
  )
}


