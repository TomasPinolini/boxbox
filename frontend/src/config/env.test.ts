import { afterEach, describe, expect, it, vi } from 'vitest';

// Se importa dinamicamente en cada caso: `env` se calcula una sola vez, al cargar el modulo,
// asi que sin resetModules el segundo caso leeria el valor del primero.
async function loadEnv() {
  vi.resetModules();
  return (await import('./env')).env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('env', () => {
  it('usa lo que diga el .env cuando esta configurado', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.ejemplo.test/api/v1');
    vi.stubEnv('VITE_SOCKET_URL', 'https://api.ejemplo.test');

    const env = await loadEnv();

    expect(env.apiUrl).toBe('https://api.ejemplo.test/api/v1');
    expect(env.socketUrl).toBe('https://api.ejemplo.test');
  });

  it('cae al backend local y avisa cuando falta la variable, en vez de romper el arranque', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_SOCKET_URL', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const env = await loadEnv();

    expect(env.apiUrl).toBe('http://localhost:3000/api/v1');
    expect(env.socketUrl).toBe('http://localhost:3000');
    // El aviso dice que hacer, no solo que algo falta.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('.env.example'));
  });
});
