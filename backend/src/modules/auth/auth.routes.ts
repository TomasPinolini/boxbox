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

// Refresh + logout NO usan requireAuth (eso requiere access token en header).
// Refresh autentica via la cookie del refresh token; logout siempre limpia la cookie aunque no la traiga.
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
