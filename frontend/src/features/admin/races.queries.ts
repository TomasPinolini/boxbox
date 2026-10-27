import { useQuery } from '@tanstack/react-query';
import type { Race } from '../../models/race';
import { ApiError } from '../../services/api-error';
import { racesService, type RaceInput } from '../../services/races.service';
import { useInvalidatingMutation } from './invalidating-mutation';

// ['races'] a secas: admin.queries.ts invalida por ese prefijo y asi cargar resultados
// refresca esta tabla tambien.
const keys = { all: ['races'] as const };

export function useRaces() {
  return useQuery<Race[], ApiError>({ queryKey: keys.all, queryFn: racesService.list });
}

export const useCreateRace = () =>
  useInvalidatingMutation<Race, RaceInput>(keys.all, (input) => racesService.create(input));

export const useUpdateRace = () =>
  useInvalidatingMutation<Race, { id: number; input: RaceInput }>(keys.all, ({ id, input }) =>
    racesService.update(id, input),
  );

export const useRemoveRace = () =>
  useInvalidatingMutation<void, number>(keys.all, (id) => racesService.remove(id));
