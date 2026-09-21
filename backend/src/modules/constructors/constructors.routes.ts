import { Router } from 'express';
import * as constructorsController from './constructors.controller';
import { validate, validateParams, validateQuery } from '../../middleware/validate';
import { idParamSchema } from '../../shared/params';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import {
  createConstructorSchema,
  standingsQuerySchema,
  updateConstructorSchema,
} from './constructors.schema';

const router = Router();

router.get('/', constructorsController.getAll);
// /standings va ANTES de /:id: si no, Express lo matchea como id.
router.get('/standings', validateQuery(standingsQuerySchema), constructorsController.getStandings);
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
