// TESTS — integración HTTP → controller → service → Prisma → DB real.
// Sin mocks (ADR-0003). Cada test arranca con `users` truncado por src/tests/setup.ts.

import { describe, it, expect } from 'vitest';
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
