import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { createTestAdmin, createTestUser } from '../../tests/setup';
import { prisma } from '../../shared/prisma';

// Se recrea por test porque setup.ts trunca la DB.
let adminToken: string;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
});

const validSeason = { year: 2026 };

describe('GET /api/v1/seasons', () => {
  it('returns empty array when no seasons exist', async () => {
    const res = await request(app).get('/api/v1/seasons');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/v1/seasons — conteos', () => {
  it('cada temporada trae cuantas carreras, ligas y pilotos tiene', async () => {
    const admin = await createTestAdmin();
    const season = await prisma.season.create({ data: { year: 2027 } });

    const circuit = await prisma.circuit.create({
      data: { name: 'Monza', country: 'Italia', city: 'Monza', externalId: 'monza' },
    });
    await prisma.race.create({
      data: {
        name: 'GP de Italia',
        round: 1,
        date: new Date('2027-09-05T13:00:00Z'),
        lockDate: new Date('2027-09-05T12:00:00Z'),
        seasonId: season.id,
        circuitId: circuit.id,
      },
    });

    const constructor = await prisma.constructor.create({
      data: { name: 'McLaren', color: '#FF8000', externalId: 'mclaren' },
    });
    const driver = await prisma.driver.create({
      data: { firstName: 'Lando', lastName: 'Norris', number: 4, code: 'NOR', externalId: 'norris' },
    });
    await prisma.driverSeason.create({
      data: { driverId: driver.id, constructorId: constructor.id, seasonId: season.id },
    });

    await prisma.league.create({
      data: {
        name: 'Liga de prueba',
        inviteCode: 'liga-prueba',
        seasonId: season.id,
        createdById: admin.user.id,
      },
    });

    const res = await request(app).get('/api/v1/seasons');
    expect(res.status).toBe(200);

    const found = res.body.data.find((s: { year: number }) => s.year === 2027);
    expect(found.counts).toEqual({ races: 1, leagues: 1, drivers: 1 });
  });

  it('una temporada vacia trae los tres conteos en cero', async () => {
    await prisma.season.create({ data: { year: 2028 } });

    const res = await request(app).get('/api/v1/seasons');
    const found = res.body.data.find((s: { year: number }) => s.year === 2028);
    expect(found.counts).toEqual({ races: 0, leagues: 0, drivers: 0 });
  });
});

describe('GET /api/v1/seasons/active', () => {
  it('returns 404 when no active season', async () => {
    const res = await request(app).get('/api/v1/seasons/active');
    expect(res.status).toBe(404);
  });

  it('returns the active season', async () => {
    const created = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    const id = created.body.data.id;
    await request(app)
      .patch(`/api/v1/seasons/${id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app).get('/api/v1/seasons/active');
    expect(res.status).toBe(200);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.isActive).toBe(true);
  });
});

describe('POST /api/v1/seasons', () => {
  it('creates a season', async () => {
    const res = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    expect(res.status).toBe(201);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.isActive).toBe(false);
  });

  it('rejects duplicate year', async () => {
    await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    const res = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    expect(res.status).toBe(409);
  });

  it('rejects invalid year', async () => {
    const res = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 1999 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/seasons/:id/activate', () => {
  it('activates a season and deactivates others', async () => {
    const s1 = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 2025 });
    const s2 = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 2026 });

    await request(app)
      .patch(`/api/v1/seasons/${s1.body.data.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/seasons/${s2.body.data.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);

    const all = await request(app).get('/api/v1/seasons');
    const season2025 = all.body.data.find((s: { year: number }) => s.year === 2025);
    expect(season2025.isActive).toBe(false);
  });
});

describe('DELETE /api/v1/seasons/:id', () => {
  it('deletes a season (hard delete)', async () => {
    const created = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    const id = created.body.data.id;

    expect(
      (
        await request(app)
          .delete(`/api/v1/seasons/${id}`)
          .set('Authorization', `Bearer ${adminToken}`)
      ).status,
    ).toBe(204);
    expect((await request(app).get('/api/v1/seasons')).body.data).toHaveLength(0);
  });

  // `races` y `driver_seasons` tienen FK ON DELETE RESTRICT: sin la guarda el error es un 500.
  it('rechaza borrar una temporada que tiene carreras (409, no 500)', async () => {
    const created = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    const seasonId = created.body.data.id;

    const circuit = await prisma.circuit.create({
      data: { name: 'Interlagos', country: 'Brasil', city: 'Sao Paulo', externalId: 'interlagos' },
    });
    await prisma.race.create({
      data: {
        name: 'GP de Brasil',
        round: 1,
        date: new Date('2026-11-08T18:00:00Z'),
        lockDate: new Date('2026-11-08T17:00:00Z'),
        seasonId,
        circuitId: circuit.id,
      },
    });

    const res = await request(app)
      .delete(`/api/v1/seasons/${seasonId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SEASON_HAS_DEPENDENCIES');
  });

  it('rechaza borrar una temporada que tiene pilotos asignados (409, no 500)', async () => {
    const created = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    const seasonId = created.body.data.id;

    const constructor = await prisma.constructor.create({
      data: { name: 'Williams', color: '#64C4FF', externalId: 'williams' },
    });
    const driver = await prisma.driver.create({
      data: { firstName: 'Alex', lastName: 'Albon', number: 23, code: 'ALB', externalId: 'albon' },
    });
    await prisma.driverSeason.create({
      data: { driverId: driver.id, constructorId: constructor.id, seasonId },
    });

    const res = await request(app)
      .delete(`/api/v1/seasons/${seasonId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SEASON_HAS_DEPENDENCIES');
  });

  it('returns 404 when deleting non-existent season', async () => {
    expect(
      (
        await request(app)
          .delete('/api/v1/seasons/999')
          .set('Authorization', `Bearer ${adminToken}`)
      ).status,
    ).toBe(404);
  });
});

describe('seasons — solo admin puede mutar', () => {
  it('rechaza POST sin token (401 TOKEN_MISSING)', async () => {
    const res = await request(app).post('/api/v1/seasons').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza PATCH /:id/activate con token de USER (403 ADMIN_REQUIRED)', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .patch('/api/v1/seasons/1/activate')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// Seasons no tiene GET /:id: se prueba con DELETE como admin para que el 400 sea del id, no del auth.
describe('seasons — :id no numerico', () => {
  it('DELETE /seasons/abc responde 400 VALIDATION_ERROR, no 500', async () => {
    const res = await request(app)
      .delete('/api/v1/seasons/abc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
