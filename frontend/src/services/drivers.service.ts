import type { ConstructorStanding, DriverStanding } from '../models/championship';
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

  // Campeonato real de la temporada activa (Slice 16). constructorStandings vive aca por el
  // mismo criterio que constructors(): un solo consumidor, la pantalla de campeonato.
  standings: () => apiClient.get<DriverStanding[]>('/drivers/standings'),
  constructorStandings: () => apiClient.get<ConstructorStanding[]>('/constructors/standings'),
};
