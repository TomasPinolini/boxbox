import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateDriverInput, UpdateDriverInput } from './drivers.schema';
import type { RaceResultStatus } from '../../generated/prisma/client';

const notDeleted = { deletedAt: null };

export type ConstructorRef = {
  id: number;
  name: string;
  color: string;
  logoUrl: string | null;
};

// La temporada explícita, si no la activa, si no null.
// No usa seasonsService.findActive() porque tira 404, y un catálogo público tiene que
// responder aunque no haya temporada activa (DB recién clonada o truncada por los tests).
export async function resolveSeasonId(seasonId?: number): Promise<number | null> {
  if (seasonId) return seasonId;
  const active = await prisma.season.findFirst({ where: { isActive: true } });
  return active?.id ?? null;
}

function indexConstructorsByDriver(
  links: { driverId: number; constructorId: number }[],
  constructors: ConstructorRef[],
): Map<number, ConstructorRef> {
  const byId = new Map(constructors.map((c) => [c.id, c]));
  const byDriver = new Map<number, ConstructorRef>();
  for (const link of links) {
    const constructor = byId.get(link.constructorId);
    // Escudería soft-deleted: el piloto queda sin equipo en las lecturas públicas.
    if (constructor) byDriver.set(link.driverId, constructor);
  }
  return byDriver;
}

// Agrupado por escudería para que, con 2 pilotos por equipo y grilla de 2 columnas, cada fila
// sea un equipo. Los sin equipo van al final (con "" quedarían primeros).
function sortByConstructorThenName<T extends { constructor: { name: string } | null; lastName: string; firstName: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const an = a.constructor?.name ?? '￿';
    const bn = b.constructor?.name ?? '￿';
    return (
      an.localeCompare(bn) ||
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName)
    );
  });
}

// Tres queries planas + merge en TS en vez de include/select sobre la relación `constructor`:
// ese nombre choca con Object.prototype.constructor y rompe los tipos de Prisma en tsc.
// El delegate prisma.constructor sí es seguro.
export async function findAll(constructorId?: number, seasonId?: number) {
  const resolvedSeasonId = await resolveSeasonId(seasonId);

  const drivers = await prisma.driver.findMany({
    where: {
      ...notDeleted, // siempre filtra borrados
      // Acotado a la temporada: si no, quien corrió para ese equipo otro año aparece en el
      // filtro mostrando su escudería actual.
      ...(constructorId
        ? {
            seasons: {
              some: {
                constructorId,
                ...(resolvedSeasonId ? { seasonId: resolvedSeasonId } : {}),
              },
            },
          }
        : {}),
    },
    orderBy: { lastName: 'asc' },
  });

  if (drivers.length === 0) return [];

  if (!resolvedSeasonId) return drivers.map((driver) => ({ ...driver, constructor: null }));

  const byDriver = await constructorsForDrivers(
    drivers.map((d) => d.id),
    resolvedSeasonId,
  );

  return sortByConstructorThenName(
    drivers.map((driver) => ({
      ...driver,
      constructor: byDriver.get(driver.id) ?? null,
    })),
  );
}

async function constructorsForDrivers(
  driverIds: number[],
  seasonId: number,
): Promise<Map<number, ConstructorRef>> {
  // Fila entera, sin select: ver la colisión de nombres en findAll.
  const links = await prisma.driverSeason.findMany({
    where: { seasonId, driverId: { in: driverIds } },
  });

  if (links.length === 0) return new Map();

  const constructors = await prisma.constructor.findMany({
    where: { id: { in: links.map((l) => l.constructorId) }, deletedAt: null },
  });

  return indexConstructorsByDriver(
    links,
    constructors.map((c) => ({ id: c.id, name: c.name, color: c.color, logoUrl: c.logoUrl })),
  );
}

// Solo valida existencia, para que update/softDelete no paguen los joins de findDetail.
async function findById(id: number) {
  const driver = await prisma.driver.findFirst({
    where: { id, ...notDeleted }, // findFirst porque filtramos deletedAt (no es solo PK)
  });

  if (!driver) throw new NotFoundError('Driver');
  return driver;
}

export type DriverStats = {
  races: number;
  points: number;
  wins: number;
  podiums: number;
  bestFinish: number | null;
  dnfs: number;
};

// En memoria en vez de groupBy: una query en lugar de tres, y es pura (se testea sin DB).
function buildDriverStats(
  results: { position: number | null; points: number; status: RaceResultStatus }[],
): DriverStats {
  const finished = results.filter((r) => r.position !== null).map((r) => r.position as number);

  return {
    races: results.length,
    points: results.reduce((total, r) => total + r.points, 0),
    wins: finished.filter((position) => position === 1).length,
    // Los podios incluyen las victorias — convencion de F1, no un off-by-one.
    podiums: finished.filter((position) => position <= 3).length,
    bestFinish: finished.length > 0 ? Math.min(...finished) : null,
    dnfs: results.filter((r) => r.status === 'DNF').length,
  };
}

export async function findDetail(id: number, seasonId?: number) {
  const driver = await findById(id);
  const resolvedSeasonId = await resolveSeasonId(seasonId);

  // Sin temporada no se cae a "toda la carrera del piloto": mezclaría temporadas y `round`
  // dejaría de ser un orden total.
  if (!resolvedSeasonId) {
    return {
      ...driver,
      constructor: null,
      seasonId: null,
      stats: buildDriverStats([]),
      results: [],
    };
  }

  const byDriver = await constructorsForDrivers([driver.id], resolvedSeasonId);

  // include de `race` es seguro: la colisión de nombres es solo con `constructor`.
  const raceResults = await prisma.raceResult.findMany({
    where: { driverId: driver.id, race: { seasonId: resolvedSeasonId } },
    include: { race: true },
    orderBy: { race: { round: 'asc' } },
  });

  return {
    ...driver,
    constructor: byDriver.get(driver.id) ?? null,
    seasonId: resolvedSeasonId,
    stats: buildDriverStats(raceResults),
    results: raceResults.map((r) => ({
      raceId: r.raceId,
      raceName: r.race.name,
      round: r.race.round,
      raceDate: r.race.date,
      position: r.position,
      points: r.points,
      gridPosition: r.gridPosition,
      fastestLap: r.fastestLap,
      status: r.status,
    })),
  };
}

// Entran todos los pilotos de la temporada, también con 0 puntos. Acá sí groupBy: es la
// grilla entera y no hace falta traer ~500 filas para sumar una columna.
export async function findStandings(seasonId?: number) {
  const resolvedSeasonId = await resolveSeasonId(seasonId);
  if (!resolvedSeasonId) return [];

  const links = await prisma.driverSeason.findMany({ where: { seasonId: resolvedSeasonId } });
  const drivers = await prisma.driver.findMany({
    where: { id: { in: links.map((l) => l.driverId) }, ...notDeleted },
  });
  if (drivers.length === 0) return [];

  const driverIds = drivers.map((d) => d.id);
  const inSeason = { driverId: { in: driverIds }, race: { seasonId: resolvedSeasonId } };

  const [byDriver, pointRows, winRows] = await Promise.all([
    constructorsForDrivers(driverIds, resolvedSeasonId),
    prisma.raceResult.groupBy({ by: ['driverId'], where: inSeason, _sum: { points: true } }),
    prisma.raceResult.groupBy({
      by: ['driverId'],
      where: { ...inSeason, position: 1 },
      _count: { _all: true },
    }),
  ]);

  const points = new Map(pointRows.map((r) => [r.driverId, r._sum.points ?? 0]));
  const wins = new Map(winRows.map((r) => [r.driverId, r._count._all]));

  return (
    drivers
      .map((d) => ({
        points: points.get(d.id) ?? 0,
        wins: wins.get(d.id) ?? 0,
        driver: {
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          code: d.code,
          headshotUrl: d.headshotUrl,
          constructor: byDriver.get(d.id) ?? null,
        },
      }))
      // Victorias es el desempate real de la F1; el nombre hace el orden determinístico en cero.
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          a.driver.lastName.localeCompare(b.driver.lastName) ||
          a.driver.firstName.localeCompare(b.driver.firstName),
      )
      .map((row, index) => ({ position: index + 1, ...row }))
  );
}

export async function create(data: CreateDriverInput) {
  // Sin filtro deletedAt: un piloto borrado sigue reservando su externalId.
  const existing = await prisma.driver.findUnique({
    where: { externalId: data.externalId },
  });

  if (existing) {
    throw new ConflictError(
      'A driver with this external ID already exists',
      'DRIVER_ALREADY_EXISTS',
    );
  }

  return prisma.driver.create({ data });
}

export async function update(id: number, data: UpdateDriverInput) {
  await findById(id); // reutiliza findById para validar existencia — lanza 404 si no existe
  return prisma.driver.update({ where: { id }, data });
}

export async function softDelete(id: number) {
  await findById(id); // valida existencia antes de intentar borrar

  const activeDependencies = await prisma.fantasyTeam.count({
    where: {
      OR: [{ driver1Id: id }, { driver2Id: id }],
    },
  });

  if (activeDependencies > 0) {
    throw new ConflictError(
      'Cannot delete driver with active fantasy team dependencies',
      'DRIVER_HAS_DEPENDENCIES',
    );
  }

  // Soft delete: los RaceResult históricos siguen apuntando a este piloto.
  return prisma.driver.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
