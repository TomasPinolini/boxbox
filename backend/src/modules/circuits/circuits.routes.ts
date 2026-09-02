import { Router } from 'express';
import * as circuitsController from './circuits.controller';
import { validate, validateParams } from '../../middleware/validate';
import { idParamSchema } from '../../shared/params';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { createCircuitSchema, updateCircuitSchema } from './circuits.schema';

const router = Router();

router.get('/', circuitsController.getAll);
router.get('/:id', validateParams(idParamSchema), circuitsController.getById);
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createCircuitSchema),
  circuitsController.create,
);
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  validate(updateCircuitSchema),
  circuitsController.update,
);
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  circuitsController.remove,
);

export default router;
