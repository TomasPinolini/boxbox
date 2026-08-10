import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../shared/prisma';
import { hashPassword } from '../shared/password';
import { signAccessToken } from '../shared/jwt';

// Clean all tables before each test so tests don't affect each other
beforeEach(async () => {
  // Delete in order that respects foreign key constraints (children first)
  await prisma.$executeRawUnsafe('TRUNCATE TABLE sync_logs CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE league_standings CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE predictions CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE race_results CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE constructor_results CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE driver_swaps CASCADE');
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

// Disconnect from DB after all tests finish
afterAll(async () => {
  await prisma.$disconnect();
});

// ─── TEST HELPERS ────────────────────────────────────────────────
// Crean users via Prisma directo + firman el JWT sin pasar por HTTP.
// Motivo: los tests que necesitan un usuario autenticado no deberian re-testear
// register/login (eso ya lo hace auth.test.ts). Bypass = tests mas rapidos y
// menos frágiles a cambios en el flujo de auth.

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

// Sugar sobre createTestUser para el caso mas comun en tests admin-only.
export function createTestAdmin(overrides: Omit<CreateTestUserOverrides, 'role'> = {}) {
  return createTestUser({ ...overrides, role: 'ADMIN' });
}
