import type { Circuit } from '../models/circuit';
import { apiClient } from './api-client';

// `circuitLength` se omite si no se carga: el schema del backend es optional, no nullable.
export interface CircuitInput {
  name: string;
  country: string;
  city: string;
  circuitLength?: number;
  externalId: string;
}

export const circuitsService = {
  list: () => apiClient.get<Circuit[]>('/circuits'),
  create: (input: CircuitInput) => apiClient.post<Circuit>('/circuits', input),
  update: (id: number, input: CircuitInput) =>
    apiClient.patch<Circuit>(`/circuits/${id}`, input),
  // Baja logica: devuelve el circuito, no un 204.
  remove: (id: number) => apiClient.delete<Circuit>(`/circuits/${id}`),
};
