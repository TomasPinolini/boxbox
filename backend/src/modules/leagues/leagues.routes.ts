// ROUTES — wiring entre URL paths y handlers.
//
// Orden de middlewares por ruta (Slice 3):
//   rateLimit (donde aplica) → requireAuth → validateParams → requireLeagueMember
//                              → requireLeagueOwner (si aplica) → validate(body) → controller
//
// Decisiones clave:
//   - rateLimit antes que requireAuth: corre primero para que un atacante sin token igual
//     no pueda golpear el endpoint masivamente. La key del limiter usa req.user si existe;
//     si no, IP. Defense in depth.
//   - validateParams ANTES de requireLeagueMember: el middleware necesita Number(req.params.id),
//     y validateParams coerciona + rechaza con 400 si :id no es int positive.
//   - validate(body) DESPUES de requireLeagueOwner en PATCH: queremos que un no-owner reciba
//     403 sin necesidad de mandar body valido. Si validate corriera antes, un no-owner con
//     body malo recibiria 400 (info leak menor).
//
// No hay DELETE /leagues/:id (decision Slice 2 — archivar via PATCH status='ARCHIVED').
//
// Slice 4: GET /:id/teams/me reusa exactamente la misma chain que GET /:id/members
// (requireAuth → validateParams → requireLeagueMember) — cualquier ACTIVE member puede leer
// su propio FantasyTeam.

import { Router } from 'express';
import * as leaguesController from './leagues.controller';
import draftRoutes from '../draft/draft.routes';
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

// ─── Rutas Slice 2 (actualizadas con middleware chain de Slice 3) ────

// requireAuth ANTES del limiter: el keyGenerator de rateLimit.ts lee req.user.userId, que
// solo existe despues de requireAuth. Al reves, la key caia siempre al fallback por IP y dos
// users en la misma red compartian contador (B3 / PER-18).
router.post(
  '/',
  requireAuth,
  leagueCreateLimiter,
  validate(createLeagueSchema),
  leaguesController.create,
);

router.get('/', requireAuth, leaguesController.list);

// ─── Ruta Slice 3 nueva: POST /leagues/join ──────────────────────────
// Atencion al ORDEN: /join va ANTES de /:id, porque Express matchea por orden.
// Si /:id fuera antes, "join" seria capturado como id="join" y validateParams lo rechazaria.

router.post(
  '/join',
  requireAuth,
  leagueJoinLimiter,
  validate(joinLeagueSchema),
  leaguesController.join,
);

// ─── Rutas /:id (Slice 2 con membership check + Slice 3 nuevas) ─────

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

// ─── Ruta Slice 4 nueva: GET /leagues/:id/teams/me ───────────────────

router.get(
  '/:id/teams/me',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  leaguesController.getMyFantasyTeam,
);

// ─── Sub-router Slice 5 nuevo: /leagues/:id/draft/* ──────────────────
// La chain comun (requireAuth + validateParams + requireLeagueMember) se aplica UNA vez
// aca; draft.routes.ts asume que ya corrio y solo agrega requireLeagueOwner donde hace falta.

router.use(
  '/:id/draft',
  requireAuth,
  validateParams(leagueIdParamSchema),
  requireLeagueMember,
  draftRoutes,
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
