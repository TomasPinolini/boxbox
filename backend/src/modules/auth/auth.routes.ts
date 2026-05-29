// ROUTES — el portero del módulo auth.
// Mapea las URLs públicas a sus controllers y aplica validate() para chequear el body.

import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { registerSchema, loginSchema } from './auth.schema';

const router = Router();

// Publicos — sin requireAuth. validate() chequea el body antes del controller.
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protegido — requireAuth corre primero. Si falla → 401 TOKEN_MISSING o TOKEN_INVALID.
// Si pasa → req.user esta seteado y el controller lo usa para fetch.
router.get('/me', requireAuth, authController.getMe);

export default router;
