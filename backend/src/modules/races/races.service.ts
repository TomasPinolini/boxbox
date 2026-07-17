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
  // 1. La Race tiene que existir y estar en un estado cargable.
  const race = await prisma.race.findUnique({ where: { id: raceId } });
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

  // 2. Pre-check: el mismo driver no puede aparecer dos veces en el payload.
  // La unique constraint @@unique([raceId, driverId]) tambien lo agarraria, pero
  // el error de Prisma es menos claro. Fail fast con un mensaje tipado.
  const driverIds = input.results.map((r) => r.driverId);
  const uniqueDriverIds = new Set(driverIds);
  if (uniqueDriverIds.size !== driverIds.length) {
    throw new ConflictError('Payload contains duplicate driverId', 'RACE_RESULT_DUPLICATE_DRIVER');
  }

  // 3. Pre-check: todos los drivers tienen que existir y no estar soft-deleted.
  // Si falta alguno, abortamos ANTES de crear filas (evitamos rollback innecesario).
  const foundDrivers = await prisma.driver.findMany({
    where: { id: { in: [...uniqueDriverIds] }, deletedAt: null },
    select: { id: true },
  });
  if (foundDrivers.length !== uniqueDriverIds.size) {
    throw new NotFoundError('Driver');
  }

  // 4. Transaccion interactiva: los N inserts + el update del status son atomicos.
  // Si algo falla adentro, rollback total. Devolvemos los results desde adentro
  // para no hacer otro round-trip.
  return prisma.$transaction(async (tx) => {
    await tx.raceResult.createMany({
      data: input.results.map((r) => ({ ...r, raceId })),
    });
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
