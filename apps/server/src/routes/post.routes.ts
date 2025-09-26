import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { upload } from '../middleware/upload';
import { createPost, deletePost, getPost, listPosts, updatePost } from '../controllers/post.controller';
import { Post } from '../models/Post';

const router = Router();

router.get('/', listPosts);
router.get('/:id', getPost);
router.post('/', authGuard, upload.single('image'), createPost);
router.put('/:id', authGuard, upload.single('image'), updatePost);
router.delete('/:id', authGuard, deletePost);

// Benzer yazılar: aynı kategori, yüksek etkileşim
router.get('/:id/related', async (req, res) => {
  const base = await Post.findById(req.params.id);
  if (!base) return res.status(404).json({ error: 'Not found' });
  const items = await Post.find({ _id: { $ne: base._id }, category: base.category })
    .sort({ engagementScore: -1, createdAt: -1 })
    .limit(6)
    .select('title imageUrl engagementScore createdAt category');
  return res.json(items);
});

export default router;


