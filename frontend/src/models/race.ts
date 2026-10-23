import type { Circuit } from './circuit';

export type RaceStatus = 'UPCOMING' | 'QUALIFYING_LOCKED' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface Race {
  id: number;
  name: string;
  round: number;
  date: string;
  /** Opcional en el backend: el seed no siempre carga la quali. */
  qualifyingDate: string | null;
  status: RaceStatus;
  seasonId: number;
  circuitId: number;
  circuit: Circuit;
}
