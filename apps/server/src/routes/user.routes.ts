import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { adminGuard } from '../middleware/adminGuard';
import { User } from '../models/User';
import { recomputeLevels } from '../controllers/user.controller';
import { Post } from '../models/Post';
import { Match } from '../models/Match';

const router = Router();

// Admin: kullanıcı rol/level güncelle
router.put('/:id', authGuard, adminGuard, async (req, res) => {
  const { role, level } = req.body as { role?: 'user' | 'admin'; level?: 'Çaylak' | 'Köşe Yazarı' | 'Usta Kalem' };
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  // Admin kullanıcıların rolü değiştirilemez; sadece user rolüne sahip kullanıcıların rolü yönetilir
  if (typeof role !== 'undefined') {
    if (target.role === 'admin') {
      return res.status(400).json({ error: 'Admin rolü değiştirilemez' });
    }
    target.role = role;
  }
  if (typeof level !== 'undefined') {
    if (target.role === 'admin') {
      return res.status(400).json({ error: 'Admin seviyesi değiştirilemez' });
    }
    target.level = level;
  }
  await target.save();
  return res.json({ user: await User.findById(target._id).select('email displayName role level') });
});

// Admin: kullanıcı listesi (basit)
router.get('/', authGuard, adminGuard, async (_req, res) => {
  const users = await User.find().select('email displayName role level createdAt');
  return res.json(users);
});

// Admin: kullanıcı detay
router.get('/:id/detail', authGuard, adminGuard, async (req, res) => {
  const user = await User.findById(req.params.id).select('email displayName role level createdAt');
  if (!user) return res.status(404).json({ error: 'Not found' });
  const [postCount, posts] = await Promise.all([
    Post.countDocuments({ authorId: user._id }),
    Post.find({ authorId: user._id }).select('_id'),
  ]);
  const wins = await Match.countDocuments({ winnerId: { $in: posts.map(p => p._id) } });
  return res.json({ user, stats: { postCount, wins } });
});

// Admin: kullanıcı sil
router.delete('/:id', authGuard, adminGuard, async (req, res) => {
  const u = await User.findByIdAndDelete(req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  return res.status(204).send();
});

export default router;

// Admin: tüm kullanıcıların seviyesini yeniden hesapla
router.post('/recompute-levels', authGuard, adminGuard, recomputeLevels);


