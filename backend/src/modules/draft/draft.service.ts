// SERVICE — toda la logica del snake draft vive aca. No sabe que existe HTTP.
//
// Diseno de rondas (decision Slice 5, confirmada con el equipo antes de codear):
// FantasyTeam tiene 4 slots (driver1, driver2, reserveDriver, constructor), asi que el draft
// son 4 rondas fijas — una por slot, en este orden:
//   Ronda 1 -> driver1Id   (categoria DRIVER)
//   Ronda 2 -> driver2Id   (categoria DRIVER)
//   Ronda 3 -> reserveDriverId (categoria DRIVER)
//   Ronda 4 -> constructorId   (categoria CONSTRUCTOR)
//
// Orden de picks: snake entre rondas (1->N, N->1, 1->N, N->1) sobre un orden base shuffleado
// una sola vez en startDraft. En vez de guardar un "draftOrder" separado en LeagueMember,
// el orden completo del draft se materializa como filas DraftPick placeholder (driverId Y
// constructorId null) creadas todas de una en startDraft, con pickNumber ya asignado segun
// snake order. "El pick actual" es siempre la fila con menor pickNumber que sigue sin llenar
// — no hace falta ningun otro estado derivado.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { NotFoundError, ConflictError } from '../../shared/errors';
import type { DraftPickInput } from './draft.schema';

const TOTAL_ROUNDS = 4;

type PickCategory = 'DRIVER' | 'CONSTRUCTOR';

function categoryForRound(round: number): PickCategory {
  return round < TOTAL_ROUNDS ? 'DRIVER' : 'CONSTRUCTOR';
}

const SLOT_BY_ROUND: Record<
  number,
  'driver1Id' | 'driver2Id' | 'reserveDriverId' | 'constructorId'
> = {
  1: 'driver1Id',
  2: 'driver2Id',
  3: 'reserveDriverId',
  4: 'constructorId',
};

// `as Prisma.<Model>Select` (type assertion, NO anotacion `: Prisma.<Model>Select` ni
// `as const`): DraftPick tiene una relacion llamada literalmente `constructor` (FK a
// Constructor), y el modelo Constructor en si tiene el mismo choque via `prisma.constructor`
// (el nombre del delegate). Ambos colisionan con la propiedad `constructor` que TODO objeto
// JS hereda de Object.prototype — `as const` o una anotacion directa hacen que TS compare
// estructuralmente el literal contra el select type y arrastre un `constructor: Function`
// heredado que no es real (a runtime esto funciona bien), tirando TS2322. Una type ASSERTION
// (`as`, no `satisfies`) es el unico approach que evita el falso positivo (mismo fix que
// leagues.service.ts:fantasyTeamSelect, confirmado empiricamente).
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
} as const;

const constructorAvailableSelect = {
  id: true,
  name: true,
  color: true,
} as Prisma.ConstructorSelect;

// startDraft: genera el calendario completo de picks (M miembros x 4 rondas) de una sola vez
// y transiciona League.draftStatus a LIVE. Owner-only (enforced en middleware).
export async function startDraft(leagueId: number) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
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

  // Fisher-Yates — orden aleatorio (docs/api-endpoints.md: "Genera draft order aleatorio").
  const shuffled = [...members];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picks: Prisma.DraftPickCreateManyInput[] = [];
  let pickNumber = 1;
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    // Snake: rondas impares en el orden shuffleado, pares invertido.
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

// getDraftState: el pick "actual" es siempre la fila abierta (driverId Y constructorId null)
// de menor pickNumber. Si no hay ninguna, el draft esta COMPLETED (o todavia no arranco).
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

// getAvailablePicks: drivers/constructors sin drafted en ESTA liga (otras ligas no cuentan —
// el mismo Driver puede estar tomado en la liga A y libre en la liga B). La relacion
// draftsAsPick solo matchea filas donde driverId/constructorId ya esta seteado (una fila
// placeholder con driverId null no referencia a ningun Driver via la relacion), asi que
// `none: { leagueId }` alcanza sin filtrar explicitamente por driverId/constructorId not null.
export async function getAvailablePicks(leagueId: number) {
  const [drivers, constructors] = await Promise.all([
    prisma.driver.findMany({
      where: { deletedAt: null, draftsAsPick: { none: { leagueId } } },
      select: driverAvailableSelect,
      orderBy: { lastName: 'asc' },
    }),
    prisma.constructor.findMany({
      where: { deletedAt: null, draftsAsPick: { none: { leagueId } } },
      select: constructorAvailableSelect,
      orderBy: { name: 'asc' },
    }),
  ]);
  return { drivers, constructors };
}

// submitPick: valida turno + categoria + disponibilidad, aplica el pick, llena el slot del
// FantasyTeam correspondiente, y si era el ultimo pick pendiente transiciona League a
// COMPLETED — todo en una sola transaccion interactiva (el conteo de remaining depende del
// update anterior, necesita $transaction(async (tx) => ...) en vez del array-form).
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
  // Defense in depth: no deberia pasar con draftStatus LIVE (ambos se actualizan en la misma
  // tx en el ultimo pick), pero si pasa tratamos "no hay pick abierto" como draft no-live.
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
    const pick = await tx.draftPick.update({
      where: { id: currentPick.id },
      data:
        category === 'DRIVER'
          ? { driverId: pickedId, pickedAt: new Date() }
          : { constructorId: pickedId, pickedAt: new Date() },
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

// resetDraft: borra todos los picks, vacia los FantasyTeams de la liga y vuelve draftStatus
// a PENDING. Owner-only (enforced en middleware). Funciona sin importar el estado actual
// (LIVE o COMPLETED) — reset desde PENDING es un no-op inofensivo.
export async function resetDraft(leagueId: number) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) {
    throw new NotFoundError('League');
  }

  await prisma.$transaction([
    prisma.draftPick.deleteMany({ where: { leagueId } }),
    prisma.fantasyTeam.updateMany({
      where: { leagueMember: { leagueId } },
      data: { driver1Id: null, driver2Id: null, reserveDriverId: null, constructorId: null },
    }),
    prisma.league.update({ where: { id: leagueId }, data: { draftStatus: 'PENDING' } }),
  ]);

  return { draftStatus: 'PENDING' as const };
}
