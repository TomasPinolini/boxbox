// La autorizacion (miembro / owner) la resuelven los middlewares de leagueMembership.ts;
// este service asume que el caller ya paso por ellos.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { NotFoundError, ConflictError } from '../../shared/errors';
import type { CreateLeagueInput, UpdateLeagueInput } from './leagues.schema';

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

const memberSelect = {
  id: true,
  userId: true,
  isOwner: true,
  status: true,
  joinedAt: true,
  user: { select: { name: true, motto: true, avatarUrl: true } },
} as const;

// `as Prisma.FantasyTeamSelect` y no `as const` ni anotacion: la relacion `constructor`
// choca con Object.prototype.constructor y cualquier otra forma tira un TS2322 falso.
const fantasyTeamSelect = {
  id: true,
  leagueMemberId: true,
  driver1Id: true,
  driver2Id: true,
  constructorId: true,
  createdAt: true,
} as Prisma.FantasyTeamSelect;

// Cada miembro draftea 2 pilotos exclusivos por liga (ADR-0006): el tope es floor(pilotos / 2).
// Unica fuente de la formula; draft.service.ts la reusa en startDraft.
export function maxMembersForSeason(driverCount: number): number {
  return Math.floor(driverCount / 2);
}

// startDraft materializa el orden de picks para los miembros de ese momento: un join posterior
// queda sin turno y un leave/kick deja turnos huerfanos. COMPLETED tambien bloquea (equipo
// vacio toda la temporada). POST /draft/reset vuelve a PENDING y desbloquea.
function assertRosterOpen(draftStatus: string): void {
  if (draftStatus !== 'PENDING') {
    throw new ConflictError(
      'Members cannot join, leave or be kicked once the draft has started',
      'ROSTER_LOCKED',
    );
  }
}

export async function createLeague(data: CreateLeagueInput, userId: number) {
  const season = await prisma.season.findUnique({ where: { id: data.seasonId } });
  if (!season) {
    throw new NotFoundError('Season');
  }
  const cap = maxMembersForSeason(season.driverCount);
  if (data.maxMembers !== undefined && data.maxMembers > cap) {
    throw new ConflictError(
      `maxMembers cannot exceed ${cap} for this season (${season.driverCount} drivers / 2)`,
      'MAX_MEMBERS_EXCEEDS_SEASON',
    );
  }

  // Nested write: League + owner + FantasyTeam en una sola transaccion, para que nunca
  // exista una liga sin owner.
  try {
    const league = await prisma.league.create({
      data: {
        name: data.name,
        inviteCode: data.inviteCode,
        seasonId: data.seasonId,
        maxMembers: data.maxMembers ?? cap,
        createdById: userId,
        members: {
          create: {
            userId,
            isOwner: true,
            status: 'ACTIVE',
            fantasyTeam: { create: {} },
          },
        },
      },
      select: leagueSelect,
    });
    return league;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new ConflictError(
          'A league with this invite code already exists',
          'INVITE_CODE_TAKEN',
        );
      }
      if (err.code === 'P2003') {
        throw new NotFoundError('Season');
      }
    }
    throw err;
  }
}

export async function listLeagues(userId: number) {
  const leagues = await prisma.league.findMany({
    where: {
      // Dos status distintos: el de la membresia (sigo adentro) y el de la liga (sigue abierta).
      members: { some: { userId, status: 'ACTIVE' } },
      // Archivar es como el owner cierra una liga (ADR-0009): deja de aparecer en el listado.
      status: 'ACTIVE',
    },
    select: {
      ...leagueSelect,
      // El equipo del que pide, para que /leagues no haga una request por liga. Reusa
      // fantasyTeamSelect por la colision de `constructor`: un literal propio rompe tsc.
      members: {
        where: { userId, status: 'ACTIVE' as const },
        select: { fantasyTeam: { select: fantasyTeamSelect } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return leagues.map(({ members, ...league }) => ({
    ...league,
    myTeam: members[0]?.fantasyTeam ?? null,
  }));
}

export async function getLeagueById(id: number) {
  const league = await prisma.league.findUnique({ where: { id }, select: leagueSelect });
  if (!league) {
    throw new NotFoundError('League');
  }
  return league;
}

export async function updateLeague(id: number, data: UpdateLeagueInput) {
  if (data.maxMembers !== undefined) {
    const league = await prisma.league.findUnique({ where: { id }, include: { season: true } });
    if (!league) {
      throw new NotFoundError('League');
    }
    const cap = maxMembersForSeason(league.season.driverCount);
    if (data.maxMembers > cap) {
      throw new ConflictError(
        `maxMembers cannot exceed ${cap} for this season (${league.season.driverCount} drivers / 2)`,
        'MAX_MEMBERS_EXCEEDS_SEASON',
      );
    }
  }

  try {
    return await prisma.league.update({ where: { id }, data, select: leagueSelect });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError(
        'A league with this invite code already exists',
        'INVITE_CODE_TAKEN',
      );
    }
    throw err;
  }
}

// Decision consciente: tanto LEFT como KICKED pueden volver a unirse.
export async function joinLeague(inviteCode: string, userId: number) {
  const league = await prisma.league.findUnique({ where: { inviteCode } });
  if (!league || league.status !== 'ACTIVE') {
    // Archivada e inexistente dan el mismo error: no revelar que el codigo existe.
    // Con underscore para que el codigo salga 'INVITE_CODE_NOT_FOUND' y no con espacio.
throw new NotFoundError('Invite_code');
  }

  assertRosterOpen(league.draftStatus);

  const activeCount = await prisma.leagueMember.count({
    where: { leagueId: league.id, status: 'ACTIVE' },
  });
  if (activeCount >= league.maxMembers) {
    throw new ConflictError('League is at capacity', 'LEAGUE_FULL');
  }

  const existing = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId } },
  });
  if (existing && existing.status === 'ACTIVE') {
    throw new ConflictError('You are already a member of this league', 'ALREADY_MEMBER');
  }

  // El branch `update` (rejoin) no toca fantasyTeam a proposito: ya existe desde el join
  // original (@@unique([leagueMemberId]) no admite otro) y asi conserva sus picks.
  const member = await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId } },
    update: { status: 'ACTIVE', joinedAt: new Date() },
    create: {
      leagueId: league.id,
      userId,
      isOwner: false,
      status: 'ACTIVE',
      fantasyTeam: { create: {} },
    },
    select: memberSelect,
  });
  return member;
}

// El owner no puede irse: transferir ownership no esta implementado.
export async function leaveLeague(leagueId: number, userId: number, isOwner: boolean) {
  if (isOwner) {
    throw new ConflictError(
      'Owner cannot leave the league. Transfer ownership first.',
      'OWNER_CANNOT_LEAVE',
    );
  }
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { draftStatus: true },
  });
  if (!league) {
    throw new NotFoundError('League');
  }
  assertRosterOpen(league.draftStatus);

  return prisma.leagueMember.update({
    where: { leagueId_userId: { leagueId, userId } },
    data: { status: 'LEFT' },
    select: memberSelect,
  });
}

// joinedAt asc deja al owner primero: entra en el mismo momento en que se crea la liga.
export async function listMembers(leagueId: number) {
  return prisma.leagueMember.findMany({
    where: { leagueId, status: 'ACTIVE' },
    select: memberSelect,
    orderBy: { joinedAt: 'asc' },
  });
}

export async function kickMember(leagueId: number, kickedUserId: number, ownerUserId: number) {
  if (kickedUserId === ownerUserId) {
    throw new ConflictError(
      'Owner cannot kick themselves. Transfer ownership first.',
      'OWNER_CANNOT_LEAVE',
    );
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { draftStatus: true },
  });
  if (!league) {
    throw new NotFoundError('League');
  }
  assertRosterOpen(league.draftStatus);

  const target = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: kickedUserId } },
  });
  if (!target || target.status !== 'ACTIVE') {
    throw new NotFoundError('Member');
  }

  return prisma.leagueMember.update({
    where: { leagueId_userId: { leagueId, userId: kickedUserId } },
    data: { status: 'KICKED' },
    select: memberSelect,
  });
}

export async function getMyFantasyTeam(leagueMemberId: number) {
  const team = await prisma.fantasyTeam.findUnique({
    where: { leagueMemberId },
    select: fantasyTeamSelect,
  });
  if (!team) {
    throw new NotFoundError('Fantasy_team');
  }
  return team;
}
