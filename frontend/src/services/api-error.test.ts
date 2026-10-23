import { ApiError, errorFromResponse, toApiError } from './api-error';

describe('errorFromResponse', () => {
  it('convierte el envelope { error } del backend en ApiError', async () => {
    const body = { error: { code: 'LEAGUE_FULL', message: 'League is at capacity', status: 409 } };
    const err = await errorFromResponse(new Response(JSON.stringify(body), { status: 409 }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('LEAGUE_FULL');
    expect(err.status).toBe(409);
    expect(err.message).toBe('League is at capacity');
  });

  it('una respuesta que no es el envelope queda como UNKNOWN_ERROR con su status', async () => {
    const err = await errorFromResponse(new Response('<html>Bad Gateway</html>', { status: 502 }));
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.status).toBe(502);
  });
});

describe('toApiError', () => {
  it('sin respuesta del server es NETWORK_ERROR', () => {
    const err = toApiError(new TypeError('Failed to fetch'));
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.status).toBe(0);
  });

  it('un ApiError se devuelve tal cual', () => {
    const original = new ApiError('X', 400, 'x');
    expect(toApiError(original)).toBe(original);
  });
});
