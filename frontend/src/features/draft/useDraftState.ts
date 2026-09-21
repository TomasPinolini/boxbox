import { useEffect, useState } from 'react';
import type { DraftAvailable, DraftPick, DraftState } from '../../models/draft';
import { useAuthStore } from '../../store/auth.store';
import { connectDraftSocket } from './draft-socket';

export type DraftConnectionStatus = 'connecting' | 'connected' | 'error';

interface DraftSocketResult {
  state: DraftState | null;
  status: DraftConnectionStatus;
  errorMessage: string | null;
}

interface DraftUpdatePayload {
  pick: DraftPick | null;
  nextTurn: number | null;
  round: number | null;
  available: DraftAvailable;
}

// useDraftState: conecta al namespace /draft para ESTA liga y mantiene el ultimo `draft:state`
// al dia con los broadcasts que van llegando. Tramo 1 de Slice 13b — solo lectura del estado
// en vivo; mandar un pick propio (`emit('draft:pick', ...)`) queda para el tramo 2, pero la
// pantalla igual refleja los picks de otros miembros mientras esta abierta.
export function useDraftState(leagueId: number): DraftSocketResult {
  const token = useAuthStore((s) => s.accessToken);
  const [state, setState] = useState<DraftState | null>(null);
  const [status, setStatus] = useState<DraftConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = connectDraftSocket(leagueId, token);

    socket.on('connect', () => setStatus('connected'));

    socket.on('draft:state', (payload: DraftState) => setState(payload));

    socket.on('draft:update', (payload: DraftUpdatePayload) => {
      setState((prev) => {
        if (!prev) return prev;
        const picks =
          payload.pick && !prev.picks.some((p) => p.id === payload.pick!.id)
            ? [...prev.picks, payload.pick]
            : prev.picks;
        return {
          ...prev,
          round: payload.round,
          currentTurnLeagueMemberId: payload.nextTurn,
          available: payload.available,
          picks,
        };
      });
    });

    socket.on('draft:complete', () => {
      setState((prev) =>
        prev ? { ...prev, draftStatus: 'COMPLETED', currentTurnLeagueMemberId: null, round: null } : prev,
      );
    });

    socket.on('connect_error', (err: Error) => {
      setStatus('error');
      setErrorMessage(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [leagueId, token]);

  return { state, status, errorMessage };
}
