// TEST — módulo completo contra la DB real: HTTP → routes → controller → service → Prisma.

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../shared/prisma';
import { createTestAdmin, createTestUser } from '../../tests/setup';

let adminToken: string;
let seasonId: number;
let circuitId: number;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
  const season = await prisma.season.create({
    data: { year: 2026, isActive: true, driverCount: 22 },
  });
  seasonId = season.id;
  const circuit = await prisma.circuit.create({
    data: { name: 'Circuito', city: 'Rosario', country: 'AR', externalId: 'circuito' },
  });
  circuitId = circuit.id;
});

// Helpers locales — tests/setup.ts solo exporta createTestUser/createTestAdmin.
async function seedConstructor(name: string) {
  const c = await prisma.constructor.create({
    data: { name, color: '#FF0000', externalId: name.toLowerCase() },
  });
  return c.id;
}

async function seedDriver(code: string, constructorId: number) {
  const d = await prisma.driver.create({
    data: { firstName: code, lastName: code, number: 1, code, externalId: code.toLowerCase() },
  });
  await prisma.driverSeason.create({ data: { driverId: d.id, constructorId, seasonId } });
  return d.id;
}

async function seedRace(round: number, status: 'COMPLETED' | 'UPCOMING' = 'COMPLETED') {
  const r = await prisma.race.create({
    data: {
      name: `GP ${round}`,
      round,
      date: new Date(`2026-0${round}-01T15:00:00Z`),
      lockDate: new Date(`2026-0${round}-01T13:00:00Z`),
      seasonId,
      circuitId,
      status,
    },
  });
  return r.id;
}

async function seedResults(
  raceId: number,
  driverPoints: { driverId: number; points: number }[],
  constructorPoints: { constructorId: number; totalPoints: number }[] = [],
) {
  for (const d of driverPoints) {
    await prisma.raceResult.create({
      data: { raceId, driverId: d.driverId, position: 1, points: d.points },
    });
  }
  for (const c of constructorPoints) {
    await prisma.constructorResult.create({
      data: { raceId, constructorId: c.constructorId, totalPoints: c.totalPoints },
    });
  }
}

// Una liga con N miembros, cada uno con su FantasyTeam ya armado.
async function seedLeague(teams: { driver1Id?: number; driver2Id?: number; constructorId?: number }[]) {
  const owner = await createTestUser({ email: 'owner@test.com' });
  const league = await prisma.league.create({
    data: {
      name: 'Liga',
      inviteCode: `liga${Date.now()}`.slice(0, 20),
      seasonId,
      createdById: owner.user.id,
    },
  });

  const memberIds: number[] = [];
  for (const [i, team] of teams.entries()) {
    const user = i === 0 ? owner : await createTestUser({ email: `m${i}@test.com` });
    const member = await prisma.leagueMember.create({
      data: { leagueId: league.id, userId: user.user.id, isOwner: i === 0 },
    });
    await prisma.fantasyTeam.create({ data: { leagueMemberId: member.id, ...team } });
    memberIds.push(member.id);
  }

  return { leagueId: league.id, memberIds, ownerToken: owner.accessToken };
}

describe('POST /api/v1/races/:id/recalculate', () => {
  it('genera un standing por miembro, con posiciones 1..N por totalPoints', async () => {
    const ferrari = await seedConstructor('Ferrari');
    const mclaren = await seedConstructor('McLaren');
    const leclerc = await seedDriver('LEC', ferrari);
    const norris = await seedDriver('NOR', mclaren);
    const piastri = await seedDriver('PIA', mclaren);

    const raceId = await seedRace(1);
    await seedResults(
      raceId,
      [
        { driverId: leclerc, points: 25 },
        { driverId: norris, points: 18 },
        { driverId: piastri, points: 15 },
      ],
      [
        { constructorId: ferrari, totalPoints: 25 },
        { constructorId: mclaren, totalPoints: 33 },
      ],
    );

    const { leagueId, memberIds } = await seedLeague([
      { driver1Id: leclerc, driver2Id: norris, constructorId: ferrari }, // 25+18+25 = 68
      { driver1Id: piastri, constructorId: mclaren }, // 15+0+33 = 48
    ]);

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ leagues: 1, standings: 2 });

    const rows = await prisma.leagueStanding.findMany({
      where: { raceId },
      orderBy: { position: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      leagueMemberId: memberIds[0],
      driverPoints: 43,
      constructorPoints: 25,
      totalPoints: 68,
      position: 1,
      positionChange: 0, // primera carrera
    });
    expect(rows[1]).toMatchObject({ totalPoints: 48, position: 2 });
    expect(leagueId).toBeDefined();
  });

  // La regla de dominio central: un standing es la foto del campeonato hasta esa fecha,
  // no los puntos de esa carrera sola (docs/domain-entities.md §LeagueStanding).
  it('acumula los puntos de todas las carreras anteriores', async () => {
    const ferrari = await seedConstructor('Ferrari');
    const leclerc = await seedDriver('LEC', ferrari);

    const race1 = await seedRace(1);
    await seedResults(race1, [{ driverId: leclerc, points: 25 }]);
    const race2 = await seedRace(2);
    await seedResults(race2, [{ driverId: leclerc, points: 18 }]);

    await seedLeague([{ driver1Id: leclerc }]);

    await request(app)
      .post(`/api/v1/races/${race1}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/v1/races/${race2}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const afterRace1 = await prisma.leagueStanding.findFirst({ where: { raceId: race1 } });
    const afterRace2 = await prisma.leagueStanding.findFirst({ where: { raceId: race2 } });

    expect(afterRace1?.totalPoints).toBe(25);
    expect(afterRace2?.totalPoints).toBe(43); // 25 + 18, no 18
  });

  it('calcula positionChange contra la carrera anterior (positivo = subio)', async () => {
    const ferrari = await seedConstructor('Ferrari');
    const mclaren = await seedConstructor('McLaren');
    const leclerc = await seedDriver('LEC', ferrari);
    const norris = await seedDriver('NOR', mclaren);

    const race1 = await seedRace(1);
    await seedResults(race1, [
      { driverId: leclerc, points: 25 },
      { driverId: norris, points: 10 },
    ]);
    const race2 = await seedRace(2);
    await seedResults(race2, [
      { driverId: leclerc, points: 0 },
      { driverId: norris, points: 25 },
    ]);

    const { memberIds } = await seedLeague([{ driver1Id: leclerc }, { driver1Id: norris }]);

    await request(app)
      .post(`/api/v1/races/${race1}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/v1/races/${race2}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Tras la carrera 2: Norris 35, Leclerc 25 -> se dan vuelta.
    const norrisRow = await prisma.leagueStanding.findFirst({
      where: { raceId: race2, leagueMemberId: memberIds[1] },
    });
    const leclercRow = await prisma.leagueStanding.findFirst({
      where: { raceId: race2, leagueMemberId: memberIds[0] },
    });

    expect(norrisRow).toMatchObject({ position: 1, positionChange: 1 }); // subio del 2 al 1
    expect(leclercRow).toMatchObject({ position: 2, positionChange: -1 });
  });

  it('un equipo incompleto suma lo que tiene, no queda afuera', async () => {
    const ferrari = await seedConstructor('Ferrari');
    const leclerc = await seedDriver('LEC', ferrari);
    const raceId = await seedRace(1);
    await seedResults(raceId, [{ driverId: leclerc, points: 25 }], [
      { constructorId: ferrari, totalPoints: 25 },
    ]);

    await seedLeague([{ driver1Id: leclerc }]); // sin driver2 ni constructor

    await request(app)
      .post(`/api/v1/races/${raceId}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const row = await prisma.leagueStanding.findFirst({ where: { raceId } });
    expect(row).toMatchObject({ driverPoints: 25, constructorPoints: 0, totalPoints: 25 });
  });

  it('ignora a los miembros que se fueron', async () => {
    const ferrari = await seedConstructor('Ferrari');
    const leclerc = await seedDriver('LEC', ferrari);
    const raceId = await seedRace(1);
    await seedResults(raceId, [{ driverId: leclerc, points: 25 }]);

    const { memberIds } = await seedLeague([{ driver1Id: leclerc }, { driver1Id: leclerc }]);
    await prisma.leagueMember.update({
      where: { id: memberIds[1] },
      data: { status: 'LEFT' },
    });

    await request(app)
      .post(`/api/v1/races/${raceId}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const rows = await prisma.leagueStanding.findMany({ where: { raceId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].leagueMemberId).toBe(memberIds[0]);
  });

  // El endpoint se llama recalculate: tiene que poder correrse de nuevo sin duplicar.
  it('es idempotente', async () => {
    const ferrari = await seedConstructor('Ferrari');
    const leclerc = await seedDriver('LEC', ferrari);
    const raceId = await seedRace(1);
    await seedResults(raceId, [{ driverId: leclerc, points: 25 }]);
    await seedLeague([{ driver1Id: leclerc }]);

    for (let i = 0; i < 2; i++) {
      await request(app)
        .post(`/api/v1/races/${raceId}/recalculate`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    expect(await prisma.leagueStanding.count({ where: { raceId } })).toBe(1);
  });

  it('rechaza una carrera que todavia no se corrio (409)', async () => {
    const raceId = await seedRace(1, 'UPCOMING');

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_NOT_COMPLETED');
  });

  it('rechaza a un usuario que no es admin (403)', async () => {
    const { accessToken } = await createTestUser();
    const raceId = await seedRace(1);

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/recalculate`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

describe('GET /api/v1/leagues/:id/standings', () => {
  it('devuelve la tabla ordenada por posicion, con el nombre de cada usuario', async () => {
    const ferrari = await seedConstructor('Ferrari');
    const leclerc = await seedDriver('LEC', ferrari);
    const raceId = await seedRace(1);
    await seedResults(raceId, [{ driverId: leclerc, points: 25 }]);
    const { leagueId, ownerToken } = await seedLeague([{ driver1Id: leclerc }]);

    await request(app)
      .post(`/api/v1/races/${raceId}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`/api/v1/leagues/${leagueId}/standings`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.raceId).toBe(raceId);
    expect(res.body.data.standings[0]).toMatchObject({ position: 1, totalPoints: 25 });
    expect(res.body.data.standings[0].user.name).toBeDefined();
  });

  it('devuelve lista vacia si la liga todavia no tiene ninguna carrera puntuada', async () => {
    const { leagueId, ownerToken } = await seedLeague([{}]);

    const res = await request(app)
      .get(`/api/v1/leagues/${leagueId}/standings`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ raceId: null, standings: [] });
  });

  it('rechaza a quien no es miembro de la liga (404, anti-enumeracion)', async () => {
    const { leagueId } = await seedLeague([{}]);
    const intruso = await createTestUser({ email: 'intruso@test.com' });

    const res = await request(app)
      .get(`/api/v1/leagues/${leagueId}/standings`)
      .set('Authorization', `Bearer ${intruso.accessToken}`);

    expect(res.status).toBe(404);
  });

  it('rechaza ?raceId=abc con 400, no 500', async () => {
    const { leagueId, ownerToken } = await seedLeague([{}]);

    const res = await request(app)
      .get(`/api/v1/leagues/${leagueId}/standings?raceId=abc`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
