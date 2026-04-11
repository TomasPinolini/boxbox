import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { CreateCircuitInput, UpdateCircuitInput } from './circuits.schema';

const notDeleted = { deletedAt: null };

export async function findAll() {
  return prisma.circuit.findMany({
    where: notDeleted,
    orderBy: { name: 'asc' },
  });
}

export async function findById(id: number) {
  const circuit = await prisma.circuit.findFirst({
    where: { id, ...notDeleted },
  });

  if (!circuit) throw new NotFoundError('Circuit');
  return circuit;
}

export async function create(data: CreateCircuitInput) {
  const existing = await prisma.circuit.findUnique({
    where: { externalId: data.externalId },
  });

  if (existing) {
    throw new ConflictError(
      'A circuit with this external ID already exists',
      'CIRCUIT_ALREADY_EXISTS',
    );
  }

  return prisma.circuit.create({ data });
}

export async function update(id: number, data: UpdateCircuitInput) {
  await findById(id);
  return prisma.circuit.update({ where: { id }, data });
}

export async function softDelete(id: number) {
  await findById(id);

  const activeRaces = await prisma.race.count({
    where: { circuitId: id, status: { in: ['UPCOMING', 'QUALIFYING_LOCKED'] } },
  });

  if (activeRaces > 0) {
    throw new ConflictError(
      'Cannot delete circuit with active races',
      'CIRCUIT_HAS_DEPENDENCIES',
    );
  }

  return prisma.circuit.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
