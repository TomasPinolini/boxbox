// Express type augmentation — extiende el tipo Request global para que TS sepa que existen
// los campos custom que enganchan nuestros middlewares.
//   - req.user           ← engancha requireAuth (src/middleware/auth.ts)
//   - req.leagueMember   ← engancha requireLeagueMember (src/middleware/leagueMembership.ts)
//   - req.validatedQuery ← engancha validateQuery (src/middleware/validate.ts)
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

      // Optional porque solo aparece en endpoints que pasaron por validateQuery.
      // Es `unknown` a proposito: el controller lo castea al tipo inferido de SU schema.
      // No existe un tipo comun — cada endpoint valida su propio set de query params.
      //
      // Por que no reemplazamos req.query directo, como hacen validate/validateParams con
      // body/params: en Express 5 `req.query` es un getter del prototipo SIN setter
      // (verificado en 5.2.1: { get: fn, set: undefined }). Con "strict": true el codigo
      // emitido corre en modo estricto, asi que asignarle tira TypeError en runtime — un 500
      // en cada request, y tsc no lo detecta. req.params y req.body si son propiedades
      // propias del objeto, por eso aquellos dos middlewares pueden reasignar sin problema.
      validatedQuery?: unknown;
    }
  }
}

// File debe ser un modulo (tener al menos un import/export) para que `declare global` funcione.
export {};
