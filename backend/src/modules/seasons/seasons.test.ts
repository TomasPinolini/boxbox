import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { createTestAdmin, createTestUser } from '../../tests/setup';

// adminToken: el CRUD de catalogo es admin-only (A5 / BOX-15); se recrea por test (truncate).
let adminToken: string;

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
});

const validSeason = { year: 2026 };

describe('GET /api/v1/seasons', () => {
  it('returns empty array when no seasons exist', async () => {
    const res = await request(app).get('/api/v1/seasons');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/v1/seasons/active', () => {
  it('returns 404 when no active season', async () => {
    const res = await request(app).get('/api/v1/seasons/active');
    expect(res.status).toBe(404);
  });

  it('returns the active season', async () => {
    const created = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    const id = created.body.data.id;
    await request(app)
      .patch(`/api/v1/seasons/${id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app).get('/api/v1/seasons/active');
    expect(res.status).toBe(200);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.isActive).toBe(true);
  });
});

describe('POST /api/v1/seasons', () => {
  it('creates a season', async () => {
    const res = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    expect(res.status).toBe(201);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.isActive).toBe(false);
  });

  it('rejects duplicate year', async () => {
    await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    const res = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    expect(res.status).toBe(409);
  });

  it('rejects invalid year', async () => {
    const res = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 1999 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/seasons/:id/activate', () => {
  it('activates a season and deactivates others', async () => {
    const s1 = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 2025 });
    const s2 = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 2026 });

    // Activate 2025 first
    await request(app)
      .patch(`/api/v1/seasons/${s1.body.data.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Now activate 2026 — 2025 should become inactive
    const res = await request(app)
      .patch(`/api/v1/seasons/${s2.body.data.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);

    // Verify 2025 is now inactive
    const all = await request(app).get('/api/v1/seasons');
    const season2025 = all.body.data.find((s: { year: number }) => s.year === 2025);
    expect(season2025.isActive).toBe(false);
  });
});

describe('DELETE /api/v1/seasons/:id', () => {
  it('deletes a season (hard delete)', async () => {
    const created = await request(app)
      .post('/api/v1/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSeason);
    const id = created.body.data.id;

    expect(
      (
        await request(app)
          .delete(`/api/v1/seasons/${id}`)
          .set('Authorization', `Bearer ${adminToken}`)
      ).status,
    ).toBe(204);
    expect((await request(app).get('/api/v1/seasons')).body.data).toHaveLength(0);
  });

  it('returns 404 when deleting non-existent season', async () => {
    expect(
      (
        await request(app)
          .delete('/api/v1/seasons/999')
          .set('Authorization', `Bearer ${adminToken}`)
      ).status,
    ).toBe(404);
  });
});

// ─── Solo admin muta el catalogo (A5 / BOX-15) ─────────────────────────

describe('seasons — solo admin puede mutar', () => {
  it('rechaza POST sin token (401 TOKEN_MISSING)', async () => {
    const res = await request(app).post('/api/v1/seasons').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rechaza PATCH /:id/activate con token de USER (403 ADMIN_REQUIRED)', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .patch('/api/v1/seasons/1/activate')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// A3 / BOX-13: un :id no numerico antes llegaba a Prisma como NaN y explotaba en 500.
// Seasons no tiene GET /:id — se prueba con DELETE (admin) para que el 400 sea del id, no del auth.
describe('seasons — :id no numerico', () => {
  it('DELETE /seasons/abc responde 400 VALIDATION_ERROR, no 500', async () => {
    const res = await request(app)
      .delete('/api/v1/seasons/abc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
