import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { adminGuard } from '../middleware/adminGuard';
import { createTournament, getTournament, progressTournament, listTournaments, cancelTournament, deleteTournament, progressTournamentPublic, rebuildTournament, resetTournament } from '../controllers/tournament.controller';

const router = Router();

router.post('/', authGuard, adminGuard, createTournament);
router.get('/', listTournaments);
router.get('/:id', getTournament);
router.post('/:id/progress', authGuard, adminGuard, progressTournament);
router.post('/:id/progress-public', progressTournamentPublic);
router.post('/rebuild', authGuard, adminGuard, rebuildTournament);
router.post('/:id/reset', authGuard, adminGuard, resetTournament);
router.post('/:id/cancel', authGuard, adminGuard, cancelTournament);
router.delete('/:id', authGuard, adminGuard, deleteTournament);

export default router;


