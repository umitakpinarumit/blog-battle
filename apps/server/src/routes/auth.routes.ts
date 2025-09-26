import { Router } from 'express';
import { login, me, register, updateMe } from '../controllers/auth.controller';
import { sseService } from '../services/sse.service';
import { verifyJwt } from '../utils/jwt';
import { authGuard } from '../middleware/authGuard';
import { adminGuard } from '../middleware/adminGuard';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authGuard, me);
router.get('/me/admin', authGuard, adminGuard, me);
router.put('/me', authGuard, updateMe);
// Kullanıcı bildirim SSE kanalı
router.get('/me/stream', (req, res) => {
  try {
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyJwt(authHeader.substring('Bearer '.length));
      userId = payload.sub;
    } else if (typeof req.query.token === 'string') {
      const payload = verifyJwt(req.query.token as string);
      userId = payload.sub;
    }
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    sseService.addUserClient(userId, res);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

export default router;


