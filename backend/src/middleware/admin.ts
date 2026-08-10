// ADMIN MIDDLEWARE — gate global de autorizacion por rol.
//
// Cadena tipica para una ruta admin-only:
//   requireAuth → requireAdmin → handler
//
// Diseño: no hace query a la DB. Lee `req.user.role` que ya viene del JWT
// (payload firmado en signAccessToken con role: 'USER' | 'ADMIN'). El JWT
// esta validado shape-wise por el Zod schema en shared/jwt.ts, asi que si
// llegamos aca sabemos que role existe y es uno de los dos valores.
//
// Vs requireLeagueOwner: aquel es scoped al recurso (owner de ESTA liga),
// esto es un rol global del sistema. Un ADMIN puede tocar cualquier recurso
// admin-only sin importar de qué liga sea member.
//
// Nota sobre staleness: el role vive en el JWT hasta que expira (~15 min).
// Si un ADMIN es demoteado en DB, sigue teniendo acceso hasta que su token
// caduque. El refresh flow re-lee el role de DB (auth.service.ts:106), asi
// que el proximo access token ya refleja el cambio. Para forzar downgrade
// inmediato haria falta revocation server-side — es la deuda P3 documentada
// en auth.service.ts.

import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    // requireAuth corrio antes y puso req.user. El `!` es seguro porque la
    // cadena garantiza el orden — sin requireAuth nunca llegaria aca.
    const role = req.user!.role;

    if (role !== 'ADMIN') {
      throw new ForbiddenError('Admin access required', 'ADMIN_REQUIRED');
    }

    next();
  } catch (err) {
    next(err);
  }
}
