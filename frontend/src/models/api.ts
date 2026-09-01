// Envelope de la API: exito { data }, error { error: { code, message, status } }.
export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  };
}
