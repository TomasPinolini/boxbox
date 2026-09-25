import { io, type Socket } from 'socket.io-client';
import { env } from '../../config/env';

// connectDraftSocket: unico lugar que arma el socket del namespace /draft (mismo criterio que
// ApiClient para HTTP — una puerta, no un `io(...)` suelto en cada componente). La liga se
// decide en el handshake (`auth: { token, leagueId }`), no con un evento "join" aparte —
// espeja exactamente el middleware de backend/src/modules/draft/draft.gateway.ts.
export function connectDraftSocket(leagueId: number, token: string): Socket {
  return io(`${env.socketUrl}/draft`, { auth: { token, leagueId } });
}
