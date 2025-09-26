import { useEffect, useState } from 'react'
import { useNavigate, Outlet, NavLink, useLocation } from 'react-router-dom'

export default function AdminLayout() {
  const navigate = useNavigate()
  const [openUsers, setOpenUsers] = useState(true)
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const role = params.get('role') || ''
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) navigate('/admin/login')
  }, [navigate])

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r bg-white/90 backdrop-blur p-4">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-600" />
          <div className="font-semibold tracking-tight">Admin Panel</div>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <button onClick={() => setOpenUsers(o => !o)} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-100 flex items-center justify-between">
            <span>Kullanıcılar</span>
            <span className="text-xs">{openUsers ? '▾' : '▸'}</span>
          </button>
          {openUsers && (
            <div className="ml-3 flex flex-col gap-1">
              <NavLink to="/admin/users" className={() => `px-2 py-1 rounded ${location.pathname.startsWith('/admin/users') && !role ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>Tüm Kullanıcılar</NavLink>
              <NavLink to="/admin/users?role=admin" className={() => `px-2 py-1 rounded ${location.pathname.startsWith('/admin/users') && role==='admin' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>Yönetim</NavLink>
              <NavLink to="/admin/users?role=user" className={() => `px-2 py-1 rounded ${location.pathname.startsWith('/admin/users') && role==='user' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>Yazarlar ve Diğerleri</NavLink>
            </div>
          )}
          <NavLink to="/admin/posts" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>Yazılar</NavLink>
          <NavLink to="/admin/matches" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>Eşleşmeler</NavLink>
          <NavLink to="/admin/categories" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>Kategoriler</NavLink>
          <NavLink to="/admin/tournaments" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>Turnuvalar</NavLink>
        </nav>
        <button onClick={() => { localStorage.removeItem('admin_token'); window.location.href = '/admin/login'; }} className="mt-6 text-sm px-3 py-2 rounded bg-red-600 text-white w-full">Admin Çıkış</button>
      </aside>
      <main className="p-8 bg-neutral-50">
        <Outlet />
      </main>
    </div>
  )
}


