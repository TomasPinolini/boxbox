import { useQuery } from '@tanstack/react-query';
import type { ConstructorStanding, DriverStanding } from '../../models/championship';
import { ApiError } from '../../services/api-error';
import { driversService } from '../../services/drivers.service';

// Mismo patron que drivers.queries.ts: un hook por lectura, keys como tuplas.
const keys = {
  drivers: ['championship', 'drivers'] as const,
  constructors: ['championship', 'constructors'] as const,
};

export function useDriverStandings() {
  return useQuery<DriverStanding[], ApiError>({
    queryKey: keys.drivers,
    queryFn: driversService.standings,
  });
}

export function useConstructorStandings() {
  return useQuery<ConstructorStanding[], ApiError>({
    queryKey: keys.constructors,
    queryFn: driversService.constructorStandings,
  });
}
