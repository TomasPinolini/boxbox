import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import type { User } from '../models/user';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from './api-client';
import { ApiError } from './api-error';

const user: User = {
  id: 1,
  email: 'a@b.test',
  name: 'A',
  avatarUrl: null,
  motto: null,
  role: 'USER',
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const unauthorized = () =>
  json(401, { error: { code: 'TOKEN_EXPIRED', message: 'expired', status: 401 } });

// Lo que el cliente le pidio a fetch: URL, metodo y el header Authorization.
function calls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: url as string,
    method: (init as RequestInit).method,
    auth: ((init as RequestInit).headers as Record<string, string>).Authorization,
  }));
}

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.getState().setSession(user, 'viejo');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().clear();
  });

  it('manda el token y desarma el envelope { data }', async () => {
    fetchMock.mockResolvedValue(json(200, { data: [1, 2] }));

    await expect(apiClient.get('/drivers')).resolves.toEqual([1, 2]);
    expect(calls(fetchMock)).toEqual([
      { url: `${env.apiUrl}/drivers`, method: 'GET', auth: 'Bearer viejo' },
    ]);
  });

  it('un 204 sin cuerpo resuelve a undefined', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiClient.delete('/races/1')).resolves.toBeUndefined();
  });

  it('dos 401 a la vez hacen un solo refresh y cada uno reintenta con el token nuevo', async () => {
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve(json(200, { data: { user, accessToken: 'nuevo' } }));
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return Promise.resolve(auth === 'Bearer nuevo' ? json(200, { data: 'ok' }) : unauthorized());
    });

    await expect(Promise.all([apiClient.get('/a'), apiClient.get('/b')])).resolves.toEqual([
      'ok',
      'ok',
    ]);
    expect(calls(fetchMock).filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1);
    expect(useAuthStore.getState().accessToken).toBe('nuevo');
  });

  it('si el refresh falla, cierra la sesion y no reintenta', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/auth/refresh')
          ? json(401, { error: { code: 'REFRESH_INVALID', message: 'no', status: 401 } })
          : unauthorized(),
      ),
    );

    const err = await apiClient.get('/a').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('REFRESH_INVALID');
    expect(useAuthStore.getState().isLoggedIn()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sin red, el error es NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/a')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});
