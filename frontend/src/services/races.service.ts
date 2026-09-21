import type { RaceResultStatus } from '../models/driver';
import type { Race } from '../models/race';
import { apiClient } from './api-client';

// Espejo de raceResultItemSchema en backend/src/modules/races/races.schema.ts.
export interface RaceResultInput {
  driverId: number;
  position?: number;
  points: number;
  status: RaceResultStatus;
}

export const racesService = {
  bySeason: (seasonId: number) => apiClient.get<Race[]>(`/races?seasonId=${seasonId}`),
  // Los dos de abajo son admin-only (requireAuth -> requireAdmin en el backend).
  loadResults: (raceId: number, results: RaceResultInput[]) =>
    apiClient.post(`/races/${raceId}/results`, { results }),
  recalculate: (raceId: number) =>
    apiClient.post<{ raceId: number; leagues: number; standings: number }>(
      `/races/${raceId}/recalculate`,
    ),
};
