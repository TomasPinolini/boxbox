import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { createTestAdmin, createTestUser } from '../../tests/setup';
import { prisma } from '../../shared/prisma';

// adminToken: el CRUD de catalogo es admin-only (A5 / BOX-15); se recrea por test (truncate).
let adminToken: string;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
});

const validConstructor = {
  name: 'McLaren',
  color: '#FF8000',
  externalId: 'mclaren',
};

describe('GET /api/v1/constructors', () => {
  it('returns empty array when no constructors exist', async () => {
    const res = await request(app).get('/api/v1/constructors');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns all non-deleted constructors', async () => {
    await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);
    await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...validConstructor,
        name: 'Ferrari',
        color: '#DC0000',
        externalId: 'ferrari',
      });

    const res = await request(app).get('/api/v1/constructors');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('GET /api/v1/constructors/:id', () => {
  it('returns a constructor by id', async () => {
    const created = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);
    const id = created.body.data.id;

    const res = await request(app).get(`/api/v1/constructors/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('McLaren');
  });

  it('returns 404 for non-existent constructor', async () => {
    const res = await request(app).get('/api/v1/constructors/999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CONSTRUCTOR_NOT_FOUND');
  });
});

describe('POST /api/v1/constructors', () => {
  it('creates a constructor with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'McLaren',
      color: '#FF8000',
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('rejects request with missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'McLaren' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('color');
  });

  it('rejects duplicate externalId', async () => {
    await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);

    const res = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONSTRUCTOR_ALREADY_EXISTS');
  });
});

describe('PATCH /api/v1/constructors/:id', () => {
  it('updates a constructor partially', async () => {
    const created = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);
    const id = created.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/constructors/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ color: '#FF9900' });

    expect(res.status).toBe(200);
    expect(res.body.data.color).toBe('#FF9900');
    expect(res.body.data.name).toBe('McLaren');
  });

  it('returns 404 when updating non-existent constructor', async () => {
    const res = await request(app)
      .patch('/api/v1/constructors/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ color: '#FF9900' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/constructors/:id', () => {
  it('soft deletes a constructor (returns 204)', async () => {
    const created = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);
    const id = created.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/v1/constructors/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app).get('/api/v1/constructors');
    expect(listRes.body.data).toHaveLength(0);

    const getRes = await request(app).get(`/api/v1/constructors/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting non-existent constructor', async () => {
    const res = await request(app)
      .delete('/api/v1/constructors/999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── Solo admin muta el catalogo (A5 / BOX-15) ─────────────────────────

describe('constructors — solo admin puede mutar', () => {
  it('rechaza POST sin token (401 TOKEN_MISSING)', async () => {
    const res = await request(app).post('/api/v1/constructors').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza DELETE con token de USER (403 ADMIN_REQUIRED)', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .delete('/api/v1/constructors/1')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// A3 / BOX-13: un :id no numerico antes llegaba a Prisma como NaN y explotaba en 500.
describe('constructors — :id no numerico', () => {
  it('GET /constructors/abc responde 400 VALIDATION_ERROR, no 500', async () => {
    const res = await request(app).get('/api/v1/constructors/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// Fixtures directo por Prisma, mismo criterio que drivers.test.ts: crear la grilla por HTTP
// solo agrega ruido. ConstructorResult se siembra a mano (no via POST /races/:id/results)
// porque aca se prueba la suma del campeonato, no la derivacion del Slice 8.
async function seedTeam(seasonId: number, name: string, externalId: string) {
  const constructor = await prisma.constructor.create({
    data: { name, color: '#FF0000', externalId },
  });
  const driver = await prisma.driver.create({
    data: {
      firstName: 'Piloto',
      lastName: name,
      number: 1,
      code: 'PIL',
      externalId: `${externalId}-${seasonId}`,
    },
  });
  await prisma.driverSeason.create({
    data: { driverId: driver.id, constructorId: constructor.id, seasonId },
  });
  return constructor.id;
}

async function linkToSeason(constructorId: number, seasonId: number) {
  const driver = await prisma.driver.create({
    data: {
      firstName: 'Piloto',
      lastName: 'Extra',
      number: 2,
      code: 'EXT',
      externalId: `extra-${constructorId}-${seasonId}`,
    },
  });
  await prisma.driverSeason.create({ data: { driverId: driver.id, constructorId, seasonId } });
}

async function seedRaceTotals(
  seasonId: number,
  round: number,
  totals: { constructorId: number; totalPoints: number }[],
) {
  const circuit = await prisma.circuit.create({
    data: {
      name: `Circuito ${round}`,
      city: 'Rosario',
      country: 'AR',
      externalId: `circuito-${round}`,
    },
  });
  const race = await prisma.race.create({
    data: {
      name: `Gran Premio ${round}`,
      round,
      date: new Date(`2026-0${round}-01T15:00:00Z`),
      lockDate: new Date(`2026-0${round}-01T13:00:00Z`),
      seasonId,
      circuitId: circuit.id,
      status: 'COMPLETED',
    },
  });
  await prisma.constructorResult.createMany({
    data: totals.map((t) => ({ raceId: race.id, driver1Points: t.totalPoints, ...t })),
  });
}

describe('GET /api/v1/constructors/standings — campeonato de escuderias', () => {
  type Row = { position: number; points: number; constructor: { name: string } };
  const summary = (rows: Row[]) => rows.map((r) => [r.position, r.constructor.name, r.points]);

  it('suma dos carreras, ordena por puntos e incluye a las de 0 puntos', async () => {
    const season = await prisma.season.create({ data: { year: 2026, isActive: true } });
    const ferrari = await seedTeam(season.id, 'Ferrari', 'ferrari');
    const mclaren = await seedTeam(season.id, 'McLaren', 'mclaren');
    await seedTeam(season.id, 'Alpine', 'alpine'); // sin resultados: tiene que aparecer en 0

    // Ferrari gana la fecha 1 pero McLaren la da vuelta en la 2: si solo se leyera una
    // carrera, o si el orden fuera alfabetico, el resultado seria otro.
    await seedRaceTotals(season.id, 1, [
      { constructorId: ferrari, totalPoints: 43 },
      { constructorId: mclaren, totalPoints: 27 },
    ]);
    await seedRaceTotals(season.id, 2, [
      { constructorId: ferrari, totalPoints: 10 },
      { constructorId: mclaren, totalPoints: 40 },
    ]);

    const res = await request(app).get('/api/v1/constructors/standings');

    expect(res.status).toBe(200);
    expect(summary(res.body.data)).toEqual([
      [1, 'McLaren', 67],
      [2, 'Ferrari', 53],
      [3, 'Alpine', 0],
    ]);
    expect(res.body.data[0].constructor).toEqual({
      id: mclaren,
      name: 'McLaren',
      color: '#FF0000',
      logoUrl: null,
    });
  });

  it('excluye resultados de otra temporada y acepta ?seasonId=', async () => {
    const vieja = await prisma.season.create({ data: { year: 2025, isActive: false } });
    const activa = await prisma.season.create({ data: { year: 2026, isActive: true } });
    const ferrari = await seedTeam(vieja.id, 'Ferrari', 'ferrari');
    await linkToSeason(ferrari, activa.id);
    await seedRaceTotals(vieja.id, 1, [{ constructorId: ferrari, totalPoints: 43 }]);
    await seedRaceTotals(activa.id, 2, [{ constructorId: ferrari, totalPoints: 12 }]);

    const current = await request(app).get('/api/v1/constructors/standings');
    const old = await request(app).get(`/api/v1/constructors/standings?seasonId=${vieja.id}`);

    expect(summary(current.body.data)).toEqual([[1, 'Ferrari', 12]]);
    expect(summary(old.body.data)).toEqual([[1, 'Ferrari', 43]]);
  });

  it('excluye escuderias soft-deleted y las que no corren la temporada', async () => {
    const season = await prisma.season.create({ data: { year: 2026, isActive: true } });
    const borrada = await seedTeam(season.id, 'Ferrari', 'ferrari');
    await seedTeam(season.id, 'McLaren', 'mclaren');
    await prisma.constructor.create({
      data: { name: 'Sin Temporada', color: '#000000', externalId: 'none' },
    });
    await seedRaceTotals(season.id, 1, [{ constructorId: borrada, totalPoints: 43 }]);
    await prisma.constructor.update({ where: { id: borrada }, data: { deletedAt: new Date() } });

    const res = await request(app).get('/api/v1/constructors/standings');

    expect(summary(res.body.data)).toEqual([[1, 'McLaren', 0]]);
  });

  it('responde 200 con lista vacia cuando no hay temporada activa', async () => {
    const res = await request(app).get('/api/v1/constructors/standings');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('rechaza ?seasonId=abc con 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/constructors/standings?seasonId=abc');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
