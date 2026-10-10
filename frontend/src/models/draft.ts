// Espejo del payload de `draft:state` (backend/src/modules/draft/draft.gateway.ts) — mismo
// shape que devuelve GET /leagues/:id/draft/state, mas `available` y `timer` que solo manda
// el socket. Slice 13b (tramo 1) solo LEE este estado; picks y timer countdown quedan para
// el tramo 2, pero el tipo ya refleja el wire format completo para no romper cuando se sumen.

import type { ConstructorRef, Driver } from './driver';

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

// Drivers/constructors disponibles para pickear — mismo shape que `Driver`/`ConstructorRef`
// de /drivers (Slice 14), no una version recortada: el picker del draft pinta foto, dorsal
// y escudería con los mismos componentes (`DriverAvatar`, `TeamBadge`), así que necesita los
// mismos datos.
export interface DraftAvailable {
  drivers: Driver[];
  constructors: ConstructorRef[];
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
