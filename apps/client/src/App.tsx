import { Route, Routes, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { logout } from './features/auth/authSlice'
import './App.css'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import CreatePost from './pages/CreatePost'
import AdminLayout from './pages/AdminLayout'
import AdminLogin from './pages/AdminLogin'
import AdminUsers from './pages/AdminUsers'
import AdminPosts from './pages/AdminPosts'
import AdminMatches from './pages/AdminMatches'
import AdminPostDetail from './pages/AdminPostDetail'
import AdminCategories from './pages/AdminCategories'
import AdminMatchDetail from './pages/AdminMatchDetail'
import AdminUserDetail from './pages/AdminUserDetail'
import Vote from './pages/Vote'
import Profile from './pages/Profile'
import PostDetail from './pages/PostDetail'
import AdminTournaments from './pages/AdminTournaments'
import AdminTournamentDetail from './pages/AdminTournamentDetail'
import TournamentDetail from './pages/TournamentDetail'
import TournamentVote from './pages/TournamentVote'
import ActiveTournaments from './pages/ActiveTournaments'

function App() {
  const token = useAppSelector(s => s.auth.token)
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = location.pathname.startsWith('/admin')
  // Logout redirect
  if (!isAdmin && !token && location.pathname.startsWith('/profile')) {
    navigate('/')
  }
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {!isAdmin && (
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-blue-600" />
              <span className="font-semibold tracking-tight text-neutral-900">Blog Battle</span>
            </div>
            <nav className="relative flex flex-wrap items-center gap-1 text-sm">
              <NavLink to="/" className={({isActive}) => `px-3 py-1.5 rounded-lg hover:bg-neutral-100 ${isActive ? 'font-semibold text-blue-700' : 'text-neutral-700'}`}>Ana Sayfa</NavLink>
              {!token && (
                <div className="group relative inline-block">
                  <button className="px-3 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-700 focus:outline-none">Hesap ▾</button>
                  <div className="absolute right-0 top-full z-50 w-44 rounded-lg border bg-white shadow transition duration-150 invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <NavLink to="/login" className={({isActive}) => `block px-3 py-2 rounded-t-lg hover:bg-neutral-50 ${isActive ? 'font-semibold text-blue-700' : 'text-neutral-700'}`}>Giriş Yap</NavLink>
                    <NavLink to="/register" className={({isActive}) => `block px-3 py-2 rounded-b-lg hover:bg-neutral-50 ${isActive ? 'font-semibold text-blue-700' : 'text-neutral-700'}`}>Kayıt Ol</NavLink>
                  </div>
                </div>
              )}
              {token && (
                <NavLink to="/create" className={({isActive}) => `px-3 py-1.5 rounded-lg hover:bg-neutral-100 ${isActive ? 'font-semibold text-blue-700' : 'text-neutral-700'}`}>Yazı Oluştur</NavLink>
              )}
              <NavLink to="/tournaments" className={({isActive}) => `px-3 py-1.5 rounded-lg hover:bg-neutral-100 ${isActive ? 'font-semibold text-blue-700' : 'text-neutral-700'}`}>Turnuvalar</NavLink>
              {!token && (
                <NavLink to="/vote" className={({isActive}) => `px-3 py-1.5 rounded-lg hover:bg-neutral-100 ${isActive ? 'font-semibold text-blue-700' : 'text-neutral-700'}`}>Oyla</NavLink>
              )}
              {token && (
                <NavLink to="/profile" className={({isActive}) => `px-3 py-1.5 rounded-lg hover:bg-neutral-100 ${isActive ? 'font-semibold text-blue-700' : 'text-neutral-700'}`}>Profil</NavLink>
              )}
              {token && (
                <button onClick={() => dispatch(logout())} className="ml-2 px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800">Çıkış</button>
              )}
            </nav>
      </div>
        </header>
      )}
      <main className={isAdmin ? 'px-6 py-8' : 'mx-auto max-w-[1200px] px-6 py-10'}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/tournaments/:id/vote" element={<TournamentVote />} />
          <Route path="/tournaments" element={<ActiveTournaments />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="matches" element={<AdminMatches />} />
            <Route path="matches/:id" element={<AdminMatchDetail />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="tournaments" element={<AdminTournaments />} />
            <Route path="tournaments/:id" element={<AdminTournamentDetail />} />
            <Route path="posts/:id" element={<AdminPostDetail />} />
          </Route>
        </Routes>
      </main>
      </div>
  )
}

export default App
