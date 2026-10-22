import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../shared/prisma';
import { hashPassword } from '../shared/password';
import { signAccessToken } from '../shared/jwt';
import { assertLocalDatabase } from './db-guard';

assertLocalDatabase(process.env.DATABASE_URL);

beforeEach(async () => {
  // Un solo TRUNCATE con todas las tablas: Postgres las vacía juntas y el orden no importa.
  // Una tabla nueva tiene que sumarse acá.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      sync_logs, league_standings, predictions, race_results, constructor_results,
      draft_picks, fantasy_teams, league_members, leagues, driver_seasons,
      races, circuits, seasons, drivers, constructors, users
    CASCADE
  `);
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
