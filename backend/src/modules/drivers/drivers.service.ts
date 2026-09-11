// SERVICE — el cerebro del módulo
// Toda la lógica de negocio y el acceso a la base de datos viven acá.
// No sabe que existe HTTP: no toca req, res ni next.
// Comunica errores lanzando excepciones (AppError y subclases) — el controller las atrapa.

import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateDriverInput, UpdateDriverInput } from './drivers.schema';
import type { RaceResultStatus } from '../../generated/prisma/client';

// Objeto compartido para excluir soft-deleted en todas las queries.
// Closure de módulo: todas las funciones de este archivo lo "ven" sin recibirlo como parámetro.
const notDeleted = { deletedAt: null };

// Escuderia tal como la exponemos en la API. No es el modelo entero de Constructor:
// el listado solo necesita con que pintar el chip de equipo.
export type ConstructorRef = {
  id: number;
  name: string;
  color: string;
  logoUrl: string | null;
};

// Resuelve contra que temporada leer la escuderia: la explicita si vino por query, si no
// la activa, y si no hay ninguna -> null.
//
// Por que NO importamos seasonsService.findActive(): esa tira NotFoundError, asi que
// GET /drivers devolveria 404 en una DB sin temporada activa. Eso es exactamente el estado
// de la DB en cada test (setup.ts trunca seasons antes de cada uno) y el de un clone fresco
// sin seed. Un endpoint publico de catalogo no puede depender de que exista una temporada.
async function resolveSeasonId(seasonId?: number): Promise<number | null> {
  if (seasonId) return seasonId;
  const active = await prisma.season.findFirst({ where: { isActive: true } });
  return active?.id ?? null;
}

// Cruza los DriverSeason con los Constructor y devuelve un indice driverId -> escuderia.
// Funcion pura, sin DB — mismo criterio que buildConstructorResults en races.service.ts.
function indexConstructorsByDriver(
  links: { driverId: number; constructorId: number }[],
  constructors: ConstructorRef[],
): Map<number, ConstructorRef> {
  const byId = new Map(constructors.map((c) => [c.id, c]));
  const byDriver = new Map<number, ConstructorRef>();
  for (const link of links) {
    const constructor = byId.get(link.constructorId);
    // Si la escuderia esta soft-deleted no entra en `constructors`, y el piloto queda sin
    // equipo. Decision explicita: lo borrado no existe para las lecturas publicas.
    if (constructor) byDriver.set(link.driverId, constructor);
  }
  return byDriver;
}

// GET /drivers — listado publico con la escuderia de cada piloto.
//
// Se resuelve en tres queries planas + merge en TS en vez de un include/select sobre la
// relacion `constructor`. Motivo: el modelo Constructor genera un campo que se llama
// literalmente `constructor`, que colisiona con la propiedad que todo objeto JS hereda de
// Object.prototype. Eso rompio tsc en los Slices 4 y 5 (ver roadmap, "Bug de tipos"). El
// delegate prisma.constructor es seguro; lo que muerde es la relacion dentro de un select.
export async function findAll(constructorId?: number, seasonId?: number) {
  const resolvedSeasonId = await resolveSeasonId(seasonId);

  const drivers = await prisma.driver.findMany({
    where: {
      ...notDeleted, // siempre filtra borrados
      // El filtro por escuderia se acota ademas a la temporada resuelta: sin eso, un piloto
      // que corrio para Ferrari en 2025 aparecia al filtrar Ferrari en 2026 mostrando en su
      // fila la escuderia actual — listado y filtro se contradecian.
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

  // Sin temporada resuelta no hay contra que buscar la escuderia: todos van sin equipo.
  if (!resolvedSeasonId) return drivers.map((driver) => ({ ...driver, constructor: null }));

  const byDriver = await constructorsForDrivers(
    drivers.map((d) => d.id),
    resolvedSeasonId,
  );

  return drivers.map((driver) => ({
    ...driver,
    constructor: byDriver.get(driver.id) ?? null,
  }));
}

// Las dos queries que faltan del merge de arriba. Aparte porque findDetail hace lo mismo
// para un solo piloto.
async function constructorsForDrivers(
  driverIds: number[],
  seasonId: number,
): Promise<Map<number, ConstructorRef>> {
  // Fila entera, sin select: ver el comentario de colision de nombres en findAll.
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

// Version flaca: solo valida existencia. NO se exporta a proposito — update() y
// softDelete() la usan para el 404 y no tienen por que pagar los joins del detalle.
// El endpoint publico usa findDetail(). Sin el export, knip no la reporta como muerta y
// queda auto-documentado cual es cual.
async function findById(id: number) {
  const driver = await prisma.driver.findFirst({
    where: { id, ...notDeleted }, // findFirst porque filtramos deletedAt (no es solo PK)
  });

  // Si no existe (o fue soft-deleted), lanza NotFoundError → controller → errorHandler → 404
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

// Agregacion en memoria sobre filas planas, no con groupBy/aggregate de Prisma: es el patron
// del proyecto (ver buildConstructorResults en races.service.ts). Ventajas concretas: una sola
// query en vez de tres, y la funcion se testea sin DB porque es pura.
// No exportada — nadie fuera de este modulo la necesita.
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

// GET /drivers/:id — el piloto con su escuderia, sus estadisticas y su historial de carreras,
// todo acotado a la temporada resuelta (la activa salvo que se pase ?seasonId=).
//
// Reusa findById para el 404 antes de traer nada mas, igual que getResults en races.service.ts.
export async function findDetail(id: number, seasonId?: number) {
  const driver = await findById(id);
  const resolvedSeasonId = await resolveSeasonId(seasonId);

  // Sin temporada no hay contra que leer: escuderia vacia, stats en cero, historial vacio.
  // No caemos a "toda la carrera del piloto" porque mezclaria temporadas y `round` dejaria
  // de ser un orden total.
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

  // include: { race: true } es seguro — el problema de nombres es con la relacion
  // `constructor`, que no aparece por ningun lado en esta query.
  //
  // Orden por `round`, no por el `position asc nulls last` canonico de races.service.ts: ese
  // ordena los resultados DE una carrera; el historial DE un piloto se lee cronologicamente.
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
    // Aplanado a proposito: la tabla del frontend no tiene que navegar dos niveles.
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

export async function create(data: CreateDriverInput) {
  // externalId es el ID del piloto en Jolpica-F1. Debe ser único.
  // Usamos findUnique (sin filtro deletedAt) para detectar conflictos aunque estén borrados.
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

  // No podemos borrar un piloto que está en uso en algún FantasyTeam activo
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

  // Soft delete: no borramos la fila, seteamos deletedAt.
  // Los RaceResult históricos siguen apuntando a este piloto — si lo borráramos físicamente, romperíamos esas referencias.
  return prisma.driver.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
