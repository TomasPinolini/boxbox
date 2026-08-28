import { prisma } from '../../shared/prisma';
import type { RaceStatus } from '../../generated/prisma/enums';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateRaceInput, UpdateRaceInput, LoadRaceResultsInput } from './races.schema';

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
  // Verify season exists
  const season = await prisma.season.findUnique({ where: { id: data.seasonId } });
  if (!season) throw new NotFoundError('Season');

  // Verify circuit exists (and not soft-deleted)
  const circuit = await prisma.circuit.findFirst({
    where: { id: data.circuitId, deletedAt: null },
  });
  if (!circuit) throw new NotFoundError('Circuit');

  // Check unique constraint: no duplicate round in same season
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

  // If changing season or circuit, verify they exist
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
  return prisma.race.delete({ where: { id } });
}

// ─── Slice 7 — RaceResult ingestion ──────────────────────────────
// Carga manual (admin-only) del array de resultados de una carrera.
// Al finalizar exitosamente: la Race pasa a COMPLETED en la misma transaccion,
// asi el estado nunca queda inconsistente (results creados pero race sin cerrar,
// o viceversa).

// Estados desde los que se puede cargar results. COMPLETED = ya se cargaron,
// CANCELLED/POSTPONED = la carrera no ocurrio, no aplica.
// Tipado como `readonly RaceStatus[]` para que `.includes(race.status)` no requiera
// cast — cualquier RaceStatus es aceptado como parametro y el runtime hace el match.
const LOADABLE_STATUSES: readonly RaceStatus[] = ['UPCOMING', 'QUALIFYING_LOCKED'];

export async function loadResults(raceId: number, input: LoadRaceResultsInput) {
  // 1. Pre-check sin DB: el mismo driver no puede aparecer dos veces en el payload.
  // La unique constraint @@unique([raceId, driverId]) tambien lo agarraria, pero
  // el error de Prisma es menos claro. Fail fast con un mensaje tipado.
  const driverIds = input.results.map((r) => r.driverId);
  const uniqueDriverIds = new Set(driverIds);
  if (uniqueDriverIds.size !== driverIds.length) {
    throw new ConflictError('Payload contains duplicate driverId', 'RACE_RESULT_DUPLICATE_DRIVER');
  }

  // 2. Transaccion interactiva. TODO lo que lee y decide va ADENTRO (C6 / BOX-24): asi los
  // chequeos y los inserts ven la misma foto de la DB, y si cualquier paso tira, rollback
  // total — nunca queda una Race con RaceResults pero sin ConstructorResults, o al reves.
  // Devolvemos los results desde adentro para no hacer otro round-trip.
  return prisma.$transaction(async (tx) => {
    // 2a. La Race tiene que existir y estar en un estado cargable.
    const race = await tx.race.findUnique({ where: { id: raceId } });
    if (!race) throw new NotFoundError('Race');

    if (race.status === 'COMPLETED') {
      throw new ConflictError(
        'Race is already completed — results cannot be loaded again',
        'RACE_ALREADY_COMPLETED',
      );
    }
    if (!LOADABLE_STATUSES.includes(race.status)) {
      // CANCELLED / POSTPONED caen aca.
      throw new ConflictError(
        `Race is ${race.status.toLowerCase()} — results cannot be loaded`,
        'RACE_NOT_LOADABLE',
      );
    }

    // 2b. Todos los drivers tienen que existir y no estar soft-deleted.
    const foundDrivers = await tx.driver.findMany({
      where: { id: { in: [...uniqueDriverIds] }, deletedAt: null },
      select: { id: true },
    });
    if (foundDrivers.length !== uniqueDriverIds.size) {
      throw new NotFoundError('Driver');
    }

    // 2c. Slice 8: a que constructor corre cada driver ESTA temporada. El vinculo vive en
    // DriverSeason (un driver puede cambiar de equipo entre temporadas), no en Driver.
    // Sin `select`: un select con la clave `constructorId` tropieza con la colision de tipos
    // de la relacion `constructor` (ver roadmap, Slice 5 — `Object.prototype.constructor`).
    // Traer la fila entera son 2 columnas de mas y cero type assertions.
    const links = await tx.driverSeason.findMany({
      where: { seasonId: race.seasonId, driverId: { in: [...uniqueDriverIds] } },
    });
    const constructorOf = new Map(links.map((l) => [l.driverId, l.constructorId]));
    const unlinked = [...uniqueDriverIds].filter((id) => !constructorOf.has(id));
    if (unlinked.length > 0) {
      // Error de datos, no del cliente: cargar el DriverSeason primero. Ignorarlo en silencio
      // daria standings incompletos en Slice 9 sin ninguna pista.
      throw new ConflictError(
        `Drivers ${unlinked.join(', ')} have no DriverSeason for season ${race.seasonId}`,
        'DRIVER_NOT_IN_SEASON',
      );
    }
    const constructorRows = buildConstructorResults(raceId, input.results, constructorOf);

    // 2d. Los N RaceResults + los ConstructorResults + el update del status, atomicos.
    await tx.raceResult.createMany({
      data: input.results.map((r) => ({ ...r, raceId })),
    });
    await tx.constructorResult.createMany({ data: constructorRows });
    await tx.race.update({
      where: { id: raceId },
      data: { status: 'COMPLETED' },
    });
    return tx.raceResult.findMany({
      where: { raceId },
      orderBy: [{ position: { sort: 'asc', nulls: 'last' } }],
    });
  });
}

type ConstructorResultRow = {
  raceId: number;
  constructorId: number;
  driver1Points: number;
  driver2Points: number;
  totalPoints: number;
};

// buildConstructorResults (Slice 8): agrupa los puntos de los RaceResults por constructor y
// arma una fila por constructor. Funcion pura — no toca la DB — para que se lea de arriba a
// abajo: (1) un Map constructorId -> puntos de sus pilotos, (2) una fila por entrada del Map.
// driver1Points es el mayor de los dos; con un solo piloto, driver2Points queda en 0. Un
// constructor sin pilotos en el payload no genera fila (Slice 9 lo trata como 0).
function buildConstructorResults(
  raceId: number,
  results: LoadRaceResultsInput['results'],
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
      // En F1 corren 2 por equipo. Tres o mas es un error de datos (DriverSeason mal cargado).
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

// GET /api/v1/races/:id/results — lectura publica de los results de una carrera.
// User-facing, no requiere admin. Race tiene que existir (404 si no).
export async function getResults(raceId: number) {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  return prisma.raceResult.findMany({
    where: { raceId },
    orderBy: [{ position: { sort: 'asc', nulls: 'last' } }],
  });
}
