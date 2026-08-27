import { Router } from 'express';
import * as circuitsController from './circuits.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { createCircuitSchema, updateCircuitSchema } from './circuits.schema';

const router = Router();

router.get('/', circuitsController.getAll);
router.get('/:id', circuitsController.getById);
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
  validate(updateCircuitSchema),
  circuitsController.update,
);
router.delete('/:id', requireAuth, requireAdmin, circuitsController.remove);

export default router;
