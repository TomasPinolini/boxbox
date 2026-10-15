// ROUTES — el portero del módulo auth.
// Mapea las URLs públicas a sus controllers y aplica validate() para chequear el body.

import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { registerSchema, loginSchema } from './auth.schema';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimit';

const router = Router();

// Publicos — sin requireAuth. El limiter va PRIMERO: no hay usuario al que atribuir el
// request, asi que la key es la IP y no depende de nada que corra despues. validate()
// chequea el body antes del controller.
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// Protegido — requireAuth corre primero. Si falla → 401 TOKEN_MISSING o TOKEN_INVALID.
// Si pasa → req.user esta seteado y el controller lo usa para fetch.
router.get('/me', requireAuth, authController.getMe);

// Refresh + logout NO usan requireAuth (eso requiere access token en header).
// Refresh autentica via la cookie del refresh token; logout siempre limpia la cookie aunque no la traiga.
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
