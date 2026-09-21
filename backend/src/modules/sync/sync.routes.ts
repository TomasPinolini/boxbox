// ROUTES — montado en app.ts bajo /api/v1/admin/sync. Todo el modulo es admin-only, por eso
// la cadena requireAuth → requireAdmin va una sola vez, a nivel router.

import { Router } from 'express';
import * as syncController from './sync.controller';
import { validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { idParamSchema } from '../../shared/params';
import { syncRacesQuerySchema, syncResultsQuerySchema } from './sync.schema';

const router = Router();

router.use(requireAuth, requireAdmin);

// 12b — calendario: upsert de Circuit por externalId y de Race por (seasonId, round).
router.post('/races', validateQuery(syncRacesQuerySchema), syncController.syncRaces);

// 12c — resultados de UNA carrera. ?dryRun=true devuelve el mapeo sin escribir resultados
// (es lo que usa la vista previa de /admin/results).
router.post(
  '/races/:id/results',
  validateParams(idParamSchema),
  validateQuery(syncResultsQuerySchema),
  syncController.syncResults,
);

export default router;
