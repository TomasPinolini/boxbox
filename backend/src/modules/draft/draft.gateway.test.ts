// A diferencia de draft.test.ts, aca hace falta un puerto real: los sockets necesitan un
// servidor escuchando. pickTimeoutMs baja a 300ms para no esperar 60s por cada auto-pick.

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import type { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import app from '../../app';
import { createTestAdmin } from '../../tests/setup';
import { env } from '../../config/env';
import { prisma } from '../../shared/prisma';
import { registerDraftGateway, clearAllDraftTimers } from './draft.gateway';

const PICK_TIMEOUT_MS = 300;

let httpServer: HttpServer;
let io: SocketIOServer;
let port: number;

beforeAll(async () => {
  httpServer = createServer(app);
  io = registerDraftGateway(httpServer, { pickTimeoutMs: PICK_TIMEOUT_MS });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  port = typeof address === 'object' && address !== null ? address.port : 0;
});

// El truncate entre tests borra las ligas pero no los timers en memoria, que si no explotan
// despues contra una liga ya truncada.
afterEach(() => {
  clearAllDraftTimers();
});

afterAll(async () => {
  // io.close() y no httpServer.close(): este ultimo se cuelga esperando las conexiones
  // keep-alive de socket.io y el hook termina en timeout.
  await new Promise<void>((resolve) => io.close(() => resolve()));
});

let userCounter = 0;
async function authedUser() {
  const counter = ++userCounter;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: `gw-user-${counter}@boxbox.com`, password: 'hunter2222', name: `GW${counter}` });
  if (res.status !== 201) throw new Error(`authedUser fallo: ${JSON.stringify(res.body)}`);
  return { userId: res.body.data.user.id, token: res.body.data.accessToken };
}

async function seedSeason() {
  return prisma.season.create({ data: { year: 2030, isActive: true, driverCount: 22 } });
}

let driverCounter = 0;
async function seedDriver(seasonId?: number) {
  const n = ++driverCounter;
  // El CRUD de catalogo es admin-only: cada seed pide su propio admin.
  const { accessToken } = await createTestAdmin();
  const res = await request(app)
    .post('/api/v1/drivers')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      firstName: 'GW',
      lastName: `D${n}`,
      number: n,
      code: `G${String(n).padStart(2, '0')}`,
      externalId: `gw-driver-${n}`,
    });
  if (res.status !== 201) throw new Error(`seedDriver fallo: ${JSON.stringify(res.body)}`);
  const driverId = res.body.data.id as number;

  // Sin DriverSeason el piloto no entra al pool y el auto-pick se queda sin candidatos.
  if (seasonId !== undefined) {
    const constructorId = await seedConstructor();
    await prisma.driverSeason.create({ data: { driverId, constructorId, seasonId } });
  }

  return driverId;
}

let constructorCounter = 0;
async function seedConstructor() {
  const n = ++constructorCounter;
  const { accessToken } = await createTestAdmin();
  const res = await request(app)
    .post('/api/v1/constructors')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: `GW Constructor ${n}`, color: '#111111', externalId: `gw-constructor-${n}` });
  if (res.status !== 201) throw new Error(`seedConstructor fallo: ${JSON.stringify(res.body)}`);
  return res.body.data.id as number;
}

type Member = { userId: number; token: string; leagueMemberId: number };

async function setupLeague(count: number) {
  const season = await seedSeason();
  const users = await Promise.all(Array.from({ length: count }, () => authedUser()));
  const inviteCode = `gw-${Date.now()}-${Math.floor(Math.random() * 1000)}`.slice(0, 20);

  const created = await request(app)
    .post('/api/v1/leagues')
    .set('Authorization', `Bearer ${users[0].token}`)
    .send({ name: 'GW League', inviteCode, seasonId: season.id, maxMembers: Math.max(count, 2) });
  const leagueId = created.body.data.id as number;

  for (const u of users.slice(1)) {
    await request(app)
      .post('/api/v1/leagues/join')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ inviteCode });
  }

  const membersRes = await request(app)
    .get(`/api/v1/leagues/${leagueId}/members`)
    .set('Authorization', `Bearer ${users[0].token}`);
  const members: Member[] = users.map((u) => {
    const m = membersRes.body.data.find((x: { userId: number }) => x.userId === u.userId);
    return { ...u, leagueMemberId: m.id as number };
  });

  return { leagueId, owner: members[0], members, season };
}

async function discoverOrder(leagueId: number, members: Member[]): Promise<Member[]> {
  const round1 = await prisma.draftPick.findMany({
    where: { leagueId, round: 1 },
    orderBy: { pickNumber: 'asc' },
  });
  return round1.map((p) => members.find((m) => m.leagueMemberId === p.leagueMemberId)!);
}

function connectSocket(token: string, leagueId: number): ClientSocket {
  return ioClient(`http://localhost:${port}/draft`, {
    auth: { token, leagueId },
    transports: ['websocket'],
    reconnection: false,
  });
}

function waitForEvent<T = unknown>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 2000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout esperando evento '${event}'`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function waitForConnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (err) => reject(err));
  });
}

// El listener de draft:state se registra antes de esperar 'connect': .once() no bufferea, y el
// server puede emitir el estado apenas conecta.
async function connectMember(token: string, leagueId: number) {
  const socket = connectSocket(token, leagueId);
  const statePromise = waitForEvent<{ draftStatus: string; picks: unknown[] }>(
    socket,
    'draft:state',
  );
  await waitForConnect(socket);
  const state = await statePromise;
  return { socket, state };
}

// ─── Auth en el handshake ───────────────────────────────────────────────

describe('draft namespace — auth en el handshake', () => {
  it('rechaza conexion sin token', async () => {
    const { leagueId } = await setupLeague(1);
    const socket = connectSocket('', leagueId);
    await expect(waitForConnect(socket)).rejects.toThrow();
    socket.disconnect();
  });

  it('rechaza conexion si no soy member de la liga', async () => {
    const { leagueId } = await setupLeague(1);
    const outsider = await authedUser();
    const socket = connectSocket(outsider.token, leagueId);
    await expect(waitForConnect(socket)).rejects.toThrow();
    socket.disconnect();
  });

  it('acepta conexion de un ACTIVE member y manda draft:state', async () => {
    const { leagueId, owner } = await setupLeague(1);
    const { socket, state } = await connectMember(owner.token, leagueId);
    expect(state.draftStatus).toBe('PENDING');
    expect(state.picks).toEqual([]);

    socket.disconnect();
  });
});

// ─── Pick por socket ────────────────────────────────────────────────────

describe('draft namespace — draft:pick', () => {
  it('pick valido se broadcastea como draft:update a TODOS los conectados de la liga', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${owner.token}`);
    const order = await discoverOrder(leagueId, members);
    const d1 = await seedDriver();

    const [{ socket: socketFirst }, { socket: socketSecond }] = await Promise.all([
      connectMember(order[0].token, leagueId),
      connectMember(order[1].token, leagueId),
    ]);

    const updatePromiseFirst = waitForEvent<{ pick: { driverId: number } }>(
      socketFirst,
      'draft:update',
    );
    const updatePromiseSecond = waitForEvent<{ pick: { driverId: number } }>(
      socketSecond,
      'draft:update',
    );

    socketFirst.emit('draft:pick', { driverId: d1 });

    const [updateFirst, updateSecond] = await Promise.all([
      updatePromiseFirst,
      updatePromiseSecond,
    ]);
    expect(updateFirst.pick.driverId).toBe(d1);
    expect(updateSecond.pick.driverId).toBe(d1);

    socketFirst.disconnect();
    socketSecond.disconnect();
  });

  it('pick fuera de turno via socket devuelve draft:error solo al que lo mando', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${owner.token}`);
    const order = await discoverOrder(leagueId, members);
    const d1 = await seedDriver();

    const { socket: socketSecond } = await connectMember(order[1].token, leagueId);

    const errorPromise = waitForEvent<{ code: string }>(socketSecond, 'draft:error');
    socketSecond.emit('draft:pick', { driverId: d1 });
    const error = await errorPromise;

    expect(error.code).toBe('NOT_YOUR_TURN');
    socketSecond.disconnect();
  });

  it('un pick hecho por REST tambien se broadcastea a los sockets conectados (overlay)', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${owner.token}`);
    const order = await discoverOrder(leagueId, members);
    const d1 = await seedDriver();

    const { socket } = await connectMember(order[1].token, leagueId); // no pickea, solo escucha

    const updatePromise = waitForEvent<{ pick: { driverId: number } }>(socket, 'draft:update');

    const res = await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/pick`)
      .set('Authorization', `Bearer ${order[0].token}`)
      .send({ driverId: d1 });
    expect(res.status).toBe(200);

    const update = await updatePromise;
    expect(update.pick.driverId).toBe(d1);

    socket.disconnect();
  });

  it('archivar la liga por REST avisa a los sockets conectados al draft', async () => {
    const { leagueId, owner, members } = await setupLeague(2);
    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${owner.token}`);

    const { socket } = await connectMember(members[1].token, leagueId);
    const archivedPromise = waitForEvent<{ leagueId: number }>(socket, 'league:archived');

    const res = await request(app)
      .patch(`/api/v1/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'ARCHIVED' });
    expect(res.status).toBe(200);

    const avisado = await archivedPromise;
    expect(avisado.leagueId).toBe(leagueId);

    socket.disconnect();
  });
});

// ─── Timer + auto-pick ──────────────────────────────────────────────────

describe('draft namespace — timer y auto-pick', () => {
  it('emite draft:timer al arrancar el draft', async () => {
    const { leagueId, owner } = await setupLeague(1);
    const { socket } = await connectMember(owner.token, leagueId);

    const timerPromise = waitForEvent<{ secondsRemaining: number }>(socket, 'draft:timer');
    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${owner.token}`);

    const timer = await timerPromise;
    expect(timer.secondsRemaining).toBeGreaterThan(0);
    socket.disconnect();
  });

  it('auto-pickea al expirar el timer si nadie pickeo a tiempo', async () => {
    const { leagueId, owner, season } = await setupLeague(1);
    await seedDriver(season.id); // unico driver disponible para la ronda 1 -> el auto-pick lo elige a el

    const { socket } = await connectMember(owner.token, leagueId);

    const updatePromise = waitForEvent<{ pick: { driverId: number } }>(
      socket,
      'draft:update',
      PICK_TIMEOUT_MS + 2000,
    );
    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${owner.token}`);

    // No mandamos ningun draft:pick — dejamos que el timer expire solo.
    const update = await updatePromise;
    expect(update.pick.driverId).toBeDefined();

    const pick = await prisma.draftPick.findFirst({ where: { leagueId, round: 1 } });
    expect(pick!.driverId).not.toBeNull();

    socket.disconnect();
  });

  it('emite draft:complete cuando el ultimo pick termina el draft', async () => {
    const { leagueId, owner } = await setupLeague(1);
    const drivers = await Promise.all(Array.from({ length: 2 }, () => seedDriver()));
    const constructorId = await seedConstructor();

    const { socket } = await connectMember(owner.token, leagueId);

    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${owner.token}`);
    await waitForEvent(socket, 'draft:timer');

    const completePromise = waitForEvent<{ teams: { constructorId: number }[] }>(
      socket,
      'draft:complete',
    );

    for (let i = 0; i < 2; i++) {
      const updatePromise = waitForEvent(socket, 'draft:update');
      socket.emit('draft:pick', { driverId: drivers[i] });
      await updatePromise;
    }
    socket.emit('draft:pick', { constructorId });

    const complete = await completePromise;
    expect(complete.teams).toHaveLength(1);
    expect(complete.teams[0].constructorId).toBe(constructorId);

    socket.disconnect();
  });
});

// Pegan a httpServer y no a `app`: el cors() de Express no corre en el handshake de
// Socket.io, asi que contra `app` pasarian siempre. Reproducen el polling inicial del browser,
// que los tests con transports: ['websocket'] no ejercitan.
describe('draft namespace — CORS del handshake', () => {
  const HANDSHAKE_PATH = '/socket.io/?EIO=4&transport=polling';

  it('responde Access-Control-Allow-Origin para FRONTEND_URL en el polling inicial', async () => {
    const res = await request(httpServer).get(HANDSHAKE_PATH).set('Origin', env.FRONTEND_URL);

    expect(res.headers['access-control-allow-origin']).toBe(env.FRONTEND_URL);
  });

  // Protege que nadie "arregle" el cors con `origin: '*'` o `origin: true`: ambos dejarian
  // pasar a evil.test.
  it('para un origin ajeno sigue respondiendo FRONTEND_URL (no refleja, no es *)', async () => {
    const res = await request(httpServer).get(HANDSHAKE_PATH).set('Origin', 'http://evil.test');

    expect(res.headers['access-control-allow-origin']).toBe(env.FRONTEND_URL);
  });
});

// Una promesa del timer que rechaza sin catch termina el proceso de Node.
describe('draft namespace — errores en segundo plano no tiran el proceso', () => {
  it('si el timer dispara contra una liga borrada, loguea el error y el server sigue vivo', async () => {
    const { leagueId, owner } = await setupLeague(1);
    await seedDriver();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await request(app)
        .post(`/api/v1/leagues/${leagueId}/draft/start`)
        .set('Authorization', `Bearer ${owner.token}`);

      // Con el timer armado, se borra la liga por abajo como hace el truncate entre tests.
      await prisma.$executeRawUnsafe('TRUNCATE TABLE leagues CASCADE');
      await new Promise((resolve) => setTimeout(resolve, PICK_TIMEOUT_MS + 300));

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[draft]'), expect.anything());

      const health = await request(app).get('/api/v1/health');
      expect(health.status).toBe(200);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
