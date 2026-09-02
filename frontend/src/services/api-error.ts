import axios from 'axios';
import type { ApiErrorBody } from '../models/api';

// ApiError: el error tipado que ve el resto de la app. `code` es el SCREAMING_SNAKE del backend
// (docs/error-codes.md); `status` el HTTP. Clase (no interface) para que `instanceof` funcione
// en catch y para cumplir "modelos con clases" de la rubrica.
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'error' in body;
}

// toApiError: normaliza cualquier cosa que tire axios a un ApiError.
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const body: unknown = err.response?.data;
    if (isApiErrorBody(body)) {
      const { code, message, status } = body.error;
      return new ApiError(code, status, message);
    }
    if (!err.response) {
      return new ApiError('NETWORK_ERROR', 0, 'No se pudo conectar con el servidor');
    }
    return new ApiError('UNKNOWN_ERROR', err.response.status, err.message);
  }
  return new ApiError('UNKNOWN_ERROR', 0, String(err));
}
