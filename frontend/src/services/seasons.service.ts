import type { Season } from '../models/season';
import { apiClient } from './api-client';

// El servicio de temporadas: todo lo que habla con /seasons. Sin React, sin URLs en los
// componentes — mismo contrato que leagues.service.ts.
export interface SeasonInput {
  year: number;
  driverCount: number;
}

export const seasonsService = {
  list: () => apiClient.get<Season[]>('/seasons'),
  create: (input: SeasonInput) => apiClient.post<Season>('/seasons', input),
  update: (id: number, input: SeasonInput) => apiClient.patch<Season>(`/seasons/${id}`, input),
  remove: (id: number) => apiClient.delete(`/seasons/${id}`),
  // Endpoint propio y no un `isActive: true` por PATCH: activate desactiva las demas en una
  // transaccion. Con update quedarian dos activas y findActive usa findFirst — gana cualquiera.
  activate: (id: number) => apiClient.patch<Season>(`/seasons/${id}/activate`),
};
