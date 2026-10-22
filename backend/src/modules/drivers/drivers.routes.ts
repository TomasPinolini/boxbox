import { Router } from 'express';
import * as driversController from './drivers.controller';
import { validate, validateParams, validateQuery } from '../../middleware/validate';
import { idParamSchema } from '../../shared/params';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import {
  createDriverSchema,
  listDriversQuerySchema,
  standingsQuerySchema,
  updateDriverSchema,
} from './drivers.schema';

const router = Router();

router.get('/', validateQuery(listDriversQuerySchema), driversController.getAll);
// /standings va ANTES de /:id: si no, Express lo matchea como id y validateParams da 400.
router.get('/standings', validateQuery(standingsQuerySchema), driversController.getStandings);
router.get('/:id', validateParams(idParamSchema), driversController.getById);

router.post('/', requireAuth, requireAdmin, validate(createDriverSchema), driversController.create);
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  validate(updateDriverSchema),
  driversController.update,
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  driversController.remove,
);

export default router;
