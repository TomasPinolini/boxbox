import { useQuery } from '@tanstack/react-query';
import type { ConstructorRef, Driver, DriverDetail } from '../../models/driver';
import { ApiError } from '../../services/api-error';
import { driversService } from '../../services/drivers.service';

const keys = {
  all: (constructorId?: number) => ['drivers', { constructorId }] as const,
  one: (id: number) => ['drivers', id] as const,
  constructors: ['constructors'] as const,
};

export function useDrivers(constructorId?: number) {
  return useQuery<Driver[], ApiError>({
    queryKey: keys.all(constructorId),
    queryFn: () => driversService.list(constructorId),
    // El filtro es server-side: sin esto la lista se vacia mientras viaja el request.
    placeholderData: (previous) => previous,
  });
}

export function useDriver(id: number) {
  return useQuery<DriverDetail, ApiError>({
    queryKey: keys.one(id),
    queryFn: () => driversService.get(id),
  });
}

// Aparte del listado: si salieran de la lista filtrada, al elegir Ferrari no habria vuelta atras.
export function useConstructors() {
  return useQuery<ConstructorRef[], ApiError>({
    queryKey: keys.constructors,
    queryFn: driversService.constructors,
  });
}
