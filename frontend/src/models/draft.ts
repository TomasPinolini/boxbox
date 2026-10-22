// Payload de `draft:state`: lo mismo que GET /leagues/:id/draft/state, mas `available` y
// `timer`, que solo manda el socket.

import type { ConstructorRef, Driver } from './driver';

export interface DraftPick {
  id: number;
  leagueMemberId: number;
  pickNumber: number;
  round: number;
  driverId: number | null;
  constructorId: number | null;
  pickedAt: string | null;
}

// Mismo shape que /drivers y no uno recortado: el picker usa DriverAvatar y TeamBadge.
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
