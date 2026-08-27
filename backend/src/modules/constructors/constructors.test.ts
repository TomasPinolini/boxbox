import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { createTestAdmin, createTestUser } from '../../tests/setup';

// adminToken: el CRUD de catalogo es admin-only (A5 / BOX-15); se recrea por test (truncate).
let adminToken: string;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
});

const validConstructor = {
  name: 'McLaren',
  color: '#FF8000',
  externalId: 'mclaren',
};

describe('GET /api/v1/constructors', () => {
  it('returns empty array when no constructors exist', async () => {
    const res = await request(app).get('/api/v1/constructors');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns all non-deleted constructors', async () => {
    await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);
    await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...validConstructor,
        name: 'Ferrari',
        color: '#DC0000',
        externalId: 'ferrari',
      });

    const res = await request(app).get('/api/v1/constructors');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('GET /api/v1/constructors/:id', () => {
  it('returns a constructor by id', async () => {
    const created = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);
    const id = created.body.data.id;

    const res = await request(app).get(`/api/v1/constructors/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('McLaren');
  });

  it('returns 404 for non-existent constructor', async () => {
    const res = await request(app).get('/api/v1/constructors/999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CONSTRUCTOR_NOT_FOUND');
  });
});

describe('POST /api/v1/constructors', () => {
  it('creates a constructor with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'McLaren',
      color: '#FF8000',
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('rejects request with missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'McLaren' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('color');
  });

  it('rejects duplicate externalId', async () => {
    await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);

    const res = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONSTRUCTOR_ALREADY_EXISTS');
  });
});

describe('PATCH /api/v1/constructors/:id', () => {
  it('updates a constructor partially', async () => {
    const created = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);
    const id = created.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/constructors/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ color: '#FF9900' });

    expect(res.status).toBe(200);
    expect(res.body.data.color).toBe('#FF9900');
    expect(res.body.data.name).toBe('McLaren');
  });

  it('returns 404 when updating non-existent constructor', async () => {
    const res = await request(app)
      .patch('/api/v1/constructors/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ color: '#FF9900' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/constructors/:id', () => {
  it('soft deletes a constructor (returns 204)', async () => {
    const created = await request(app)
      .post('/api/v1/constructors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validConstructor);
    const id = created.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/v1/constructors/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app).get('/api/v1/constructors');
    expect(listRes.body.data).toHaveLength(0);

    const getRes = await request(app).get(`/api/v1/constructors/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting non-existent constructor', async () => {
    const res = await request(app)
      .delete('/api/v1/constructors/999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── Solo admin muta el catalogo (A5 / BOX-15) ─────────────────────────

describe('constructors — solo admin puede mutar', () => {
  it('rechaza POST sin token (401 TOKEN_MISSING)', async () => {
    const res = await request(app).post('/api/v1/constructors').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza DELETE con token de USER (403 ADMIN_REQUIRED)', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .delete('/api/v1/constructors/1')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});
