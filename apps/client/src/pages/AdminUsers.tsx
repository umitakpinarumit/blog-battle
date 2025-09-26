import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../api/admin'
import { Link, useLocation } from 'react-router-dom'

type User = { _id: string; email: string; displayName?: string; role: string; level?: string }

export default function AdminUsers() {
  const [list, setList] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const role = params.get('role') || ''

  async function load() {
    try {
      setLoading(true)
      const res = await adminApi.get('/users')
      setList(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Yüklenemedi')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => list.filter(u =>
    (!role || u.role === role) &&
    (!search || (u.email?.toLowerCase().includes(search.toLowerCase()) || u.displayName?.toLowerCase().includes(search.toLowerCase())))
  ), [list, role, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Kullanıcılar</h2>
        <div className="flex items-center gap-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} className="border rounded px-3 py-2 text-sm" placeholder="Ara..." />
          <button onClick={async ()=>{ try{ await adminApi.post('/users/recompute-levels'); await load(); } catch{} }} className="px-3 py-2 rounded border text-sm hover:bg-neutral-50">Seviyeleri Yeniden Hesapla</button>
        </div>
      </div>
      {loading ? 'Yükleniyor...' : error ? <div className="text-red-600">{error}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(u => (
            <Link to={`/admin/users/${u._id}`} key={u._id} className="rounded border bg-white p-4 hover:bg-neutral-50">
              <div className="font-medium">{u.displayName || u.email}</div>
              <div className="text-xs text-neutral-600">Rol: {u.role}</div>
              {u.level && <div className="text-xs text-neutral-600">Seviye: {u.level}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}


