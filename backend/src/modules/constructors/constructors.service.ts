import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateConstructorInput, UpdateConstructorInput } from './constructors.schema';
import { resolveSeasonId, type ConstructorRef } from '../drivers/drivers.service';

const notDeleted = { deletedAt: null };

// Estos dos `select` van con `as Prisma.XSelect` (type assertion, NO anotacion con `:`): sus
// modelos tienen una relacion llamada `constructor`, que colisiona con Object.prototype y hace
// que tsc rechace cualquier select o include sobre ellos. Mismo workaround que Slices 4, 5, 9
// y 14. No lo ve ningun test: la suite pasa en verde y el build no compila.
const driverSeasonDriverIdSelect = { driverId: true } as Prisma.DriverSeasonSelect;

const constructorResultDetailSelect = {
  raceId: true,
  driver1Points: true,
  driver2Points: true,
  totalPoints: true,
} as Prisma.ConstructorResultSelect;

export async function findAll() {
  return prisma.constructor.findMany({
    where: notDeleted,
    orderBy: { name: 'asc' },
  });
}

// GET /constructors/standings — campeonato de escuderias de la temporada resuelta (Slice 16).
// Misma resolucion de temporada que GET /drivers (explicita -> activa -> ninguna = []).
// Entran todas las escuderias con DriverSeason en la temporada, tambien las de 0 puntos.
export async function findStandings(seasonId?: number) {
  const resolvedSeasonId = await resolveSeasonId(seasonId);
  if (!resolvedSeasonId) return [];

  // Fila entera, sin select/include: la relacion `constructor` colisiona con
  // Object.prototype (ver drivers.service.ts, findAll).
  const links = await prisma.driverSeason.findMany({ where: { seasonId: resolvedSeasonId } });
  const constructors = await prisma.constructor.findMany({
    where: { id: { in: links.map((l) => l.constructorId) }, ...notDeleted },
  });

  const pointRows = await prisma.constructorResult.groupBy({
    by: ['constructorId'],
    where: { race: { seasonId: resolvedSeasonId } },
    _sum: { totalPoints: true },
  });
  const points = new Map(pointRows.map((r) => [r.constructorId, r._sum.totalPoints ?? 0]));

  // Se pasa por ConstructorRef ANTES de ordenar. El tipo de fila que genera Prisma para este
  // modelo queda intersectado con Function (el delegate se llama `constructor`, igual que
  // Object.prototype.constructor), y ahi `name` choca con Function.name y tipa como `never`:
  // `c.name.localeCompare` no compila. Asignarlo a un campo `string` si (never es asignable
  // a todo) — es la misma razon por la que drivers.service.ts mapea a ConstructorRef.
  const refs: ConstructorRef[] = constructors.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    logoUrl: c.logoUrl,
  }));

  return refs
    .map((ref) => ({ ref, points: points.get(ref.id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.ref.name.localeCompare(b.ref.name))
    .map(({ ref, points: total }, index) => ({
      position: index + 1,
      points: total,
      constructor: ref,
    }));
}

export async function findById(id: number) {
  const constructor = await prisma.constructor.findFirst({
    where: { id, ...notDeleted },
  });

  if (!constructor) throw new NotFoundError('Constructor');
  return constructor;
}

// GET /constructors/:id — el detalle publico de una escuderia: quienes la corren esta
// temporada y como viene puntuando. Mismo molde que findDetail de drivers (Slice 14):
// findById queda para los chequeos de existencia y no paga estos joins.
//
// Ninguna de estas queries incluye la relacion `constructor`: ese nombre colisiona con
// Object.prototype y rompe tsc (Slices 4, 5, 9 y 14). Se piden las tablas de al lado y se
// arma el objeto en TS.
export async function findDetail(id: number) {
  const constructor = await findById(id);
  const resolvedSeasonId = await resolveSeasonId();

  // Sin temporada no hay contra que leer. No caemos a "toda la historia de la escuderia"
  // porque mezclaria temporadas y `round` dejaria de ser un orden total.
  if (!resolvedSeasonId) {
    return {
      ...constructor,
      seasonId: null,
      drivers: [],
      stats: { races: 0, points: 0 },
      results: [],
    };
  }

  // Queries planas y merge en TS, nunca `include`. `DriverSeason` y `ConstructorResult` tienen
  // una relacion llamada `constructor`, y ese nombre colisiona con Object.prototype: el tipo
  // Include generado lo hereda como Function y tsc rechaza hasta `include: { race: true }`.
  // Es la misma trampa de las Slices 4, 5, 9 y 14, y no la ve ningun test: la suite pasa en
  // verde y el build no compila.
  const driverSeasons = (await prisma.driverSeason.findMany({
    where: { constructorId: id, seasonId: resolvedSeasonId },
    select: driverSeasonDriverIdSelect,
  })) as { driverId: number }[];
  const drivers = await prisma.driver.findMany({
    where: { id: { in: driverSeasons.map((ds) => ds.driverId) } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      number: true,
      code: true,
      headshotUrl: true,
    },
    orderBy: { number: 'asc' },
  });

  const results = (await prisma.constructorResult.findMany({
    where: { constructorId: id, race: { seasonId: resolvedSeasonId } },
    select: constructorResultDetailSelect,
  })) as { raceId: number; driver1Points: number; driver2Points: number; totalPoints: number }[];
  const races = await prisma.race.findMany({
    where: { id: { in: results.map((r) => r.raceId) } },
    select: { id: true, name: true, round: true, date: true },
  });
  const raceById = new Map(races.map((race) => [race.id, race]));

  // Los puntos POR PILOTO. ConstructorResult no sabe de quien es cada numero: driver1Points es
  // solo "el mayor de los dos" y se reordena carrera a carrera (BOX-65). RaceResult es la unica
  // tabla que ata un puntaje a una persona, asi que el desglose sale de aca.
  //
  // `select` plano sin cast: RaceResult no tiene relacion `constructor`, asi que no sufre la
  // colision con Object.prototype que si afecta a DriverSeason y ConstructorResult.
  const perDriver = await prisma.raceResult.findMany({
    where: { driverId: { in: drivers.map((d) => d.id) }, raceId: { in: results.map((r) => r.raceId) } },
    select: { raceId: true, driverId: true, points: true },
  });
  const pointsByRace = new Map<number, Record<number, number>>();
  for (const row of perDriver) {
    const bucket = pointsByRace.get(row.raceId) ?? {};
    bucket[row.driverId] = row.points;
    pointsByRace.set(row.raceId, bucket);
  }

  return {
    ...constructor,
    seasonId: resolvedSeasonId,
    drivers,
    stats: {
      races: results.length,
      points: results.reduce((total, r) => total + r.totalPoints, 0),
    },
    // Aplanado a proposito: la tabla del frontend no tiene que navegar dos niveles. El orden
    // por `round` se hace aca y no en la query porque ordenar por la relacion exigiria tocar
    // `race`, que es lo que no se puede.
    results: results
      .map((r) => {
        const race = raceById.get(r.raceId);
        return {
          raceId: r.raceId,
          raceName: race?.name ?? '',
          round: race?.round ?? 0,
          raceDate: race?.date ?? null,
          // Se conservan por compatibilidad, pero NO son pilotos: ver BOX-65. Lo que la
          // pantalla muestra es pointsByDriverId.
          driver1Points: r.driver1Points,
          driver2Points: r.driver2Points,
          totalPoints: r.totalPoints,
          pointsByDriverId: pointsByRace.get(r.raceId) ?? {},
        };
      })
      .sort((a, b) => a.round - b.round),
  };
}

export async function create(data: CreateConstructorInput) {
  const existing = await prisma.constructor.findUnique({
    where: { externalId: data.externalId },
  });

  if (existing) {
    throw new ConflictError(
      'A constructor with this external ID already exists',
      'CONSTRUCTOR_ALREADY_EXISTS',
    );
  }

  return prisma.constructor.create({ data });
}

export async function update(id: number, data: UpdateConstructorInput) {
  await findById(id);
  return prisma.constructor.update({ where: { id }, data });
}

export async function softDelete(id: number) {
  await findById(id);

  const activeDependencies = await prisma.fantasyTeam.count({
    where: { constructorId: id },
  });

  if (activeDependencies > 0) {
    throw new ConflictError(
      'Cannot delete constructor with active fantasy team dependencies',
      'CONSTRUCTOR_HAS_DEPENDENCIES',
    );
  }

  return prisma.constructor.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
