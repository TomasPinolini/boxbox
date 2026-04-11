import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateRaceInput, UpdateRaceInput } from './races.schema';

export async function findAll(seasonId?: number, status?: string) {
  return prisma.race.findMany({
    where: {
      ...(seasonId ? { seasonId } : {}),
      ...(status ? { status: status as any } : {}),
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
