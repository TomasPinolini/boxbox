import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { createTestAdmin, createTestUser } from '../../tests/setup';

// adminToken: el CRUD de catalogo es admin-only (A5 / BOX-15); se recrea por test (truncate).
let adminToken: string;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
});

const validCircuit = {
  name: 'Silverstone Circuit',
  country: 'United Kingdom',
  city: 'Silverstone',
  circuitLength: 5.891,
  externalId: 'silverstone',
};

describe('GET /api/v1/circuits', () => {
  it('returns empty array when no circuits exist', async () => {
    const res = await request(app).get('/api/v1/circuits');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns all non-deleted circuits', async () => {
    await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCircuit);
    await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...validCircuit,
        name: 'Monza',
        country: 'Italy',
        city: 'Monza',
        externalId: 'monza',
      });

    const res = await request(app).get('/api/v1/circuits');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('GET /api/v1/circuits/:id', () => {
  it('returns a circuit by id', async () => {
    const created = await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCircuit);
    const id = created.body.data.id;

    const res = await request(app).get(`/api/v1/circuits/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Silverstone Circuit');
  });

  it('returns 404 for non-existent circuit', async () => {
    const res = await request(app).get('/api/v1/circuits/999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CIRCUIT_NOT_FOUND');
  });
});

describe('POST /api/v1/circuits', () => {
  it('creates a circuit with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCircuit);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Silverstone Circuit',
      country: 'United Kingdom',
      city: 'Silverstone',
      circuitLength: 5.891,
    });
  });

  it('rejects request with missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Monza' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate externalId', async () => {
    await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCircuit);
    const res = await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCircuit);
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/v1/circuits/:id', () => {
  it('updates a circuit partially', async () => {
    const created = await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCircuit);
    const id = created.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/circuits/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ city: 'Towcester' });
    expect(res.status).toBe(200);
    expect(res.body.data.city).toBe('Towcester');
    expect(res.body.data.name).toBe('Silverstone Circuit');
  });

  it('returns 404 when updating non-existent circuit', async () => {
    const res = await request(app)
      .patch('/api/v1/circuits/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ city: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/circuits/:id', () => {
  it('soft deletes a circuit', async () => {
    const created = await request(app)
      .post('/api/v1/circuits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCircuit);
    const id = created.body.data.id;

    expect(
      (
        await request(app)
          .delete(`/api/v1/circuits/${id}`)
          .set('Authorization', `Bearer ${adminToken}`)
      ).status,
    ).toBe(204);
    expect((await request(app).get('/api/v1/circuits')).body.data).toHaveLength(0);
  });

  it('returns 404 when deleting non-existent circuit', async () => {
    expect(
      (
        await request(app)
          .delete('/api/v1/circuits/999')
          .set('Authorization', `Bearer ${adminToken}`)
      ).status,
    ).toBe(404);
  });
});

// ─── Solo admin muta el catalogo (A5 / BOX-15) ─────────────────────────

describe('circuits — solo admin puede mutar', () => {
  it('rechaza POST sin token (401 TOKEN_MISSING)', async () => {
    const res = await request(app).post('/api/v1/circuits').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza DELETE con token de USER (403 ADMIN_REQUIRED)', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .delete('/api/v1/circuits/1')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// A3 / BOX-13: un :id no numerico antes llegaba a Prisma como NaN y explotaba en 500.
describe('circuits — :id no numerico', () => {
  it('GET /circuits/abc responde 400 VALIDATION_ERROR, no 500', async () => {
    const res = await request(app).get('/api/v1/circuits/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
