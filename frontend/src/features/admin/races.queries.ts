import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Race } from '../../models/race';
import { ApiError } from '../../services/api-error';
import { racesService, type RaceInput } from '../../services/races.service';

// ['races'] a secas: admin.queries.ts invalida por ese prefijo y asi cargar resultados
// refresca esta tabla tambien.
const keys = { all: ['races'] as const };

export function useRaces() {
  return useQuery<Race[], ApiError>({ queryKey: keys.all, queryFn: racesService.list });
}

export function useCreateRace() {
  const qc = useQueryClient();
  return useMutation<Race, ApiError, RaceInput>({
    // Envuelta: React Query pasa su contexto como segundo argumento y el servicio no lo espera.
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
