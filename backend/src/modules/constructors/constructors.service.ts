import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateConstructorInput, UpdateConstructorInput } from './constructors.schema';
import { resolveSeasonId, type ConstructorRef } from '../drivers/drivers.service';

const notDeleted = { deletedAt: null };

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
