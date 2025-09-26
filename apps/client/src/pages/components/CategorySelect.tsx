import { useEffect, useState } from 'react'
import { api } from '../../api/client'

type Category = { _id: string; name: string }

export default function CategorySelect({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await api.get('/categories')
        setCats(res.data)
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Kategoriler yüklenemedi')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="text-sm text-neutral-600">Kategoriler yükleniyor...</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>

  return (
    <div>
      <select className="border p-2 w-full" value={value ?? ''} onChange={e=>onChange(e.target.value)}>
        <option value="">Kategori seçin</option>
        {cats.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
      </select>
    </div>
  )
}


