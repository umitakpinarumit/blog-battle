import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../app/hooks';
import { api } from '../api/client';
import { setToken } from '../features/auth/authSlice';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      dispatch(setToken(data.token));
      navigate('/profile');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Giriş başarısız');
    }
  }

  return (
    <div className="min-h-[70vh] grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div className="hidden md:block rounded-2xl border bg-gradient-to-br from-blue-50 to-purple-50 p-10">
        <div className="h-10 w-10 rounded bg-blue-600 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Blog Battle</h2>
        <p className="text-neutral-600">Yazılarını paylaş, eşleşmelerde yarış, anlık oylarla kazanan sen ol.</p>
        <ul className="mt-6 space-y-2 text-sm text-neutral-700 list-disc list-inside">
          <li>Gerçek zamanlı oy oranları</li>
          <li>Modern ve hızlı arayüz</li>
          <li>Türkçe deneyim</li>
        </ul>
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Giriş Yap</h2>
          <p className="text-sm text-neutral-600 mb-4">Hesabınıza erişin ve yazmaya devam edin.</p>
          {error && <div className="text-red-600 mb-3 text-sm">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-neutral-700">E-posta</label>
              <input className="w-full border rounded px-3 py-2" placeholder="ornek@mail.com" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-neutral-700">Şifre</label>
              <div className="relative">
                <input className="w-full border rounded px-3 py-2 pr-12" placeholder="Şifreniz" type={show ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} />
                <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-600 hover:text-neutral-800">{show ? 'Gizle' : 'Göster'}</button>
              </div>
            </div>
            <button className="w-full rounded bg-blue-600 text-white py-2 hover:bg-blue-700 transition">Giriş Yap</button>
          </form>
          <div className="mt-4 text-sm text-neutral-700">
            Hesabın yok mu? <Link to="/register" className="text-blue-700 hover:underline">Kayıt Ol</Link>
          </div>
        </div>
      </div>
    </div>
  );
}


