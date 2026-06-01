// ROUTES — el wire entre URL paths y handlers.
// Orden de middlewares por ruta: requireAuth → validate(schema) → controller.
//
// Por que requireAuth ANTES de validate:
//   Si validate corriera primero, un atacante sin token podria probar bodies y recibir
//   400 detallando el shape esperado — info leak. Con requireAuth primero, recibe 401
//   sin importar el body. Failsafe.
//
// No hay DELETE — archivado se hace via PATCH status='ARCHIVED' (decision Slice 2).

import { Router } from 'express';
import * as leaguesController from './leagues.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { createLeagueSchema, updateLeagueSchema } from './leagues.schema';

const router = Router();

router.post('/', requireAuth, validate(createLeagueSchema), leaguesController.create);
router.get('/', requireAuth, leaguesController.list);
router.get('/:id', requireAuth, leaguesController.getById);
router.patch('/:id', requireAuth, validate(updateLeagueSchema), leaguesController.update);

export default router;
