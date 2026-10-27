import type { ApiErrorBody } from '../models/api';

// Clase y no interface para que `instanceof` funcione en un catch.
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

// Una respuesta que no es 2xx: el envelope { error } del backend, o un error generico con el
// status si vino otra cosa (el HTML de un 502 del proxy, por ejemplo).
export async function errorFromResponse(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null);
  if (isApiErrorBody(body)) {
    const { code, message, status } = body.error;
    return new ApiError(code, status, message);
  }
  return new ApiError('UNKNOWN_ERROR', res.status, `Request failed with status code ${res.status}`);
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  // fetch rechaza con TypeError solo cuando no hubo respuesta: red caida, CORS, DNS.
  if (err instanceof TypeError) {
    return new ApiError('NETWORK_ERROR', 0, 'No se pudo conectar con el servidor');
  }
  return new ApiError('UNKNOWN_ERROR', 0, String(err));
}
