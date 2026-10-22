// Un no-miembro recibe 404 y no 403: distinguir "existe pero no es tuya" permite enumerar
// IDs de ligas.

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../shared/prisma';
import { NotFoundError, ForbiddenError } from '../shared/errors';

export async function requireLeagueMember(req: Request, _res: Response, next: NextFunction) {
  const leagueId = Number(req.params.id);
  const userId = req.user!.userId;

  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
  });

  // LEFT/KICKED conservan su fila por historial, pero responden igual que "nunca fue miembro".
  if (!member || member.status !== 'ACTIVE') {
    throw new NotFoundError('League');
  }

  req.leagueMember = member;
  next();
}

// Va despues de requireLeagueMember y reusa req.leagueMember. Aca 403 no filtra nada:
// un miembro ya sabe que la liga existe.
export function requireLeagueOwner(req: Request, _res: Response, next: NextFunction) {
  if (!req.leagueMember || !req.leagueMember.isOwner) {
    return next(new ForbiddenError('You are not the owner of this league', 'NOT_LEAGUE_OWNER'));
  }
  next();
}
