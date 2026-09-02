import { Router } from 'express';
import * as racesController from './races.controller';
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

export default router;
