// TESTS — el namespace /draft de socket.io contra un http.Server real (sin mocks, ADR-0003).
// A diferencia de draft.test.ts (que le pega a `app` via supertest sin bindear puerto), acá
// hace falta un puerto real: los sockets necesitan un servidor escuchando de verdad.
//
// pickTimeoutMs se baja a 300ms para este archivo (registerDraftGateway({ pickTimeoutMs })) —
// nada que ver con los 60s reales de produccion, es solo para no tener que esperar 60s por
// cada test del auto-pick.

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import type { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import app from '../../app';
import { env } from '../../config/env';
import { prisma } from '../../shared/prisma';
import { registerDraftGateway, clearAllDraftTimers } from './draft.gateway';
import { setIo } from '../../shared/socket';

const PICK_TIMEOUT_MS = 300;

let httpServer: HttpServer;
let io: SocketIOServer;
let port: number;

beforeAll(async () => {
  httpServer = createServer(app);
  io = registerDraftGateway(httpServer, { pickTimeoutMs: PICK_TIMEOUT_MS });
  setIo(io);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  port = typeof address === 'object' && address !== null ? address.port : 0;
});

// activeTimers es un Map en memoria del modulo — el truncate-cascade de tests/setup.ts entre
// cada test borra las ligas de la DB pero no cancela timers de auto-pick ya agendados contra
// esas ligas. Sin este afterEach, un timer que un test dejo corriendo (arranco el draft pero
// nunca espero a que el timer disparara) explota mas tarde contra una liga ya truncada.
afterEach(() => {
  clearAllDraftTimers();
});

afterAll(async () => {
  setIo(null);
  // io.close() (no httpServer.close() a secas): cierra el engine.io/transporte de socket.io Y
  // el httpServer subyacente, y desconecta cualquier cliente que haya quedado sin disconnect()
  // explicito. Cerrar solo el httpServer se cuelga esperando conexiones que socket.io mantiene
  // vivas por su cuenta (keep-alive), y el hook de vitest terminaba en timeout.
  await new Promise<void>((resolve) => io.close(() => resolve()));
});

// ─── Helpers locales (no van a shared/ — mismo criterio que draft.test.ts) ─────────────

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
async function seedDriver() {
  const n = ++driverCounter;
  const res = await request(app)
    .post('/api/v1/drivers')
    .send({ firstName: 'GW', lastName: `D${n}`, number: n, code: `G${String(n).padStart(2, '0')}`, externalId: `gw-driver-${n}` });
  if (res.status !== 201) throw new Error(`seedDriver fallo: ${JSON.stringify(res.body)}`);
  return res.body.data.id as number;
}

let constructorCounter = 0;
async function seedConstructor() {
  const n = ++constructorCounter;
  const res = await request(app)
    .post('/api/v1/constructors')
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

  return { leagueId, owner: members[0], members };
}

async function discoverOrder(leagueId: number, members: Member[]): Promise<Member[]> {
  const round1 = await prisma.draftPick.findMany({ where: { leagueId, round: 1 }, orderBy: { pickNumber: 'asc' } });
  return round1.map((p) => members.find((m) => m.leagueMemberId === p.leagueMemberId)!);
}

function connectSocket(token: string, leagueId: number): ClientSocket {
  return ioClient(`http://localhost:${port}/draft`, {
    auth: { token, leagueId },
    transports: ['websocket'],
    reconnection: false,
  });
}

function waitForEvent<T = unknown>(socket: ClientSocket, event: string, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout esperando evento '${event}'`)), timeoutMs);
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

// connectMember: conecta y devuelve el socket YA con el draft:state inicial consumido.
// Importante el ORDEN: registra el listener de 'draft:state' (waitForEvent ejecuta su
// `socket.once(...)` de forma sincronica, antes de que este `await` ceda el control) ANTES de
// esperar el 'connect'. Si esperaramos el connect primero y recién despues llamaramos a
// waitForEvent, el servidor podria emitir draft:state en la microtask inmediatamente posterior
// a 'connection' y perderse — .once() no bufferea eventos emitidos antes de que exista.
async function connectMember(token: string, leagueId: number) {
  const socket = connectSocket(token, leagueId);
  const statePromise = waitForEvent<{ draftStatus: string; picks: unknown[] }>(socket, 'draft:state');
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

    const updatePromiseFirst = waitForEvent<{ pick: { driverId: number } }>(socketFirst, 'draft:update');
    const updatePromiseSecond = waitForEvent<{ pick: { driverId: number } }>(socketSecond, 'draft:update');

    socketFirst.emit('draft:pick', { driverId: d1 });

    const [updateFirst, updateSecond] = await Promise.all([updatePromiseFirst, updatePromiseSecond]);
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
    const { leagueId, owner } = await setupLeague(1);
    await seedDriver(); // unico driver disponible para la ronda 1 -> el auto-pick lo elige a el

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
    const drivers = await Promise.all(Array.from({ length: 3 }, () => seedDriver()));
    const constructorId = await seedConstructor();

    const { socket } = await connectMember(owner.token, leagueId);

    await request(app)
      .post(`/api/v1/leagues/${leagueId}/draft/start`)
      .set('Authorization', `Bearer ${owner.token}`);
    await waitForEvent(socket, 'draft:timer');

    const completePromise = waitForEvent<{ teams: { constructorId: number }[] }>(socket, 'draft:complete');

    for (let i = 0; i < 3; i++) {
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

// ─── CORS del handshake (A1 / PER-11) ─────────────────────────────────────────────────
// Socket.io atiende /socket.io/* directo sobre el http.Server, ANTES que Express — el cors()
// de app.ts nunca corre para el handshake. Por eso estos tests pegan a `httpServer`, no a `app`:
// contra `app` pasarian siempre (Express si tiene cors) y no probarian nada.
//
// Reproducen el PRIMER request que hace un browser real: GET polling con header Origin. Los
// demas tests de este archivo usan transports: ['websocket'] desde Node, que es justamente la
// combinacion que esconde el bug (Node no aplica same-origin; el upgrade a WS no pasa por CORS).
describe('draft namespace — CORS del handshake', () => {
  const HANDSHAKE_PATH = '/socket.io/?EIO=4&transport=polling';

  it('responde Access-Control-Allow-Origin para FRONTEND_URL en el polling inicial', async () => {
    const res = await request(httpServer).get(HANDSHAKE_PATH).set('Origin', env.FRONTEND_URL);

    expect(res.headers['access-control-allow-origin']).toBe(env.FRONTEND_URL);
  });

  // El paquete `cors` (que usa Socket.io por abajo, igual que app.ts) con `origin: string` NO
  // refleja el Origin del request ni omite el header: siempre responde el origin configurado.
  // El browser compara ese valor con su propio origin y bloquea si no coincide. Lo que este
  // test protege es que nadie "arregle" el cors con `origin: '*'` o `origin: true` (reflejar
  // cualquiera) — ambos harian que evil.test pase.
  it('para un origin ajeno sigue respondiendo FRONTEND_URL (no refleja, no es *)', async () => {
    const res = await request(httpServer).get(HANDSHAKE_PATH).set('Origin', 'http://evil.test');

    expect(res.headers['access-control-allow-origin']).toBe(env.FRONTEND_URL);
  });
});

// ─── Errores en segundo plano (B1 / BOX-16) ───────────────────────────────────────────
// El timer de auto-pick corre "fire and forget" (void runAutoPick(...)): nadie espera su
// promesa. Si falla — ej. la liga ya no existe cuando dispara, que es exactamente lo que pasa
// cuando el truncate de tests/setup.ts corre con un timer vivo — la promesa rechaza sin nadie
// que la atrape, y Node termina el proceso. Este test reproduce ese caso a proposito y exige
// que el error quede logueado y el server siga respondiendo.
describe('draft namespace — errores en segundo plano no tiran el proceso', () => {
  it('si el timer dispara contra una liga borrada, loguea el error y el server sigue vivo', async () => {
    const { leagueId, owner } = await setupLeague(1);
    await seedDriver();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await request(app)
        .post(`/api/v1/leagues/${leagueId}/draft/start`)
        .set('Authorization', `Bearer ${owner.token}`);

      // Timer armado (300ms). Borramos la liga por abajo, igual que hace el truncate entre tests.
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
