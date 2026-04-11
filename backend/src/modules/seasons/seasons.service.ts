import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateSeasonInput, UpdateSeasonInput } from './seasons.schema';

export async function findAll() {
  return prisma.season.findMany({ orderBy: { year: 'desc' } });
}

export async function findActive() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) throw new NotFoundError('Active season');
  return season;
}

export async function findById(id: number) {
  const season = await prisma.season.findUnique({ where: { id } });
  if (!season) throw new NotFoundError('Season');
  return season;
}

export async function create(data: CreateSeasonInput) {
  const existing = await prisma.season.findUnique({ where: { year: data.year } });
  if (existing) {
    throw new ConflictError('A season for this year already exists', 'SEASON_ALREADY_EXISTS');
  }

  return prisma.season.create({ data });
}

export async function update(id: number, data: UpdateSeasonInput) {
  await findById(id);
  return prisma.season.update({ where: { id }, data });
}

export async function activate(id: number) {
  await findById(id);

  // Deactivate all other seasons, then activate this one — in a transaction
  return prisma.$transaction([
    prisma.season.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.season.update({ where: { id }, data: { isActive: true } }),
  ]);
}

export async function remove(id: number) {
  await findById(id);

  const activeLeagues = await prisma.league.count({ where: { seasonId: id } });
  if (activeLeagues > 0) {
    throw new ConflictError(
      'Cannot delete season with active leagues',
      'SEASON_HAS_DEPENDENCIES',
    );
  }

  return prisma.season.delete({ where: { id } });
}
