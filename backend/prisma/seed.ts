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
];

// ───────────────────────────────────────────────────────────────────────────
// Lógica — recorre los arrays y persiste vía upsert
// ───────────────────────────────────────────────────────────────────────────

async function main() {
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
    const teamConstructor = await prisma.constructor.upsert({
      where: { externalId: team.externalId },
      update: {},
      create: { externalId: team.externalId, name: team.name, color: team.color },
    });

    for (const d of team.drivers) {
      const driver = await prisma.driver.upsert({
        where: { externalId: d.externalId },
        update: {},
        create: {
          externalId: d.externalId,
          firstName: d.firstName,
          lastName: d.lastName,
          number: d.number,
          code: d.code,
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

  // 5. Summary --------------------------------------------------------------
  const counts = {
    seasons: await prisma.season.count(),
    constructors: await prisma.constructor.count({ where: { deletedAt: null } }),
    drivers: await prisma.driver.count({ where: { deletedAt: null } }),
    driverSeasons: await prisma.driverSeason.count(),
    circuits: await prisma.circuit.count({ where: { deletedAt: null } }),
    races: await prisma.race.count(),
  };
  console.log('Seed completo:', counts);
}

main()
  .catch((err) => {
    console.error('Seed falló:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
