// LEAGUE MEMBERSHIP MIDDLEWARES — gates de autorizacion scoped al recurso.
//
// Cadena tipica para una ruta protegida con owner-only:
//   requireAuth → validateParams(leagueIdParamSchema) → requireLeagueMember → requireLeagueOwner → handler
//
// Por que dos middlewares separados:
//   - requireLeagueMember chequea la condicion mas debil (soy member) y la usa la mayoria
//     de las rutas (GET, leave, members). El fetch del DB queda en una sola query.
//   - requireLeagueOwner SOLO chequea isOwner del leagueMember ya en memoria — no hace
//     query nueva, se monta encima del primero. Solo se aplica donde se requiere owner
//     (PATCH, DELETE kick).
//
// P2-1 unification (security finding de Slice 2):
//   Cuando un user no tiene relacion con la liga referenced en :id, devolvemos 404
//   LEAGUE_NOT_FOUND, NO 403. Distinguir "existe pero no es tuya" leakea informacion
//   sobre que IDs existen (Mallory enumera). 403 solo aplica al caso "sos member pero
//   la ruta exige owner" — ahi 403 NO leakea porque vos ya sabias que la liga existe.

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../shared/prisma';
import { NotFoundError, ForbiddenError } from '../shared/errors';

export async function requireLeagueMember(req: Request, _res: Response, next: NextFunction) {
  try {
    // validateParams corrio antes y coercio :id a number. Lo extraemos del params.
    const leagueId = Number(req.params.id);
    // requireAuth corrio antes y puso req.user. El `!` es seguro porque la cadena
    // garantiza el orden; sin requireAuth nunca llegaria aca.
    const userId = req.user!.userId;

    // Lookup por composite unique. Prisma genera el input `leagueId_userId` para uniques compuestas.
    const member = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    });

    // Solo ACTIVE cuenta como "miembro" para autorizacion. LEFT/KICKED tienen row en DB
    // (preservamos historial) pero no autorizan accesos. Para el atacante son
    // indistinguibles de "nunca fue miembro" — eso es deseado, no leakeamos history.
    if (!member || member.status !== 'ACTIVE') {
      throw new NotFoundError('League');
    }

    // Attachea al request. El typing viene de src/types/express.d.ts (declaration merging).
    req.leagueMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

// requireLeagueOwner: NO hace fetch — depende de que requireLeagueMember ya corrio
// y dejo req.leagueMember poblado. Si el orden de middlewares esta mal, el !req.leagueMember
// tira 403 generico — defensa secundaria.
//
// Por que tiramos 403 aqui (no 404): el user es ACTIVE member, asi que ya sabe que
// la liga existe. Decirle "no sos owner" no leakea info nueva.
export function requireLeagueOwner(req: Request, _res: Response, next: NextFunction) {
  if (!req.leagueMember || !req.leagueMember.isOwner) {
    return next(new ForbiddenError('You are not the owner of this league', 'NOT_LEAGUE_OWNER'));
  }
  next();
}
