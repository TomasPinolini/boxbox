// Se monta desde leagues.routes.ts, que ya aplica requireAuth y requireLeagueMember a todo.

import { Router } from 'express';
import * as draftController from './draft.controller';
import { validate } from '../../middleware/validate';
import { requireLeagueOwner } from '../../middleware/leagueMembership';
import { draftPickSchema } from './draft.schema';

const router = Router();

router.post('/start', requireLeagueOwner, draftController.start);
router.get('/state', draftController.getState);
router.get('/available', draftController.getAvailable);
router.post('/pick', validate(draftPickSchema), draftController.pick);
router.post('/reset', requireLeagueOwner, draftController.reset);

export default router;
