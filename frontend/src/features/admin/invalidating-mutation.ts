import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { ApiError } from '../../services/api-error';

// La mutacion de un CRUD de admin: corre la operacion y, si sale bien, invalida la lista para
// que la tabla se recargue. La funcion se envuelve porque React Query le pasa su contexto como
// segundo argumento, y los servicios no lo esperan.
export function useInvalidatingMutation<TData, TVariables>(
  queryKey: QueryKey,
  run: (variables: TVariables) => Promise<TData>,
) {
  const qc = useQueryClient();
  return useMutation<TData, ApiError, TVariables>({
    mutationFn: (variables) => run(variables),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
}
