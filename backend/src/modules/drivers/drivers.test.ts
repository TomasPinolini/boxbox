import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';

const validDriver = {
  firstName: 'Max',
  lastName: 'Verstappen',
  number: 1,
  code: 'VER',
  externalId: 'verstappen',
};

describe('GET /api/v1/drivers', () => {
  it('returns empty array when no drivers exist', async () => {
    const res = await request(app).get('/api/v1/drivers');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns all non-deleted drivers', async () => {
    // Create two drivers
    await request(app).post('/api/v1/drivers').send(validDriver);
    await request(app).post('/api/v1/drivers').send({
      ...validDriver,
      firstName: 'Lando',
      lastName: 'Norris',
      number: 4,
      code: 'NOR',
      externalId: 'norris',
    });

    const res = await request(app).get('/api/v1/drivers');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('GET /api/v1/drivers/:id', () => {
  it('returns a driver by id', async () => {
    const created = await request(app).post('/api/v1/drivers').send(validDriver);
    const id = created.body.data.id;

    const res = await request(app).get(`/api/v1/drivers/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Max');
    expect(res.body.data.lastName).toBe('Verstappen');
  });

  it('returns 404 for non-existent driver', async () => {
    const res = await request(app).get('/api/v1/drivers/999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DRIVER_NOT_FOUND');
  });
});

describe('POST /api/v1/drivers', () => {
  it('creates a driver with valid data', async () => {
    const res = await request(app).post('/api/v1/drivers').send(validDriver);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      firstName: 'Max',
      lastName: 'Verstappen',
      number: 1,
      code: 'VER',
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.createdAt).toBeDefined();
  });

  it('rejects request with missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/drivers')
      .send({ firstName: 'Max' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('lastName');
    expect(res.body.error.details).toHaveProperty('number');
  });

  it('rejects duplicate externalId', async () => {
    await request(app).post('/api/v1/drivers').send(validDriver);

    const res = await request(app).post('/api/v1/drivers').send(validDriver);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DRIVER_ALREADY_EXISTS');
  });
});

describe('PATCH /api/v1/drivers/:id', () => {
  it('updates a driver partially', async () => {
    const created = await request(app).post('/api/v1/drivers').send(validDriver);
    const id = created.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/drivers/${id}`)
      .send({ number: 33 });

    expect(res.status).toBe(200);
    expect(res.body.data.number).toBe(33);
    expect(res.body.data.firstName).toBe('Max'); // Unchanged fields stay
  });

  it('returns 404 when updating non-existent driver', async () => {
    const res = await request(app)
      .patch('/api/v1/drivers/999')
      .send({ number: 33 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/drivers/:id', () => {
  it('soft deletes a driver (returns 204)', async () => {
    const created = await request(app).post('/api/v1/drivers').send(validDriver);
    const id = created.body.data.id;

    const deleteRes = await request(app).delete(`/api/v1/drivers/${id}`);
    expect(deleteRes.status).toBe(204);

    // Deleted driver should not appear in list
    const listRes = await request(app).get('/api/v1/drivers');
    expect(listRes.body.data).toHaveLength(0);

    // Deleted driver should return 404 on direct access
    const getRes = await request(app).get(`/api/v1/drivers/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting non-existent driver', async () => {
    const res = await request(app).delete('/api/v1/drivers/999');
    expect(res.status).toBe(404);
  });
});
