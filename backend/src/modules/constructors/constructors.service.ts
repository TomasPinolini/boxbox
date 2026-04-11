import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateConstructorInput, UpdateConstructorInput } from './constructors.schema';

const notDeleted = { deletedAt: null };

export async function findAll() {
  return prisma.constructor.findMany({
    where: notDeleted,
    orderBy: { name: 'asc' },
  });
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
