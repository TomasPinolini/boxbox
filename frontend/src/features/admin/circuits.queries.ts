import { useQuery } from '@tanstack/react-query';
import type { Circuit } from '../../models/circuit';
import { ApiError } from '../../services/api-error';
import { circuitsService, type CircuitInput } from '../../services/circuits.service';
import { useInvalidatingMutation } from './invalidating-mutation';

const keys = { all: ['circuits'] as const };

export function useCircuits() {
  return useQuery<Circuit[], ApiError>({ queryKey: keys.all, queryFn: circuitsService.list });
}

export const useCreateCircuit = () =>
  useInvalidatingMutation<Circuit, CircuitInput>(keys.all, (input) =>
    circuitsService.create(input),
  );

export const useUpdateCircuit = () =>
  useInvalidatingMutation<Circuit, { id: number; input: CircuitInput }>(keys.all, ({ id, input }) =>
    circuitsService.update(id, input),
  );

export const useRemoveCircuit = () =>
  useInvalidatingMutation<Circuit, number>(keys.all, (id) => circuitsService.remove(id));
