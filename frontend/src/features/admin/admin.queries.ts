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

// Un solo pedido: el backend carga la fecha y recalcula las ligas en la misma transaccion.
export function useProcessRace() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { raceId: number; results: RaceResultInput[] }>({
    mutationFn: ({ raceId, results }) => racesService.loadResults(raceId, results),
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
