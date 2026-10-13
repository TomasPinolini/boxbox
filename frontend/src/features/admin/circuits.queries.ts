import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Circuit } from '../../models/circuit';
import { ApiError } from '../../services/api-error';
import { circuitsService, type CircuitInput } from '../../services/circuits.service';

const keys = { all: ['circuits'] as const };

export function useCircuits() {
  return useQuery<Circuit[], ApiError>({ queryKey: keys.all, queryFn: circuitsService.list });
}

export function useCreateCircuit() {
  const qc = useQueryClient();
  return useMutation<Circuit, ApiError, CircuitInput>({
    // Envuelta y no `circuitsService.create` a secas: React Query le pasa su contexto como
    // segundo argumento, y entonces el servicio recibe un parametro que no espera.
    mutationFn: (input) => circuitsService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateCircuit() {
  const qc = useQueryClient();
  return useMutation<Circuit, ApiError, { id: number; input: CircuitInput }>({
    mutationFn: ({ id, input }) => circuitsService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRemoveCircuit() {
  const qc = useQueryClient();
  return useMutation<Circuit, ApiError, number>({
    mutationFn: (id) => circuitsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
