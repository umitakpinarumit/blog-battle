import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { adminGuard } from '../middleware/adminGuard';
import { castVote, listMyVotes, resetMyVotes, resetAllVotes, resetVotesByMatch, resetVotesByTournament } from '../controllers/vote.controller';

const router = Router();

router.post('/', authGuard, castVote);
router.get('/me', authGuard, listMyVotes);
router.post('/reset/me', authGuard, resetMyVotes);
router.post('/reset/all', authGuard, resetAllVotes);
router.post('/reset/match/:id', authGuard, adminGuard, resetVotesByMatch);
router.post('/reset/tournament/:id', authGuard, adminGuard, resetVotesByTournament);

export default router;


