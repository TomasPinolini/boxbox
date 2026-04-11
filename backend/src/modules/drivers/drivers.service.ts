import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateDriverInput, UpdateDriverInput } from './drivers.schema';

// Reusable filter — excludes soft-deleted drivers from all queries
const notDeleted = { deletedAt: null };

export async function findAll(constructorId?: number, seasonId?: number) {
  return prisma.driver.findMany({
    where: {
      ...notDeleted,
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
    where: { id, ...notDeleted },
  });

  if (!driver) throw new NotFoundError('Driver');
  return driver;
}

export async function create(data: CreateDriverInput) {
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
  await findById(id); // Throws NotFoundError if not found
  return prisma.driver.update({ where: { id }, data });
}

export async function softDelete(id: number) {
  await findById(id);

  // Check for active dependencies (fantasy teams using this driver)
  const activeDependencies = await prisma.fantasyTeam.count({
    where: {
      OR: [{ driver1Id: id }, { driver2Id: id }, { reserveDriverId: id }],
    },
  });

  if (activeDependencies > 0) {
    throw new ConflictError(
      'Cannot delete driver with active fantasy team dependencies',
      'DRIVER_HAS_DEPENDENCIES',
    );
  }

  return prisma.driver.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
