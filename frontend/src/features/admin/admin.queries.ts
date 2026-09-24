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

// Carreras de la temporada activa. El filtro a "cargables" lo hace la pantalla: es la misma
// regla que LOADABLE_STATUSES en backend/src/modules/races/races.service.ts.
export function useActiveSeasonRaces() {
  return useQuery<Race[], ApiError>({
    queryKey: keys.races,
    queryFn: async () => racesService.bySeason(await leaguesService.activeSeasonId()),
  });
}

// El Epic 2 en una mutacion: cargar resultados y recalcular standings. Son dos requests y NO
// son atomicos entre si — si el segundo falla, la carrera ya quedo COMPLETED. No es grave:
// recalculate es idempotente (upsert), asi que se puede reintentar solo.
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
    // Invalida todo lo que cambio: status de la carrera, stats de pilotos y standings de ligas.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['races'] });
      void qc.invalidateQueries({ queryKey: ['drivers'] });
      void qc.invalidateQueries({ queryKey: ['leagues'] });
    },
  });
}

// Vista previa desde Jolpica. Es mutation y no query: la dispara un boton, y cada corrida deja
// un SyncLog en el backend — no queremos que React Query la repita sola al re-enfocar la pestaña.
export function useJolpicaPreview() {
  return useMutation<JolpicaPreview, ApiError, number>({
    mutationFn: (raceId) => racesService.previewFromJolpica(raceId),
  });
}

// Recalcular standings para una carrera que ya tiene resultados. Idempotente: repetir no duplica.
export function useRecalculateStandings() {
  const qc = useQueryClient();
  return useMutation<
    { raceId: number; leagues: number; standings: number },
    ApiError,
    number
  >({
    mutationFn: (raceId) => racesService.recalculate(raceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leagues'] });
    },
  });
}
