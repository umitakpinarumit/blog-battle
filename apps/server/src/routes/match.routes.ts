import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { adminGuard } from '../middleware/adminGuard';
import { createMatch, finishMatch, getMatch, listActiveMatches, streamMatch, listMatchesByPost } from '../controllers/match.controller';

const router = Router();

router.get('/active', listActiveMatches);
router.get('/:id', getMatch);
router.get('/:id/stream', streamMatch);
router.get('/by-post/:postId', listMatchesByPost);
router.post('/', authGuard, adminGuard, createMatch);
router.post('/:id/finish', authGuard, adminGuard, finishMatch);

export default router;


