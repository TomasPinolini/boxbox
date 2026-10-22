// Las reglas del draft viven en draft.service.ts; aca solo hay auth del handshake, rooms,
// broadcasts y el timer de auto-pick. El server no tickea el countdown: avisa una vez cuanto
// dura y dispara una vez al vencer. Los picks por REST emiten los mismos eventos.

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

// A nivel de modulo y no como parametro: draft.controller.ts llama a las funciones exportadas
// sin saber de timers y tiene que respetar el override que registro el gateway (tests).
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
    // No es un evento del draft, pero los que hay que avisar estan conectados a este namespace.
    'league:archived': (payload: { leagueId: number }) => void;
  },
  Record<string, never>,
  SocketData
>;

function roomName(leagueId: number): string {
  return `league:${leagueId}`;
}

// En memoria: un restart del server pierde los timers. startedAt permite decirle a un cliente
// que se conecta a mitad del countdown cuanto le queda.
const activeTimers = new Map<number, { handle: NodeJS.Timeout; startedAt: number; timeoutMs: number }>();

function clearDraftTimer(leagueId: number): void {
  const existing = activeTimers.get(leagueId);
  if (existing) {
    clearTimeout(existing.handle);
    activeTimers.delete(leagueId);
  }
}

// Solo para tests: el truncate entre tests borra las ligas pero no los timers, que si no
// disparan despues contra una liga inexistente en medio de otro test.
export function clearAllDraftTimers(): void {
  for (const leagueId of activeTimers.keys()) {
    clearDraftTimer(leagueId);
  }
}

function getTimerSnapshot(leagueId: number): { secondsRemaining: number } | null {
  const entry = activeTimers.get(leagueId);
  if (!entry) return null;
  const elapsed = Date.now() - entry.startedAt;
  // ceil y no round: nunca reportar "0 segundos" mientras todavia queda tiempo.
  const remaining = Math.max(0, Math.ceil((entry.timeoutMs - elapsed) / 1000));
  return { secondsRemaining: remaining };
}

function scheduleAutoPick(io: DraftServer, leagueId: number): void {
  clearDraftTimer(leagueId);
  const timeoutMs = configuredPickTimeoutMs;

  io.of('/draft')
    .to(roomName(leagueId))
    .emit('draft:timer', { secondsRemaining: Math.ceil(timeoutMs / 1000) });

  const handle = setTimeout(() => {
    activeTimers.delete(leagueId);
    // .catch obligatorio: nadie espera esta promesa, y un rechazo sin catch termina el proceso.
    void runAutoPick(io, leagueId).catch((err) =>
      console.error(`[draft] auto-pick fallo (league ${leagueId})`, err),
    );
  }, timeoutMs);

  activeTimers.set(leagueId, { handle, startedAt: Date.now(), timeoutMs });
}

// Al azar entre los legales de la ronda: no hay ranking para elegir "el mejor disponible".
async function runAutoPick(io: DraftServer, leagueId: number): Promise<void> {
  const state = await getDraftState(leagueId);
  if (state.draftStatus !== 'LIVE' || state.round === null || state.currentTurnLeagueMemberId === null) {
    // Se reseteo o completo entre que se agendo el timer y que disparo.
    return;
  }

  const category = categoryForRound(state.round);
  const available = await getAvailablePicks(leagueId);
  const pool = category === 'DRIVER' ? available.drivers : available.constructors;

  if (pool.length === 0) {
    // No deberia pasar; si pasa no se reagenda: mejor un turno colgado que un crash.
    return;
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const input = category === 'DRIVER' ? { driverId: chosen.id } : { constructorId: chosen.id };

  try {
    await submitPick(leagueId, state.currentTurnLeagueMemberId, input);
  } catch (err) {
    // Lo esperado es que un pick manual le gano al timer (submitPick no lo pisa y ese pick ya
    // broadcasteo); igual se loguea por si es otra cosa, como la DB caida.
    console.warn(`[draft] auto-pick descartado (league ${leagueId})`, err);
    return;
  }

  await broadcastPickResult(io, leagueId);
}

// Despues de cualquier pick exitoso: por socket, por REST (draft.controller.ts) o del timer.
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

// Se puede archivar con el draft corriendo; sin este aviso los demas siguen mirando el reloj
// de una liga muerta. Va por /draft porque la pantalla de la liga no abre socket.
export function announceLeagueArchived(io: DraftServer, leagueId: number): void {
  clearDraftTimer(leagueId);
  io.of('/draft').to(roomName(leagueId)).emit('league:archived', { leagueId });
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

// pickTimeoutMs existe para que los tests no esperen 60s reales por cada auto-pick.
export function registerDraftGateway(
  httpServer: HttpServer,
  options: DraftGatewayOptions = {},
): DraftServer {
  configuredPickTimeoutMs = options.pickTimeoutMs ?? DEFAULT_PICK_TIMEOUT_MS;
  // Socket.io atiende el handshake antes que Express, asi que el cors() de app.ts no aplica.
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

      const payload = verifyAccessToken(token);

      const member = await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId, userId: payload.userId } },
      });
      // Como requireLeagueMember: "no existe" y "no sos miembro" responden igual (anti-enumeracion).
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

    // .catch obligatorio: nadie espera esta promesa, y un rechazo sin catch tira el proceso.
    void (async () => {
      const state = await getDraftState(leagueId);
      const available = await getAvailablePicks(leagueId);
      socket.emit('draft:state', { ...state, available, timer: getTimerSnapshot(leagueId) });
    })().catch((err) => console.error(`[draft] snapshot inicial fallo (league ${leagueId})`, err));

    socket.on('draft:pick', (payload) => {
      void handleSocketPick(io, socket, payload);
    });
  });

  return io;
}
