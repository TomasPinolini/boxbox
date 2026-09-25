import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { DraftAvailable, DraftPick, DraftState } from '../../models/draft';
import { useAuthStore } from '../../store/auth.store';
import { connectDraftSocket } from './draft-socket';

export type DraftConnectionStatus = 'connecting' | 'connected' | 'error';
export type DraftPickInput = { driverId: number } | { constructorId: number };

interface DraftUpdatePayload {
  pick: DraftPick | null;
  nextTurn: number | null;
  round: number | null;
  available: DraftAvailable;
}

interface DraftSocketResult {
  state: DraftState | null;
  status: DraftConnectionStatus;
  errorMessage: string | null;
  secondsRemaining: number | null;
  pickError: { code: string; message: string } | null;
  pickPending: boolean;
  submitPick: (input: DraftPickInput) => void;
}

// useDraftState: conecta al namespace /draft para ESTA liga, mantiene el `draft:state` al dia
// con los broadcasts que van llegando, y expone `submitPick` para mandar el pick propio
// (Slice 13b tramo 2 — tramo 1 solo leia el estado).
export function useDraftState(leagueId: number): DraftSocketResult {
  const token = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<DraftState | null>(null);
  const [status, setStatus] = useState<DraftConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  // timerTick sube cada vez que llega un draft:timer/draft:state con timer nuevo (una vez por
  // ronda o pick), nunca en cada segundo — el reset del `setInterval` de mas abajo depende de
  // esto, no del valor de secondsRemaining (que cambia cada 1s y recrearia el intervalo).
  const [timerTick, setTimerTick] = useState(0);
  const [pickError, setPickError] = useState<{ code: string; message: string } | null>(null);
  const [pickPending, setPickPending] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = connectDraftSocket(leagueId, token);
    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));

    socket.on('draft:state', (payload: DraftState) => {
      setState(payload);
      setSecondsRemaining(payload.timer?.secondsRemaining ?? null);
      setTimerTick((n) => n + 1);
    });

    socket.on('draft:update', (payload: DraftUpdatePayload) => {
      setPickPending(false);
      setPickError(null);
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

    socket.on('draft:timer', (payload: { secondsRemaining: number }) => {
      setSecondsRemaining(payload.secondsRemaining);
      setTimerTick((n) => n + 1);
    });

    socket.on('draft:complete', () => {
      setPickPending(false);
      setSecondsRemaining(null);
      setState((prev) =>
        prev ? { ...prev, draftStatus: 'COMPLETED', currentTurnLeagueMemberId: null, round: null } : prev,
      );
    });

    socket.on('draft:error', (payload: { code: string; message: string }) => {
      setPickPending(false);
      setPickError(payload);
    });

    socket.on('connect_error', (err: Error) => {
      setStatus('error');
      setErrorMessage(err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [leagueId, token]);

  // El countdown en si: un setInterval que decrementa cada 1s. Depende de timerTick (no de
  // secondsRemaining) para no recrearse a si mismo en cada tick.
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerTick]);

  const submitPick = useCallback((input: DraftPickInput) => {
    setPickError(null);
    setPickPending(true);
    socketRef.current?.emit('draft:pick', input);
  }, []);

  return { state, status, errorMessage, secondsRemaining, pickError, pickPending, submitPick };
}
