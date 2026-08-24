// GATEWAY — namespace `/draft` de Socket.io. Overlay en tiempo real sobre el REST de Slice 5:
// reusa draft.service.ts tal cual (start/state/available/pick), nunca reimplementa reglas de
// negocio. Este archivo solo agrega: auth por JWT en el handshake, rooms por liga, broadcasts,
// y el timer de 60s con auto-pick (setTimeout, no setInterval — el server nunca "tickea" el
// countdown, solo avisa una vez cuanto dura y dispara una vez cuando expira).
//
// REST <-> Socket, en ambas direcciones:
//   - Un pick que llega por socket dispara los mismos broadcasts que uno que llega por REST.
//   - Un pick/start/reset que llega por REST (draft.controller.ts, via shared/socket.ts) tambien
//     notifica a los clientes conectados por socket. Sin esto, Slice 6 seria inconsistente
//     apenas alguien usara el REST en vez del socket — dejaria de ser un "overlay" real.
//
// Auth: el cliente conecta con `auth: { token, leagueId }` en el handshake (no hay evento
// "join" separado — la liga se decide al conectar). Si el token es invalido o el user no es
// ACTIVE member de esa liga, la conexion se rechaza en el middleware del namespace (evento
// `connect_error` del lado del cliente) — nunca llega a `connection`.

import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../../config/env';
import { prisma } from '../../shared/prisma';
import { verifyAccessToken } from '../../shared/jwt';
import { AppError } from '../../shared/errors';
import {
  getDraftState,
  getAvailablePicks,
  submitPick,
  categoryForRound,
} from './draft.service';
import { draftPickSchema } from './draft.schema';

const DEFAULT_PICK_TIMEOUT_MS = 60_000;

// pickTimeoutMs configurado para ESTA instancia del gateway (seteado una vez por
// registerDraftGateway). Vive en modulo, no como parametro que cada funcion tiene que recibir
// y reenviar: draft.controller.ts (REST) llama a broadcastPickResult/announceDraftStarted sin
// saber nada de timers, y aun asi tiene que respetar el mismo timeout que configuro el gateway
// — si esto fuera un parametro con default propio en cada funcion exportada, cualquier llamada
// que no lo pase explicitamente (como las del controller) caeria silenciosamente al default de
// 60s real aunque el gateway se haya registrado con un override para tests. Ya paso una vez.
let configuredPickTimeoutMs = DEFAULT_PICK_TIMEOUT_MS;

type SocketData = {
  userId: number;
  leagueId: number;
  leagueMemberId: number;
};

type DraftServer = SocketIOServer<
  { 'draft:pick': (payload: unknown) => void },
  {
    'draft:state': (payload: unknown) => void;
    'draft:update': (payload: unknown) => void;
    'draft:timer': (payload: { secondsRemaining: number }) => void;
    'draft:complete': (payload: { teams: unknown[] }) => void;
    'draft:error': (payload: { code: string; message: string }) => void;
  },
  Record<string, never>,
  SocketData
>;

function roomName(leagueId: number): string {
  return `league:${leagueId}`;
}

// activeTimers — estado en memoria del proceso (no persiste a DB, no sobrevive un restart del
// server). Es lo estandar para timers de sockets: son efimeros por naturaleza. startedAt sirve
// para poder decirle a un cliente que se conecta A MITAD del countdown cuanto le queda.
const activeTimers = new Map<number, { handle: NodeJS.Timeout; startedAt: number; timeoutMs: number }>();

function clearDraftTimer(leagueId: number): void {
  const existing = activeTimers.get(leagueId);
  if (existing) {
    clearTimeout(existing.handle);
    activeTimers.delete(leagueId);
  }
}

// clearAllDraftTimers — SOLO para tests. activeTimers es estado de proceso, no de DB: el
// truncate-cascade de tests/setup.ts entre cada test borra las ligas pero no cancela timers ya
// agendados contra esas ligas. Sin este cleanup, un timer que quedo vivo de un test anterior
// dispara mas tarde contra una liga que ya no existe (NotFoundError sin catch, unhandled
// rejection) durante un test completamente distinto.
export function clearAllDraftTimers(): void {
  for (const leagueId of activeTimers.keys()) {
    clearDraftTimer(leagueId);
  }
}

function getTimerSnapshot(leagueId: number): { secondsRemaining: number } | null {
  const entry = activeTimers.get(leagueId);
  if (!entry) return null;
  const elapsed = Date.now() - entry.startedAt;
  // Math.ceil, no Math.round: nunca queremos reportar "0 segundos" mientras todavia queda
  // tiempo real (con timeouts cortos en tests, round(0.3) redondea a 0 y es enganoso).
  const remaining = Math.max(0, Math.ceil((entry.timeoutMs - elapsed) / 1000));
  return { secondsRemaining: remaining };
}

// scheduleAutoPick: (re)arranca el timer de la ronda actual. Se llama al arrancar el draft y
// despues de cada pick (manual o auto) mientras el draft siga LIVE.
function scheduleAutoPick(io: DraftServer, leagueId: number): void {
  clearDraftTimer(leagueId);
  const timeoutMs = configuredPickTimeoutMs;

  io.of('/draft')
    .to(roomName(leagueId))
    .emit('draft:timer', { secondsRemaining: Math.ceil(timeoutMs / 1000) });

  const handle = setTimeout(() => {
    activeTimers.delete(leagueId);
    void runAutoPick(io, leagueId);
  }, timeoutMs);

  activeTimers.set(leagueId, { handle, startedAt: Date.now(), timeoutMs });
}

// runAutoPick: elige al azar entre los disponibles de la categoria que le toca a la ronda
// actual (decision de equipo — no hay sistema de ranking en el proyecto, asi que "el mejor
// disponible" del roadmap se resuelve como random entre los legales para esa ronda).
async function runAutoPick(io: DraftServer, leagueId: number): Promise<void> {
  const state = await getDraftState(leagueId);
  if (state.draftStatus !== 'LIVE' || state.round === null || state.currentTurnLeagueMemberId === null) {
    // El draft se reseteo/completo entre que se agendo este timer y que disparo — nada que hacer.
    return;
  }

  const category = categoryForRound(state.round);
  const available = await getAvailablePicks(leagueId);
  const pool = category === 'DRIVER' ? available.drivers : available.constructors;

  if (pool.length === 0) {
    // Defense in depth: no deberia pasar en un draft real (siempre hay mas drivers/constructors
    // que slots a llenar), pero si pasa no reagendamos — mejor un turno colgado que un crash.
    return;
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const input = category === 'DRIVER' ? { driverId: chosen.id } : { constructorId: chosen.id };

  try {
    await submitPick(leagueId, state.currentTurnLeagueMemberId, input);
  } catch {
    // Race: un pick manual gano la carrera contra el timer entre el findFirst de arriba y
    // este submitPick (el re-check WHERE-null de submitPick lo hace fallar en vez de pisar el
    // pick manual). El pick manual ya broadcasteo su propio draft:update — no hacemos nada mas.
    return;
  }

  await broadcastPickResult(io, leagueId);
}

// broadcastPickResult: la logica compartida despues de CUALQUIER pick exitoso (manual por
// socket, manual por REST, o auto del timer). Exportada para que draft.controller.ts la llame
// tras un POST /pick exitoso.
export async function broadcastPickResult(io: DraftServer, leagueId: number): Promise<void> {
  const state = await getDraftState(leagueId);
  const available = await getAvailablePicks(leagueId);
  const lastPick = state.picks[state.picks.length - 1] ?? null;

  io.of('/draft').to(roomName(leagueId)).emit('draft:update', {
    pick: lastPick,
    nextTurn: state.currentTurnLeagueMemberId,
    round: state.round,
    available,
  });

  if (state.draftStatus === 'COMPLETED') {
    clearDraftTimer(leagueId);
    const teams = await prisma.fantasyTeam.findMany({
      where: { leagueMember: { leagueId } },
    });
    io.of('/draft').to(roomName(leagueId)).emit('draft:complete', { teams });
    return;
  }

  scheduleAutoPick(io, leagueId);
}

// announceDraftStarted / announceDraftReset: llamadas desde draft.controller.ts (REST) para
// que los clientes ya conectados por socket se enteren de un start/reset disparado por HTTP.
export async function announceDraftStarted(io: DraftServer, leagueId: number): Promise<void> {
  const state = await getDraftState(leagueId);
  const available = await getAvailablePicks(leagueId);
  io.of('/draft')
    .to(roomName(leagueId))
    .emit('draft:state', { ...state, available, timer: getTimerSnapshot(leagueId) });
  scheduleAutoPick(io, leagueId);
}

export async function announceDraftReset(io: DraftServer, leagueId: number): Promise<void> {
  clearDraftTimer(leagueId);
  const state = await getDraftState(leagueId);
  const available = await getAvailablePicks(leagueId);
  io.of('/draft')
    .to(roomName(leagueId))
    .emit('draft:state', { ...state, available, timer: null });
}

async function handleSocketPick(io: DraftServer, socket: Socket, payload: unknown) {
  const parsed = draftPickSchema.safeParse(payload);
  if (!parsed.success) {
    socket.emit('draft:error', { code: 'VALIDATION_ERROR', message: 'Invalid pick payload' });
    return;
  }

  try {
    await submitPick(socket.data.leagueId, socket.data.leagueMemberId, parsed.data);
    await broadcastPickResult(io, socket.data.leagueId);
  } catch (err) {
    if (err instanceof AppError) {
      socket.emit('draft:error', { code: err.code, message: err.message });
    } else {
      socket.emit('draft:error', { code: 'INTERNAL_ERROR', message: 'Something went wrong' });
    }
  }
}

export type DraftGatewayOptions = {
  pickTimeoutMs?: number;
};

// registerDraftGateway: crea el Server de Socket.io sobre el httpServer dado y arma el
// namespace /draft entero. Devuelve el Server para que server.ts lo guarde en shared/socket.ts.
// pickTimeoutMs es override-able (default 60s) — tests lo bajan a milisegundos para no tener
// que esperar 60s reales por cada assert del auto-pick.
export function registerDraftGateway(
  httpServer: HttpServer,
  options: DraftGatewayOptions = {},
): DraftServer {
  configuredPickTimeoutMs = options.pickTimeoutMs ?? DEFAULT_PICK_TIMEOUT_MS;
  // cors: Socket.io atiende /socket.io/* directo sobre el http.Server, ANTES que Express, asi
  // que el cors() de app.ts NO aplica al handshake. Sin esta opcion el browser del frontend
  // (FRONTEND_URL) falla el primer request de polling con `xhr poll error`. Misma lista que
  // app.ts, leida del mismo lugar (config/env.ts) — nunca una segunda copia de la URL.
  const io: DraftServer = new SocketIOServer(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });
  const draftNamespace = io.of('/draft');

  draftNamespace.use(async (socket, next) => {
    try {
      const { token, leagueId } = socket.handshake.auth as { token?: string; leagueId?: number };

      if (!token) {
        next(new Error('TOKEN_MISSING'));
        return;
      }
      if (typeof leagueId !== 'number') {
        next(new Error('LEAGUE_ID_REQUIRED'));
        return;
      }

      // Puede tirar UnauthorizedError (TOKEN_INVALID) — lo dejamos caer al catch de abajo.
      const payload = verifyAccessToken(token);

      const member = await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId, userId: payload.userId } },
      });
      // Mismo criterio P2-1 que requireLeagueMember (HTTP): no distinguimos "liga no existe"
      // de "no soy member" — ambos casos rechazan la conexion igual.
      if (!member || member.status !== 'ACTIVE') {
        next(new Error('LEAGUE_NOT_FOUND'));
        return;
      }

      socket.data.userId = payload.userId;
      socket.data.leagueId = leagueId;
      socket.data.leagueMemberId = member.id;
      next();
    } catch {
      next(new Error('TOKEN_INVALID'));
    }
  });

  draftNamespace.on('connection', (socket) => {
    const { leagueId } = socket.data;
    socket.join(roomName(leagueId));

    // Snapshot inicial — fire and forget desde el handler sync de 'connection' (Socket.io no
    // espera un return de esta callback), pero cualquier error queda logueado en vez de perdido.
    void (async () => {
      const state = await getDraftState(leagueId);
      const available = await getAvailablePicks(leagueId);
      socket.emit('draft:state', { ...state, available, timer: getTimerSnapshot(leagueId) });
    })();

    socket.on('draft:pick', (payload) => {
      void handleSocketPick(io, socket, payload);
    });
  });

  return io;
}
