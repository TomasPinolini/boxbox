import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Season } from '../../models/season';
import { ApiError } from '../../services/api-error';
import { seasonsService, type SeasonInput } from '../../services/seasons.service';

const keys = { all: ['seasons'] as const };

export function useSeasons() {
  return useQuery<Season[], ApiError>({ queryKey: keys.all, queryFn: seasonsService.list });
}

export function useCreateSeason() {
  const qc = useQueryClient();
  return useMutation<Season, ApiError, SeasonInput>({
    // Envuelta: React Query pasa su contexto como segundo argumento y el servicio no lo espera.
    mutationFn: (input) => seasonsService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRemoveSeason() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: (id) => seasonsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useActivateSeason() {
  const qc = useQueryClient();
  return useMutation<Season, ApiError, number>({
    mutationFn: (id) => seasonsService.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateSeason() {
  const qc = useQueryClient();
  return useMutation<Season, ApiError, { id: number; input: SeasonInput }>({
    mutationFn: ({ id, input }) => seasonsService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
