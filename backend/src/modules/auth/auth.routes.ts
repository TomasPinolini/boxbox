// ROUTES — el portero del módulo auth.
// Mapea las URLs públicas a sus controllers y aplica validate() para chequear el body.

import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from './auth.schema';

const router = Router();

// Ambos endpoints son públicos (sin auth middleware — eso viene en Slice 1b).
// El validate() corre primero: si el body falla schema, cortamos con 400 antes del controller.
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

export default router;
