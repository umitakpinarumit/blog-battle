import { useEffect, useState } from 'react'
import { api } from '../../api/client'

type Post = { _id: string; title: string; content: string; category: string; imageUrl?: string }

export default function EditPostModal({ post, onClose, onSaved }: { post: Post; onClose: () => void; onSaved: (p: any)=>void }) {
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content || '')
  const [category, setCategory] = useState(post.category)
  const [image, setImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cats, setCats] = useState<Array<{_id:string; name:string}>>([])
  const [loadingCats, setLoadingCats] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        setLoadingCats(true)
        const res = await api.get('/categories')
        setCats(res.data || [])
      } catch {}
      finally { setLoadingCats(false) }
    })()
  }, [])

  async function save() {
    try {
      setSaving(true)
      setError(null)
      const form = new FormData()
      form.append('title', title)
      form.append('content', content)
      form.append('category', category)
      if (image) form.append('image', image)
      const res = await api.put(`/posts/${post._id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      onSaved(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Kaydedilemedi')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[90%] max-w-xl rounded-lg bg-white shadow p-5">
        <h3 className="text-lg font-semibold mb-3">Yazıyı Düzenle</h3>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Başlık" />
          <textarea className="w-full border rounded px-3 py-2 min-h-40" value={content} onChange={e=>setContent(e.target.value)} placeholder="İçerik" />
          {loadingCats ? (
            <div className="text-sm text-neutral-600">Kategoriler yükleniyor...</div>
          ) : (
            <select className="w-full border rounded px-3 py-2" value={category} onChange={e=>setCategory(e.target.value)}>
              {cats.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          )}
          <input type="file" onChange={e=>setImage(e.target.files?.[0] || null)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded bg-neutral-100 hover:bg-neutral-200">Vazgeç</button>
          <button disabled={saving} onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      </div>
    </div>
  )
}


