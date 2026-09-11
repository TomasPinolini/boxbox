import { Router } from 'express';
import * as racesController from './races.controller';
import * as standingsController from '../standings/standings.controller';
import { validate, validateParams } from '../../middleware/validate';
import { idParamSchema } from '../../shared/params';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { createRaceSchema, updateRaceSchema, loadRaceResultsSchema } from './races.schema';

const router = Router();

router.get('/', racesController.getAll);
router.get('/:id', validateParams(idParamSchema), racesController.getById);
router.post('/', requireAuth, requireAdmin, validate(createRaceSchema), racesController.create);
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  validate(updateRaceSchema),
  racesController.update,
);
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  racesController.remove,
);

// Slice 7 — RaceResult
router.get('/:id/results', validateParams(idParamSchema), racesController.getResults);
router.post(
  '/:id/results',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  validate(loadRaceResultsSchema),
  racesController.loadResults,
);

// Slice 9 — recalcula los LeagueStanding de esta carrera para todas las ligas activas de su
// temporada. La logica vive en el modulo standings (es scoring, no races), pero la ruta cuelga
// de aca porque es race-scoped y admin-only, igual que la carga de resultados.
router.post(
  '/:id/recalculate',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  standingsController.recalculate,
);

export default router;
