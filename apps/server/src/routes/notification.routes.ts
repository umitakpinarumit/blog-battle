import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { Notification } from '../models/Notification';

const router = Router();

router.get('/', authGuard, async (req, res) => {
  const items = await Notification.find({ userId: req.user!.sub }).sort({ createdAt: -1 }).limit(100);
  return res.json(items);
});

router.put('/:id/read', authGuard, async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.sub }, { read: true }, { new: true });
  if (!n) return res.status(404).json({ error: 'Not found' });
  return res.json(n);
});

export default router;


