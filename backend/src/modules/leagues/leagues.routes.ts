// validate(body) va despues de requireLeagueOwner: un no-owner recibe 403 aunque mande un
// body invalido. No hay DELETE /leagues/:id: se archiva con PATCH status='ARCHIVED'.

import { Router } from 'express';
import * as leaguesController from './leagues.controller';
import draftRoutes from '../draft/draft.routes';
import standingsRoutes from '../standings/standings.routes';
import { validate, validateParams } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireLeagueMember, requireLeagueOwner } from '../../middleware/leagueMembership';
import { leagueCreateLimiter, leagueJoinLimiter } from '../../middleware/rateLimit';
import {
  createLeagueSchema,
  updateLeagueSchema,
  joinLeagueSchema,
  leagueIdParamSchema,
  memberKickParamSchema,
} from './leagues.schema';

const router = Router();

// requireAuth antes del limiter: su key es req.user.userId; sin eso cae a la IP y dos
// usuarios en la misma red comparten contador.
router.post(
  '/',
  requireAuth,
  leagueCreateLimiter,
  validate(createLeagueSchema),
  leaguesController.create,
);

router.get('/', requireAuth, leaguesController.list);

// /join va antes de /:id: si no, Express lo toma como id="join" y validateParams da 400.
router.post(
  '/join',
  requireAuth,
  leagueJoinLimiter,
  validate(joinLeagueSchema),
  leaguesController.join,
);

router.get(
  '/:id',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  leaguesController.getById,
);

router.patch(
  '/:id',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  requireLeagueOwner,
  validate(updateLeagueSchema),
  leaguesController.update,
);

router.post(
  '/:id/leave',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  leaguesController.leave,
);

router.get(
  '/:id/members',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  leaguesController.listMembers,
);

router.get(
  '/:id/teams/me',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  leaguesController.getMyFantasyTeam,
);

// La cadena comun corre una sola vez aca; draft.routes.ts y standings.routes.ts asumen
// req.leagueMember poblado.
router.use(
  '/:id/draft',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  draftRoutes,
);

router.use(
  '/:id/standings',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  standingsRoutes,
);

router.delete(
  '/:id/members/:userId',
  requireAuth,
  validateParams(memberKickParamSchema),
  requireLeagueMember,
  requireLeagueOwner,
  leaguesController.kickMember,
);

export default router;
