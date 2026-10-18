import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Race } from '../../models/race';
import { ApiError } from '../../services/api-error';
import { racesService, type RaceInput } from '../../services/races.service';

// ['races'] a secas y no ['races', 'all']: admin.queries.ts usa ['races', 'active-season'] y
// ya invalida por el prefijo ['races'], asi que cargar resultados refresca esta tabla tambien.
const keys = { all: ['races'] as const };

export function useRaces() {
  return useQuery<Race[], ApiError>({ queryKey: keys.all, queryFn: racesService.list });
}

export function useCreateRace() {
  const qc = useQueryClient();
  return useMutation<Race, ApiError, RaceInput>({
    // Envuelta y no `racesService.create` a secas: React Query le pasa su contexto como
    // segundo argumento, y entonces el servicio recibe un parametro que no espera.
    mutationFn: (input) => racesService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateRace() {
  const qc = useQueryClient();
  return useMutation<Race, ApiError, { id: number; input: RaceInput }>({
    mutationFn: ({ id, input }) => racesService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRemoveRace() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: (id) => racesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
