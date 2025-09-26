import { useEffect, useState } from 'react'
import { adminApi } from '../api/admin'
import ConfirmModal from './components/ConfirmModal'

type Category = { _id: string; name: string }

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  async function load() {
    try {
      setLoading(true)
      const res = await adminApi.get('/categories')
      setCategories(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!name.trim()) return
    await adminApi.post('/categories', { name })
    setName('')
    await load()
  }

  function triggerRemove(id: string) { setDeleteId(id) }
  function triggerEdit(id: string, current: string) { setEditId(id); setEditValue(current) }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Kategoriler</h2>
      <div className="flex items-center gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} className="border rounded px-3 py-2 text-sm" placeholder="Yeni kategori adı" />
        <button onClick={add} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Ekle</button>
      </div>
      {loading ? 'Yükleniyor...' : error ? <div className="text-red-600">{error}</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map(c => (
            <div key={c._id} className="rounded border bg-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-neutral-100">🏷️</span>
                <span>{c.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button title="Düzenle" onClick={() => triggerEdit(c._id, c.name)} className="text-sm px-2 py-1 rounded bg-neutral-900 text-white">✏️</button>
                <button title="Sil" onClick={() => triggerRemove(c._id)} className="text-sm px-2 py-1 rounded bg-red-600 text-white">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!deleteId}
        title="Kategoriyi Sil"
        description="Bu kategoriyi silmek istediğinize emin misiniz?"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => { if (!deleteId) return; await adminApi.delete(`/categories/${deleteId}`); setDeleteId(null); await load() }}
      />
      <ConfirmModal
        open={!!editId}
        title="Kategori Düzenle"
        description="Yeni kategori adını girin."
        confirmText="Kaydet"
        onCancel={() => { setEditId(null); setEditValue('') }}
        onConfirm={async () => { if (!editId || !editValue.trim()) return; await adminApi.put(`/categories/${editId}`, { name: editValue.trim() }); setEditId(null); setEditValue(''); await load() }}
        inputLabel="Kategori Adı"
        inputPlaceholder="Örn: Teknoloji"
        inputValue={editValue}
        onInputChange={setEditValue}
      />
    </div>
  )
}


