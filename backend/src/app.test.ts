// TESTS cross-cutting de app.ts — comportamiento que no pertenece a ningun modulo:
// como responde la API cuando el request esta roto ANTES de llegar a un controller.
// (A3 / BOX-13). Sin mocks, contra la app real (ADR-0003).

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app';

describe('app — errores que no son AppError', () => {
  it('body JSON malformado responde 400 INVALID_JSON con el envelope, no 500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(res.body.error.status).toBe(400);
  });

  it('ruta inexistente responde 404 ROUTE_NOT_FOUND en JSON, no la pagina HTML de Express', async () => {
    const res = await request(app).get('/api/v1/no-existe');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('sub-ruta inexistente dentro de un router tambien cae en el 404 JSON', async () => {
    const res = await request(app).get('/api/v1/drivers/1/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
