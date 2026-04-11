import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';

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
    const created = await request(app).post('/api/v1/seasons').send(validSeason);
    const id = created.body.data.id;
    await request(app).patch(`/api/v1/seasons/${id}/activate`);

    const res = await request(app).get('/api/v1/seasons/active');
    expect(res.status).toBe(200);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.isActive).toBe(true);
  });
});

describe('POST /api/v1/seasons', () => {
  it('creates a season', async () => {
    const res = await request(app).post('/api/v1/seasons').send(validSeason);
    expect(res.status).toBe(201);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.isActive).toBe(false);
  });

  it('rejects duplicate year', async () => {
    await request(app).post('/api/v1/seasons').send(validSeason);
    const res = await request(app).post('/api/v1/seasons').send(validSeason);
    expect(res.status).toBe(409);
  });

  it('rejects invalid year', async () => {
    const res = await request(app).post('/api/v1/seasons').send({ year: 1999 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/seasons/:id/activate', () => {
  it('activates a season and deactivates others', async () => {
    const s1 = await request(app).post('/api/v1/seasons').send({ year: 2025 });
    const s2 = await request(app).post('/api/v1/seasons').send({ year: 2026 });

    // Activate 2025 first
    await request(app).patch(`/api/v1/seasons/${s1.body.data.id}/activate`);

    // Now activate 2026 — 2025 should become inactive
    const res = await request(app).patch(`/api/v1/seasons/${s2.body.data.id}/activate`);
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
    const created = await request(app).post('/api/v1/seasons').send(validSeason);
    const id = created.body.data.id;

    expect((await request(app).delete(`/api/v1/seasons/${id}`)).status).toBe(204);
    expect((await request(app).get('/api/v1/seasons')).body.data).toHaveLength(0);
  });

  it('returns 404 when deleting non-existent season', async () => {
    expect((await request(app).delete('/api/v1/seasons/999')).status).toBe(404);
  });
});
