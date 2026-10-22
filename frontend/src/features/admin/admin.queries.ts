import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Race } from '../../models/race';
import { ApiError } from '../../services/api-error';
import { leaguesService } from '../../services/leagues.service';
import {
  racesService,
  type JolpicaPreview,
  type RaceResultInput,
} from '../../services/races.service';

const keys = { races: ['races', 'active-season'] as const };

// El filtro a "cargables" lo hace la pantalla, con la regla de LOADABLE_STATUSES del backend.
export function useActiveSeasonRaces() {
  return useQuery<Race[], ApiError>({
    queryKey: keys.races,
    queryFn: async () => racesService.bySeason(await leaguesService.activeSeasonId()),
  });
}

// Dos requests NO atomicos: si el segundo falla la carrera ya quedo COMPLETED, pero
// recalculate es idempotente y se puede reintentar.
export function useProcessRace() {
  const qc = useQueryClient();
  return useMutation<
    { leagues: number; standings: number },
    ApiError,
    { raceId: number; results: RaceResultInput[] }
  >({
    mutationFn: async ({ raceId, results }) => {
      await racesService.loadResults(raceId, results);
      return racesService.recalculate(raceId);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['races'] });
      void qc.invalidateQueries({ queryKey: ['drivers'] });
      void qc.invalidateQueries({ queryKey: ['leagues'] });
    },
  });
}

// Mutation y no query: cada corrida deja un SyncLog y React Query no tiene que repetirla sola.
export function useJolpicaPreview() {
  return useMutation<JolpicaPreview, ApiError, number>({
    mutationFn: (raceId) => racesService.previewFromJolpica(raceId),
  });
}

export function useRecalculateStandings() {
  const qc = useQueryClient();
  return useMutation<{ raceId: number; leagues: number; standings: number }, ApiError, number>({
    mutationFn: (raceId) => racesService.recalculate(raceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leagues'] });
    },
  });
}
