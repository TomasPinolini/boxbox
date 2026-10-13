import type { ConstructorDetail } from '../models/constructor';
import { apiClient } from './api-client';

// Solo el detalle. El listado (`constructors`) y el campeonato (`constructorStandings`) viven
// en drivers.service.ts desde la Slice 14, cuando su unico consumidor era una pantalla de
// pilotos; no se mudan acá para no tocar features que no cambian en este ticket.
export const constructorsService = {
  get: (id: number) => apiClient.get<ConstructorDetail>(`/constructors/${id}`),
};
