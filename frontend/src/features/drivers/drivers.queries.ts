import { useQuery } from '@tanstack/react-query';
import type { ConstructorRef, Driver, DriverDetail } from '../../models/driver';
import { ApiError } from '../../services/api-error';
import { driversService } from '../../services/drivers.service';

// Mismo patron que leagues.queries.ts: un hook por lectura, keys como tuplas, sin exportar
// el objeto de keys.
const keys = {
  all: (constructorId?: number) => ['drivers', { constructorId }] as const,
  one: (id: number) => ['drivers', id] as const,
  constructors: ['constructors'] as const,
};

export function useDrivers(constructorId?: number) {
  return useQuery<Driver[], ApiError>({
    queryKey: keys.all(constructorId),
    queryFn: () => driversService.list(constructorId),
    // El filtro es server-side: sin esto, cada cambio vacia la lista mientras viaja el
    // request y la pantalla parpadea. Con placeholderData la tabla anterior se queda
    // hasta que llega la nueva.
    placeholderData: (previous) => previous,
  });
}

export function useDriver(id: number) {
  return useQuery<DriverDetail, ApiError>({
    queryKey: keys.one(id),
    queryFn: () => driversService.get(id),
  });
}

// Puebla el <select> del filtro. Se piden aparte a proposito: si las opciones salieran del
// listado ya filtrado, al elegir Ferrari quedaria Ferrari como unica opcion y no habria
// forma de volver atras.
export function useConstructors() {
  return useQuery<ConstructorRef[], ApiError>({
    queryKey: keys.constructors,
    queryFn: driversService.constructors,
  });
}
