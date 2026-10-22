import type { TokenPayload } from '../shared/jwt';
import type { LeagueMember } from '../generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;

      leagueMember?: LeagueMember;

      // En Express 5 `req.query` es un getter sin setter: asignarle tira TypeError en runtime
      // (tsc no lo ve), por eso validateQuery deja el resultado aca. Cada controller lo castea.
      validatedQuery?: unknown;
    }
  }
}

export {};
