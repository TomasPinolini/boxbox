// SERVICE — el cerebro del módulo
// Toda la lógica de negocio y el acceso a la base de datos viven acá.
// No sabe que existe HTTP: no toca req, res ni next.
// Comunica errores lanzando excepciones (AppError y subclases) — el controller las atrapa.

import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateDriverInput, UpdateDriverInput } from './drivers.schema';

// Objeto compartido para excluir soft-deleted en todas las queries.
// Closure de módulo: todas las funciones de este archivo lo "ven" sin recibirlo como parámetro.
const notDeleted = { deletedAt: null };

export async function findAll(constructorId?: number, seasonId?: number) {
  return prisma.driver.findMany({
    where: {
      ...notDeleted, // siempre filtra borrados
      // Si se pasaron filtros opcionales, agrega la condición de temporada/constructor
      ...(constructorId || seasonId
        ? {
            seasons: {
              some: {
                ...(constructorId ? { constructorId } : {}),
                ...(seasonId ? { seasonId } : {}),
              },
            },
          }
        : {}),
    },
    orderBy: { lastName: 'asc' },
  });
}

export async function findById(id: number) {
  const driver = await prisma.driver.findFirst({
    where: { id, ...notDeleted }, // findFirst porque filtramos deletedAt (no es solo PK)
  });

  // Si no existe (o fue soft-deleted), lanza NotFoundError → controller → errorHandler → 404
  if (!driver) throw new NotFoundError('Driver');
  return driver;
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
