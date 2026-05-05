import { Router } from 'express';
import * as leaguesController from './leagues.controller';

const router = Router();

router.get('/', leaguesController.getAll);
router.get('/:id', leaguesController.getLeagueById);
router.post('/', leaguesController.createLeague);
router.patch('/:id', leaguesController.updateLeague);
router.delete('/:id', leaguesController.deleteLeague);

export default router;
