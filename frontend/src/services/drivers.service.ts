import type { ConstructorStanding, DriverStanding } from '../models/championship';
import type { ConstructorRef, Driver, DriverDetail } from '../models/driver';
import { apiClient } from './api-client';

export const driversService = {
  list: (constructorId?: number) =>
    apiClient.get<Driver[]>(constructorId ? `/drivers?constructorId=${constructorId}` : '/drivers'),

  get: (id: number) => apiClient.get<DriverDetail>(`/drivers/${id}`),

  constructors: () => apiClient.get<ConstructorRef[]>('/constructors'),

  standings: () => apiClient.get<DriverStanding[]>('/drivers/standings'),
  constructorStandings: () => apiClient.get<ConstructorStanding[]>('/constructors/standings'),
};
