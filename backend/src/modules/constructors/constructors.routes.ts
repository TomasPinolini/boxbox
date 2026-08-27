import { Router } from 'express';
import * as constructorsController from './constructors.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { createConstructorSchema, updateConstructorSchema } from './constructors.schema';

const router = Router();

router.get('/', constructorsController.getAll);
router.get('/:id', constructorsController.getById);
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createConstructorSchema),
  constructorsController.create,
);
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updateConstructorSchema),
  constructorsController.update,
);
router.delete('/:id', requireAuth, requireAdmin, constructorsController.remove);

export default router;
