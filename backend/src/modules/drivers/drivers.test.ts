// TEST — el verificador de extremo a extremo
// Prueba el módulo completo: HTTP → routes → controller → service → Prisma → DB real.
// No hay mocks — si algo está roto en cualquier capa, el test falla.
// La DB se trunca antes de cada test (ver src/tests/setup.ts) → cada test empieza limpio.

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest'; // simula requests HTTP sin levantar un puerto real
import app from '../../app';
import { createTestAdmin, createTestUser } from '../../tests/setup';
import { prisma } from '../../shared/prisma';

// adminToken: el CRUD de catalogo es admin-only (A5 / BOX-15). setup.ts trunca la DB antes de
// cada test, asi que el admin se recrea por test.
let adminToken: string;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
});

// Driver válido reutilizado en múltiples tests
const validDriver = {
  firstName: 'Max',
  lastName: 'Verstappen',
  number: 1,
  code: 'VER',
  externalId: 'verstappen',
};

describe('GET /api/v1/drivers', () => {
  it('returns empty array when no drivers exist', async () => {
    const res = await request(app).get('/api/v1/drivers');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns all non-deleted drivers', async () => {
    // Cada test crea sus propios datos — no depende de que otro test haya creado algo
    await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDriver);
    await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...validDriver,
        firstName: 'Lando',
        lastName: 'Norris',
        number: 4,
        code: 'NOR',
        externalId: 'norris',
      });

    const res = await request(app).get('/api/v1/drivers');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

// Helpers locales, no compartidos. tests/setup.ts solo exporta createTestUser/createTestAdmin;
// races.test.ts ya sento el precedente de que cada archivo arme los suyos. Season, Constructor
// y DriverSeason van directo por Prisma (crearlos por HTTP solo agrega ruido); los drivers van
// por HTTP para ejercitar el path real.
async function seedSeason(year = 2026, isActive = true) {
  const season = await prisma.season.create({ data: { year, isActive, driverCount: 22 } });
  return season.id;
}

async function seedConstructor(name: string, externalId: string, color = '#FF0000') {
  const constructor = await prisma.constructor.create({ data: { name, color, externalId } });
  return constructor.id;
}

async function seedDriver(overrides: Partial<typeof validDriver> = {}) {
  const res = await request(app)
    .post('/api/v1/drivers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ ...validDriver, ...overrides });
  return res.body.data.id as number;
}

async function linkDriverSeason(driverId: number, constructorId: number, seasonId: number) {
  await prisma.driverSeason.create({ data: { driverId, constructorId, seasonId } });
}

describe('GET /api/v1/drivers — escuderia en el listado', () => {
  it('incluye la escuderia del piloto en la temporada activa', async () => {
    const seasonId = await seedSeason();
    const constructorId = await seedConstructor('Red Bull Racing', 'red_bull', '#3671C6');
    const driverId = await seedDriver();
    await linkDriverSeason(driverId, constructorId, seasonId);

    const res = await request(app).get('/api/v1/drivers');

    expect(res.status).toBe(200);
    expect(res.body.data[0].constructor).toEqual({
      id: constructorId,
      name: 'Red Bull Racing',
      color: '#3671C6',
    });
  });

  it('devuelve constructor null si el piloto no corre esta temporada', async () => {
    await seedSeason();
    await seedDriver();

    const res = await request(app).get('/api/v1/drivers');

    expect(res.status).toBe(200);
    expect(res.body.data[0].constructor).toBeNull();
  });

  it('devuelve constructor null si la escuderia esta soft-deleted', async () => {
    const seasonId = await seedSeason();
    const constructorId = await seedConstructor('Extinta', 'extinta');
    const driverId = await seedDriver();
    await linkDriverSeason(driverId, constructorId, seasonId);
    await prisma.constructor.update({
      where: { id: constructorId },
      data: { deletedAt: new Date() },
    });

    const res = await request(app).get('/api/v1/drivers');

    expect(res.status).toBe(200);
    expect(res.body.data[0].constructor).toBeNull();
  });

  // Canario: si alguien reemplaza resolveSeasonId por seasonsService.findActive(), que tira
  // NotFoundError, este test pasa de 200 a 404. Un endpoint publico de catalogo no puede
  // depender de que exista una temporada activa.
  it('responde 200, no 404, cuando no hay ninguna temporada activa', async () => {
    await seedDriver();

    const res = await request(app).get('/api/v1/drivers');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].constructor).toBeNull();
  });
});

describe('GET /api/v1/drivers?constructorId=', () => {
  it('devuelve solo los pilotos de esa escuderia', async () => {
    const seasonId = await seedSeason();
    const ferrari = await seedConstructor('Ferrari', 'ferrari');
    const mclaren = await seedConstructor('McLaren', 'mclaren');
    const leclerc = await seedDriver({ lastName: 'Leclerc', code: 'LEC', externalId: 'leclerc' });
    const norris = await seedDriver({ lastName: 'Norris', code: 'NOR', externalId: 'norris' });
    await linkDriverSeason(leclerc, ferrari, seasonId);
    await linkDriverSeason(norris, mclaren, seasonId);

    const res = await request(app).get(`/api/v1/drivers?constructorId=${ferrari}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].lastName).toBe('Leclerc');
  });

  // El filtro se acota a la temporada resuelta: sin eso, un piloto que corrio para Ferrari
  // en 2025 aparecia al filtrar Ferrari en 2026 mostrando su escuderia actual en la fila.
  it('no devuelve un piloto que corrio para esa escuderia en OTRA temporada', async () => {
    const vieja = await seedSeason(2025, false);
    const activa = await seedSeason(2026, true);
    const ferrari = await seedConstructor('Ferrari', 'ferrari');
    const mclaren = await seedConstructor('McLaren', 'mclaren');
    const driverId = await seedDriver({ lastName: 'Sainz', code: 'SAI', externalId: 'sainz' });
    await linkDriverSeason(driverId, ferrari, vieja);
    await linkDriverSeason(driverId, mclaren, activa);

    const res = await request(app).get(`/api/v1/drivers?constructorId=${ferrari}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('devuelve lista vacia (200) para una escuderia inexistente, no 404', async () => {
    await seedSeason();
    await seedDriver();

    const res = await request(app).get('/api/v1/drivers?constructorId=99999');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // Mismo bug que A3/BOX-13 pero en query params: sin validateQuery, Number('abc') era NaN,
  // llegaba a Prisma y escalaba a 500.
  it('rechaza ?constructorId=abc con 400 VALIDATION_ERROR, no 500', async () => {
    const res = await request(app).get('/api/v1/drivers?constructorId=abc');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('?seasonId= acota la escuderia mostrada a esa temporada', async () => {
    const vieja = await seedSeason(2025, false);
    const activa = await seedSeason(2026, true);
    const ferrari = await seedConstructor('Ferrari', 'ferrari');
    const mclaren = await seedConstructor('McLaren', 'mclaren');
    const driverId = await seedDriver({ lastName: 'Sainz', code: 'SAI', externalId: 'sainz' });
    await linkDriverSeason(driverId, ferrari, vieja);
    await linkDriverSeason(driverId, mclaren, activa);

    const res = await request(app).get(`/api/v1/drivers?seasonId=${vieja}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].constructor.name).toBe('Ferrari');
  });
});

describe('GET /api/v1/drivers/:id', () => {
  it('returns a driver by id', async () => {
    const created = await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDriver);
    const id = created.body.data.id; // usamos el id que devolvió el POST

    const res = await request(app).get(`/api/v1/drivers/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Max');
    expect(res.body.data.lastName).toBe('Verstappen');
  });

  it('returns 404 for non-existent driver', async () => {
    const res = await request(app).get('/api/v1/drivers/999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DRIVER_NOT_FOUND'); // código de error tipado, no mensaje libre
  });
});

describe('POST /api/v1/drivers', () => {
  it('creates a driver with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDriver);

    expect(res.status).toBe(201); // 201 Created, no 200
    expect(res.body.data).toMatchObject({
      firstName: 'Max',
      lastName: 'Verstappen',
      number: 1,
      code: 'VER',
    });
    expect(res.body.data.id).toBeDefined(); // la DB asignó un id
    expect(res.body.data.createdAt).toBeDefined(); // Prisma llenó el timestamp
  });

  it('rejects request with missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Max' });

    expect(res.status).toBe(400); // validate() cortó el request antes del controller
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('lastName'); // qué campos fallaron
    expect(res.body.error.details).toHaveProperty('number');
  });

  it('rejects duplicate externalId', async () => {
    await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDriver); // primer POST: ok

    const res = await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDriver); // segundo: conflicto

    expect(res.status).toBe(409); // 409 Conflict
    expect(res.body.error.code).toBe('DRIVER_ALREADY_EXISTS');
  });
});

describe('PATCH /api/v1/drivers/:id', () => {
  it('updates a driver partially', async () => {
    const created = await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDriver);
    const id = created.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/drivers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: 33 });

    expect(res.status).toBe(200);
    expect(res.body.data.number).toBe(33);
    expect(res.body.data.firstName).toBe('Max'); // campos no enviados no se tocan
  });

  it('returns 404 when updating non-existent driver', async () => {
    const res = await request(app)
      .patch('/api/v1/drivers/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: 33 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/drivers/:id', () => {
  it('soft deletes a driver (returns 204)', async () => {
    const created = await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDriver);
    const id = created.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/v1/drivers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204); // 204 No Content — sin body

    // Soft delete: la fila sigue en la DB pero deletedAt != null → no aparece en listados
    const listRes = await request(app).get('/api/v1/drivers');
    expect(listRes.body.data).toHaveLength(0);

    // Tampoco se puede acceder por id
    const getRes = await request(app).get(`/api/v1/drivers/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting non-existent driver', async () => {
    const res = await request(app)
      .delete('/api/v1/drivers/999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── Solo admin muta el catalogo (A5 / BOX-15) ─────────────────────────
// Los GET son publicos (el frontend lista pilotos sin login). POST/PATCH/DELETE exigen
// requireAuth + requireAdmin — requisito de aprobacion de la catedra ("proteger las rutas en
// base al nivel de acceso requerido").

describe('drivers — solo admin puede mutar', () => {
  it('rechaza POST sin token (401 TOKEN_MISSING)', async () => {
    const res = await request(app).post('/api/v1/drivers').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza DELETE con token de USER (403 ADMIN_REQUIRED)', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .delete('/api/v1/drivers/1')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// A3 / BOX-13: un :id no numerico antes llegaba a Prisma como NaN y explotaba en 500.
describe('drivers — :id no numerico', () => {
  it('GET /drivers/abc responde 400 VALIDATION_ERROR, no 500', async () => {
    const res = await request(app).get('/api/v1/drivers/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
