import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../app/hooks';
import { api } from '../api/client';
import { setToken } from '../features/auth/authSlice';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.post('/auth/register', { email, password, displayName });
      dispatch(setToken(data.token));
      navigate('/profile');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Kayıt başarısız');
    }
  }

  return (
    <div className="min-h-[70vh] grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div className="hidden md:block rounded-2xl border bg-gradient-to-br from-emerald-50 to-blue-50 p-10">
        <div className="h-10 w-10 rounded bg-emerald-600 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Aramıza Katıl</h2>
        <p className="text-neutral-600">Yazılarını paylaş ve topluluktan geri bildirim al.</p>
        <ul className="mt-6 space-y-2 text-sm text-neutral-700 list-disc list-inside">
          <li>Kolay gönderi oluşturma</li>
          <li>Gerçek zamanlı oylama</li>
          <li>Mobil uyumlu deneyim</li>
        </ul>
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Kayıt Ol</h2>
          <p className="text-sm text-neutral-600 mb-4">Hemen ücretsiz bir hesap oluştur.</p>
          {error && <div className="text-red-600 mb-3 text-sm">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-neutral-700">Ad Soyad</label>
              <input className="w-full border rounded px-3 py-2" placeholder="Adınız Soyadınız" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-neutral-700">E-posta</label>
              <input className="w-full border rounded px-3 py-2" placeholder="ornek@mail.com" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-neutral-700">Şifre</label>
              <input className="w-full border rounded px-3 py-2" placeholder="En az 6 karakter" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <button className="w-full rounded bg-emerald-600 text-white py-2 hover:bg-emerald-700 transition">Kayıt Ol</button>
          </form>
          <div className="mt-4 text-sm text-neutral-700">
            Zaten hesabın var mı? <Link to="/login" className="text-blue-700 hover:underline">Giriş Yap</Link>
          </div>
        </div>
      </div>
    </div>
  );
}


