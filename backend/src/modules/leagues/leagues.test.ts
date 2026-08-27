// TESTS — integracion HTTP → controller → service → Prisma → DB real.
// Sin mocks (ADR-0003). setup.ts trunca todas las tablas antes de cada test,
// asi que cada test arranca con DB vacia y necesita crear Season + User inline.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
async function seedSeason(driverCount = 22) {
  return prisma.season.create({
    data: { year: 2026, isActive: true, driverCount },
  });
}

// ─── POST /leagues ────────────────────────────────────────────────────

describe('POST /api/v1/leagues', () => {
  it('crea una liga happy path + creator como LeagueMember(isOwner=true) atomico', async () => {
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

    // Slice 3: createLeague debe crear el LeagueMember(creator, isOwner=true) atomicamente.
    const member = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: res.body.data.id, userId: me.userId } },
    });
    expect(member).not.toBeNull();
    expect(member!.isOwner).toBe(true);
    expect(member!.status).toBe('ACTIVE');

    // Slice 4: el FantasyTeam del creator debe crearse atomicamente junto al LeagueMember,
    // con todos los slots null (draft todavia no corrio).
    const team = await prisma.fantasyTeam.findUnique({
      where: { leagueMemberId: member!.id },
    });
    expect(team).not.toBeNull();
    expect(team).toMatchObject({
      driver1Id: null,
      driver2Id: null,
      constructorId: null,
    });
    // ADR-0006: la reserva no existe — ni como columna.
    expect(team).not.toHaveProperty('reserveDriverId');
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

  it('devuelve solo leagues donde soy ACTIVE member (Slice 3)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    // Alice crea 2 ligas (es auto-member de ambas como owner).
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'A1', inviteCode: 'a1-liga', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'A2', inviteCode: 'a2-liga', seasonId: season.id });
    // Bob crea 1 (Alice NO es member de esta).
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'B1', inviteCode: 'b1-liga', seasonId: season.id });

    // Alice solo debe ver las suyas (donde es ACTIVE member).
    const res = await request(app)
      .get('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Slice 2 assertaba createdById; Slice 3 sigue siendo equivalente porque creator es auto-member.
    expect(res.body.data.every((l: { createdById: number }) => l.createdById === alice.userId)).toBe(true);
  });

  it('incluye leagues que junte por inviteCode (Slice 3)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    // Alice crea una liga.
    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Alice Liga', inviteCode: 'a-liga', seasonId: season.id });

    // Bob joinea.
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    // Bob ve esta liga en su list aunque NO la creo.
    const res = await request(app)
      .get('/api/v1/leagues')
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(created.body.data.id);
    expect(res.body.data[0].createdById).toBe(alice.userId); // sigue siendo Alice, no Bob
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

  it('devuelve 404 LEAGUE_NOT_FOUND si la liga es de otro user (P2-1 unification)', async () => {
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

    // P2-1 (security fix Slice 2): cuando user no tiene relacion con la liga, 404 — NO 403.
    // 403 leakeaba que el id existia. 404 trata "existe pero no es tuya" indistinguible
    // de "no existe".
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LEAGUE_NOT_FOUND');
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

  it('devuelve 404 LEAGUE_NOT_FOUND si soy no-member (P2-1 unification)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b'); // Bob nunca joineo
    const season = await seedSeason();

    const aliceLeague = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'A', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .patch(`/api/v1/leagues/${aliceLeague.body.data.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'Robada' });

    // Bob no es member → 404, NO 403. requireLeagueMember tira NotFoundError antes que requireLeagueOwner.
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LEAGUE_NOT_FOUND');
  });

  it('devuelve 403 NOT_LEAGUE_OWNER si soy member pero no owner', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const aliceLeague = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'A', inviteCode: 'a-liga', seasonId: season.id });

    // Bob joinea — ahora es ACTIVE member pero no owner.
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    const res = await request(app)
      .patch(`/api/v1/leagues/${aliceLeague.body.data.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'Cambio Bob' });

    // Bob es member → requireLeagueMember pasa → requireLeagueOwner tira 403.
    // Es el unico caso donde 403 NO leakea info (Bob ya sabe que la liga existe porque es member).
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

// ─── POST /leagues/join (Slice 3) ─────────────────────────────────────

describe('POST /api/v1/leagues/join', () => {
  it('happy path: Bob joinea con inviteCode de Alice', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Liga', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: bob.userId,
      isOwner: false,
      status: 'ACTIVE',
    });

    // Slice 4: joinLeague tambien crea el FantasyTeam, no solo createLeague.
    const team = await prisma.fantasyTeam.findUnique({
      where: { leagueMemberId: res.body.data.id },
    });
    expect(team).not.toBeNull();
  });

  it('rechaza inviteCode inexistente con 404', async () => {
    const me = await authedUser();

    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ inviteCode: 'no-existe' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVITE_CODE_NOT_FOUND');
  });

  it('rechaza si ya soy ACTIVE member con 409 ALREADY_MEMBER', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    // Bob joinea OK
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    // Bob intenta joinear de nuevo
    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('permite rejoin despues de LEFT', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    // Bob joinea, leaves, rejoinea.
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });
    await request(app)
      .post(`/api/v1/leagues/${created.body.data.id}/leave`)
      .set('Authorization', `Bearer ${bob.token}`);

    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('permite rejoin despues de KICKED (decision consciente — audit trail solo cosmetico)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    // Bob joinea, Alice lo kickea, Bob rejoinea.
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });
    await request(app)
      .delete(`/api/v1/leagues/${created.body.data.id}/members/${bob.userId}`)
      .set('Authorization', `Bearer ${alice.token}`);

    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('rechaza con 409 LEAGUE_FULL cuando se alcanzo maxMembers', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const carl = await authedUser('c');
    const season = await seedSeason();

    // Liga con maxMembers=2 (Alice owner ocupa 1 slot, Bob el segundo).
    await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id, maxMembers: 2 });

    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    // Carl intenta entrar — full.
    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${carl.token}`)
      .send({ inviteCode: 'a-liga' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LEAGUE_FULL');
  });

  it('rechaza inviteCode de liga ARCHIVED con 404 (no leakea estado)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });
    // Alice archiva.
    await request(app)
      .patch(`/api/v1/leagues/${created.body.data.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ status: 'ARCHIVED' });

    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVITE_CODE_NOT_FOUND');
  });

  it('rechaza sin auth con 401', async () => {
    const res = await request(app)
      .post('/api/v1/leagues/join')
      .send({ inviteCode: 'whatever' });

    expect(res.status).toBe(401);
  });
});

// ─── POST /leagues/:id/leave (Slice 3) ────────────────────────────────

describe('POST /api/v1/leagues/:id/leave', () => {
  it('member normal puede salir, status pasa a LEFT', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    const res = await request(app)
      .post(`/api/v1/leagues/${created.body.data.id}/leave`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('LEFT');
  });

  it('owner no puede salir, 409 OWNER_CANNOT_LEAVE', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .post(`/api/v1/leagues/${created.body.data.id}/leave`)
      .set('Authorization', `Bearer ${me.token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OWNER_CANNOT_LEAVE');
  });

  it('no-member que intenta leave recibe 404 (requireLeagueMember)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    // Bob nunca joineo.
    const res = await request(app)
      .post(`/api/v1/leagues/${created.body.data.id}/leave`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LEAGUE_NOT_FOUND');
  });
});

// ─── GET /leagues/:id/members (Slice 3) ───────────────────────────────

describe('GET /api/v1/leagues/:id/members', () => {
  it('lista solo ACTIVE members', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const carl = await authedUser('c');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    // Bob y Carl joinean.
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${carl.token}`)
      .send({ inviteCode: 'a-liga' });

    // Bob deja la liga (LEFT, no debe aparecer).
    await request(app)
      .post(`/api/v1/leagues/${created.body.data.id}/leave`)
      .set('Authorization', `Bearer ${bob.token}`);

    const res = await request(app)
      .get(`/api/v1/leagues/${created.body.data.id}/members`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2); // Alice + Carl, NO Bob
    expect(res.body.data.every((m: { status: string }) => m.status === 'ACTIVE')).toBe(true);
  });

  it('no-member recibe 404 (requireLeagueMember)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .get(`/api/v1/leagues/${created.body.data.id}/members`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LEAGUE_NOT_FOUND');
  });
});

// ─── DELETE /leagues/:id/members/:userId (Slice 3) ────────────────────

describe('DELETE /api/v1/leagues/:id/members/:userId', () => {
  it('owner kickea a un member, status pasa a KICKED', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    const res = await request(app)
      .delete(`/api/v1/leagues/${created.body.data.id}/members/${bob.userId}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('KICKED');
  });

  it('non-owner no puede kickear, 403 NOT_LEAGUE_OWNER', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const carl = await authedUser('c');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${carl.token}`)
      .send({ inviteCode: 'a-liga' });

    // Bob (no-owner) intenta kickear a Carl.
    const res = await request(app)
      .delete(`/api/v1/leagues/${created.body.data.id}/members/${carl.userId}`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_LEAGUE_OWNER');
  });

  it('owner no puede kickearse a si mismo, 409 OWNER_CANNOT_LEAVE', async () => {
    const me = await authedUser();
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .delete(`/api/v1/leagues/${created.body.data.id}/members/${me.userId}`)
      .set('Authorization', `Bearer ${me.token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OWNER_CANNOT_LEAVE');
  });

  it('kickear a un userId que no es member devuelve 404 MEMBER_NOT_FOUND', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b'); // existe como user pero NO joineo
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .delete(`/api/v1/leagues/${created.body.data.id}/members/${bob.userId}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('MEMBER_NOT_FOUND');
  });
});

// ─── GET /leagues/:id/teams/me (Slice 4) ──────────────────────────────

describe('GET /api/v1/leagues/:id/teams/me', () => {
  it('devuelve mi FantasyTeam vacio (200), creado atomicamente al joinear', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });

    const res = await request(app)
      .get(`/api/v1/leagues/${created.body.data.id}/teams/me`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      driver1Id: null,
      driver2Id: null,
      constructorId: null,
    });
    // ADR-0006: el shape publico del FantasyTeam tiene 3 slots, no 4.
    expect(res.body.data).not.toHaveProperty('reserveDriverId');
  });

  it('devuelve 404 LEAGUE_NOT_FOUND si no soy member (requireLeagueMember)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b'); // Bob nunca joineo
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app)
      .get(`/api/v1/leagues/${created.body.data.id}/teams/me`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LEAGUE_NOT_FOUND');
  });

  it('persiste el mismo team tras leave + rejoin (no duplica, respeta @@unique)', async () => {
    const alice = await authedUser('a');
    const bob = await authedUser('b');
    const season = await seedSeason();

    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });
    await request(app)
      .post(`/api/v1/leagues/${created.body.data.id}/leave`)
      .set('Authorization', `Bearer ${bob.token}`);

    // Rejoin: si el service intentara recrear el FantasyTeam aca, esto rompería con
    // P2002 (@@unique en leagueMemberId). El happy path prueba que no lo hace.
    const rejoin = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'a-liga' });
    expect(rejoin.status).toBe(201);

    const res = await request(app)
      .get(`/api/v1/leagues/${created.body.data.id}/teams/me`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(200);

    const teams = await prisma.fantasyTeam.findMany({
      where: { leagueMember: { leagueId: created.body.data.id, userId: bob.userId } },
    });
    expect(teams).toHaveLength(1);
  });

  it('rechaza sin auth (401)', async () => {
    const alice = await authedUser('a');
    const season = await seedSeason();
    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'L', inviteCode: 'a-liga', seasonId: season.id });

    const res = await request(app).get(`/api/v1/leagues/${created.body.data.id}/teams/me`);
    expect(res.status).toBe(401);
  });
});

// ─── Tope de miembros derivado de la temporada (ADR-0006 / BOX-14) ────
// Cada miembro draftea 2 pilotos y los picks son exclusivos por liga, asi que el tope es
// floor(driverCount / 2): 11 para una grilla de 22, 10 para una de 20. Antes el 11 era un
// numero fijo que no miraba la temporada.

describe('tope de miembros = pilotos de la temporada / 2', () => {
  it('sin maxMembers en el body, usa floor(driverCount / 2) de la temporada', async () => {
    const alice = await authedUser();
    const season = await seedSeason(20);

    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Liga 20', inviteCode: 'cap-default', seasonId: season.id });

    expect(res.status).toBe(201);
    expect(res.body.data.maxMembers).toBe(10);
  });

  it('rechaza maxMembers mayor al tope de la temporada (409 MAX_MEMBERS_EXCEEDS_SEASON)', async () => {
    const alice = await authedUser();
    const season = await seedSeason(22);

    const res = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Liga 12', inviteCode: 'cap-over', seasonId: season.id, maxMembers: 12 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MAX_MEMBERS_EXCEEDS_SEASON');
  });

  it('PATCH tambien rechaza maxMembers mayor al tope (409)', async () => {
    const alice = await authedUser();
    const season = await seedSeason(22);
    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Liga', inviteCode: 'cap-patch', seasonId: season.id });

    const res = await request(app)
      .patch(`/api/v1/leagues/${created.body.data.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ maxMembers: 12 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MAX_MEMBERS_EXCEEDS_SEASON');
  });
});

// ─── Roster bloqueado una vez que arranca el draft (B2 / BOX-17) ───────
// startDraft materializa el orden de picks para los miembros que hay en ESE momento. Si
// despues alguien entra, sale o es echado, el draft queda inconsistente: el que entra no
// tiene picks ni turno; el que sale deja turnos que nadie puede jugar. Mientras draftStatus
// no sea PENDING, join/leave/kick responden 409 ROSTER_LOCKED. Un reset (vuelve a PENDING)
// desbloquea.

describe('roster bloqueado con draft LIVE o COMPLETED', () => {
  async function leagueWithLiveDraft() {
    const alice = await authedUser('rl-owner');
    const bob = await authedUser('rl-bob');
    const season = await seedSeason();
    const created = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Locked', inviteCode: 'locked', seasonId: season.id });
    const leagueId = created.body.data.id as number;
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ inviteCode: 'locked' });
    const start = await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(start.status).toBe(201);
    return { alice, bob, leagueId };
  }

  it('join durante el draft -> 409 ROSTER_LOCKED', async () => {
    await leagueWithLiveDraft();
    const carol = await authedUser('rl-carol');

    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ inviteCode: 'locked' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROSTER_LOCKED');
  });

  it('leave durante el draft -> 409 ROSTER_LOCKED', async () => {
    const { bob, leagueId } = await leagueWithLiveDraft();

    const res = await request(app)
      .post(`/api/v1/leagues/${leagueId}/leave`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROSTER_LOCKED');
  });

  it('kick durante el draft -> 409 ROSTER_LOCKED', async () => {
    const { alice, bob, leagueId } = await leagueWithLiveDraft();

    const res = await request(app)
      .delete(`/api/v1/leagues/${leagueId}/members/${bob.userId}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROSTER_LOCKED');
  });

  it('despues de reset (vuelve a PENDING) el join funciona de nuevo', async () => {
    const { alice, leagueId } = await leagueWithLiveDraft();
    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/reset`)
      .set('Authorization', `Bearer ${alice.token}`);
    const carol = await authedUser('rl-carol');

    const res = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ inviteCode: 'locked' });

    expect(res.status).toBe(201);
  });
});

// ─── Rate limit user-based (B3 / PER-18) ──────────────────────────────
// El limiter tiene `skip: isTestEnv` (rateLimit.ts) para que el resto de la suite no tope el
// cap de 5/min. Este describe lo re-activa apagando las dos envs que isTestEnv mira — se
// evalua por request, asi que alcanza con setearlas antes y restaurarlas despues.
//
// Lo que se prueba es la KEY del limiter, no el cap: dos users distintos desde la misma IP
// (supertest siempre pega desde 127.0.0.1) no deben compartir contador. Si el limiter corre
// antes que requireAuth, req.user es undefined en keyGenerator y cae al fallback por IP:
// el 1er POST de B despues de los 5 de A da 429. Con requireAuth primero, B tiene su
// propio bucket y da 201.

describe('rate limit de POST /api/v1/leagues es por user, no por IP', () => {
  const savedEnv = { NODE_ENV: process.env.NODE_ENV, VITEST: process.env.VITEST };

  beforeAll(() => {
    process.env.NODE_ENV = 'development';
    process.env.VITEST = 'false';
  });

  afterAll(() => {
    process.env.NODE_ENV = savedEnv.NODE_ENV;
    process.env.VITEST = savedEnv.VITEST;
  });

  it('user B no hereda el contador agotado de user A en la misma IP', async () => {
    const alice = await authedUser('rl-a');
    const bob = await authedUser('rl-b');
    const season = await seedSeason();

    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/v1/leagues')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ name: `Liga A${i}`, inviteCode: `rl-alice-${i}`, seasonId: season.id });
      expect(res.status).toBe(201);
    }

    const sixthFromAlice = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Liga A6', inviteCode: 'rl-alice-6', seasonId: season.id });
    expect(sixthFromAlice.status).toBe(429);
    expect(sixthFromAlice.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

    const firstFromBob = await request(app)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'Liga B1', inviteCode: 'rl-bob-1', seasonId: season.id });
    expect(firstFromBob.status).toBe(201);
  });
});
