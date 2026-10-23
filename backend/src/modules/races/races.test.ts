import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../shared/prisma';
import { createTestAdmin, createTestUser } from '../../tests/setup';

// Se recrea por test porque setup.ts trunca la DB.
let adminToken: string;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
});

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

  // Igual que /drivers: un seasonId que no es numero es un pedido mal armado, no un "sin filtro".
  it('returns 400 for a non-numeric seasonId', async () => {
    const res = await request(app).get('/api/v1/races?seasonId=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('ignores an invalid status instead of failing', async () => {
    await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());

    for (const status of ['NOEXISTE', 'toString']) {
      const res = await request(app).get(`/api/v1/races?status=${status}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    }
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

  // z.coerce.date() convertiria null/true/0 en 1970-01-01 sin fallar.
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

  // Sin la guarda del service, la FK ON DELETE RESTRICT termina en P2003 y un 500.
  it('rechaza con 409 borrar una carrera que ya tiene resultados cargados', async () => {
    const created = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const id = created.body.data.id;
    const drivers = await createDrivers(4);

    await request(app)
      .post(`/api/v1/races/${id}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ results: buildResults(drivers) })
      .expect(201);

    const res = await request(app)
      .delete(`/api/v1/races/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_HAS_DEPENDENCIES');
    // La carrera sigue ahi: el rechazo no borro nada a medias.
    expect((await request(app).get('/api/v1/races')).body.data).toHaveLength(1);
  });
});

// Vincula los drivers a la temporada de a pares por constructor (1-2 -> equipo 1, 3-4 -> 2...).
// Sin DriverSeason, loadResults rechaza con 409 DRIVER_NOT_IN_SEASON.
type SeededDriver = { id: number; constructorId: number | null };

async function createDrivers(
  n: number,
  opts: { linkToSeason: boolean } = { linkToSeason: true },
): Promise<SeededDriver[]> {
  const drivers: SeededDriver[] = [];
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
    drivers.push({ id: res.body.data.id, constructorId: null });
  }

  if (opts.linkToSeason) {
    for (let i = 0; i < drivers.length; i += 2) {
      const k = i / 2 + 1;
      const constructor = await prisma.constructor.create({
        data: { name: `Team ${k}`, color: '#000000', externalId: `test-team-${k}` },
      });
      for (const driver of drivers.slice(i, i + 2)) {
        driver.constructorId = constructor.id;
        await prisma.driverSeason.create({
          data: { driverId: driver.id, seasonId, constructorId: constructor.id },
        });
      }
    }
  }
  return drivers;
}

function buildResults(drivers: Array<{ id: number }>) {
  return drivers.map((d, i) => ({
    driverId: d.id,
    position: i + 1,
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

    const count = await prisma.raceResult.count({ where: { raceId } });
    expect(count).toBe(20);

    const race = await prisma.race.findUnique({ where: { id: raceId } });
    expect(race?.status).toBe('COMPLETED');
  });

  // Una sola tabla de puntos, la del backend: lo que mande el cliente en `points` se descarta.
  it('calcula los puntos por puesto e ignora los que manda el cliente', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    const [winner, dnf] = await createDrivers(2);

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        results: [
          { driverId: winner.id, position: 1, points: 99, status: 'CLASSIFIED' },
          { driverId: dnf.id, points: 50, status: 'DNF' },
        ],
      });
    expect(res.status).toBe(201);

    const rows = await prisma.raceResult.findMany({ where: { raceId } });
    const pointsOf = (id: number) => rows.find((r) => r.driverId === id)?.points;
    expect(pointsOf(winner.id)).toBe(25);
    expect(pointsOf(dnf.id)).toBe(0);
  });

  // Cargar la fecha y actualizar las ligas pasan juntos: no hace falta POST /recalculate.
  it('cargar resultados actualiza los standings de las ligas en la misma operacion', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const raceId = raceRes.body.data.id;
    const [winner] = await createDrivers(2);

    const owner = await createTestUser({ email: 'owner@test.com' });
    const league = await prisma.league.create({
      data: { name: 'Liga', inviteCode: 'ligacarga', seasonId, createdById: owner.user.id },
    });
    const member = await prisma.leagueMember.create({
      data: { leagueId: league.id, userId: owner.user.id, isOwner: true },
    });
    await prisma.fantasyTeam.create({
      data: { leagueMemberId: member.id, driver1Id: winner.id },
    });

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ results: [{ driverId: winner.id, position: 1, status: 'CLASSIFIED' }] });
    expect(res.status).toBe(201);

    const standings = await prisma.leagueStanding.findMany({ where: { raceId } });
    expect(standings).toHaveLength(1);
    expect(standings[0]).toMatchObject({
      leagueMemberId: member.id,
      driverPoints: 25,
      position: 1,
    });
  });

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

    const results = [
      ...buildResults(drivers),
      { driverId: 999999, position: 3, status: 'CLASSIFIED' as const },
    ];

    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DRIVER_NOT_FOUND');

    const count = await prisma.raceResult.count({ where: { raceId } });
    expect(count).toBe(0);
  });

  it('Race ya COMPLETED → 409 RACE_ALREADY_COMPLETED (idempotency guard)', async () => {
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

    // Una fila insertada a mano simula una carga previa que no paso por este endpoint.
    await prisma.raceResult.create({
      data: { raceId, driverId: drivers[0].id, points: 25, status: 'CLASSIFIED' },
    });

    // El payload no trae duplicados, asi que lo frena el @@unique (P2002 traducido a 409).
    const res = await request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results: buildResults(drivers) });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_RESULTS_ALREADY_EXIST');
    // Rollback total: sigue habiendo solo la fila insertada a mano y la Race no se cerro.
    expect(await prisma.raceResult.count({ where: { raceId } })).toBe(1);
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    expect(race?.status).toBe('UPCOMING');
  });

  it('driverId duplicado en el payload → 409 RACE_RESULT_DUPLICATE_DRIVER', async () => {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    const drivers = await createDrivers(2);
    const { accessToken } = await createTestAdmin();

    const results = [
      { driverId: drivers[0].id, position: 1, status: 'CLASSIFIED' as const },
      { driverId: drivers[0].id, position: 2, status: 'CLASSIFIED' as const },
    ];

    const res = await request(app)
      .post(`/api/v1/races/${raceRes.body.data.id}/results`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ results });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_RESULT_DUPLICATE_DRIVER');
  });

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
        results: [{ driverId: drivers[0].id, status: 'BOGUS' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// Sin pasar por el navegador: estas reglas tienen que valer para cualquier cliente.
describe('POST /api/v1/races/:id/results — reglas entre filas', () => {
  async function postResults(results: unknown[]) {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    return request(app)
      .post(`/api/v1/races/${raceRes.body.data.id}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ results });
  }

  it('dos pilotos con la misma posicion → 400, no se reparten puntos de mas', async () => {
    const [a, b] = await createDrivers(2);
    const res = await postResults([
      { driverId: a.id, position: 1, status: 'CLASSIFIED' },
      { driverId: b.id, position: 1, status: 'CLASSIFIED' },
    ]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.raceResult.count()).toBe(0);
  });

  it('CLASSIFIED sin posicion → 400', async () => {
    const [a] = await createDrivers(1);
    const res = await postResults([{ driverId: a.id, status: 'CLASSIFIED' }]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('dos vueltas rapidas → 400', async () => {
    const [a, b] = await createDrivers(2);
    const res = await postResults([
      { driverId: a.id, position: 1, fastestLap: true, status: 'CLASSIFIED' },
      { driverId: b.id, position: 2, fastestLap: true, status: 'CLASSIFIED' },
    ]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('un hueco en las posiciones se acepta: el suplente salteado de Jolpica', async () => {
    const [a, b] = await createDrivers(2);
    const res = await postResults([
      { driverId: a.id, position: 1, status: 'CLASSIFIED' },
      { driverId: b.id, position: 3, status: 'CLASSIFIED' },
    ]);
    expect(res.status).toBe(201);
  });
});

describe('POST /api/v1/races/:id/results — ConstructorResult (Slice 8)', () => {
  async function createRace() {
    const raceRes = await request(app)
      .post('/api/v1/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validRace());
    return raceRes.body.data.id as number;
  }

  async function load(raceId: number, results: ReturnType<typeof buildResults>) {
    return request(app)
      .post(`/api/v1/races/${raceId}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ results });
  }

  it('20 pilotos en 10 escuderias -> 10 ConstructorResult con la suma correcta', async () => {
    const raceId = await createRace();
    const drivers = await createDrivers(20);

    const res = await load(raceId, buildResults(drivers));
    expect(res.status).toBe(201);

    const rows = await prisma.constructorResult.findMany({ where: { raceId } });
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(row.totalPoints).toBe(row.driver1Points + row.driver2Points);
    }

    // Drivers 1 y 2 (25 y 18 puntos) comparten constructor: driver1Points es el mayor.
    const top = rows.find((r) => r.constructorId === drivers[0].constructorId);
    expect(top).toMatchObject({ driver1Points: 25, driver2Points: 18, totalPoints: 43 });

    // Drivers 19 y 20 no puntuan (fuera del top 10): fila con ceros, no ausente.
    const bottom = rows.find((r) => r.constructorId === drivers[18].constructorId);
    expect(bottom).toMatchObject({ driver1Points: 0, driver2Points: 0, totalPoints: 0 });
  });

  it('escuderia con un solo piloto en los results -> driver2Points = 0', async () => {
    const raceId = await createRace();
    const drivers = await createDrivers(2); // ambos en Team 1

    const res = await load(raceId, buildResults([drivers[0]])); // solo el primero
    expect(res.status).toBe(201);

    const rows = await prisma.constructorResult.findMany({ where: { raceId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ driver1Points: 25, driver2Points: 0, totalPoints: 25 });
  });

  it('piloto sin DriverSeason en la temporada -> 409 DRIVER_NOT_IN_SEASON y rollback total', async () => {
    const raceId = await createRace();
    const drivers = await createDrivers(2, { linkToSeason: false });

    const res = await load(raceId, buildResults(drivers));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DRIVER_NOT_IN_SEASON');
    expect(await prisma.raceResult.count({ where: { raceId } })).toBe(0);
    expect(await prisma.constructorResult.count({ where: { raceId } })).toBe(0);
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    expect(race?.status).toBe('UPCOMING');
  });

  it('tres pilotos de la misma escuderia en una carrera -> 409 CONSTRUCTOR_TOO_MANY_DRIVERS', async () => {
    const raceId = await createRace();
    const drivers = await createDrivers(3); // 1-2 en Team 1, 3 en Team 2
    await prisma.driverSeason.updateMany({
      where: { driverId: drivers[2].id },
      data: { constructorId: drivers[0].constructorId! },
    });

    const res = await load(raceId, buildResults(drivers));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONSTRUCTOR_TOO_MANY_DRIVERS');
    expect(await prisma.raceResult.count({ where: { raceId } })).toBe(0);
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

// Sin validateParams, un :id no numerico llega a Prisma como NaN y da 500.
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
