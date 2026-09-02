import { Router } from 'express';
import * as constructorsController from './constructors.controller';
import { validate, validateParams } from '../../middleware/validate';
import { idParamSchema } from '../../shared/params';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { createConstructorSchema, updateConstructorSchema } from './constructors.schema';

const router = Router();

router.get('/', constructorsController.getAll);
router.get('/:id', validateParams(idParamSchema), constructorsController.getById);
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
  validateParams(idParamSchema),
  validate(updateConstructorSchema),
  constructorsController.update,
);
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  constructorsController.remove,
);

export default router;
