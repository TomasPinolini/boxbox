// TEST — módulo completo contra la DB real: HTTP → routes → controller → service → Prisma.
// Lo unico stubeado es la red: `fetch` global devuelve fixtures recortados de respuestas reales
// de Jolpica (sync.fixtures.ts). supertest no usa fetch, asi que el stub no toca nuestra app.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../shared/prisma';
import { createTestAdmin, createTestUser } from '../../tests/setup';
import {
  racesResponse,
  australiaResultsResponse,
  chinaResultsResponse,
  noResultsResponse,
} from './sync.fixtures';

let adminToken: string;
let seasonId: number;

// Rutea por substring de la URL. Un valor Error simula la red caida.
function stubJolpica(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const hit = Object.entries(routes).find(([path]) => url.includes(path));
    if (!hit) return { ok: false, status: 404, json: async () => ({}) };
    if (hit[1] instanceof Error) throw hit[1];
    return { ok: true, status: 200, json: async () => hit[1] };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(async () => {
  adminToken = (await createTestAdmin()).accessToken;
  seasonId = (await prisma.season.create({ data: { year: 2026, isActive: true, driverCount: 22 } }))
    .id;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const post = (path: string, token = adminToken) =>
  request(app).post(`/api/v1/admin/sync${path}`).set('Authorization', `Bearer ${token}`);

const lastLog = () => prisma.syncLog.findFirst({ orderBy: { id: 'desc' } });

describe('auth', () => {
  it('sin token → 401; USER comun → 403 ADMIN_REQUIRED', async () => {
    const anon = await request(app).post('/api/v1/admin/sync/races?year=2026');
    expect(anon.status).toBe(401);

    const { accessToken } = await createTestUser();
    const user = await post('/races?year=2026', accessToken);
    expect(user.status).toBe(403);
    expect(user.body.error.code).toBe('ADMIN_REQUIRED');
    expect(await prisma.syncLog.count()).toBe(0);
  });
});

describe('POST /admin/sync/races (12b)', () => {
  it('sin ?year → 400 VALIDATION_ERROR', async () => {
    const res = await post('/races');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('season inexistente → 404 y SyncLog FAILED', async () => {
    stubJolpica({ '/1999/races.json': racesResponse });
    const res = await post('/races?year=1999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SEASON_NOT_FOUND');
    expect(await lastLog()).toMatchObject({ type: 'RACES', status: 'FAILED' });
  });

  it('crea circuits y races, y deja un SyncLog SUCCESS con los counts', async () => {
    stubJolpica({ '/2026/races.json': racesResponse });

    const res = await post('/races?year=2026');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'SUCCESS',
      created: 2,
      updated: 0,
      circuitsCreated: 2,
      skipped: [],
    });

    const races = await prisma.race.findMany({
      where: { seasonId },
      include: { circuit: true },
      orderBy: { round: 'asc' },
    });
    expect(races.map((r) => [r.round, r.name, r.circuit.externalId])).toEqual([
      [1, 'Australian Grand Prix', 'albert_park'],
      [2, 'Chinese Grand Prix', 'shanghai'],
    ]);
    expect(races[0].date.toISOString()).toBe('2026-03-08T04:00:00.000Z');
    expect(races[0].lockDate.toISOString()).toBe('2026-03-08T03:00:00.000Z');
    expect(races[0].sprintDate).toBeNull();
    expect(races[1].sprintDate?.toISOString()).toBe('2026-03-14T03:00:00.000Z');
    expect(races[1].status).toBe('UPCOMING');

    expect(await lastLog()).toMatchObject({
      id: res.body.data.syncLogId,
      type: 'RACES',
      status: 'SUCCESS',
      recordsCreated: 2,
      recordsUpdated: 0,
      recordsSkipped: 0,
      error: null,
    });
  });

  it('re-sync no duplica: 0 creadas, 2 actualizadas, y no pisa status ni circuits existentes', async () => {
    // Circuit curado a mano (como el seed): el sync no le cambia el nombre.
    await prisma.circuit.create({
      data: { name: 'Albert Park', city: 'Melbourne', country: 'AU', externalId: 'albert_park' },
    });
    stubJolpica({ '/2026/races.json': racesResponse });
    await post('/races?year=2026');
    await prisma.race.updateMany({ where: { seasonId, round: 1 }, data: { status: 'COMPLETED' } });

    const res = await post('/races?year=2026');

    expect(res.body.data).toMatchObject({ created: 0, updated: 2, circuitsCreated: 0 });
    expect(await prisma.race.count()).toBe(2);
    expect(await prisma.circuit.count()).toBe(2);
    expect((await prisma.circuit.findUnique({ where: { externalId: 'albert_park' } }))?.name).toBe(
      'Albert Park',
    );
    const round1 = await prisma.race.findFirst({ where: { seasonId, round: 1 } });
    expect(round1?.status).toBe('COMPLETED');
    expect(await prisma.syncLog.count()).toBe(2);
  });

  it('TRAMPA: una fecha con resultados de OTRO circuito no se pisa → skipped + PARTIAL', async () => {
    const bahrain = await prisma.circuit.create({
      data: { name: 'Sakhir', city: 'Sakhir', country: 'BH', externalId: 'bahrain' },
    });
    const race = await prisma.race.create({
      data: {
        name: 'Bahrain Grand Prix',
        round: 1,
        date: new Date('2026-03-01'),
        lockDate: new Date('2026-03-01'),
        seasonId,
        circuitId: bahrain.id,
      },
    });
    const driver = await prisma.driver.create({
      data: { firstName: 'A', lastName: 'B', number: 1, code: 'AAA', externalId: 'aaa' },
    });
    await prisma.raceResult.create({
      data: { raceId: race.id, driverId: driver.id, points: 25, status: 'CLASSIFIED' },
    });
    stubJolpica({ '/2026/races.json': racesResponse });

    const res = await post('/races?year=2026');

    expect(res.body.data).toMatchObject({ status: 'PARTIAL', created: 1, updated: 0 });
    expect(res.body.data.skipped).toHaveLength(1);
    expect(res.body.data.skipped[0].ref).toBe('round 1');
    const untouched = await prisma.race.findUnique({ where: { id: race.id } });
    expect(untouched).toMatchObject({ name: 'Bahrain Grand Prix', circuitId: bahrain.id });
    expect(await lastLog()).toMatchObject({ status: 'PARTIAL', recordsSkipped: 1 });
  });

  it('una fecha de otro circuito SIN resultados si se corrige', async () => {
    const bahrain = await prisma.circuit.create({
      data: { name: 'Sakhir', city: 'Sakhir', country: 'BH', externalId: 'bahrain' },
    });
    await prisma.race.create({
      data: {
        name: 'Bahrain Grand Prix',
        round: 1,
        date: new Date('2026-03-01'),
        lockDate: new Date('2026-03-01'),
        seasonId,
        circuitId: bahrain.id,
      },
    });
    stubJolpica({ '/2026/races.json': racesResponse });

    const res = await post('/races?year=2026');

    expect(res.body.data).toMatchObject({ status: 'SUCCESS', created: 1, updated: 1 });
    const round1 = await prisma.race.findFirst({ where: { seasonId, round: 1 } });
    expect(round1?.name).toBe('Australian Grand Prix');
  });

  it('Jolpica caida → 502 JOLPICA_UNAVAILABLE, SyncLog FAILED, nada escrito', async () => {
    stubJolpica({ '/2026/races.json': new Error('The operation was aborted due to timeout') });

    const res = await post('/races?year=2026');

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('JOLPICA_UNAVAILABLE');
    expect(await prisma.race.count()).toBe(0);
    const log = await lastLog();
    expect(log).toMatchObject({ type: 'RACES', status: 'FAILED' });
    expect(log?.error).toContain('JOLPICA_UNAVAILABLE');
  });

  it('Jolpica responde con otro shape → 502 JOLPICA_BAD_RESPONSE', async () => {
    stubJolpica({ '/2026/races.json': { MRData: { nope: true } } });
    const res = await post('/races?year=2026');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('JOLPICA_BAD_RESPONSE');
  });
});

describe('POST /admin/sync/races/:id/results (12c)', () => {
  let australiaId: number;
  let chinaId: number;
  const driverId: Record<string, number> = {};

  // La grilla del test: 7 pilotos con DriverSeason + bortoleto SIN DriverSeason.
  // arvid_lindblad no existe: es el "piloto desconocido" del fixture.
  const GRID: [externalId: string, constructor: string][] = [
    ['russell', 'mercedes'],
    ['antonelli', 'mercedes'],
    ['max_verstappen', 'red_bull'],
    ['bearman', 'haas'],
    ['stroll', 'aston_martin'],
    ['alonso', 'aston_martin'],
    ['piastri', 'mclaren'],
  ];

  beforeEach(async () => {
    stubJolpica({ '/2026/races.json': racesResponse });
    await post('/races?year=2026');
    const races = await prisma.race.findMany({ where: { seasonId }, orderBy: { round: 'asc' } });
    [australiaId, chinaId] = races.map((r) => r.id);

    const constructorId: Record<string, number> = {};
    let n = 1;
    for (const [externalId, team] of [...GRID, ['bortoleto', null] as const]) {
      const d = await prisma.driver.create({
        data: { firstName: externalId, lastName: 'X', number: n++, code: 'XXX', externalId },
      });
      driverId[externalId] = d.id;
      if (!team) continue;
      constructorId[team] ??= (
        await prisma.constructor.create({
          data: { name: team, color: '#000000', externalId: team },
        })
      ).id;
      await prisma.driverSeason.create({
        data: { driverId: d.id, constructorId: constructorId[team], seasonId },
      });
    }

    await prisma.syncLog.deleteMany(); // el log del sync de carreras no es de estos tests
    stubJolpica({
      '/2026/1/results.json': australiaResultsResponse,
      '/2026/2/results.json': chinaResultsResponse,
    });
  });

  it('dryRun: devuelve el mapeo y NO escribe resultados; igual deja su SyncLog', async () => {
    const res = await post(`/races/${australiaId}/results?dryRun=true`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ dryRun: true, status: 'PARTIAL', created: 0 });
    expect(res.body.data.results).toHaveLength(7);
    expect(res.body.data.skipped.map((s: { ref: string }) => s.ref)).toEqual([
      'arvid_lindblad',
      'bortoleto',
    ]);

    expect(await prisma.raceResult.count()).toBe(0);
    expect(await prisma.constructorResult.count()).toBe(0);
    expect((await prisma.race.findUnique({ where: { id: australiaId } }))?.status).toBe('UPCOMING');
    expect(await lastLog()).toMatchObject({
      type: 'RESULTS',
      status: 'PARTIAL',
      recordsCreated: 0,
      recordsSkipped: 2,
    });
  });

  it('mapea por positionText: Lapped clasifica, "R" es DNF aunque el status diga Lapped, "W" es DNS', async () => {
    const res = await post(`/races/${australiaId}/results?dryRun=true`);
    const by = (ext: string) =>
      res.body.data.results.find((r: { driverId: number }) => r.driverId === driverId[ext]);

    expect(by('russell')).toEqual({
      driverId: driverId.russell,
      position: 1,
      points: 25,
      gridPosition: 1,
      laps: 58,
      fastestLap: false,
      status: 'CLASSIFIED',
    });
    expect(by('bearman')).toMatchObject({ position: 7, points: 6, status: 'CLASSIFIED' });
    expect(by('max_verstappen')).toMatchObject({ position: 6, points: 8, fastestLap: true });
    expect(by('stroll')).toMatchObject({ points: 0, laps: 43, status: 'DNF' });
    expect(by('stroll')).not.toHaveProperty('position');
    expect(by('alonso')).toMatchObject({ status: 'DNF' });
    expect(by('piastri')).toMatchObject({ points: 0, laps: 0, status: 'DNS' });
    expect(by('piastri')).not.toHaveProperty('position');
  });

  it('import real: carga via loadResults, deriva ConstructorResults, cierra la Race, log PARTIAL', async () => {
    const driversBefore = await prisma.driver.count();
    const linksBefore = await prisma.driverSeason.count();

    const res = await post(`/races/${australiaId}/results`);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ dryRun: false, status: 'PARTIAL', created: 7 });

    const rows = await prisma.raceResult.findMany({ where: { raceId: australiaId } });
    const points = Object.fromEntries(
      GRID.map(([ext]) => [ext, rows.find((r) => r.driverId === driverId[ext])?.points]),
    );
    expect(points).toEqual({
      russell: 25,
      antonelli: 18,
      max_verstappen: 8,
      bearman: 6,
      stroll: 0,
      alonso: 0,
      piastri: 0,
    });
    // La suma de las partes: 25 + 18 + 8 + 6. Los 4 + 2 de los dos salteados NO entran.
    expect(rows.reduce((acc, r) => acc + r.points, 0)).toBe(57);

    const mercedes = await prisma.constructor.findUnique({ where: { externalId: 'mercedes' } });
    const cr = await prisma.constructorResult.findFirst({
      where: { raceId: australiaId, constructorId: mercedes!.id },
    });
    expect(cr).toMatchObject({ driver1Points: 25, driver2Points: 18, totalPoints: 43 });

    expect((await prisma.race.findUnique({ where: { id: australiaId } }))?.status).toBe(
      'COMPLETED',
    );
    // La trampa de los 32 pilotos: el sync jamas crea Drivers ni DriverSeasons.
    expect(await prisma.driver.count()).toBe(driversBefore);
    expect(await prisma.driverSeason.count()).toBe(linksBefore);

    const log = await lastLog();
    expect(log).toMatchObject({
      type: 'RESULTS',
      status: 'PARTIAL',
      recordsCreated: 7,
      recordsSkipped: 2,
    });
    expect(log?.error).toContain('arvid_lindblad');
    expect(log?.error).toContain('bortoleto');
  });

  it('cada carrera trae SUS puntos: China no repite los de Australia', async () => {
    await post(`/races/${australiaId}/results`);
    const res = await post(`/races/${chinaId}/results`);

    // China no tiene salteados en el fixture → SUCCESS.
    expect(res.body.data).toMatchObject({ status: 'SUCCESS', created: 7, skipped: [] });

    const pointsOf = async (raceId: number, ext: string) =>
      (
        await prisma.raceResult.findUnique({
          where: { raceId_driverId: { raceId, driverId: driverId[ext] } },
        })
      )?.points;
    expect(await pointsOf(australiaId, 'antonelli')).toBe(18);
    expect(await pointsOf(chinaId, 'antonelli')).toBe(25);
    expect(await pointsOf(australiaId, 'max_verstappen')).toBe(8);
    expect(await pointsOf(chinaId, 'max_verstappen')).toBe(0);
    expect(await pointsOf(chinaId, 'bearman')).toBe(10);
  });

  it('importar dos veces la misma carrera → 409 RACE_ALREADY_COMPLETED + SyncLog FAILED', async () => {
    await post(`/races/${australiaId}/results`);
    const res = await post(`/races/${australiaId}/results`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_ALREADY_COMPLETED');
    expect(await prisma.raceResult.count({ where: { raceId: australiaId } })).toBe(7);
    expect(await lastLog()).toMatchObject({ status: 'FAILED' });
    expect(await prisma.syncLog.count()).toBe(2);
  });

  it('RaceResults preexistentes en una Race abierta → 409 RACE_RESULTS_ALREADY_EXIST, no 500', async () => {
    await prisma.raceResult.create({
      data: { raceId: australiaId, driverId: driverId.russell, points: 1, status: 'CLASSIFIED' },
    });

    const res = await post(`/races/${australiaId}/results`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RACE_RESULTS_ALREADY_EXIST');
    expect(await prisma.raceResult.count({ where: { raceId: australiaId } })).toBe(1);
  });

  it('TRAMPA: el round local apunta a otro circuito → 409 SYNC_RACE_MISMATCH, nada escrito', async () => {
    // Calendario local desfasado: la "fecha 1" de aca es Suzuka, la de Jolpica es Albert Park.
    const suzuka = await prisma.circuit.create({
      data: { name: 'Suzuka', city: 'Suzuka', country: 'JP', externalId: 'suzuka' },
    });
    await prisma.race.update({
      where: { id: australiaId },
      data: { name: 'Japanese Grand Prix', circuitId: suzuka.id },
    });

    const res = await post(`/races/${australiaId}/results`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SYNC_RACE_MISMATCH');
    expect(await prisma.raceResult.count()).toBe(0);
    expect(await lastLog()).toMatchObject({ status: 'FAILED' });
  });

  it('carrera sin correr en Jolpica → 409 SYNC_RESULTS_NOT_AVAILABLE', async () => {
    stubJolpica({ '/2026/1/results.json': noResultsResponse });
    const res = await post(`/races/${australiaId}/results?dryRun=true`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SYNC_RESULTS_NOT_AVAILABLE');
  });

  it('race inexistente → 404; id no numerico o dryRun invalido → 400', async () => {
    expect((await post('/races/999999/results')).body.error.code).toBe('RACE_NOT_FOUND');
    expect((await post('/races/abc/results')).status).toBe(400);
    expect((await post(`/races/${australiaId}/results?dryRun=maybe`)).status).toBe(400);
  });

  it('le pide a Jolpica el año y el round de ESA carrera', async () => {
    const fetchMock = stubJolpica({ '/2026/2/results.json': chinaResultsResponse });
    await post(`/races/${chinaId}/results?dryRun=true`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.jolpi.ca/ergast/f1/2026/2/results.json?limit=100',
    );
  });
});
