import type { ConstructorDetail } from '../models/constructor';
import { apiClient } from './api-client';

// Solo el detalle: el listado y el campeonato de escuderias viven en drivers.service.ts.
export const constructorsService = {
  get: (id: number) => apiClient.get<ConstructorDetail>(`/constructors/${id}`),
};
