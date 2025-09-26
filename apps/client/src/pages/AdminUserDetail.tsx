import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { adminApi } from '../api/admin'
import ConfirmModal from './components/ConfirmModal'

type User = { _id: string; displayName: string; email: string; role: string; level: string; createdAt: string }

export default function AdminUserDetail() {
  const { id } = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [postCount, setPostCount] = useState<number>(0)
  const [wins, setWins] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await adminApi.get(`/users/${id}/detail`)
        setUser(res.data.user)
        setPostCount(res.data.stats.postCount)
        setWins(res.data.stats.wins)
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Yüklenemedi')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!user) return <div>Bulunamadı</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Kullanıcı Detayı</h2>
          <div className="text-sm text-neutral-600">{user.email}</div>
        </div>
        <button onClick={() => setConfirmDelete(true)} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Kullanıcıyı Sil</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-neutral-600">Ad Soyad</div>
          <div className="text-lg font-medium">{user.displayName}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-neutral-600">Rol • Seviye</div>
          <div className="text-lg font-medium">{user.role} • {user.level}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-neutral-600">Kayıt Tarihi</div>
          <div className="text-lg font-medium">{new Date(user.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-6 text-center">
          <div className="text-sm text-neutral-600">Yazı Sayısı</div>
          <div className="text-3xl font-semibold">{postCount}</div>
        </div>
        <div className="rounded border bg-white p-6 text-center">
          <div className="text-sm text-neutral-600">Kazanılan Eşleşme</div>
          <div className="text-3xl font-semibold">{wins}</div>
        </div>
      </div>
      <ConfirmModal
        open={confirmDelete}
        title="Kullanıcıyı Sil"
        description="Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="Vazgeç"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => { await adminApi.delete(`/users/${user._id}`); setConfirmDelete(false); window.history.back(); }}
      />
    </div>
  )
}


