import { Router } from 'express';
import * as seasonsController from './seasons.controller';
import { validate, validateParams } from '../../middleware/validate';
import { idParamSchema } from '../../shared/params';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { createSeasonSchema, updateSeasonSchema } from './seasons.schema';

const router = Router();

router.get('/', seasonsController.getAll);
router.get('/active', seasonsController.getActive);
router.post('/', requireAuth, requireAdmin, validate(createSeasonSchema), seasonsController.create);
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  validate(updateSeasonSchema),
  seasonsController.update,
);
router.patch(
  '/:id/activate',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  seasonsController.activate,
);
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  seasonsController.remove,
);

export default router;
