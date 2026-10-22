import { io, type Socket } from 'socket.io-client';
import { env } from '../../config/env';

// La liga va en el handshake y no en un evento "join": asi lo espera draft.gateway.ts del backend.
export function connectDraftSocket(leagueId: number, token: string): Socket {
  return io(`${env.socketUrl}/draft`, { auth: { token, leagueId } });
}
