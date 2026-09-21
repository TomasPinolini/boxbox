import { buildResultsPayload, pointsFor, type ResultRow } from './results-payload';

const row = (driverId: number, position: string, status: ResultRow['status'] = 'CLASSIFIED') => ({
  driverId,
  label: `P${driverId}`,
  position,
  status,
});

describe('pointsFor', () => {
  it('reparte la tabla de F1 y nada fuera del top 10', () => {
    expect(pointsFor(1, 'CLASSIFIED')).toBe(25);
    expect(pointsFor(10, 'CLASSIFIED')).toBe(1);
    expect(pointsFor(11, 'CLASSIFIED')).toBe(0);
  });

  it('un DSQ no suma aunque tenga posicion', () => {
    expect(pointsFor(1, 'DSQ')).toBe(0);
  });
});

describe('buildResultsPayload', () => {
  it('arma el payload y omite position cuando no hay', () => {
    const out = buildResultsPayload([row(1, '1'), row(2, '', 'DNF')]);
    expect(out).toEqual({
      ok: true,
      results: [
        { driverId: 1, position: 1, points: 25, status: 'CLASSIFIED' },
        { driverId: 2, points: 0, status: 'DNF' },
      ],
    });
  });

  it('rechaza posiciones repetidas, clasificados sin posicion y no enteros', () => {
    const out = buildResultsPayload([row(1, '1'), row(2, '1'), row(3, ''), row(4, '2.5')]);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.errors).toHaveLength(3);
  });
});
