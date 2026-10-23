import type { Circuit } from './circuit';

export type RaceStatus = 'UPCOMING' | 'QUALIFYING_LOCKED' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface Race {
  id: number;
  name: string;
  round: number;
  date: string;
  /** Opcionales en el backend: no toda fecha tiene sprint, y el seed no siempre carga la quali. */
  qualifyingDate: string | null;
  sprintDate: string | null;
  status: RaceStatus;
  seasonId: number;
  circuitId: number;
  circuit: Circuit;
}
