import { useQuery } from '@tanstack/react-query';
import type { ConstructorDetail } from '../../models/constructor';
import { ApiError } from '../../services/api-error';
import { constructorsService } from '../../services/constructors.service';

export function useConstructor(id: number) {
  return useQuery<ConstructorDetail, ApiError>({
    queryKey: ['constructors', id],
    queryFn: () => constructorsService.get(id),
    enabled: Number.isFinite(id),
  });
}
