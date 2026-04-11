import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

// Races depend on Season + Circuit, so we create those first in each test
let seasonId: number;
let circuitId: number;

beforeEach(async () => {
  const season = await request(app).post('/api/v1/seasons').send({ year: 2026 });
  seasonId = season.body.data.id;

  const circuit = await request(app).post('/api/v1/circuits').send({
    name: 'Silverstone',
    country: 'UK',
    city: 'Silverstone',
    externalId: 'silverstone',
  });
  circuitId = circuit.body.data.id;
});

function validRace() {
  return {
    name: 'British Grand Prix',
    round: 1,
    date: '2026-07-05T14:00:00Z',
    lockDate: '2026-07-04T12:00:00Z',
    seasonId,
    circuitId,
  };
}

describe('GET /api/v1/races', () => {
  it('returns empty array when no races exist', async () => {
    const res = await request(app).get('/api/v1/races');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('filters by seasonId', async () => {
    await request(app).post('/api/v1/races').send(validRace());

    const res = await request(app).get(`/api/v1/races?seasonId=${seasonId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const empty = await request(app).get('/api/v1/races?seasonId=9999');
    expect(empty.body.data).toHaveLength(0);
  });
});

describe('GET /api/v1/races/:id', () => {
  it('returns a race with circuit and season included', async () => {
    const created = await request(app).post('/api/v1/races').send(validRace());
    const id = created.body.data.id;

    const res = await request(app).get(`/api/v1/races/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('British Grand Prix');
    expect(res.body.data.circuit).toBeDefined();
    expect(res.body.data.season).toBeDefined();
  });

  it('returns 404 for non-existent race', async () => {
    const res = await request(app).get('/api/v1/races/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/races', () => {
  it('creates a race with valid data', async () => {
    const res = await request(app).post('/api/v1/races').send(validRace());

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('British Grand Prix');
    expect(res.body.data.status).toBe('UPCOMING');
  });

  it('rejects when season does not exist', async () => {
    const res = await request(app).post('/api/v1/races').send({
      ...validRace(),
      seasonId: 9999,
    });
    expect(res.status).toBe(404);
  });

  it('rejects when circuit does not exist', async () => {
    const res = await request(app).post('/api/v1/races').send({
      ...validRace(),
      circuitId: 9999,
    });
    expect(res.status).toBe(404);
  });

  it('rejects duplicate round in same season', async () => {
    await request(app).post('/api/v1/races').send(validRace());

    const res = await request(app).post('/api/v1/races').send({
      ...validRace(),
      name: 'Another GP',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_ROUND_DUPLICATE');
  });

  it('rejects missing required fields', async () => {
    const res = await request(app).post('/api/v1/races').send({ name: 'GP' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/races/:id', () => {
  it('updates a race partially', async () => {
    const created = await request(app).post('/api/v1/races').send(validRace());
    const id = created.body.data.id;

    const res = await request(app).patch(`/api/v1/races/${id}`).send({ name: 'Silverstone GP' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Silverstone GP');
  });

  it('returns 404 when updating non-existent race', async () => {
    const res = await request(app).patch('/api/v1/races/999').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/races/:id', () => {
  it('deletes a race', async () => {
    const created = await request(app).post('/api/v1/races').send(validRace());
    const id = created.body.data.id;

    expect((await request(app).delete(`/api/v1/races/${id}`)).status).toBe(204);
    expect((await request(app).get('/api/v1/races')).body.data).toHaveLength(0);
  });

  it('returns 404 when deleting non-existent race', async () => {
    expect((await request(app).delete('/api/v1/races/999')).status).toBe(404);
  });
});
