import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { adminGuard } from '../middleware/adminGuard';
import { Category } from '../models/Category';
import { Post } from '../models/Post';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';

const router = Router();

router.get('/', async (_req, res) => {
  const cats = await Category.find().sort({ name: 1 });
  return res.json(cats);
});

router.post('/', authGuard, adminGuard, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Geçersiz kategori adı' });
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  const exists = await Category.findOne({ $or: [{ name }, { slug }] });
  if (exists) return res.status(409).json({ error: 'Kategori zaten var' });
  const c = await Category.create({ name: name.trim(), slug });
  // Auto create tournament for this category (draft if participants < 2)
  try {
    const posts = await Post.find({ category: c.name }).select('_id');
    const participants = posts.map(p => String(p._id));
    if (participants.length >= 2) {
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const pairs: [string, string][] = [];
      for (let i = 0; i < shuffled.length; i += 2) if (shuffled[i+1]) pairs.push([shuffled[i], shuffled[i+1]]);
      const round1: string[] = [];
      for (const [a,b] of pairs) {
        const m = await Match.create({ postAId: a, postBId: b, category: c.name, round: 1, status: 'ongoing' });
        round1.push(String(m._id));
      }
      if (shuffled.length % 2 === 1) {
        const last = shuffled[shuffled.length-1];
        const bye = await Match.create({ postAId: last, postBId: last, category: c.name, round: 1, status: 'finished', winnerId: last as any });
        round1.push(String(bye._id));
      }
      await Tournament.create({ name: `${c.name} Turnuvası`, category: c.name, participants, rounds: [round1], currentRound: 1, status: 'ongoing', currentRoundStartedAt: new Date(), progressionMode: 'participation', threshold: 50 });
    } else {
      await Tournament.create({ name: `${c.name} Turnuvası`, category: c.name, participants, rounds: [], currentRound: 0, status: 'draft', progressionMode: 'participation', threshold: 50 });
    }
  } catch {}
  return res.status(201).json(c);
});

router.put('/:id', authGuard, adminGuard, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Geçersiz kategori adı' });
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  const exists = await Category.findOne({ slug, _id: { $ne: req.params.id } });
  if (exists) return res.status(409).json({ error: 'Kategori zaten var' });
  const cat = await Category.findByIdAndUpdate(req.params.id, { name: name.trim(), slug }, { new: true });
  if (!cat) return res.status(404).json({ error: 'Not found' });
  return res.json(cat);
});

router.delete('/:id', authGuard, adminGuard, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  return res.status(204).send();
});

export default router;


