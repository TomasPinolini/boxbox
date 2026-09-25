import type { RaceResultStatus } from '../models/driver';
import type { Race } from '../models/race';
import { apiClient } from './api-client';

// Espejo de raceResultItemSchema en backend/src/modules/races/races.schema.ts.
export interface RaceResultInput {
  driverId: number;
  position?: number;
  points: number;
  // Solo los trae la importacion de Jolpica; la grilla manual no los pide.
  gridPosition?: number;
  laps?: number;
  fastestLap?: boolean;
  status: RaceResultStatus;
}

// Respuesta de POST /admin/sync/races/:id/results?dryRun=true (backend modules/sync).
export interface JolpicaPreview {
  results: RaceResultInput[];
  // Pilotos de Jolpica que no existen aca o no tienen escuderia en la temporada.
  skipped: { ref: string; reason: string }[];
}

export const racesService = {
  bySeason: (seasonId: number) => apiClient.get<Race[]>(`/races?seasonId=${seasonId}`),
  // Los dos de abajo son admin-only (requireAuth -> requireAdmin en el backend).
  loadResults: (raceId: number, results: RaceResultInput[]) =>
    apiClient.post(`/races/${raceId}/results`, { results }),
  // dryRun: mapea los resultados de Jolpica y los devuelve SIN escribirlos. Es la vista previa.
  previewFromJolpica: (raceId: number) =>
    apiClient.post<JolpicaPreview>(`/admin/sync/races/${raceId}/results?dryRun=true`),
  recalculate: (raceId: number) =>
    apiClient.post<{ raceId: number; leagues: number; standings: number }>(
      `/races/${raceId}/recalculate`,
    ),
};
