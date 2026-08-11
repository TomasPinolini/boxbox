// TESTS — integracion HTTP → controller → service → Prisma → DB real (sin mocks, ADR-0003).
//
// El orden del draft es aleatorio (Fisher-Yates en startDraft), asi que estos tests NO
// hardcodean quien pickea primero: lo descubren consultando la ronda 1 ordenada por
// pickNumber despues de /start, y usan ese orden descubierto para el resto de las
// aserciones (incluida la verificacion de que la ronda 2 es exactamente el orden inverso).

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../shared/prisma';

// ─── Helpers locales ───────────────────────────────────────────────────

let userCounter = 0;
async function authedUser() {
  const counter = ++userCounter;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: `draft-user-${counter}@boxbox.com`, password: 'hunter2222', name: `D${counter}` });
  if (res.status !== 201) {
    throw new Error(`authedUser setup fallo: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { userId: res.body.data.user.id, token: res.body.data.accessToken };
}

async function seedSeason() {
  return prisma.season.create({ data: { year: 2027, isActive: true, driverCount: 22 } });
}

let driverCounter = 0;
async function seedDriver() {
  const n = ++driverCounter;
  const res = await request(app).post('/api/v1/drivers').send({
    firstName: 'Driver',
    lastName: `D${n}`,
    number: n,
    code: `D${String(n).padStart(2, '0')}`,
    externalId: `draft-driver-${n}`,
  });
  if (res.status !== 201) throw new Error(`seedDriver fallo: ${JSON.stringify(res.body)}`);
  return res.body.data.id as number;
}

let constructorCounter = 0;
async function seedConstructor() {
  const n = ++constructorCounter;
  const res = await request(app)
    .post('/api/v1/constructors')
    .send({ name: `Constructor ${n}`, color: '#000000', externalId: `draft-constructor-${n}` });
  if (res.status !== 201) throw new Error(`seedConstructor fallo: ${JSON.stringify(res.body)}`);
  return res.body.data.id as number;
}

// setupLeague: crea una liga con `count` members (el primero es el owner) y devuelve, por
// cada uno, { userId, token, leagueMemberId }. leagueMemberId hace falta para mapear el
// orden del draft (que trabaja en terminos de LeagueMember, no de User) de vuelta a un token.
async function setupLeague(count: number) {
  const season = await seedSeason();
  const users = await Promise.all(Array.from({ length: count }, () => authedUser()));
  const inviteCode = `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`.slice(0, 20);

  const created = await request(app)
    .post('/api/v1/leagues')
    .set('Authorization', `Bearer ${users[0].token}`)
    .send({ name: 'Draft League', inviteCode, seasonId: season.id, maxMembers: Math.max(count, 2) });
  const leagueId = created.body.data.id as number;

  for (const u of users.slice(1)) {
    const join = await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ inviteCode });
    if (join.status !== 201) throw new Error(`join fallo: ${JSON.stringify(join.body)}`);
  }

  const membersRes = await request(app)
    .get(`/api/v1/leagues/${leagueId}/members`)
    .set('Authorization', `Bearer ${users[0].token}`);

  const members = users.map((u) => {
    const m = membersRes.body.data.find((x: { userId: number }) => x.userId === u.userId);
    return { ...u, leagueMemberId: m.id as number };
  });

  return { leagueId, owner: members[0], members };
}

type Member = { userId: number; token: string; leagueMemberId: number };

async function startDraft(token: string, leagueId: number) {
  return request(app)
    .post(`/api/v1/leagues/${leagueId}/draft/start`)
    .set('Authorization', `Bearer ${token}`);
}

async function submitPick(
  token: string,
  leagueId: number,
  body: { driverId?: number; constructorId?: number },
) {
  return request(app)
    .post(`/api/v1/leagues/${leagueId}/draft/pick`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

// discoverOrder: consulta la ronda 1 ordenada por pickNumber y devuelve los Member en ese
// orden (mapeando leagueMemberId -> Member). Es el "orden shuffleado" real de este draft.
async function discoverOrder(leagueId: number, members: Member[]): Promise<Member[]> {
  const round1 = await prisma.draftPick.findMany({
    where: { leagueId, round: 1 },
    orderBy: { pickNumber: 'asc' },
  });
  return round1.map((p) => members.find((m) => m.leagueMemberId === p.leagueMemberId)!);
}

// ─── POST /leagues/:id/draft/start ─────────────────────────────────────

describe('POST /api/v1/leagues/:id/draft/start', () => {
  it('genera 4 rondas x N miembros picks placeholder y pasa a LIVE', async () => {
    const { leagueId, owner } = await setupLeague(3);

    const res = await startDraft(owner.token, leagueId);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ draftStatus: 'LIVE', totalPicks: 12 });

    const picks = await prisma.draftPick.findMany({ where: { leagueId } });
    expect(picks).toHaveLength(12);
    expect(picks.every((p) => p.driverId === null && p.constructorId === null)).toBe(true);

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    expect(league!.draftStatus).toBe('LIVE');
  });

  it('arma orden snake: ronda 2 es el reverso exacto de la ronda 1, ronda 3 = ronda 1', async () => {
    const { leagueId, owner, members } = await setupLeague(3);
    await startDraft(owner.token, leagueId);

    const round1 = await prisma.draftPick.findMany({
      where: { leagueId, round: 1 },
      orderBy: { pickNumber: 'asc' },
    });
    const round2 = await prisma.draftPick.findMany({
      where: { leagueId, round: 2 },
      orderBy: { pickNumber: 'asc' },
    });
    const round3 = await prisma.draftPick.findMany({
      where: { leagueId, round: 3 },
      orderBy: { pickNumber: 'asc' },
    });

    const order1 = round1.map((p) => p.leagueMemberId);
    const order2 = round2.map((p) => p.leagueMemberId);
    const order3 = round3.map((p) => p.leagueMemberId);

    expect(order1).toHaveLength(members.length);
    expect(order2).toEqual([...order1].reverse());
    expect(order3).toEqual(order1);
    // pickNumber es global y secuencial 1..12 sin huecos.
    const allPickNumbers = [...round1, ...round2, ...round3].map((p) => p.pickNumber);
    expect(new Set(allPickNumbers).size).toBe(9); // 3 rondas x 3 miembros, sin duplicados
  });

  it('rechaza si no soy owner (403 NOT_LEAGUE_OWNER)', async () => {
    const { leagueId, members } = await setupLeague(2);
    const res = await startDraft(members[1].token, leagueId);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_LEAGUE_OWNER');
  });

  it('rechaza doble start (409 DRAFT_ALREADY_STARTED)', async () => {
    const { leagueId, owner } = await setupLeague(2);
    await startDraft(owner.token, leagueId);

    const res = await startDraft(owner.token, leagueId);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DRAFT_ALREADY_STARTED');
  });

  it('rechaza si no soy member (404 LEAGUE_NOT_FOUND)', async () => {
    const { leagueId } = await setupLeague(1);
    const outsider = await authedUser();
    const res = await startDraft(outsider.token, leagueId);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LEAGUE_NOT_FOUND');
  });
});

// ─── GET /leagues/:id/draft/state ──────────────────────────────────────

describe('GET /api/v1/leagues/:id/draft/state', () => {
  it('antes de start: PENDING, sin turno, sin picks', async () => {
    const { leagueId, owner } = await setupLeague(2);

    const res = await request(app)
      .get(`/api/v1/leagues/${leagueId}/draft/state`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      draftStatus: 'PENDING',
      round: null,
      pickNumber: null,
      currentTurnLeagueMemberId: null,
      picks: [],
    });
  });

  it('despues de start: LIVE, ronda 1, pick 1, turno del primero en el orden descubierto', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    const order = await discoverOrder(leagueId, members);

    const res = await request(app)
      .get(`/api/v1/leagues/${leagueId}/draft/state`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      draftStatus: 'LIVE',
      round: 1,
      pickNumber: 1,
      currentTurnLeagueMemberId: order[0].leagueMemberId,
    });
    expect(res.body.data.picks).toEqual([]);
  });
});

// ─── GET /leagues/:id/draft/available ──────────────────────────────────

describe('GET /api/v1/leagues/:id/draft/available', () => {
  it('devuelve todos los drivers/constructors no drafteados en esta liga', async () => {
    const { leagueId, owner } = await setupLeague(1);
    await seedDriver();
    await seedDriver();
    await seedConstructor();

    const res = await request(app)
      .get(`/api/v1/leagues/${leagueId}/draft/available`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.drivers).toHaveLength(2);
    expect(res.body.data.constructors).toHaveLength(1);
  });

  it('excluye los ya drafteados en ESTA liga', async () => {
    const { leagueId, owner } = await setupLeague(1);
    const d1 = await seedDriver();
    await seedDriver();
    await startDraft(owner.token, leagueId);

    await submitPick(owner.token, leagueId, { driverId: d1 });

    const res = await request(app)
      .get(`/api/v1/leagues/${leagueId}/draft/available`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.drivers).toHaveLength(1);
    expect(res.body.data.drivers[0].id).not.toBe(d1);
  });
});

// ─── POST /leagues/:id/draft/pick ──────────────────────────────────────

describe('POST /api/v1/leagues/:id/draft/pick', () => {
  it('rechaza pick cuando el draft no arranco (409 DRAFT_NOT_LIVE)', async () => {
    const { leagueId, owner } = await setupLeague(1);
    const d1 = await seedDriver();

    const res = await submitPick(owner.token, leagueId, { driverId: d1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DRAFT_NOT_LIVE');
  });

  it('happy path: pick de driver en ronda 1 llena driver1Id del FantasyTeam', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    const order = await discoverOrder(leagueId, members);
    const first = order[0];
    const d1 = await seedDriver();

    const res = await submitPick(first.token, leagueId, { driverId: d1 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ round: 1, pickNumber: 1, driverId: d1 });

    const team = await prisma.fantasyTeam.findUnique({
      where: { leagueMemberId: first.leagueMemberId },
    });
    expect(team!.driver1Id).toBe(d1);
  });

  it('rechaza pick fuera de turno (409 NOT_YOUR_TURN)', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    const order = await discoverOrder(leagueId, members);
    const second = order[1];
    const d1 = await seedDriver();

    const res = await submitPick(second.token, leagueId, { driverId: d1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_YOUR_TURN');
  });

  it('rechaza categoria incorrecta: constructorId en ronda de driver (409 WRONG_PICK_CATEGORY)', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    const order = await discoverOrder(leagueId, members);
    const c1 = await seedConstructor();

    const res = await submitPick(order[0].token, leagueId, { constructorId: c1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WRONG_PICK_CATEGORY');
  });

  it('rechaza driver ya drafteado en esta liga (409 DRIVER_ALREADY_DRAFTED)', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    const order = await discoverOrder(leagueId, members);
    const d1 = await seedDriver();

    // Primer pick (ronda 1) toma d1.
    await submitPick(order[0].token, leagueId, { driverId: d1 });
    // Segundo pick (ronda 1, el otro miembro) intenta tomar el mismo driver.
    const res = await submitPick(order[1].token, leagueId, { driverId: d1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DRIVER_ALREADY_DRAFTED');
  });

  it('rechaza driverId inexistente (404 DRIVER_NOT_FOUND)', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    const order = await discoverOrder(leagueId, members);

    const res = await submitPick(order[0].token, leagueId, { driverId: 999999 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DRIVER_NOT_FOUND');
  });

  it('completa las 4 rondas: draftStatus COMPLETED y los 2 FantasyTeams llenos', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    const order = await discoverOrder(leagueId, members);

    // 3 rondas de driver x 2 miembros = 6 drivers distintos necesarios.
    const drivers = await Promise.all(Array.from({ length: 6 }, () => seedDriver()));
    // 1 ronda de constructor x 2 miembros = 2 constructors distintos.
    const constructors = await Promise.all(Array.from({ length: 2 }, () => seedConstructor()));

    let driverIdx = 0;
    let constructorIdx = 0;
    for (let round = 1; round <= 4; round++) {
      const roundOrder = round % 2 === 1 ? order : [...order].reverse();
      for (const member of roundOrder) {
        const body =
          round <= 3 ? { driverId: drivers[driverIdx++] } : { constructorId: constructors[constructorIdx++] };
        const res = await submitPick(member.token, leagueId, body);
        expect(res.status).toBe(200);
      }
    }

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    expect(league!.draftStatus).toBe('COMPLETED');

    for (const member of members) {
      const team = await prisma.fantasyTeam.findUnique({
        where: { leagueMemberId: member.leagueMemberId },
      });
      expect(team!.driver1Id).not.toBeNull();
      expect(team!.driver2Id).not.toBeNull();
      expect(team!.reserveDriverId).not.toBeNull();
      expect(team!.constructorId).not.toBeNull();
    }
  });

  it('rechaza sin auth (401)', async () => {
    const { leagueId } = await setupLeague(1);
    const res = await request(app).post(`/api/v1/leagues/${leagueId}/draft/pick`).send({ driverId: 1 });
    expect(res.status).toBe(401);
  });
});

// ─── POST /leagues/:id/draft/reset ─────────────────────────────────────

describe('POST /api/v1/leagues/:id/draft/reset', () => {
  it('owner resetea: borra picks, vacia FantasyTeams, vuelve a PENDING', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    const order = await discoverOrder(leagueId, members);
    const d1 = await seedDriver();
    await submitPick(order[0].token, leagueId, { driverId: d1 });

    const res = await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/reset`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.draftStatus).toBe('PENDING');

    const picks = await prisma.draftPick.count({ where: { leagueId } });
    expect(picks).toBe(0);

    const team = await prisma.fantasyTeam.findUnique({
      where: { leagueMemberId: order[0].leagueMemberId },
    });
    expect(team!.driver1Id).toBeNull();

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    expect(league!.draftStatus).toBe('PENDING');
  });

  it('permite volver a arrancar el draft despues de un reset', async () => {
    const { leagueId, owner } = await setupLeague(2);
    await startDraft(owner.token, leagueId);
    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/reset`)
      .set('Authorization', `Bearer ${owner.token}`);

    const res = await startDraft(owner.token, leagueId);
    expect(res.status).toBe(201);
  });

  it('rechaza si no soy owner (403 NOT_LEAGUE_OWNER)', async () => {
    const { leagueId, members } = await setupLeague(2);
    const res = await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/reset`)
      .set('Authorization', `Bearer ${members[1].token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_LEAGUE_OWNER');
  });
});
