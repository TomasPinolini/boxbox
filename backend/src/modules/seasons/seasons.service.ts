import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateSeasonInput, UpdateSeasonInput } from './seasons.schema';

// `counts.drivers` son los pilotos asignados; `driverCount` es el cupo configurado. No confundirlos.
export async function findAll() {
  const seasons = await prisma.season.findMany({
    orderBy: { year: 'desc' },
    include: { _count: { select: { races: true, leagues: true, driverSeasons: true } } },
  });

  return seasons.map(({ _count, ...season }) => ({
    ...season,
    counts: { races: _count.races, leagues: _count.leagues, drivers: _count.driverSeasons },
  }));
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

  return prisma.$transaction([
    prisma.season.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.season.update({ where: { id }, data: { isActive: true } }),
  ]);
}

export async function remove(id: number) {
  await findById(id);

  const activeLeagues = await prisma.league.count({ where: { seasonId: id } });
  if (activeLeagues > 0) {
    throw new ConflictError('Cannot delete season with active leagues', 'SEASON_HAS_DEPENDENCIES');
  }

  // races y driver_seasons tienen FK ON DELETE RESTRICT: sin estos chequeos Prisma falla con
  // un error que no es AppError y el cliente recibe un 500.
  const races = await prisma.race.count({ where: { seasonId: id } });
  if (races > 0) {
    throw new ConflictError('Cannot delete season with races', 'SEASON_HAS_DEPENDENCIES');
  }

  const driverSeasons = await prisma.driverSeason.count({ where: { seasonId: id } });
  if (driverSeasons > 0) {
    throw new ConflictError('Cannot delete season with drivers', 'SEASON_HAS_DEPENDENCIES');
  }

  return prisma.season.delete({ where: { id } });
}
