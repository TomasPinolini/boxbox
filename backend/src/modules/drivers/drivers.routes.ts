// ROUTES — el portero del módulo
// Solo responsabilidad: mapear URLs a handlers y aplicar middleware.
// No tiene lógica de negocio ni sabe nada de la base de datos.

import { Router } from 'express';
import * as driversController from './drivers.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/admin';
import { createDriverSchema, updateDriverSchema } from './drivers.schema';

const router = Router();

// GET y DELETE no reciben body → no necesitan validación
router.get('/', driversController.getAll);
router.get('/:id', driversController.getById);

// POST y PATCH reciben body → validate() corre primero como middleware.
// Si el body no matchea el schema, validate() corta el request con 400
// y driversController.create nunca se llega a llamar.
router.post('/', requireAuth, requireAdmin, validate(createDriverSchema), driversController.create);
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updateDriverSchema),
  driversController.update,
);

router.delete('/:id', requireAuth, requireAdmin, driversController.remove);

export default router;
