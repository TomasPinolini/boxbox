/**
 * Dev seed — pobla la DB con datos suficientes para arrancar el backend
 * con algo en la base, antes de que exista sync con Jolpica.
 *
 * Cómo se corre:
 *   npx prisma db seed        -> idempotente, podés correrlo cuantas veces quieras
 *   npx prisma migrate reset  -> wipea la DB y re-migra; correr `db seed` aparte
 *                                después (Prisma 7 ya NO lo auto-corre).
 *
 * Cómo es idempotente: cada operación usa `upsert` con `update: {}` (o un
 * update mínimo donde hace falta — ver DriverSeason). Eso significa que si
 * el registro existe, no lo toca; si no existe, lo crea.
 *
 * Estructura: los datos (`teams2026`, `circuits2026`, `races2026`) están
 * separados de la lógica. Agregar un equipo / circuito / carrera = agregar
 * una entrada al array, NO copiar bloques de upsert.
 */

import { prisma } from '../src/shared/prisma';
import { hashPassword } from '../src/shared/password';

const oneHourBefore = (date: Date) => new Date(date.getTime() - 60 * 60 * 1000);

// ───────────────────────────────────────────────────────────────────────────
// Tipos de datos de seed
// ───────────────────────────────────────────────────────────────────────────

type DriverData = {
  externalId: string;
  firstName: string;
  lastName: string;
  number: number;
  code: string;
};

type TeamData = {
  externalId: string;
  name: string;
  color: string;
  drivers: DriverData[];
};

type CircuitData = {
  externalId: string;
  name: string;
  country: string;
  city: string;
  circuitLength: number;
};

type RaceData = {
  round: number;
  name: string;
  date: string;
  circuitExternalId: string;
};

// ───────────────────────────────────────────────────────────────────────────
// Datos — parrilla 2026 (11 equipos, 22 pilotos)
// ───────────────────────────────────────────────────────────────────────────

const teams2026: TeamData[] = [
  {
    externalId: 'mclaren',
    name: 'McLaren',
    color: '#FF8000',
    drivers: [
      // Norris usa el #1 como campeón reinante 2025.
      { externalId: 'norris', firstName: 'Lando', lastName: 'Norris', number: 1, code: 'NOR' },
      { externalId: 'piastri', firstName: 'Oscar', lastName: 'Piastri', number: 81, code: 'PIA' },
    ],
  },
  {
    externalId: 'ferrari',
    name: 'Ferrari',
    color: '#E80020',
    drivers: [
      { externalId: 'leclerc', firstName: 'Charles', lastName: 'Leclerc', number: 16, code: 'LEC' },
      { externalId: 'hamilton', firstName: 'Lewis', lastName: 'Hamilton', number: 44, code: 'HAM' },
    ],
  },
  {
    externalId: 'red_bull',
    name: 'Red Bull Racing',
    color: '#3671C6',
    drivers: [
      // Verstappen vuelve al #3 al perder el campeonato.
      {
        externalId: 'max_verstappen',
        firstName: 'Max',
        lastName: 'Verstappen',
        number: 3,
        code: 'VER',
      },
      // Hadjar ascendido desde RB tras la salida de Lawson del equipo principal.
      { externalId: 'hadjar', firstName: 'Isack', lastName: 'Hadjar', number: 6, code: 'HAD' },
    ],
  },
  {
    externalId: 'mercedes',
    name: 'Mercedes',
    color: '#27F4D2',
    drivers: [
      { externalId: 'russell', firstName: 'George', lastName: 'Russell', number: 63, code: 'RUS' },
      {
        externalId: 'antonelli',
        firstName: 'Kimi',
        lastName: 'Antonelli',
        number: 12,
        code: 'ANT',
      },
    ],
  },
  {
    externalId: 'aston_martin',
    name: 'Aston Martin',
    color: '#229971',
    drivers: [
      { externalId: 'alonso', firstName: 'Fernando', lastName: 'Alonso', number: 14, code: 'ALO' },
      { externalId: 'stroll', firstName: 'Lance', lastName: 'Stroll', number: 18, code: 'STR' },
    ],
  },
  {
    externalId: 'alpine',
    name: 'Alpine',
    color: '#0093CC',
    drivers: [
      { externalId: 'gasly', firstName: 'Pierre', lastName: 'Gasly', number: 10, code: 'GAS' },
      {
        externalId: 'colapinto',
        firstName: 'Franco',
        lastName: 'Colapinto',
        number: 43,
        code: 'COL',
      },
    ],
  },
  {
    externalId: 'haas',
    name: 'Haas',
    color: '#B6BABD',
    drivers: [
      { externalId: 'ocon', firstName: 'Esteban', lastName: 'Ocon', number: 31, code: 'OCO' },
      { externalId: 'bearman', firstName: 'Oliver', lastName: 'Bearman', number: 87, code: 'BEA' },
    ],
  },
  {
    externalId: 'rb',
    name: 'Racing Bulls',
    color: '#6692FF',
    drivers: [
      { externalId: 'lawson', firstName: 'Liam', lastName: 'Lawson', number: 30, code: 'LAW' },
      // Lindblad: rookie absoluto promocionado desde la academia.
      {
        externalId: 'lindblad',
        firstName: 'Arvid',
        lastName: 'Lindblad',
        number: 41,
        code: 'LIN',
      },
    ],
  },
  {
    externalId: 'williams',
    name: 'Williams',
    color: '#37BEDD',
    drivers: [
      { externalId: 'albon', firstName: 'Alexander', lastName: 'Albon', number: 23, code: 'ALB' },
      { externalId: 'sainz', firstName: 'Carlos', lastName: 'Sainz', number: 55, code: 'SAI' },
    ],
  },
  {
    externalId: 'audi',
    name: 'Audi F1 Team',
    color: '#F10040',
    drivers: [
      {
        externalId: 'hulkenberg',
        firstName: 'Nico',
        lastName: 'Hülkenberg',
        number: 27,
        code: 'HUL',
      },
      {
        externalId: 'bortoleto',
        firstName: 'Gabriel',
        lastName: 'Bortoleto',
        number: 5,
        code: 'BOR',
      },
    ],
  },
  {
    externalId: 'cadillac',
    name: 'Cadillac Racing',
    color: '#101010',
    drivers: [
      { externalId: 'perez', firstName: 'Sergio', lastName: 'Pérez', number: 11, code: 'PER' },
      { externalId: 'bottas', firstName: 'Valtteri', lastName: 'Bottas', number: 77, code: 'BOT' },
    ],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Datos — circuitos 2026 (agregar nuevos acá, no abajo)
// ───────────────────────────────────────────────────────────────────────────

const circuits2026: CircuitData[] = [
  {
    externalId: 'bahrain',
    name: 'Bahrain International Circuit',
    country: 'Bahrain',
    city: 'Sakhir',
    circuitLength: 5.412,
  },
  {
    externalId: 'jeddah',
    name: 'Jeddah Corniche Circuit',
    country: 'Saudi Arabia',
    city: 'Jeddah',
    circuitLength: 6.174,
  },
  {
    externalId: 'albert_park',
    name: 'Albert Park Circuit',
    country: 'Australia',
    city: 'Melbourne',
    circuitLength: 5.278,
  },
  {
    externalId: 'suzuka',
    name: 'Suzuka International Racing Course',
    country: 'Japan',
    city: 'Suzuka',
    circuitLength: 5.807,
  },
  {
    externalId: 'shanghai',
    name: 'Shanghai International Circuit',
    country: 'China',
    city: 'Shanghai',
    circuitLength: 5.451,
  },
  {
    externalId: 'monaco',
    name: 'Circuit de Monaco',
    country: 'Monaco',
    city: 'Monte Carlo',
    circuitLength: 3.337,
  },
  {
    externalId: 'silverstone',
    name: 'Silverstone Circuit',
    country: 'UK',
    city: 'Silverstone',
    circuitLength: 5.891,
  },
  {
    externalId: 'interlagos',
    name: 'Autódromo José Carlos Pace',
    country: 'Brazil',
    city: 'São Paulo',
    circuitLength: 4.309,
  },
  {
    externalId: 'imola',
    name: 'Autodromo Enzo e Dino Ferrari',
    country: 'Italy',
    city: 'Imola',
    circuitLength: 4.909,
  },
  {
    externalId: 'miami',
    name: 'Miami International Autodrome',
    country: 'USA',
    city: 'Miami',
    circuitLength: 5.412,
  },
  {
    externalId: 'montreal',
    name: 'Circuit Gilles Villeneuve',
    country: 'Canada',
    city: 'Montreal',
    circuitLength: 4.361,
  },
  {
    externalId: 'barcelona',
    name: 'Circuit de Barcelona-Catalunya',
    country: 'Spain',
    city: 'Barcelona',
    circuitLength: 4.657,
  },
  {
    externalId: 'red_bull_ring',
    name: 'Red Bull Ring',
    country: 'Austria',
    city: 'Spielberg',
    circuitLength: 4.318,
  },
  {
    externalId: 'hungaroring',
    name: 'Hungaroring',
    country: 'Hungary',
    city: 'Budapest',
    circuitLength: 4.381,
  },
  {
    externalId: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    country: 'Belgium',
    city: 'Spa',
    circuitLength: 7.004,
  },
  {
    externalId: 'zandvoort',
    name: 'Circuit Zandvoort',
    country: 'Netherlands',
    city: 'Zandvoort',
    circuitLength: 4.259,
  },
  {
    externalId: 'monza',
    name: 'Autodromo Nazionale Monza',
    country: 'Italy',
    city: 'Monza',
    circuitLength: 5.793,
  },
  {
    externalId: 'baku',
    name: 'Baku City Circuit',
    country: 'Azerbaijan',
    city: 'Baku',
    circuitLength: 6.003,
  },
  {
    externalId: 'marina_bay',
    name: 'Marina Bay Street Circuit',
    country: 'Singapore',
    city: 'Singapore',
    circuitLength: 4.940,
  },
  {
    externalId: 'cota',
    name: 'Circuit of the Americas',
    country: 'USA',
    city: 'Austin',
    circuitLength: 5.513,
  },
  {
    externalId: 'rodriguez',
    name: 'Autódromo Hermanos Rodríguez',
    country: 'Mexico',
    city: 'Mexico City',
    circuitLength: 4.304,
  },
  {
    externalId: 'las_vegas',
    name: 'Las Vegas Strip Circuit',
    country: 'USA',
    city: 'Las Vegas',
    circuitLength: 6.201,
  },
  {
    externalId: 'lusail',
    name: 'Lusail International Circuit',
    country: 'Qatar',
    city: 'Lusail',
    circuitLength: 5.419,
  },
  {
    externalId: 'yas_marina',
    name: 'Yas Marina Circuit',
    country: 'UAE',
    city: 'Abu Dhabi',
    circuitLength: 5.281,
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Datos — primeras carreras del campeonato 2026
// ───────────────────────────────────────────────────────────────────────────

const races2026: RaceData[] = [
  {
    round: 1,
    name: 'Bahrain Grand Prix',
    date: '2026-03-08T15:00:00Z',
    circuitExternalId: 'bahrain',
  },
  {
    round: 2,
    name: 'Saudi Arabian Grand Prix',
    date: '2026-03-21T17:00:00Z',
    circuitExternalId: 'jeddah',
  },
  {
    round: 3,
    name: 'Australian Grand Prix',
    date: '2026-04-05T05:00:00Z',
    circuitExternalId: 'albert_park',
  },
  {
    round: 4,
    name: 'Japanese Grand Prix',
    date: '2026-04-19T05:00:00Z',
    circuitExternalId: 'suzuka',
  },
  {
    round: 5,
    name: 'Chinese Grand Prix',
    date: '2026-05-03T07:00:00Z',
    circuitExternalId: 'shanghai',
  },
  {
    round: 6,
    name: 'Miami Grand Prix',
    date: '2026-05-10T19:30:00Z',
    circuitExternalId: 'miami',
  },
  {
    round: 7,
    name: 'Emilia Romagna Grand Prix',
    date: '2026-05-24T13:00:00Z',
    circuitExternalId: 'imola',
  },
  {
    round: 8,
    name: 'Monaco Grand Prix',
    date: '2026-06-07T13:00:00Z',
    circuitExternalId: 'monaco',
  },
  {
    round: 9,
    name: 'Spanish Grand Prix',
    date: '2026-06-14T13:00:00Z',
    circuitExternalId: 'barcelona',
  },
  {
    round: 10,
    name: 'Canadian Grand Prix',
    date: '2026-06-28T18:00:00Z',
    circuitExternalId: 'montreal',
  },
  {
    round: 11,
    name: 'Austrian Grand Prix',
    date: '2026-07-05T13:00:00Z',
    circuitExternalId: 'red_bull_ring',
  },
  {
    round: 12,
    name: 'British Grand Prix',
    date: '2026-07-19T14:00:00Z',
    circuitExternalId: 'silverstone',
  },
  {
    round: 13,
    name: 'Hungarian Grand Prix',
    date: '2026-08-02T13:00:00Z',
    circuitExternalId: 'hungaroring',
  },
  {
    round: 14,
    name: 'Belgian Grand Prix',
    date: '2026-08-23T13:00:00Z',
    circuitExternalId: 'spa',
  },
  {
    round: 15,
    name: 'Dutch Grand Prix',
    date: '2026-09-06T13:00:00Z',
    circuitExternalId: 'zandvoort',
  },
  {
    round: 16,
    name: 'Italian Grand Prix',
    date: '2026-09-13T13:00:00Z',
    circuitExternalId: 'monza',
  },
  {
    round: 17,
    name: 'Azerbaijan Grand Prix',
    date: '2026-09-27T11:00:00Z',
    circuitExternalId: 'baku',
  },
  {
    round: 18,
    name: 'Singapore Grand Prix',
    date: '2026-10-04T12:00:00Z',
    circuitExternalId: 'marina_bay',
  },
  {
    round: 19,
    name: 'United States Grand Prix',
    date: '2026-10-25T19:00:00Z',
    circuitExternalId: 'cota',
  },
  {
    round: 20,
    name: 'Mexico City Grand Prix',
    date: '2026-11-01T20:00:00Z',
    circuitExternalId: 'rodriguez',
  },
  {
    round: 21,
    name: 'São Paulo Grand Prix',
    date: '2026-11-08T17:00:00Z',
    circuitExternalId: 'interlagos',
  },
  {
    round: 22,
    name: 'Las Vegas Grand Prix',
    date: '2026-11-21T06:00:00Z',
    circuitExternalId: 'las_vegas',
  },
  {
    round: 23,
    name: 'Qatar Grand Prix',
    date: '2026-11-29T17:00:00Z',
    circuitExternalId: 'lusail',
  },
  {
    round: 24,
    name: 'Abu Dhabi Grand Prix',
    date: '2026-12-06T13:00:00Z',
    circuitExternalId: 'yas_marina',
  },
];

type RaceResultData = {
  round: number;
  // externalIds de pilotos, el ganador primero. La posicion sale del indice y los puntos
  // de F1_POINTS. Los que no figuran acá ni en `dnf` no corrieron esa carrera.
  finishOrder: string[];
  // Abandonos: position null, 0 puntos, status DNF. Sirven para que el detalle de piloto
  // tenga un caso donde `position` es null y `bestFinish` tiene que ignorarlo.
  dnf?: string[];
};

// Sistema de puntos vigente: del 1ro al 10mo. Del 11vo para abajo, cero.
const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Resultados de las 3 primeras fechas. Sin esto, /drivers/:id renderiza vacio contra un seed
// fresco (24 carreras, 0 resultados) y Slice 9 no tiene con que calcular standings.
// Inventados: no son resultados reales de 2026.
const results2026: RaceResultData[] = [
  {
    round: 1, // Bahrain
    finishOrder: [
      'max_verstappen', 'norris', 'leclerc', 'russell', 'piastri', 'hamilton', 'antonelli',
      'sainz', 'albon', 'gasly', 'hadjar', 'lawson', 'alonso', 'stroll', 'ocon', 'bearman',
      'hulkenberg', 'bortoleto', 'colapinto', 'lindblad',
    ],
    dnf: ['perez', 'bottas'],
  },
  {
    round: 2, // Jeddah
    finishOrder: [
      'norris', 'piastri', 'max_verstappen', 'leclerc', 'hamilton', 'russell', 'sainz',
      'antonelli', 'gasly', 'alonso', 'albon', 'hadjar', 'bearman', 'ocon', 'stroll',
      'lawson', 'bottas', 'perez', 'hulkenberg', 'bortoleto', 'colapinto',
    ],
    dnf: ['lindblad'],
  },
  {
    round: 3, // Albert Park
    finishOrder: [
      'leclerc', 'max_verstappen', 'hamilton', 'norris', 'antonelli', 'piastri', 'russell',
      'albon', 'alonso', 'sainz', 'colapinto', 'gasly', 'lawson', 'stroll', 'hadjar',
      'bearman', 'bortoleto', 'perez', 'bottas', 'hulkenberg', 'lindblad', 'ocon',
    ],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Multimedia
// ───────────────────────────────────────────────────────────────────────────

// Logos de escuderia, servidos como estaticos desde frontend/public/logos/.
// Origen y licencia de cada archivo: frontend/public/logos/CREDITS.md (todos de Wikimedia
// Commons, dominio publico o CC0 salvo los marcados ahi).
// Faltan Ferrari, Audi y Racing Bulls: no habia archivo usable con fondo transparente. La UI
// cae al badge con el color del equipo, que ya alcanza para identificarlo.
// Slice 12 va a poder pisar estos valores con las URLs que devuelva la API externa.
const teamLogos: Record<string, string> = {
  alpine: '/logos/alpine.png',
  aston_martin: '/logos/aston-martin.png',
  cadillac: '/logos/cadillac.png',
  haas: '/logos/haas.png',
  mclaren: '/logos/mclaren.png',
  mercedes: '/logos/mercedes.png',
  red_bull: '/logos/red-bull-racing.png',
  williams: '/logos/williams.png',
};

// Fotos de pilotos: se guarda la URL, NO el archivo. Son imagenes de prensa de F1 alojadas en
// su CDN y este repositorio es publico, asi que bajarlas y commitearlas seria redistribuirlas.
// Las URLs salieron del campo `headshot_url` de la API de OpenF1 (gratuita, sin credenciales).
// El `2col` del path es el escalon de tamano: 1col=93px, 2col=206px, 3col=319px, 4col=432px.
// Falta Hadjar, que OpenF1 no devuelve.
const driverHeadshots: Record<string, string> = {
  albon: 'https://media.formula1.com/content/dam/fom-website/drivers/A/ALEALB01_Alexander_Albon/alealb01.png.transform/2col/image.png',
  alonso: 'https://media.formula1.com/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png.transform/2col/image.png',
  antonelli: 'https://media.formula1.com/content/dam/fom-website/drivers/K/ANDANT01_Kimi_Antonelli/andant01.png.transform/2col/image.png',
  bearman: 'https://media.formula1.com/content/dam/fom-website/drivers/O/OLIBEA01_Oliver_Bearman/olibea01.png.transform/2col/image.png',
  bortoleto: 'https://media.formula1.com/content/dam/fom-website/drivers/G/GABBOR01_Gabriel_Bortoleto/gabbor01.png.transform/2col/image.png',
  bottas: 'https://media.formula1.com/content/dam/fom-website/drivers/V/VALBOT01_Valtteri_Bottas/valbot01.png.transform/2col/image.png',
  colapinto: 'https://media.formula1.com/content/dam/fom-website/drivers/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/2col/image.png',
  gasly: 'https://media.formula1.com/content/dam/fom-website/drivers/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/2col/image.png',
  hamilton: 'https://media.formula1.com/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/2col/image.png',
  hulkenberg: 'https://media.formula1.com/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/2col/image.png',
  lawson: 'https://media.formula1.com/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/2col/image.png',
  leclerc: 'https://media.formula1.com/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/2col/image.png',
  lindblad: 'https://media.formula1.com/content/dam/fom-website/drivers/A/ARVLIN01_Arvid_Lindblad/arvlin01.png.transform/2col/image.png',
  max_verstappen: 'https://media.formula1.com/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/2col/image.png',
  norris: 'https://media.formula1.com/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/2col/image.png',
  ocon: 'https://media.formula1.com/content/dam/fom-website/drivers/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/2col/image.png',
  perez: 'https://media.formula1.com/content/dam/fom-website/drivers/S/SERPER01_Sergio_Perez/serper01.png.transform/2col/image.png',
  piastri: 'https://media.formula1.com/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/2col/image.png',
  russell: 'https://media.formula1.com/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png.transform/2col/image.png',
  sainz: 'https://media.formula1.com/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/2col/image.png',
  stroll: 'https://media.formula1.com/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/2col/image.png',
};

// ───────────────────────────────────────────────────────────────────────────
// Lógica — recorre los arrays y persiste vía upsert
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  // 0. Admin de desarrollo ---------------------------------------------------
  // El CRUD de catalogo (drivers, constructors, circuits, seasons, races) es admin-only
  // (A5 / BOX-15) y `POST /auth/register` siempre crea USER. Sin este upsert no hay forma
  // de cargar pilotos o resultados desde la API en dev. Password fija de desarrollo,
  // documentada en docs/tutorial.md — NUNCA reutilizar en un ambiente real.
  await prisma.user.upsert({
    where: { email: 'admin@boxbox.test' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@boxbox.test',
      name: 'Admin BoxBox',
      passwordHash: await hashPassword('admin1234'),
      role: 'ADMIN',
    },
  });

  // 1. Season ---------------------------------------------------------------
  const season = await prisma.season.upsert({
    where: { year: 2026 },
    update: {},
    create: { year: 2026, isActive: true, driverCount: 22 },
  });

  const connectDriverSeason = async (driverId: number, constructorId: number) => {
    await prisma.driverSeason.upsert({
      where: { driverId_seasonId: { driverId, seasonId: season.id } },
      update: { constructorId },
      create: { driverId, constructorId, seasonId: season.id },
    });
  };

  // 2. Constructors + Drivers + DriverSeasons -------------------------------
  for (const team of teams2026) {
    const logoUrl = teamLogos[team.externalId] ?? null;
    const teamConstructor = await prisma.constructor.upsert({
      where: { externalId: team.externalId },
      // logoUrl SI se actualiza (a diferencia del resto de los upserts, que usan `update: {}`):
      // el seed es su fuente de verdad, asi que agregar un logo nuevo tiene que impactar en una
      // DB ya seedeada sin obligar a borrarla.
      update: { logoUrl },
      create: { externalId: team.externalId, name: team.name, color: team.color, logoUrl },
    });

    for (const d of team.drivers) {
      const headshotUrl = driverHeadshots[d.externalId] ?? null;
      const driver = await prisma.driver.upsert({
        where: { externalId: d.externalId },
        update: { headshotUrl }, // mismo criterio que logoUrl
        create: {
          externalId: d.externalId,
          firstName: d.firstName,
          lastName: d.lastName,
          number: d.number,
          code: d.code,
          headshotUrl,
        },
      });
      await connectDriverSeason(driver.id, teamConstructor.id);
    }
  }

  // 3. Circuits -------------------------------------------------------------
  // Guardamos el id real (autoincrement) por externalId para que las races
  // puedan referenciarlo sin tener variables sueltas.
  const circuitIdByExternalId = new Map<string, number>();
  for (const c of circuits2026) {
    const circuit = await prisma.circuit.upsert({
      where: { externalId: c.externalId },
      update: {},
      create: c,
    });
    circuitIdByExternalId.set(c.externalId, circuit.id);
  }

  // 4. Races ----------------------------------------------------------------
  for (const r of races2026) {
    const circuitId = circuitIdByExternalId.get(r.circuitExternalId);
    if (!circuitId) {
      throw new Error(
        `Race "${r.name}" referencia circuit "${r.circuitExternalId}" que no está en circuits2026`,
      );
    }

    const raceDate = new Date(r.date);
    await prisma.race.upsert({
      where: { seasonId_round: { seasonId: season.id, round: r.round } },
      update: {},
      create: {
        name: r.name,
        round: r.round,
        date: raceDate,
        lockDate: oneHourBefore(raceDate),
        seasonId: season.id,
        circuitId,
      },
    });
  }

  // 5. RaceResults + ConstructorResults -------------------------------------
  // Solo las fechas que figuran en results2026; el resto de las carreras queda UPCOMING.
  const driverIdByExternalId = new Map(
    (await prisma.driver.findMany({ select: { id: true, externalId: true } })).map((d) => [
      d.externalId,
      d.id,
    ]),
  );
  // driverId -> constructorId de esta temporada, para derivar los ConstructorResult.
  const constructorIdByDriverId = new Map(
    (await prisma.driverSeason.findMany({ where: { seasonId: season.id } })).map((ds) => [
      ds.driverId,
      ds.constructorId,
    ]),
  );

  for (const r of results2026) {
    const race = await prisma.race.findUnique({
      where: { seasonId_round: { seasonId: season.id, round: r.round } },
    });
    if (!race) throw new Error(`results2026 referencia la fecha ${r.round}, que no existe`);

    const resolve = (externalId: string) => {
      const driverId = driverIdByExternalId.get(externalId);
      if (!driverId) {
        throw new Error(`results2026 (fecha ${r.round}) referencia al piloto "${externalId}"`);
      }
      return driverId;
    };

    const rows = [
      ...r.finishOrder.map((externalId, index) => ({
        driverId: resolve(externalId),
        position: index + 1,
        points: F1_POINTS[index] ?? 0,
        status: 'CLASSIFIED' as const,
      })),
      ...(r.dnf ?? []).map((externalId) => ({
        driverId: resolve(externalId),
        position: null,
        points: 0,
        status: 'DNF' as const,
      })),
    ];

    for (const row of rows) {
      await prisma.raceResult.upsert({
        where: { raceId_driverId: { raceId: race.id, driverId: row.driverId } },
        update: {},
        create: { raceId: race.id, ...row },
      });
    }

    // El upsert de la carrera usa `update: {}`, asi que en una DB ya seedeada nunca aplicaria
    // el COMPLETED. Hace falta este update explicito (idempotente por naturaleza).
    await prisma.race.update({ where: { id: race.id }, data: { status: 'COMPLETED' } });

    // ConstructorResults derivados, con la misma regla que loadResults (Slice 8):
    // driver1Points es el mayor de los dos. Sin esto la DB de dev queda en un estado que
    // Slice 8 nunca produciria y que Slice 9 leeria mal.
    const pointsByConstructor = new Map<number, number[]>();
    for (const row of rows) {
      const constructorId = constructorIdByDriverId.get(row.driverId);
      if (!constructorId) continue;
      pointsByConstructor.set(constructorId, [
        ...(pointsByConstructor.get(constructorId) ?? []),
        row.points,
      ]);
    }

    for (const [constructorId, points] of pointsByConstructor) {
      const [driver1Points = 0, driver2Points = 0] = [...points].sort((a, b) => b - a);
      await prisma.constructorResult.upsert({
        where: { raceId_constructorId: { raceId: race.id, constructorId } },
        update: {},
        create: {
          raceId: race.id,
          constructorId,
          driver1Points,
          driver2Points,
          totalPoints: driver1Points + driver2Points,
        },
      });
    }
  }

  // 6. Summary --------------------------------------------------------------
  const counts = {
    admins: await prisma.user.count({ where: { role: 'ADMIN' } }),
    seasons: await prisma.season.count(),
    constructors: await prisma.constructor.count({ where: { deletedAt: null } }),
    constructorsConLogo: await prisma.constructor.count({ where: { logoUrl: { not: null } } }),
    drivers: await prisma.driver.count({ where: { deletedAt: null } }),
    driversConFoto: await prisma.driver.count({ where: { headshotUrl: { not: null } } }),
    driverSeasons: await prisma.driverSeason.count(),
    circuits: await prisma.circuit.count({ where: { deletedAt: null } }),
    races: await prisma.race.count(),
    racesCompleted: await prisma.race.count({ where: { status: 'COMPLETED' } }),
    raceResults: await prisma.raceResult.count(),
    constructorResults: await prisma.constructorResult.count(),
  };
  console.log('Seed completo:', counts);
}

main()
  .catch((err) => {
    console.error('Seed falló:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
