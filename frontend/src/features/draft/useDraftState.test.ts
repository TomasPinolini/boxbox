import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../store/auth.store';
import { useDraftState } from './useDraftState';

// Fake socket minimo (sin depender de tipos de Node — este archivo cae bajo el tsconfig del
// browser): on/emit alcanzan para simular eventos "del servidor", y disconnect solo queda
// registrado para afirmar que el cleanup del efecto lo llama. io() mockeado devuelve siempre
// la misma instancia para poder disparar eventos desde el test.
class FakeSocket {
  private listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  disconnect = vi.fn();
  // vi.fn (no un metodo plano): dispara los listeners locales para simular eventos "del
  // servidor" en los tests Y queda espiable para afirmar que submitPick mando 'draft:pick'.
  emit = vi.fn((event: string, ...args: unknown[]) => {
    for (const handler of this.listeners.get(event) ?? []) handler(...args);
  });

  on(event: string, handler: (...args: unknown[]) => void) {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(handler);
    this.listeners.set(event, handlers);
  }
}
let lastSocket: FakeSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    lastSocket = new FakeSocket();
    return lastSocket;
  }),
}));

describe('useDraftState', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession(
      { id: 1, email: 'a@b.c', name: 'Ana', avatarUrl: null, role: 'USER' },
      'tok',
    );
  });

  it('arranca conectando y pasa a connected en el evento connect', async () => {
    const { result } = renderHook(() => useDraftState(7));
    expect(result.current.status).toBe('connecting');

    act(() => lastSocket.emit('connect'));
    await waitFor(() => expect(result.current.status).toBe('connected'));
  });

  it('guarda el draft:state recibido', async () => {
    const { result } = renderHook(() => useDraftState(7));
    const payload = {
      draftStatus: 'LIVE' as const,
      round: 1,
      pickNumber: 1,
      currentTurnLeagueMemberId: 5,
      picks: [],
    };

    act(() => lastSocket.emit('draft:state', payload));
    await waitFor(() => expect(result.current.state).toEqual(payload));
  });

  it('un draft:update agrega el pick nuevo sin duplicar el estado previo', async () => {
    const { result } = renderHook(() => useDraftState(7));
    act(() =>
      lastSocket.emit('draft:state', {
        draftStatus: 'LIVE',
        round: 1,
        pickNumber: 1,
        currentTurnLeagueMemberId: 5,
        picks: [],
      }),
    );
    await waitFor(() => expect(result.current.state).not.toBeNull());

    const pick = {
      id: 1,
      leagueMemberId: 5,
      pickNumber: 1,
      round: 1,
      driverId: 44,
      constructorId: null,
      pickedAt: '2026-09-21T00:00:00.000Z',
    };
    act(() =>
      lastSocket.emit('draft:update', {
        pick,
        nextTurn: 6,
        round: 1,
        available: { drivers: [], constructors: [] },
      }),
    );

    await waitFor(() => expect(result.current.state?.picks).toEqual([pick]));
    expect(result.current.state?.currentTurnLeagueMemberId).toBe(6);
  });

  it('un connect_error deja status "error" con el mensaje', async () => {
    const { result } = renderHook(() => useDraftState(7));
    act(() => lastSocket.emit('connect_error', new Error('LEAGUE_NOT_FOUND')));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe('LEAGUE_NOT_FOUND');
  });

  it('al desmontar, desconecta el socket', () => {
    const { unmount } = renderHook(() => useDraftState(7));
    unmount();
    expect(lastSocket.disconnect).toHaveBeenCalledOnce();
  });

  it('submitPick manda draft:pick por el socket y marca pending', () => {
    const { result } = renderHook(() => useDraftState(7));
    act(() => result.current.submitPick({ driverId: 44 }));

    expect(lastSocket.emit).toHaveBeenCalledWith('draft:pick', { driverId: 44 });
    expect(result.current.pickPending).toBe(true);
  });

  it('un draft:error baja pending y guarda el error del pick', async () => {
    const { result } = renderHook(() => useDraftState(7));
    act(() => result.current.submitPick({ driverId: 44 }));

    act(() => lastSocket.emit('draft:error', { code: 'NOT_YOUR_TURN', message: 'no es tu turno' }));
    await waitFor(() => expect(result.current.pickPending).toBe(false));
    expect(result.current.pickError).toEqual({ code: 'NOT_YOUR_TURN', message: 'no es tu turno' });
  });

  it('un draft:update propio baja pending y limpia el error del pick anterior', async () => {
    const { result } = renderHook(() => useDraftState(7));
    act(() =>
      lastSocket.emit('draft:state', { draftStatus: 'LIVE', round: 1, pickNumber: 1, currentTurnLeagueMemberId: 5, picks: [] }),
    );
    act(() => lastSocket.emit('draft:error', { code: 'NOT_YOUR_TURN', message: 'no es tu turno' }));
    await waitFor(() => expect(result.current.pickError).not.toBeNull());

    act(() =>
      lastSocket.emit('draft:update', {
        pick: { id: 1, leagueMemberId: 5, pickNumber: 1, round: 1, driverId: 44, constructorId: null, pickedAt: null },
        nextTurn: 6,
        round: 1,
        available: { drivers: [], constructors: [] },
      }),
    );
    await waitFor(() => expect(result.current.pickError).toBeNull());
    expect(result.current.pickPending).toBe(false);
  });

  it('el timer cuenta hacia atras un segundo por tick', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useDraftState(7));
      act(() => lastSocket.emit('draft:timer', { secondsRemaining: 5 }));
      expect(result.current.secondsRemaining).toBe(5);

      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.secondsRemaining).toBe(4);

      act(() => vi.advanceTimersByTime(4000));
      expect(result.current.secondsRemaining).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('un draft:complete limpia el timer', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useDraftState(7));
      act(() => lastSocket.emit('draft:timer', { secondsRemaining: 10 }));
      expect(result.current.secondsRemaining).toBe(10);

      act(() => lastSocket.emit('draft:complete', { teams: [] }));
      expect(result.current.secondsRemaining).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
