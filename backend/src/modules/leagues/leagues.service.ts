// SERVICE — toda la logica de leagues vive aca.
// No sabe que existe HTTP: nunca toca req/res/next. Recibe datos parsed (post Zod) y userId
// extraido del JWT por el controller. Comunica errores tirando AppError subclasses; el
// controller los pasa al errorHandler.
//
// Ownership: getById y update chequean explicitamente que league.createdById === userId.
// Si no, ForbiddenError → 403. Slice 3 va a expandir a 'owner OR member' cuando exista
// LeagueMember; mientras tanto, solo el creador puede leer/mutar.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { NotFoundError, ConflictError, ForbiddenError } from '../../shared/errors';
import type { CreateLeagueInput, UpdateLeagueInput } from './leagues.schema';

// leagueSelect — campos que devolvemos al cliente. Patron consistente con userSelect en auth.
// No hay campos sensibles en League hoy, pero usamos select de todas formas para tener
// control explicito sobre el shape de la response.
const leagueSelect = {
  id: true,
  name: true,
  inviteCode: true,
  maxMembers: true,
  seasonId: true,
  createdById: true,
  draftStatus: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createLeague(data: CreateLeagueInput, userId: number) {
  // userId viene del JWT validado por requireAuth — el cliente NO puede injectarlo via body.
  // maxMembers ?? 11: si el cliente omitio el campo, Prisma usa el default del schema (11).
  try {
    const league = await prisma.league.create({
      data: {
        name: data.name,
        inviteCode: data.inviteCode,
        seasonId: data.seasonId,
        maxMembers: data.maxMembers ?? 11,
        createdById: userId,
      },
      select: leagueSelect,
    });
    return league;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 — unique constraint violation. El unico campo @unique en League es inviteCode.
      if (err.code === 'P2002') {
        throw new ConflictError(
          'A league with this invite code already exists',
          'INVITE_CODE_TAKEN',
        );
      }
      // P2003 — FK violation. En create, los FK son seasonId y createdById.
      // createdById viene del JWT validado → no deberia fallar. Si falla, es seasonId.
      // (Edge case raro: user borrado entre login y create. P3 documentado en plan.)
      if (err.code === 'P2003') {
        throw new NotFoundError('Season');
      }
    }
    throw err;
  }
}

export async function listLeagues(userId: number) {
  // Decision Slice 2: GET solo devuelve las ligas creadas por el user actual.
  // Slice 3 va a expandir esto a 'owner OR member' cuando exista LeagueMember.
  return prisma.league.findMany({
    where: { createdById: userId },
    select: leagueSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getLeagueById(id: number, userId: number) {
  const league = await prisma.league.findUnique({
    where: { id },
    select: leagueSelect,
  });
  if (!league) {
    throw new NotFoundError('League');
  }
  // Ownership check. Si el cliente conoce un id valido pero no es suyo, 403.
  // No confundimos con 404: queremos que el cliente SEPA que existe pero no es suyo
  // (el JWT prueba identidad, este check prueba autorizacion sobre el recurso).
  if (league.createdById !== userId) {
    throw new ForbiddenError('You do not own this league', 'NOT_LEAGUE_OWNER');
  }
  return league;
}

export async function updateLeague(id: number, data: UpdateLeagueInput, userId: number) {
  // Fetch sin select para tener createdById en memoria → ownership check.
  // No podemos hacer `update where: {id, createdById: userId}` porque eso devuelve P2025
  // (record not found) tanto si el id no existe como si existe pero no es nuestro — se
  // pierde la distincion 404 vs 403.
  const existing = await prisma.league.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('League');
  }
  if (existing.createdById !== userId) {
    throw new ForbiddenError('You do not own this league', 'NOT_LEAGUE_OWNER');
  }

  try {
    const updated = await prisma.league.update({
      where: { id },
      data,
      select: leagueSelect,
    });
    return updated;
  } catch (err) {
    // PATCH puede chocar contra unique de inviteCode si el cliente lo cambia a uno ya tomado.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError(
        'A league with this invite code already exists',
        'INVITE_CODE_TAKEN',
      );
    }
    throw err;
  }
}
