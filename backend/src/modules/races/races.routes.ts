import { Router } from 'express';
import * as racesController from './races.controller';
import * as standingsController from '../standings/standings.controller';
import { validate, validateParams, validateQuery } from '../../middleware/validate';
import { idParamSchema } from '../../shared/params';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import {
  createRaceSchema,
  updateRaceSchema,
  loadRaceResultsSchema,
  listRacesQuerySchema,
} from './races.schema';

const router = Router();

router.get('/', validateQuery(listRacesQuerySchema), racesController.getAll);
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

router.get('/:id/results', validateParams(idParamSchema), racesController.getResults);
router.post(
  '/:id/results',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  validate(loadRaceResultsSchema),
  racesController.loadResults,
);

// La logica es de standings (scoring), pero la ruta es race-scoped y admin-only como la carga.
router.post(
  '/:id/recalculate',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  standingsController.recalculate,
);

export default router;
