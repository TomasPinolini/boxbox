import { useQuery } from '@tanstack/react-query';
import type { Season } from '../../models/season';
import { ApiError } from '../../services/api-error';
import { seasonsService, type SeasonInput } from '../../services/seasons.service';
import { useInvalidatingMutation } from './invalidating-mutation';

const keys = { all: ['seasons'] as const };

export function useSeasons() {
  return useQuery<Season[], ApiError>({ queryKey: keys.all, queryFn: seasonsService.list });
}

export const useCreateSeason = () =>
  useInvalidatingMutation<Season, SeasonInput>(keys.all, (input) => seasonsService.create(input));

export const useRemoveSeason = () =>
  useInvalidatingMutation<void, number>(keys.all, (id) => seasonsService.remove(id));

export const useActivateSeason = () =>
  useInvalidatingMutation<Season, number>(keys.all, (id) => seasonsService.activate(id));

export const useUpdateSeason = () =>
  useInvalidatingMutation<Season, { id: number; input: SeasonInput }>(keys.all, ({ id, input }) =>
    seasonsService.update(id, input),
  );
