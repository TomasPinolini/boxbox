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

// Lo que viaja al backend al crear o editar una carrera. Espejo de createRaceSchema. Las dos
// fechas opcionales se omiten cuando no se cargan: el schema las tiene optional, no nullable.
export interface RaceInput {
  name: string;
  round: number;
  date: string;
  qualifyingDate?: string;
  sprintDate?: string;
  lockDate: string;
  seasonId: number;
  circuitId: number;
}

export const racesService = {
  list: () => apiClient.get<Race[]>('/races'),
  bySeason: (seasonId: number) => apiClient.get<Race[]>(`/races?seasonId=${seasonId}`),
  create: (input: RaceInput) => apiClient.post<Race>('/races', input),
  update: (id: number, input: RaceInput) => apiClient.patch<Race>(`/races/${id}`, input),
  // 204 sin body, a diferencia de circuitos: el borrado de una carrera es fisico, no logico.
  remove: (id: number) => apiClient.delete(`/races/${id}`),
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
