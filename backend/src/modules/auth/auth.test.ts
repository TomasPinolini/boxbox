// TESTS — integración HTTP → controller → service → Prisma → DB real.
// Sin mocks (ADR-0003). Cada test arranca con `users` truncado por src/tests/setup.ts.

import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { env } from '../../config/env';
import { prisma } from '../../shared/prisma';

const validRegister = {
  email: 'verstappen@boxbox.com',
  password: 'hunter22',
  name: 'Max Verstappen',
};

describe('POST /api/v1/auth/register', () => {
  it('crea un usuario y devuelve user + accessToken (sin passwordHash)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validRegister);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      email: 'verstappen@boxbox.com',
      name: 'Max Verstappen',
      role: 'USER',
    });
    expect(res.body.data.user.id).toBeDefined();
    expect(res.body.data.user.createdAt).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined(); // ✗ nunca leakea
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.accessToken.split('.').length).toBe(3); // JWT tiene 3 partes
  });

  it('rechaza email con formato inválido (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('email');
  });

  it('rechaza password con menos de 8 caracteres', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister, password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('password');
  });

  it('rechaza request sin name', async () => {
    const incomplete = { email: validRegister.email, password: validRegister.password };
    const res = await request(app).post('/api/v1/auth/register').send(incomplete);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('name');
  });

  it('rechaza email duplicado con 409 EMAIL_ALREADY_EXISTS', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegister);
    const res = await request(app).post('/api/v1/auth/register').send(validRegister);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('lowercasea el email — Test@x.com y test@x.com son el mismo user', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister, email: 'Mixed@Boxbox.com' });
    const dup = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister, email: 'mixed@boxbox.com' });

    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('trim el email — " padded@x.com " es el mismo user que "padded@x.com"', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister, email: 'padded@x.com' });
    const dup = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister, email: '  padded@x.com  ' });

    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('maneja registers concurrentes con mismo email (uno 201, uno 409)', async () => {
    const [a, b] = await Promise.all([
      request(app).post('/api/v1/auth/register').send(validRegister),
      request(app).post('/api/v1/auth/register').send(validRegister),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    // El que ganó devuelve accessToken; el que perdió devuelve EMAIL_ALREADY_EXISTS
    const winner = a.status === 201 ? a : b;
    const loser = a.status === 201 ? b : a;
    expect(winner.body.data.accessToken).toBeDefined();
    expect(loser.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('loguea un user existente y devuelve accessToken (sin passwordHash)', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegister);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegister.email, password: validRegister.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validRegister.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rechaza email inexistente con 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'noexiste@boxbox.com', password: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rechaza password incorrecto con 401 INVALID_CREDENTIALS (mismo error que email inexistente)', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegister);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegister.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    // Anti-enumeration: mismo mensaje que arriba — no podemos enumerar emails
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rechaza request sin password (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegister.email });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('devuelve el user actual con token valido (sin passwordHash)', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validRegister.email);
    expect(res.body.data.user.name).toBe(validRegister.name);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rechaza request sin header Authorization (401 TOKEN_MISSING)', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza header sin prefijo Bearer (401 TOKEN_MISSING)', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Basic abc123');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza token con firma invalida (401 TOKEN_INVALID)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer this-is-not-a-real-jwt');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rechaza token expirado (401 TOKEN_INVALID)', async () => {
    // Forjamos un token con expiracion en el pasado para no esperar 15min.
    const expiredToken = jwt.sign({ userId: 1, role: 'USER' }, env.JWT_SECRET, {
      expiresIn: '-1s',
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rechaza token firmado con secret distinto (401 TOKEN_INVALID)', async () => {
    // Anti alg=none defense — un atacante que no tiene nuestro secret no puede forjar tokens validos.
    const forgedToken = jwt.sign({ userId: 1, role: 'ADMIN' }, 'secret-del-atacante-de-32-caracteres', {
      expiresIn: '15m',
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('devuelve 404 USER_NOT_FOUND si el user fue borrado despues del login', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;

    // Borramos el user directamente en DB simulando un caso edge.
    await prisma.user.delete({ where: { id: register.body.data.user.id } });

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });
});

describe('PATCH /api/v1/auth/me', () => {
  it('actualiza nombre y lema', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Max V', motto: 'Campeón hace 3 años' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Max V');
    expect(res.body.data.user.motto).toBe('Campeón hace 3 años');
  });

  it('motto vacío se guarda como null, no como string vacío', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;
    await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ motto: 'algo' });

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ motto: '' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.motto).toBeNull();
  });

  it('rechaza un lema de más de 40 caracteres (400 VALIDATION_ERROR)', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ motto: 'x'.repeat(41) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('motto');
  });

  it('rechaza request sin sesión (401 TOKEN_MISSING)', async () => {
    const res = await request(app).patch('/api/v1/auth/me').send({ name: 'Alguien' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });
});

// Un PNG 1x1 real, no un string cualquiera — el service decodifica el base64 de verdad para
// medir el tamaño del buffer (ver auth.service.ts, MAX_AVATAR_BYTES).
const ONE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('POST /api/v1/auth/me/avatar', () => {
  // La red no es Jolpica acá, es Supabase Storage — mismo criterio que sync.test.ts: se
  // stubea `fetch` global con una respuesta fija, supertest no lo toca para nada más.
  function stubStorage(ok = true) {
    const fetchMock = vi.fn(async (_url: string) => ({ ok, status: ok ? 200 : 500 }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    env.SUPABASE_URL = undefined;
    env.SUPABASE_SERVICE_ROLE_KEY = undefined;
  });

  it('sube la foto y guarda la URL pública', async () => {
    env.SUPABASE_URL = 'https://proyecto-test.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-de-test';
    const fetchMock = stubStorage();

    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;
    const userId = register.body.data.user.id;

    const res = await request(app)
      .post('/api/v1/auth/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: ONE_PIXEL_PNG });

    expect(res.status).toBe(200);
    expect(res.body.data.user.avatarUrl).toBe(
      `https://proyecto-test.supabase.co/storage/v1/object/public/avatars/${userId}.png`,
    );
    // El path pisa el archivo anterior (x-upsert), no acumula uno por usuario.
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://proyecto-test.supabase.co/storage/v1/object/avatars/${userId}.png`,
    );
  });

  it('rechaza un data URL que no es imagen (400 INVALID_AVATAR_FORMAT)', async () => {
    env.SUPABASE_URL = 'https://proyecto-test.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-de-test';
    stubStorage();

    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/auth/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: 'data:text/plain;base64,aG9sYQ==' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_AVATAR_FORMAT');
  });

  it('sin SUPABASE_URL configurado, 503 AVATAR_STORAGE_NOT_CONFIGURED', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/auth/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: ONE_PIXEL_PNG });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AVATAR_STORAGE_NOT_CONFIGURED');
  });

  it('si Supabase Storage devuelve error, 502 AVATAR_UPLOAD_FAILED', async () => {
    env.SUPABASE_URL = 'https://proyecto-test.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-de-test';
    stubStorage(false);

    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const token = register.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/auth/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: ONE_PIXEL_PNG });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AVATAR_UPLOAD_FAILED');
  });
});

describe('POST /api/v1/auth/refresh + /logout (httpOnly cookies)', () => {
  // Helper: extrae el value del refresh cookie del Set-Cookie header de un response.
  function getRefreshCookie(setCookieHeader: string[] | undefined): string | undefined {
    if (!setCookieHeader) return undefined;
    const cookie = setCookieHeader.find((c) => c.startsWith('refreshToken='));
    if (!cookie) return undefined;
    return cookie.split(';')[0]; // "refreshToken=eyJ..." sin attributes
  }

  it('register setea la cookie refreshToken con flags de seguridad', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validRegister);

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie).toBeDefined();
    const refreshCookieRaw = setCookie.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookieRaw).toBeDefined();
    // Flags importantes:
    expect(refreshCookieRaw).toMatch(/HttpOnly/i);
    expect(refreshCookieRaw).toMatch(/SameSite=Lax/i);
    expect(refreshCookieRaw).toMatch(/Path=\/api\/v1\/auth/i);
    // En NODE_ENV=test no debe estar Secure (solo en production).
    expect(refreshCookieRaw).not.toMatch(/Secure/i);
  });

  it('login tambien setea la cookie', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegister);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegister.email, password: validRegister.password });

    const cookie = getRefreshCookie(res.headers['set-cookie'] as unknown as string[]);
    expect(cookie).toBeDefined();
  });

  it('POST /refresh con cookie valida devuelve un access token nuevo', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const cookie = getRefreshCookie(register.headers['set-cookie'] as unknown as string[])!;

    // Pausa minima para que el iat del access nuevo sea distinto (precision de segundo en JWT).
    await new Promise((r) => setTimeout(r, 1100));

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validRegister.email);
    expect(res.body.data.accessToken).toBeDefined();
    // El access nuevo debe ser distinto al original (mismo userId+role pero distinto iat).
    expect(res.body.data.accessToken).not.toBe(register.body.data.accessToken);
  });

  it('POST /refresh sin cookie devuelve 401 REFRESH_TOKEN_MISSING', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_MISSING');
  });

  it('POST /refresh con cookie invalida devuelve 401 REFRESH_TOKEN_INVALID', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=este-no-es-un-jwt-valido');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  it('POST /refresh con refresh firmado con secret distinto devuelve 401 REFRESH_TOKEN_INVALID', async () => {
    const forged = jwt.sign({ userId: 1 }, 'secret-del-atacante-de-32-caracteres', {
      expiresIn: '7d',
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  it('POST /refresh con refresh valido pero user borrado devuelve 401', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegister);
    const cookie = getRefreshCookie(register.headers['set-cookie'] as unknown as string[])!;

    await prisma.user.delete({ where: { id: register.body.data.user.id } });

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  it('POST /logout limpia la cookie (Set-Cookie con expiry pasado)', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(204);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie).toBeDefined();
    const cleared = setCookie.find((c) => c.startsWith('refreshToken='));
    expect(cleared).toBeDefined();
    // clearCookie setea la cookie con value vacio + Expires en el pasado (1970 / Thu, 01 Jan 1970).
    expect(cleared).toMatch(/refreshToken=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});
