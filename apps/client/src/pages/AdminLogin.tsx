import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('Password123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      setLoading(true)
      const res = await api.post('/auth/login', { email, password })
      const token = res.data.token as string
      localStorage.setItem('admin_token', token)
      // doğrulama için admin endpointine vur
      await api.get('/auth/me/admin', { headers: { Authorization: `Bearer ${token}` } })
      navigate('/admin')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="text-xl font-semibold mb-4">Admin Girişi</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="border p-2 w-full" placeholder="E-posta" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border p-2 w-full" placeholder="Şifre" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="bg-neutral-900 text-white px-3 py-2 rounded disabled:opacity-60">{loading ? 'Giriş yapılıyor...' : 'Giriş'}</button>
      </form>
    </div>
  )
}
