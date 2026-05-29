// Express type augmentation — extiende el tipo Request global para que TS sepa que existe req.user.
// Esto lo engancha el middleware requireAuth en src/middleware/auth.ts.
// Sin este archivo, `req.user` seria `any` o un error de tipo en cada controller protegido.

import type { TokenPayload } from '../shared/jwt';

declare global {
  namespace Express {
    interface Request {
      // Optional porque solo aparece en endpoints que pasaron por requireAuth.
      // En endpoints publicos (register, login) sigue siendo undefined.
      user?: TokenPayload;
    }
  }
}

// File debe ser un modulo (tener al menos un import/export) para que `declare global` funcione.
export {};
