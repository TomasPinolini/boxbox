import { Router } from 'express';
import * as syncController from './sync.controller';
import { validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { idParamSchema } from '../../shared/params';
import { syncRacesQuerySchema, syncResultsQuerySchema } from './sync.schema';

const router = Router();

// Todo el modulo es admin-only: la cadena va una sola vez, a nivel router.
router.use(requireAuth, requireAdmin);

router.post('/races', validateQuery(syncRacesQuerySchema), syncController.syncRaces);

// ?dryRun=true devuelve el mapeo sin escribir: es la vista previa de /admin/results.
router.post(
  '/races/:id/results',
  validateParams(idParamSchema),
  validateQuery(syncResultsQuerySchema),
  syncController.syncResults,
);

export default router;
