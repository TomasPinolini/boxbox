import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import type { RaceStatus } from '../../generated/prisma/enums';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateRaceInput, UpdateRaceInput, LoadRaceResultsInput } from './races.schema';
import { seasonTeams } from '../drivers/drivers.service';
import { recalculateInTx } from '../standings/standings.service';

export async function findAll(seasonId?: number, status?: RaceStatus) {
  return prisma.race.findMany({
    where: {
      ...(seasonId ? { seasonId } : {}),
      ...(status ? { status } : {}),
    },
    include: { circuit: true },
    orderBy: { round: 'asc' },
  });
}

export async function findById(id: number) {
  const race = await prisma.race.findUnique({
    where: { id },
    include: { circuit: true, season: true },
  });

  if (!race) throw new NotFoundError('Race');
  return race;
}

export async function create(data: CreateRaceInput) {
  const season = await prisma.season.findUnique({ where: { id: data.seasonId } });
  if (!season) throw new NotFoundError('Season');

  const circuit = await prisma.circuit.findFirst({
    where: { id: data.circuitId, deletedAt: null },
  });
  if (!circuit) throw new NotFoundError('Circuit');

  const existing = await prisma.race.findFirst({
    where: { seasonId: data.seasonId, round: data.round },
  });
  if (existing) {
    throw new ConflictError(
      `Round ${data.round} already exists in this season`,
      'RACE_ROUND_DUPLICATE',
    );
  }

  return prisma.race.create({ data });
}

export async function update(id: number, data: UpdateRaceInput) {
  await findById(id);

  if (data.seasonId) {
    const season = await prisma.season.findUnique({ where: { id: data.seasonId } });
    if (!season) throw new NotFoundError('Season');
  }
  if (data.circuitId) {
    const circuit = await prisma.circuit.findFirst({
      where: { id: data.circuitId, deletedAt: null },
    });
    if (!circuit) throw new NotFoundError('Circuit');
  }

  return prisma.race.update({ where: { id }, data });
}

export async function remove(id: number) {
  await findById(id);

  // Las FKs hacia races son ON DELETE RESTRICT: sin este chequeo el DELETE falla con P2003,
  // que no es un AppError y termina en un 500 generico.
  const counts = await prisma.race.findUnique({
    where: { id },
    select: {
      _count: {
        select: { raceResults: true, constructorResults: true, predictions: true, standings: true },
      },
    },
  });

  const dependencies = Object.values(counts?._count ?? {}).reduce((a, b) => a + b, 0);
  if (dependencies > 0) {
    throw new ConflictError(
      'Cannot delete race with results, standings or predictions',
      'RACE_HAS_DEPENDENCIES',
    );
  }

  return prisma.race.delete({ where: { id } });
}

const LOADABLE_STATUSES: readonly RaceStatus[] = ['UPCOMING', 'QUALIFYING_LOCKED'];

// Puntos del Gran Premio por puesto final. Desde 2025 no hay punto por vuelta rapida.
// Limitacion conocida: no contempla el puntaje reducido de una carrera suspendida.
const POINTS_BY_POSITION = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function pointsFor(position: number | undefined, status: string): number {
  if (status !== 'CLASSIFIED' || position === undefined) return 0;
  return POINTS_BY_POSITION[position - 1] ?? 0;
}

type ScoredResult = LoadRaceResultsInput['results'][number] & { points: number };

export async function loadResults(raceId: number, input: LoadRaceResultsInput) {
  // El @@unique([raceId, driverId]) tambien lo frena, pero con un error de Prisma poco claro.
  const driverIds = input.results.map((r) => r.driverId);
  const uniqueDriverIds = new Set(driverIds);
  if (uniqueDriverIds.size !== driverIds.length) {
    throw new ConflictError('Payload contains duplicate driverId', 'RACE_RESULT_DUPLICATE_DRIVER');
  }

  // Todo lo que lee y decide va adentro de la transaccion: chequeos e inserts ven la misma
  // foto de la DB, y nunca quedan RaceResults sin sus ConstructorResults.
  return prisma.$transaction(runLoad).catch((err: unknown) => {
    // Una Race reabierta por PATCH, o dos cargas concurrentes, pueden chocar con el
    // @@unique([raceId, driverId]): se traduce a 409 en vez de escalar a 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError(
        'This race already has results for one or more of these drivers',
        'RACE_RESULTS_ALREADY_EXIST',
      );
    }
    throw err;
  });

  async function runLoad(tx: Prisma.TransactionClient) {
    const race = await tx.race.findUnique({ where: { id: raceId } });
    if (!race) throw new NotFoundError('Race');

    if (race.status === 'COMPLETED') {
      throw new ConflictError(
        'Race is already completed — results cannot be loaded again',
        'RACE_ALREADY_COMPLETED',
      );
    }
    if (!LOADABLE_STATUSES.includes(race.status)) {
      throw new ConflictError(
        `Race is ${race.status.toLowerCase()} — results cannot be loaded`,
        'RACE_NOT_LOADABLE',
      );
    }

    const foundDrivers = await tx.driver.findMany({
      where: { id: { in: [...uniqueDriverIds] }, deletedAt: null },
      select: { id: true },
    });
    if (foundDrivers.length !== uniqueDriverIds.size) {
      throw new NotFoundError('Driver');
    }

    // El equipo de cada piloto cambia entre temporadas: vive en DriverSeason, no en Driver.
    const teams = await seasonTeams(race.seasonId, tx);
    const constructorOf = new Map([...teams].map(([driverId, t]) => [driverId, t.constructorId]));
    const unlinked = [...uniqueDriverIds].filter((id) => !constructorOf.has(id));
    if (unlinked.length > 0) {
      // Ignorarlo en silencio daria standings incompletos sin ninguna pista.
      throw new ConflictError(
        `Drivers ${unlinked.join(', ')} have no DriverSeason for season ${race.seasonId}`,
        'DRIVER_NOT_IN_SEASON',
      );
    }
    const scored: ScoredResult[] = input.results.map((r) => ({
      ...r,
      points: pointsFor(r.position, r.status),
    }));
    const constructorRows = buildConstructorResults(raceId, scored, constructorOf);

    await tx.raceResult.createMany({
      data: scored.map((r) => ({ ...r, raceId })),
    });
    await tx.constructorResult.createMany({ data: constructorRows });
    await tx.race.update({
      where: { id: raceId },
      data: { status: 'COMPLETED' },
    });
    await recalculateInTx(tx, race);
    return tx.raceResult.findMany({
      where: { raceId },
      orderBy: [{ position: { sort: 'asc', nulls: 'last' } }],
    });
  }
}

type ConstructorResultRow = {
  raceId: number;
  constructorId: number;
  driver1Points: number;
  driver2Points: number;
  totalPoints: number;
};

// driver1Points es el mayor de los dos. Un constructor sin pilotos en el payload no genera
// fila: standings lo trata como 0.
function buildConstructorResults(
  raceId: number,
  results: ScoredResult[],
  constructorOf: Map<number, number>,
): ConstructorResultRow[] {
  const pointsByConstructor = new Map<number, number[]>();
  for (const r of results) {
    const constructorId = constructorOf.get(r.driverId)!; // garantizado por el check de arriba
    const bucket = pointsByConstructor.get(constructorId) ?? [];
    bucket.push(r.points);
    pointsByConstructor.set(constructorId, bucket);
  }

  const rows: ConstructorResultRow[] = [];
  for (const [constructorId, points] of pointsByConstructor) {
    if (points.length > 2) {
      // Tres o mas pilotos por equipo es un DriverSeason mal cargado.
      throw new ConflictError(
        `Constructor ${constructorId} has ${points.length} drivers in this race (max 2)`,
        'CONSTRUCTOR_TOO_MANY_DRIVERS',
      );
    }
    const [driver1Points = 0, driver2Points = 0] = [...points].sort((a, b) => b - a);
    rows.push({
      raceId,
      constructorId,
      driver1Points,
      driver2Points,
      totalPoints: driver1Points + driver2Points,
    });
  }
  return rows;
}

export async function getResults(raceId: number) {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  return prisma.raceResult.findMany({
    where: { raceId },
    orderBy: [{ position: { sort: 'asc', nulls: 'last' } }],
  });
}
