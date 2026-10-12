import { describe, it, expect } from 'vitest';
import { assertLocalDatabase } from './db-guard';

describe('assertLocalDatabase', () => {
  it('acepta una base en localhost', () => {
    expect(() =>
      assertLocalDatabase('postgresql://boxbox:secret@localhost:5432/boxbox'),
    ).not.toThrow();
  });

  it('acepta una base en 127.0.0.1', () => {
    expect(() =>
      assertLocalDatabase('postgresql://boxbox:secret@127.0.0.1:5432/boxbox'),
    ).not.toThrow();
  });

  // new URL() solo pasa el host a minusculas en los esquemas especiales (http, ws, file).
  // postgresql: no es uno, asi que sin normalizar a mano este caso se rechazaba.
  it('acepta localhost escrito en mayusculas', () => {
    expect(() =>
      assertLocalDatabase('postgresql://boxbox:secret@LOCALHOST:5432/boxbox'),
    ).not.toThrow();
  });

  // El IPv6 llega con brackets dentro de .hostname y hay que sacarlos.
  it('acepta la loopback IPv6 con brackets', () => {
    expect(() =>
      assertLocalDatabase('postgresql://boxbox:secret@[::1]:5432/boxbox'),
    ).not.toThrow();
  });

  it('rechaza un host que solo contiene localhost', () => {
    expect(() => assertLocalDatabase('postgresql://u:p@notlocalhost.com:5432/db')).toThrow(
      /notlocalhost\.com/,
    );
  });

  it('rechaza una base remota y nombra el host en el mensaje', () => {
    const remote = 'postgresql://user:pass@db.abc.supabase.co:5432/postgres';
    expect(() => assertLocalDatabase(remote)).toThrow(/db\.abc\.supabase\.co/);
  });

  it('rechaza una DATABASE_URL ausente', () => {
    expect(() => assertLocalDatabase(undefined)).toThrow(/DATABASE_URL/);
  });
});
