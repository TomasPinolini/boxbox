import {
  buildResultsPayload,
  entriesFromPreview,
  pointsFor,
  type ResultRow,
} from './results-payload';

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

describe('entriesFromPreview', () => {
  const preview = [
    {
      driverId: 1,
      position: 1,
      points: 25,
      gridPosition: 3,
      laps: 58,
      fastestLap: true,
      status: 'CLASSIFIED' as const,
    },
    { driverId: 2, points: 0, laps: 43, fastestLap: false, status: 'DNF' as const },
    // Medios puntos (bandera roja): Jolpica dice 9, la tabla dice 18.
    { driverId: 3, position: 2, points: 9, status: 'CLASSIFIED' as const },
  ];

  it('llena la grilla y avisa cuando los puntos de Jolpica no son los de la tabla', () => {
    const { entries, pointsMismatch } = entriesFromPreview(preview);
    expect(entries[1]).toEqual({
      position: '1',
      status: 'CLASSIFIED',
      imported: { gridPosition: 3, laps: 58, fastestLap: true },
    });
    expect(entries[2]).toMatchObject({ position: '', status: 'DNF' });
    expect(pointsMismatch).toEqual([{ driverId: 3, jolpica: 9, table: 18 }]);
  });

  it('ida y vuelta: lo importado llega al payload con grilla, vueltas y vuelta rapida', () => {
    const { entries } = entriesFromPreview(preview.slice(0, 2));
    const out = buildResultsPayload(
      [1, 2].map((driverId) => ({ driverId, label: `P${driverId}`, ...entries[driverId] })),
    );
    expect(out).toEqual({ ok: true, results: preview.slice(0, 2) });
  });
});
