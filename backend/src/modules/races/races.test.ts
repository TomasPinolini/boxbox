import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../shared/prisma';
import { createTestAdmin, createTestUser } from '../../tests/setup';

// adminToken: el CRUD de races es admin-only (A5 / BOX-15), igual que /results desde Slice 7.
// Se recrea por test (setup.ts trunca la DB).
let adminToken: string;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
});

// Races depend on Season + Circuit, so we create those first in each test
let seasonId: number;
let circuitId: number;

beforeEach(async () => {
  const season = await request(app)
    .post('/api/v1/seasons')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ year: 2026 });
  seasonId = season.body.data.id;

  const circuit = await request(app)
    .post('/api/v1/circuits')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Silverstone',
      country: 'UK',
      city: 'Silverstone',
      externalId: 'silverstone',
    });
  circuitId = circuit.body.data.id;
});

function validRace() {
  return {
    name: 'British Grand Prix',
    round: 1,
    date: '2026-07-05T14:00:00Z',
    lockDate: '2026-07-04T12:00:00Z',
    seasonId,
    circuitId,
  };
}

describe('GET /api/v1/races', () => {
  it('returns empty array when no races exist', async () => {
    const res = await request(app).get('/api/v1/races');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('filters by seasonId', async () => {
    await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());

    const res = await request(app).get(`/api/v1/races?seasonId=${seasonId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const empty = await request(app).get('/api/v1/races?seasonId=9999');
    expect(empty.body.data).toHaveLength(0);
  });
});

describe('GET /api/v1/races/:id', () => {
  it('returns a race with circuit and season included', async () => {
    const created = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const id = created.body.data.id;

    const res = await request(app).get(`/api/v1/races/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('British Grand Prix');
    expect(res.body.data.circuit).toBeDefined();
    expect(res.body.data.season).toBeDefined();
  });

  it('returns 404 for non-existent race', async () => {
    const res = await request(app).get('/api/v1/races/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/races', () => {
  it('creates a race with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('British Grand Prix');
    expect(res.body.data.status).toBe('UPCOMING');
  });

  it('rejects when season does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...validRace(),
        seasonId: 9999,
      });
    expect(res.status).toBe(404);
  });

  it('rejects when circuit does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...validRace(),
        circuitId: 9999,
      });
    expect(res.status).toBe(404);
  });

  it('rejects duplicate round in same season', async () => {
    await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());

    const res = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...validRace(),
        name: 'Another GP',
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_ROUND_DUPLICATE');
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'GP' });
    expect(res.status).toBe(400);
  });

  // A2 / BOX-12: z.coerce.date() aceptaba null/true/0 y los guardaba como 1970-01-01. Una
  // carrera con lockDate en 1970 esta "cerrada" desde hace 56 anios para predicciones.
  it('rejects non-ISO dates instead of coercing them to 1970 (null, true, 0)', async () => {
    for (const bad of [{ lockDate: null }, { qualifyingDate: true }, { date: 0 }]) {
      const res = await request(app)
        .post('/api/v1/races')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validRace(), ...bad });
      expect(res.status, JSON.stringify(bad)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('PATCH rejects a null date too', async () => {
    const created = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());

    const res = await request(app)
      .patch(`/api/v1/races/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lockDate: null });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/races/:id', () => {
  it('updates a race partially', async () => {
    const created = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const id = created.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/races/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Silverstone GP' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Silverstone GP');
  });

  it('returns 404 when updating non-existent race', async () => {
    const res = await request(app)
      .patch('/api/v1/races/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/races/:id', () => {
  it('deletes a race', async () => {
    const created = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const id = created.body.data.id;

    expect(
      (
        await request(app)
          .delete(`/api/v1/races/${id}`)
          .set('Authorization', `Bearer ${adminToken}`)
      ).status,
    ).toBe(204);
    expect((await request(app).get('/api/v1/races')).body.data).toHaveLength(0);
  });

  it('returns 404 when deleting non-existent race', async () => {
    expect(
      (await request(app).delete('/api/v1/races/999').set('Authorization', `Bearer ${adminToken}`))
        .status,
    ).toBe(404);
  });
});

// ─── Slice 7: RaceResult ingestion ───────────────────────────────
// POST /api/v1/races/:id/results (admin) — carga manual de resultados de carrera.

async function createDrivers(n: number) {
  const drivers = [];
  for (let i = 1; i <= n; i++) {
    const num = i.toString().padStart(2, '0');
    const res = await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Test',
        lastName: `Driver${num}`,
        number: i,
        code: `T${num}`,
        externalId: `test-driver-${num}`,
      });
    drivers.push(res.body.data);
  }
  return drivers;
}

// Points table F1 moderno (top 10 puntúa; 1-25 pto para la vuelta rapida ignorado aca).
const F1_POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function buildResults(drivers: Array<{ id: number }>) {
  return drivers.map((d, i) => ({
    driverId: d.id,
    position: i + 1,
    points: F1_POINTS_TABLE[i] ?? 0,
    gridPosition: drivers.length - i,
    laps: 71,
    fastestLap: i === 2, // 3er clasificado logra la vuelta rapida en este escenario
    status: 'CLASSIFIED' as const,
  }));
}

describe('POST /api/v1/races/:id/results', () => {
  it('carga 20 resultados: retorna 201, count=20 en DB, Race pasa a COMPLETED', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    const drivers = await createDrivers(20);
    const { accessToken } = await createTestAdmin();

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(201);

    // Aserciones DB directas — matchea el "Done when" del roadmap literal.
    const count = await prisma.raceResult.count({ where: { raceId } });
    expect(count).toBe(20);

    const race = await prisma.race.findUnique({ where: { id: raceId } });
    expect(race?.status).toBe('COMPLETED');
  });

  // ── Auth guards ────────────────────────────────────────────────
  it('sin token → 401 TOKEN_MISSING', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const drivers = await createDrivers(3);

    const res = await request(app)
      .post(`/api/v1/races/${raceRes.body.data.id}/results`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('con token de user no-admin → 403 ADMIN_REQUIRED', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const drivers = await createDrivers(3);
    const { accessToken } = await createTestUser(); // role=USER por default

    const res = await request(app)
      .post(`/api/v1/races/${raceRes.body.data.id}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });

  // ── Not found ──────────────────────────────────────────────────
  it('Race inexistente → 404 RACE_NOT_FOUND', async () => {
    const drivers = await createDrivers(3);
    const { accessToken } = await createTestAdmin();

    const res = await request(app)
      .post('/api/v1/races/999999/results')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RACE_NOT_FOUND');
  });

  it('driverId inexistente en payload → 404 DRIVER_NOT_FOUND + zero rows inserted (rollback)', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    const drivers = await createDrivers(2);
    const { accessToken } = await createTestAdmin();

    // Mezclamos 2 drivers validos + 1 ID inventado. El pre-check debe cortar
    // antes de la transaccion, o sea que nada se inserta.
    const results = [
      ...buildResults(drivers),
      { driverId: 999999, position: 3, points: 15, status: 'CLASSIFIED' as const },
    ];

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DRIVER_NOT_FOUND');

    // Verificamos que NINGUN result quedo escrito (atomicidad).
    const count = await prisma.raceResult.count({ where: { raceId } });
    expect(count).toBe(0);
  });

  // ── Conflict — race en estado no cargable ──────────────────────
  it('Race ya COMPLETED → 409 RACE_ALREADY_COMPLETED (idempotency guard)', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    const drivers = await createDrivers(3);
    const { accessToken } = await createTestAdmin();

    // Primera carga — deja la Race en COMPLETED.
    await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    // Segunda carga — deberia rechazar.
    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_ALREADY_COMPLETED');
  });

  it('Race CANCELLED → 409 RACE_NOT_LOADABLE', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    // Ponemos la Race en CANCELLED via update directo — no hay endpoint publico para esto.
    await prisma.race.update({ where: { id: raceId }, data: { status: 'CANCELLED' } });

    const drivers = await createDrivers(3);
    const { accessToken } = await createTestAdmin();

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_NOT_LOADABLE');
  });

  it('Race POSTPONED → 409 RACE_NOT_LOADABLE', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    await prisma.race.update({ where: { id: raceId }, data: { status: 'POSTPONED' } });

    const drivers = await createDrivers(3);
    const { accessToken } = await createTestAdmin();

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_NOT_LOADABLE');
  });

  it('Race QUALIFYING_LOCKED → 201 (estado valido para cargar)', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    // QUALIFYING_LOCKED es el otro estado en LOADABLE_STATUSES ademas de UPCOMING.
    // Verificamos explicitamente que ambos son aceptados.
    await prisma.race.update({ where: { id: raceId }, data: { status: 'QUALIFYING_LOCKED' } });

    const drivers = await createDrivers(3);
    const { accessToken } = await createTestAdmin();

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(201);
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    expect(race?.status).toBe('COMPLETED');
  });

  it('unique constraint DB atrapa duplicados si el pre-check falla (defense in depth)', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    const drivers = await createDrivers(2);
    const { accessToken } = await createTestAdmin();

    // Insertamos un RaceResult A MANO para simular estado inconsistente
    // (ej: un slice futuro que carga results parcialmente sin pasar por este endpoint).
    await prisma.raceResult.create({
      data: { raceId, driverId: drivers[0].id, points: 25, status: 'CLASSIFIED' },
    });

    // Ahora POST con los mismos 2 drivers. El pre-check "duplicate en payload" no ve
    // conflicto (son 2 driverIds unicos). Pero cuando llega a la DB, el unique
    // constraint @@unique([raceId, driverId]) explota en driver[0] → 500 INTERNAL_ERROR.
    // Este test documenta ese comportamiento — si algun dia lo queremos tipar como
    // ConflictError, el fix va en el catch del service.
    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(500);
    // No verificamos error.code — es INTERNAL_ERROR generico. Esto es P3 deuda
    // documentada en known-debt.md (mapear P2002 a ConflictError tipado).
  });

  // ── Conflict — payload malformado (aunque valido para Zod) ─────
  it('driverId duplicado en el payload → 409 RACE_RESULT_DUPLICATE_DRIVER', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const drivers = await createDrivers(2);
    const { accessToken } = await createTestAdmin();

    // 2 filas para el MISMO driver — el pre-check debe atraparlo.
    const results = [
      { driverId: drivers[0].id, position: 1, points: 25, status: 'CLASSIFIED' as const },
      { driverId: drivers[0].id, position: 2, points: 18, status: 'CLASSIFIED' as const },
    ];

    const res = await request(app)
      .post(`/api/v1/races/${raceRes.body.data.id}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_RESULT_DUPLICATE_DRIVER');
  });

  // ── Zod validation (400) ───────────────────────────────────────
  it('array de results vacio → 400 VALIDATION_ERROR', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const { accessToken } = await createTestAdmin();

    const res = await request(app)
      .post(`/api/v1/races/${raceRes.body.data.id}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('status invalido en un item → 400 VALIDATION_ERROR', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const drivers = await createDrivers(1);
    const { accessToken } = await createTestAdmin();

    const res = await request(app)
      .post(`/api/v1/races/${raceRes.body.data.id}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        results: [{ driverId: drivers[0].id, points: 25, status: 'BOGUS' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/races/:id/results', () => {
  it('devuelve los results ordenados por position', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    const drivers = await createDrivers(3);
    const { accessToken } = await createTestAdmin();

    await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    const res = await request(app).get(`/api/v1/races/${raceId}/results`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].position).toBe(1);
    expect(res.body.data[2].position).toBe(3);
  });

  it('devuelve array vacio si la Race no tiene results', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());

    const res = await request(app).get(`/api/v1/races/${raceRes.body.data.id}/results`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('Race inexistente → 404 RACE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/v1/races/999999/results');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RACE_NOT_FOUND');
  });
});

// ─── Solo admin muta el catalogo (A5 / BOX-15) ─────────────────────────
// /results ya estaba gateado desde Slice 7; esto extiende el mismo criterio al CRUD.

describe('races — solo admin puede mutar', () => {
  it('rechaza POST sin token (401 TOKEN_MISSING)', async () => {
    const res = await request(app).post('/api/v1/races').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza DELETE con token de USER (403 ADMIN_REQUIRED)', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .delete('/api/v1/races/1')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// A3 / BOX-13: un :id no numerico antes llegaba a Prisma como NaN y explotaba en 500.
describe('races — :id no numerico', () => {
  it('GET /races/abc responde 400 VALIDATION_ERROR, no 500', async () => {
    const res = await request(app).get('/api/v1/races/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /races/abc/results tambien', async () => {
    const res = await request(app).get('/api/v1/races/abc/results');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
