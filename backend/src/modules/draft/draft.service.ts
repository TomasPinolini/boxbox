// Sin piloto reserva: con picks exclusivos por liga, 2 pilotos por miembro permiten ligas de
// hasta 11 sobre 22. Ver docs/adr/ADR-0006 antes de reintroducirla.
//
// El orden snake completo se materializa en startDraft como filas DraftPick vacias; el pick
// actual es la de menor pickNumber sin llenar, sin otro estado derivado.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { maxMembersForSeason } from '../leagues/leagues.service';
import { seasonTeams, sortByConstructorThenName } from '../drivers/drivers.service';
import type { DraftPickInput } from './draft.schema';

const TOTAL_ROUNDS = 3;

export type PickCategory = 'DRIVER' | 'CONSTRUCTOR';

export function categoryForRound(round: number): PickCategory {
  return round < TOTAL_ROUNDS ? 'DRIVER' : 'CONSTRUCTOR';
}

const SLOT_BY_ROUND: Record<number, 'driver1Id' | 'driver2Id' | 'constructorId'> = {
  1: 'driver1Id',
  2: 'driver2Id',
  3: 'constructorId',
};

// `as Prisma.XSelect` y no una anotacion ni `as const`: la relacion `constructor` choca con
// Object.prototype.constructor y TS tira un TS2322 falso. Solo la assertion lo evita.
const pickSelect = {
  id: true,
  leagueMemberId: true,
  pickNumber: true,
  round: true,
  driverId: true,
  constructorId: true,
  pickedAt: true,
} as Prisma.DraftPickSelect;

const driverAvailableSelect = {
  id: true,
  firstName: true,
  lastName: true,
  number: true,
  code: true,
  headshotUrl: true,
} as const;

const constructorAvailableSelect = {
  id: true,
  name: true,
  color: true,
  logoUrl: true,
} as Prisma.ConstructorSelect;

export async function startDraft(leagueId: number) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { season: true },
  });
  if (!league) {
    throw new NotFoundError('League');
  }
  if (league.draftStatus !== 'PENDING') {
    throw new ConflictError('Draft already started', 'DRAFT_ALREADY_STARTED');
  }

  const members = await prisma.leagueMember.findMany({
    where: { leagueId, status: 'ACTIVE' },
    orderBy: { id: 'asc' },
  });

  // createLeague ya valida el tope, pero una temporada que cambio de driverCount puede dejar
  // mas miembros que pilotos. Mejor 409 aca que un draft que nunca termina.
  const cap = maxMembersForSeason(league.season.driverCount);
  if (members.length > cap) {
    throw new ConflictError(
      `Draft needs ${members.length * 2} drivers but the season has ${league.season.driverCount} (max ${cap} members)`,
      'TOO_MANY_MEMBERS_FOR_DRAFT',
    );
  }

  const shuffled = [...members];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picks: Prisma.DraftPickCreateManyInput[] = [];
  let pickNumber = 1;
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const order = round % 2 === 1 ? shuffled : [...shuffled].reverse();
    for (const member of order) {
      picks.push({
        leagueId,
        leagueMemberId: member.id,
        pickNumber: pickNumber++,
        round,
        driverId: null,
        constructorId: null,
      });
    }
  }

  await prisma.$transaction([
    prisma.draftPick.createMany({ data: picks }),
    prisma.league.update({ where: { id: leagueId }, data: { draftStatus: 'LIVE' } }),
  ]);

  return { draftStatus: 'LIVE' as const, totalPicks: picks.length };
}

export async function getDraftState(leagueId: number) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { draftStatus: true },
  });
  if (!league) {
    throw new NotFoundError('League');
  }

  const allPicks = await prisma.draftPick.findMany({
    where: { leagueId },
    select: pickSelect,
    orderBy: { pickNumber: 'asc' },
  });

  const nextPick = allPicks.find((p) => p.driverId === null && p.constructorId === null);
  const completedPicks = allPicks.filter((p) => p.driverId !== null || p.constructorId !== null);

  return {
    draftStatus: league.draftStatus,
    round: nextPick?.round ?? null,
    pickNumber: nextPick?.pickNumber ?? null,
    currentTurnLeagueMemberId: nextPick?.leagueMemberId ?? null,
    picks: completedPicks,
  };
}

// Las filas placeholder (ids null) no aparecen en la relacion draftsAsPick, asi que
// `none: { leagueId }` alcanza sin filtrar por not null.
export async function getAvailablePicks(leagueId: number) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { seasonId: true },
  });
  if (!league) {
    throw new NotFoundError('League');
  }

  const [drivers, constructors, teams] = await Promise.all([
    prisma.driver.findMany({
      where: {
        deletedAt: null,
        draftsAsPick: { none: { leagueId } },
        seasons: { some: { seasonId: league.seasonId } },
      },
      select: driverAvailableSelect,
      orderBy: { lastName: 'asc' },
    }),
    prisma.constructor.findMany({
      where: {
        deletedAt: null,
        draftsAsPick: { none: { leagueId } },
        seasons: { some: { seasonId: league.seasonId } },
      },
      select: constructorAvailableSelect,
      orderBy: { name: 'asc' },
    }),
    seasonTeams(league.seasonId),
  ]);

  // Mismo orden que /drivers: con 2 columnas, cada fila es un equipo.
  const availableDrivers = sortByConstructorThenName(
    drivers.map((d) => ({ ...d, constructor: teams.get(d.id)?.constructor ?? null })),
  );

  return { drivers: availableDrivers, constructors };
}

export async function submitPick(
  leagueId: number,
  leagueMemberId: number,
  input: DraftPickInput,
) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { draftStatus: true },
  });
  if (!league) {
    throw new NotFoundError('League');
  }
  if (league.draftStatus !== 'LIVE') {
    throw new ConflictError('Draft is not live', 'DRAFT_NOT_LIVE');
  }

  const currentPick = await prisma.draftPick.findFirst({
    where: { leagueId, driverId: null, constructorId: null },
    orderBy: { pickNumber: 'asc' },
  });
  if (!currentPick) {
    throw new ConflictError('Draft is not live', 'DRAFT_NOT_LIVE');
  }

  if (currentPick.leagueMemberId !== leagueMemberId) {
    throw new ConflictError('It is not your turn to pick', 'NOT_YOUR_TURN');
  }

  const category = categoryForRound(currentPick.round);
  if (category === 'DRIVER' && input.driverId === undefined) {
    throw new ConflictError('This round expects a driver pick', 'WRONG_PICK_CATEGORY');
  }
  if (category === 'CONSTRUCTOR' && input.constructorId === undefined) {
    throw new ConflictError('This round expects a constructor pick', 'WRONG_PICK_CATEGORY');
  }

  if (category === 'DRIVER') {
    const driver = await prisma.driver.findUnique({ where: { id: input.driverId! } });
    if (!driver || driver.deletedAt) {
      throw new NotFoundError('Driver');
    }
    const alreadyDrafted = await prisma.draftPick.findFirst({
      where: { leagueId, driverId: input.driverId },
    });
    if (alreadyDrafted) {
      throw new ConflictError(
        'This driver was already drafted in this league',
        'DRIVER_ALREADY_DRAFTED',
      );
    }
  } else {
    const constructor = await prisma.constructor.findUnique({
      where: { id: input.constructorId! },
    });
    if (!constructor || constructor.deletedAt) {
      throw new NotFoundError('Constructor');
    }
    const alreadyDrafted = await prisma.draftPick.findFirst({
      where: { leagueId, constructorId: input.constructorId },
    });
    if (alreadyDrafted) {
      throw new ConflictError(
        'This constructor was already drafted in this league',
        'CONSTRUCTOR_ALREADY_DRAFTED',
      );
    }
  }

  const slot = SLOT_BY_ROUND[currentPick.round];
  const pickedId = category === 'DRIVER' ? input.driverId! : input.constructorId!;

  return prisma.$transaction(async (tx) => {
    // updateMany con WHERE null y no update por id: un pick manual y el auto-pick del timer
    // pueden llegar juntos, y el segundo pisaria al primero. count 0 = alguien lo lleno antes.
    const result = await tx.draftPick.updateMany({
      where: { id: currentPick.id, driverId: null, constructorId: null },
      data:
        category === 'DRIVER'
          ? { driverId: pickedId, pickedAt: new Date() }
          : { constructorId: pickedId, pickedAt: new Date() },
    });
    if (result.count === 0) {
      throw new ConflictError('It is not your turn to pick', 'NOT_YOUR_TURN');
    }

    const pick = await tx.draftPick.findUniqueOrThrow({
      where: { id: currentPick.id },
      select: pickSelect,
    });

    await tx.fantasyTeam.update({
      where: { leagueMemberId },
      data: { [slot]: pickedId },
    });

    const remaining = await tx.draftPick.count({
      where: { leagueId, driverId: null, constructorId: null },
    });
    if (remaining === 0) {
      await tx.league.update({ where: { id: leagueId }, data: { draftStatus: 'COMPLETED' } });
    }

    return pick;
  });
}

export async function resetDraft(leagueId: number) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) {
    throw new NotFoundError('League');
  }

  await prisma.$transaction([
    prisma.draftPick.deleteMany({ where: { leagueId } }),
    prisma.fantasyTeam.updateMany({
      where: { leagueMember: { leagueId } },
      data: { driver1Id: null, driver2Id: null, constructorId: null },
    }),
    prisma.league.update({ where: { id: leagueId }, data: { draftStatus: 'PENDING' } }),
  ]);

  return { draftStatus: 'PENDING' as const };
}
