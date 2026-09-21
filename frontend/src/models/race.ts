// Espejo de lo que devuelve GET /races (backend/src/modules/races/races.service.ts).
export type RaceStatus = 'UPCOMING' | 'QUALIFYING_LOCKED' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface Race {
  id: number;
  name: string;
  round: number;
  date: string;
  status: RaceStatus;
  seasonId: number;
}
