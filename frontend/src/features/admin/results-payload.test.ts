import { buildResultsPayload, entriesFromPreview, type ResultRow } from './results-payload';

const row = (driverId: number, position: string, status: ResultRow['status'] = 'CLASSIFIED') => ({
  driverId,
  label: `P${driverId}`,
  position,
  status,
});

describe('buildResultsPayload', () => {
  // Sin puntos: los calcula el backend por puesto.
  it('arma el payload sin puntos y omite position cuando no hay', () => {
    const out = buildResultsPayload([row(1, '1'), row(2, '', 'DNF')]);
    expect(out).toEqual({
      ok: true,
      results: [
        { driverId: 1, position: 1, status: 'CLASSIFIED' },
        { driverId: 2, status: 'DNF' },
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
      gridPosition: 3,
      laps: 58,
      fastestLap: true,
      status: 'CLASSIFIED' as const,
    },
    { driverId: 2, laps: 43, fastestLap: false, status: 'DNF' as const },
  ];

  it('llena la grilla con lo que trae Jolpica', () => {
    const entries = entriesFromPreview(preview);
    expect(entries[1]).toEqual({
      position: '1',
      status: 'CLASSIFIED',
      imported: { gridPosition: 3, laps: 58, fastestLap: true },
    });
    expect(entries[2]).toMatchObject({ position: '', status: 'DNF' });
  });

  it('ida y vuelta: lo importado llega al payload con grilla, vueltas y vuelta rapida', () => {
    const entries = entriesFromPreview(preview);
    const out = buildResultsPayload(
      [1, 2].map((driverId) => ({ driverId, label: `P${driverId}`, ...entries[driverId] })),
    );
    expect(out).toEqual({ ok: true, results: preview });
  });
});
