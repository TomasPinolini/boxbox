import type { ConstructorRef, Driver, DriverDetail } from '../models/driver';
import { apiClient } from './api-client';

// Los GET del catalogo son publicos en el backend, asi que estos metodos funcionan sin sesion.
export const driversService = {
  list: (constructorId?: number) =>
    apiClient.get<Driver[]>(
      constructorId ? `/drivers?constructorId=${constructorId}` : '/drivers',
    ),

  get: (id: number) => apiClient.get<DriverDetail>(`/drivers/${id}`),

  // Vive aca y no en un constructors.service propio porque el unico que lo consume es el
  // filtro de esta pantalla. Mismo criterio que leaguesService.activeSeasonId().
  constructors: () => apiClient.get<ConstructorRef[]>('/constructors'),
};
