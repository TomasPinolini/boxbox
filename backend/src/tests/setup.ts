import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../shared/prisma';

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
