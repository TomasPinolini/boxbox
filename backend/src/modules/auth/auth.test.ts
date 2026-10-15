// TESTS — integración HTTP → controller → service → Prisma → DB real.
// Sin mocks (ADR-0003). Cada test arranca con `users` truncado por src/tests/setup.ts.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { env } from '../../config/env';
import { prisma } from '../../shared/prisma';
import { hashPassword } from '../../shared/password';

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

// ─── Rate limit de /auth (IP-based) ───────────────────────────────────────────────────────
// Los limiters llevan `skip: isTestEnv` para que el resto de la suite no tope el cap; aca se
// re-activan apagando las dos envs que isTestEnv mira. Se evalua por request, asi que alcanza
// con setearlas antes y restaurarlas despues. Mismo patron que leagues.test.ts.
//
// El store es in-memory y NO se resetea entre tests (setup.ts trunca la DB, no el contador),
// asi que cada limiter se ejercita en un solo `it` y el test de login crea su usuario con
// Prisma directo — el cap de register ya esta agotado cuando le toca.

describe('rate limit de /api/v1/auth (por IP)', () => {
  const savedEnv = { NODE_ENV: process.env.NODE_ENV, VITEST: process.env.VITEST };

  beforeAll(() => {
    process.env.NODE_ENV = 'development';
    process.env.VITEST = 'false';
  });

  afterAll(() => {
    process.env.NODE_ENV = savedEnv.NODE_ENV;
    process.env.VITEST = savedEnv.VITEST;
  });

  it('el 6to register desde la misma IP devuelve 429', async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: `rl-reg-${i}@boxbox.com`, password: 'hunter22', name: `Piloto ${i}` });
      expect(res.status).toBe(201);
    }

    const sixth = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'rl-reg-6@boxbox.com', password: 'hunter22', name: 'Piloto 6' });

    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('dos CF-Connecting-IP distintas no comparten el contador', async () => {
    await prisma.user.create({
      data: {
        email: 'rl-cf@boxbox.com',
        passwordHash: await hashPassword('hunter22'),
        name: 'Victima CF',
      },
    });

    // Agota el cap de una IP. En produccion Cloudflare escribe este header con la IP real del
    // cliente; es lo que ipKey usa como key. El bug que esto previene: con trust proxy mal,
    // req.ip era una IP interna de Render y TODOS los usuarios compartian este contador.
    for (let i = 1; i <= 10; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('CF-Connecting-IP', '190.18.147.247')
        .send({ email: 'rl-cf@boxbox.com', password: 'mal' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/api/v1/auth/login')
      .set('CF-Connecting-IP', '190.18.147.247')
      .send({ email: 'rl-cf@boxbox.com', password: 'mal' });
    expect(blocked.status).toBe(429);

    // Otra IP: bucket propio, intacto.
    const other = await request(app)
      .post('/api/v1/auth/login')
      .set('CF-Connecting-IP', '200.5.5.5')
      .send({ email: 'rl-cf@boxbox.com', password: 'mal' });
    expect(other.status).toBe(401);
  });

  it('10 logins fallidos agotan el cap y el 11mo da 429, pero un exito no consume', async () => {
    await prisma.user.create({
      data: {
        email: 'rl-login@boxbox.com',
        passwordHash: await hashPassword('hunter22'),
        name: 'Victima',
      },
    });

    // Un login exitoso NO cuenta (skipSuccessfulRequests), asi que no gasta presupuesto.
    const ok = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rl-login@boxbox.com', password: 'hunter22' });
    expect(ok.status).toBe(200);

    for (let i = 1; i <= 10; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rl-login@boxbox.com', password: 'contrasena-mal' });
      expect(res.status).toBe(401);
    }

    const eleventh = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rl-login@boxbox.com', password: 'contrasena-mal' });

    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
