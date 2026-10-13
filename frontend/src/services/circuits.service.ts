import type { Circuit } from '../models/circuit';
import { apiClient } from './api-client';

// Lo que viaja al backend al crear o editar. `circuitLength` se omite cuando no se carga:
// el schema del backend lo tiene optional, no nullable.
export interface CircuitInput {
  name: string;
  country: string;
  city: string;
  circuitLength?: number;
  externalId: string;
}

// El servicio de circuitos: todo lo que habla con /circuits. Sin React, sin URLs en los
// componentes — mismo contrato que seasons.service.ts.
export const circuitsService = {
  list: () => apiClient.get<Circuit[]>('/circuits'),
  create: (input: CircuitInput) => apiClient.post<Circuit>('/circuits', input),
  update: (id: number, input: CircuitInput) =>
    apiClient.patch<Circuit>(`/circuits/${id}`, input),
  // Baja logica: el backend marca deletedAt y devuelve el circuito, no un 204.
  remove: (id: number) => apiClient.delete<Circuit>(`/circuits/${id}`),
};
