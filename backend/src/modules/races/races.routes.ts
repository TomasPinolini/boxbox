import { Router } from 'express';
import * as racesController from './races.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { createRaceSchema, updateRaceSchema, loadRaceResultsSchema } from './races.schema';

const router = Router();

router.get('/', racesController.getAll);
router.get('/:id', racesController.getById);
router.post('/', requireAuth, requireAdmin, validate(createRaceSchema), racesController.create);
router.patch('/:id', requireAuth, requireAdmin, validate(updateRaceSchema), racesController.update);
router.delete('/:id', requireAuth, requireAdmin, racesController.remove);

// Slice 7 — RaceResult
router.get('/:id/results', racesController.getResults);
router.post(
  '/:id/results',
  requireAuth,
  requireAdmin,
  validate(loadRaceResultsSchema),
  racesController.loadResults,
);

export default router;
