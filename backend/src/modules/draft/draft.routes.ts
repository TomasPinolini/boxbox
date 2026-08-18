// ROUTES — a diferencia de los demas modulos, este router NO se registra en app.ts.
// Draft es un sub-recurso de League (URLs /leagues/:id/draft/*), asi que se monta desde
// leagues.routes.ts via `router.use('/:id/draft', ...)`. La chain comun a TODAS las rutas de
// aca (requireAuth → validateParams(leagueIdParamSchema) → requireLeagueMember) se aplica
// UNA sola vez en ese mount point, no ruta por ruta — todas las rutas de este router
// requieren, como minimo, ser member de la liga. start/reset agregan requireLeagueOwner
// encima porque son owner-only.

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
