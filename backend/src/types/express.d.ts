// Express type augmentation — extiende el tipo Request global para que TS sepa que existen
// los campos custom que enganchan nuestros middlewares.
//   - req.user        ← engancha requireAuth (src/middleware/auth.ts)
//   - req.leagueMember ← engancha requireLeagueMember (src/middleware/leagueMembership.ts)
// Sin este archivo, esos campos serian `any` o un error de tipo en cada controller protegido.

import type { TokenPayload } from '../shared/jwt';
import type { LeagueMember } from '../generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      // Optional porque solo aparece en endpoints que pasaron por requireAuth.
      // En endpoints publicos (register, login) sigue siendo undefined.
      user?: TokenPayload;

      // Optional porque solo aparece en endpoints que pasaron por requireLeagueMember.
      // El middleware lo popula con el row entero del LeagueMember del par (leagueId, userId).
      // requireLeagueOwner lee req.leagueMember.isOwner para decidir si pasa o tira 403.
      leagueMember?: LeagueMember;
    }
  }
}

// File debe ser un modulo (tener al menos un import/export) para que `declare global` funcione.
export {};
