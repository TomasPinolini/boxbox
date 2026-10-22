import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../shared/prisma';
import { hashPassword } from '../shared/password';
import { signAccessToken } from '../shared/jwt';
import { assertLocalDatabase } from './db-guard';

assertLocalDatabase(process.env.DATABASE_URL);

beforeEach(async () => {
  // Hijos primero, por las foreign keys. Una tabla nueva tiene que sumarse aca.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE sync_logs CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE league_standings CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE predictions CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE race_results CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE constructor_results CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE draft_picks CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE fantasy_teams CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE league_members CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE leagues CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE driver_seasons CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE races CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE circuits CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE seasons CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE drivers CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE constructors CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Crean el usuario por Prisma y firman el JWT sin pasar por HTTP: register/login ya los
// cubre auth.test.ts.
let testUserCounter = 0;

type CreateTestUserOverrides = Partial<{
  email: string;
  password: string;
  name: string;
  role: 'USER' | 'ADMIN';
}>;

export async function createTestUser(overrides: CreateTestUserOverrides = {}) {
  const counter = ++testUserCounter;
  const email = overrides.email ?? `test-user-${counter}@boxbox.test`;
  const password = overrides.password ?? 'hunter22test';
  const name = overrides.name ?? `Test User ${counter}`;
  const role = overrides.role ?? 'USER';

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role },
  });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  return { user, accessToken };
}

export function createTestAdmin(overrides: Omit<CreateTestUserOverrides, 'role'> = {}) {
  return createTestUser({ ...overrides, role: 'ADMIN' });
}
