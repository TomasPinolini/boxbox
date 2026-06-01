// TESTS — integracion HTTP → controller → service → Prisma → DB real.
// Sin mocks (ADR-0003). setup.ts trunca todas las tablas antes de cada test,
// asi que cada test arranca con DB vacia y necesita crear Season + User inline.

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../shared/prisma';

// ─── Helpers locales (no van a shared/) ───────────────────────────────

// authedUser: registra un user con email basado en suffix y devuelve { userId, token }.
// suffix permite tener multiples users en un mismo test (ej. tests de ownership con A y B).
async function authedUser(suffix = '') {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `user${suffix}@boxbox.com`,
      password: 'hunter2222',
      name: `User ${suffix || 'A'}`,
    });
  if (res.status !== 201) {
    throw new Error(`authedUser setup fallo: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { userId: res.body.data.user.id, token: res.body.data.accessToken };
}

// seedSeason: crea Season 2026 (necesario porque truncate-cascade borra todas las seasons).
// Devuelve la Season completa para que el test agarre el id.
async function seedSeason() {
  return prisma.season.create({
    data: { year: 2026, isActive: true, driverCount: 22 },
  });
}

// ─── POST /leagues ────────────────────────────────────────────────────

describe('POST /api/v1/leagues', () => {
  it('crea una liga happy path (createdById, inviteCode lowercase)', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'Liga UTN', inviteCode: 'UTN-2026', seasonId: season.id });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Liga UTN',
      inviteCode: 'utn-2026', // lowercase!
      seasonId: season.id,
      createdById: me.userId,
      status: 'ACTIVE',
      draftStatus: 'PENDING',
      maxMembers: 11, // default
    });
  });

  it('rechaza sin name (400 VALIDATION_ERROR)', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ inviteCode: 'sin-nombre', seasonId: season.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza inviteCode demasiado corto (400)', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'X', inviteCode: 'ab', seasonId: season.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza inviteCode reservado (400)', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'X', inviteCode: 'admin', seasonId: season.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('normaliza inviteCode a lowercase', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'Cool', inviteCode: 'MI-LIGA-COOL', seasonId: season.id });

    expect(res.status).toBe(201);
    expect(res.body.data.inviteCode).toBe('mi-liga-cool');
  });

  it('devuelve 404 SEASON_NOT_FOUND si seasonId no existe', async () => {
    const me = await authedUser();
    // NO creamos season → seasonId 99999 no existe.

    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'X', inviteCode: 'no-season', seasonId: 99999 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SEASON_NOT_FOUND');
  });

  it('devuelve 409 INVITE_CODE_TAKEN si el codigo ya existe', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    // Primer create OK.
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'L1', inviteCode: 'taken', seasonId: season.id });

    // Segundo create con mismo inviteCode.
    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'L2', inviteCode: 'taken', seasonId: season.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVITE_CODE_TAKEN');
  });

  it('rechaza request sin Authorization header (401 TOKEN_MISSING)', async () => {
    const res = await request(app)
      .post('/api/v1/leagues')
      .send({ name: 'X', inviteCode: 'no-auth', seasonId: 1 });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });
});

// ─── GET /leagues ─────────────────────────────────────────────────────

describe('GET /api/v1/leagues', () => {
  it('rechaza sin auth (401)', async () => {
    const res = await request(app).get('/api/v1/leagues');
    expect(res.status).toBe(401);
  });

  it('devuelve solo las ligas creadas por el user actual', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    // Alice crea 2 ligas, Bob crea 1.
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'A1', inviteCode: 'a1-liga', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'A2', inviteCode: 'a2-liga', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'B1', inviteCode: 'b1-liga', seasonId: season.id });

    // Alice solo debe ver las suyas.
    const res = await request(app)
      .get('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((l: { createdById: number }) => l.createdById === alice.userId)).toBe(true);
  });
});

// ─── GET /leagues/:id ─────────────────────────────────────────────────

describe('GET /api/v1/leagues/:id', () => {
  it('devuelve la liga si soy el creador (200)', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'Mia', inviteCode: 'mia-2026', seasonId: season.id });

    const res = await request(app)
      .get(`/api/v1/leagues/${created.body.data.id}`)
      .set('Authorization', `Bearer ${me.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
  });

  it('devuelve 403 NOT_LEAGUE_OWNER si la liga es de otro user', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const aliceLeague = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'A', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .get(`/api/v1/leagues/${aliceLeague.body.data.id}`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_LEAGUE_OWNER');
  });

  it('devuelve 404 LEAGUE_NOT_FOUND si el id no existe', async () => {
    const me = await authedUser();

    const res = await request(app)
      .get('/api/v1/leagues/99999')
      .set('Authorization', `Bearer ${me.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LEAGUE_NOT_FOUND');
  });
});

// ─── PATCH /leagues/:id ───────────────────────────────────────────────

describe('PATCH /api/v1/leagues/:id', () => {
  it('actualiza name si soy creador (200)', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'Old', inviteCode: 'patch-name', seasonId: season.id });

    const res = await request(app)
      .patch(`/api/v1/leagues/${created.body.data.id}`)
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'New' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New');
  });

  it('archiva via status=ARCHIVED (200)', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'L', inviteCode: 'patch-arch', seasonId: season.id });

    const res = await request(app)
      .patch(`/api/v1/leagues/${created.body.data.id}`)
      .set('Authorization', `Bearer ${me.token}`)
      .send({ status: 'ARCHIVED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ARCHIVED');
  });

  it('devuelve 403 NOT_LEAGUE_OWNER si la liga es de otro user', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const aliceLeague = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'A', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .patch(`/api/v1/leagues/${aliceLeague.body.data.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'Robada' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_LEAGUE_OWNER');
  });

  it('devuelve 409 INVITE_CODE_TAKEN si el nuevo inviteCode ya existe', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    // Crear dos ligas con codigos distintos.
    const l1 = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'L1', inviteCode: 'codigo-uno', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'L2', inviteCode: 'codigo-dos', seasonId: season.id });

    // PATCH de L1 cambiando su inviteCode al que ya tiene L2.
    const res = await request(app)
      .patch(`/api/v1/leagues/${l1.body.data.id}`)
      .set('Authorization', `Bearer ${me.token}`)
      .send({ inviteCode: 'codigo-dos' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVITE_CODE_TAKEN');
  });

  it('rechaza body vacio {} (400 VALIDATION_ERROR)', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'L', inviteCode: 'empty-patch', seasonId: season.id });

    const res = await request(app)
      .patch(`/api/v1/leagues/${created.body.data.id}`)
      .set('Authorization', `Bearer ${me.token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
