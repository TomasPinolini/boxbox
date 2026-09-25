// Espejo del payload de `draft:state` (backend/src/modules/draft/draft.gateway.ts) — mismo
// shape que devuelve GET /leagues/:id/draft/state, mas `available` y `timer` que solo manda
// el socket. Slice 13b (tramo 1) solo LEE este estado; picks y timer countdown quedan para
// el tramo 2, pero el tipo ya refleja el wire format completo para no romper cuando se sumen.

export type DraftRoundCategory = 'DRIVER' | 'CONSTRUCTOR';

export interface DraftPick {
  id: number;
  leagueMemberId: number;
  pickNumber: number;
  round: number;
  driverId: number | null;
  constructorId: number | null;
  pickedAt: string | null;
}

export interface DraftAvailable {
  drivers: { id: number; firstName: string; lastName: string; number: number; code: string }[];
  constructors: { id: number; name: string; color: string }[];
}

export interface DraftState {
  draftStatus: 'PENDING' | 'LIVE' | 'COMPLETED';
  round: number | null;
  pickNumber: number | null;
  currentTurnLeagueMemberId: number | null;
  picks: DraftPick[];
  available?: DraftAvailable;
  timer?: { secondsRemaining: number } | null;
}
