import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { registerSchema, loginSchema, updateProfileSchema, updateAvatarSchema } from './auth.schema';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimit';

const router = Router();

// El limiter va primero: sin usuario todavía, la key es la IP.
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

router.get('/me', requireAuth, authController.getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema), authController.updateProfile);
router.post('/me/avatar', requireAuth, validate(updateAvatarSchema), authController.updateAvatar);
router.delete('/me/avatar', requireAuth, authController.removeAvatar);

// Sin requireAuth: refresh se autentica con la cookie, y logout limpia la cookie aunque no la traiga.
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
