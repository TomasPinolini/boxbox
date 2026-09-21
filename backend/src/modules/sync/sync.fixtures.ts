// FIXTURES — respuestas REALES de Jolpica (2026, relevadas el 2026-09-21), recortadas a los
// campos que lee shared/jolpica.ts y a las filas que ejercitan una rama cada una.
// Los puntos son distintos en cada fecha a proposito: con la misma tabla en las dos, un bug
// que cargara la fecha equivocada pasaria en verde.

const albertPark = {
  circuitId: 'albert_park',
  circuitName: 'Albert Park Grand Prix Circuit',
  Location: { locality: 'Melbourne', country: 'Australia' },
};
const shanghai = {
  circuitId: 'shanghai',
  circuitName: 'Shanghai International Circuit',
  Location: { locality: 'Shanghai', country: 'China' },
};

const australia = {
  round: '1',
  raceName: 'Australian Grand Prix',
  date: '2026-03-08',
  time: '04:00:00Z',
  Circuit: albertPark,
  Qualifying: { date: '2026-03-07', time: '05:00:00Z' },
};
const china = {
  round: '2',
  raceName: 'Chinese Grand Prix',
  date: '2026-03-15',
  time: '07:00:00Z',
  Circuit: shanghai,
  Qualifying: { date: '2026-03-14', time: '07:00:00Z' },
  Sprint: { date: '2026-03-14', time: '03:00:00Z' },
};

export const racesResponse = { MRData: { RaceTable: { Races: [australia, china] } } };

type Row = [
  position: string,
  positionText: string,
  points: string,
  grid: string,
  laps: string,
  status: string,
  driverId: string,
  fastestLapRank?: string,
];

const toResult = ([position, positionText, points, grid, laps, status, driverId, rank]: Row) => ({
  position,
  positionText,
  points,
  grid,
  laps,
  status,
  Driver: { driverId },
  ...(rank ? { FastestLap: { rank } } : {}),
});

// Fecha 1 — Australia.
const australiaRows: Row[] = [
  ['1', '1', '25', '1', '58', 'Finished', 'russell', '6'],
  ['2', '2', '18', '2', '58', 'Finished', 'antonelli', '3'],
  ['6', '6', '8', '20', '58', 'Finished', 'max_verstappen', '1'], // vuelta rapida
  ['7', '7', '6', '12', '57', 'Lapped', 'bearman', '11'], // Lapped = clasificado, con puntos
  ['8', '8', '4', '9', '57', 'Lapped', 'arvid_lindblad', '12'], // NO existe en la base del test
  ['9', '9', '2', '10', '57', 'Lapped', 'bortoleto', '8'], // existe, pero sin DriverSeason
  ['17', 'R', '0', '22', '43', 'Lapped', 'stroll', '17'], // status "Lapped" pero NO clasifico
  ['18', 'R', '0', '17', '21', 'Retired', 'alonso', '18'],
  ['21', 'W', '0', '5', '0', 'Did not start', 'piastri'],
];

// Fecha 2 — China. Mismos pilotos, otro resultado.
const chinaRows: Row[] = [
  ['1', '1', '25', '1', '56', 'Finished', 'antonelli', '1'],
  ['2', '2', '18', '2', '56', 'Finished', 'russell', '2'],
  ['5', '5', '10', '10', '56', 'Finished', 'bearman', '8'],
  ['16', 'R', '0', '8', '45', 'Retired', 'max_verstappen', '11'],
  ['17', 'R', '0', '18', '32', 'Retired', 'alonso', '17'],
  ['18', 'R', '0', '20', '9', 'Retired', 'stroll', '18'],
  ['19', 'W', '0', '5', '0', 'Did not start', 'piastri'],
];

const resultsResponse = (race: typeof australia, rows: Row[]) => ({
  MRData: { RaceTable: { Races: [{ ...race, Results: rows.map(toResult) }] } },
});

export const australiaResultsResponse = resultsResponse(australia, australiaRows);
export const chinaResultsResponse = resultsResponse(china, chinaRows);
// Carrera sin correr: Jolpica responde 200 con Races vacio.
export const noResultsResponse = { MRData: { RaceTable: { Races: [] } } };
