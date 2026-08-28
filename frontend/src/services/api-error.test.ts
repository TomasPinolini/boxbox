import { AxiosError, AxiosHeaders } from 'axios';
import { ApiError, toApiError } from './api-error';

function axiosErrorWith(status: number, data?: unknown): AxiosError {
  const err = new AxiosError('Request failed', 'ERR_BAD_REQUEST');
  err.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return err;
}

describe('toApiError', () => {
  it('convierte el envelope { error } del backend en ApiError', () => {
    const err = toApiError(
      axiosErrorWith(409, {
        error: { code: 'LEAGUE_FULL', message: 'League is at capacity', status: 409 },
      }),
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('LEAGUE_FULL');
    expect(err.status).toBe(409);
    expect(err.message).toBe('League is at capacity');
  });

  it('sin respuesta del server es NETWORK_ERROR', () => {
    const err = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.status).toBe(0);
  });

  it('un ApiError se devuelve tal cual', () => {
    const original = new ApiError('X', 400, 'x');
    expect(toApiError(original)).toBe(original);
  });
});
