// SERVICE — el cerebro del módulo
// Toda la lógica de negocio y el acceso a la base de datos viven acá.
// No sabe que existe HTTP: no toca req, res ni next.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors';

// Estos dos `select` van con `as Prisma.XSelect` (type assertion, NO anotacion `:` ni
// `as const`). Motivo: ConstructorResult y FantasyTeam tienen una relacion que se llama
// literalmente `constructor`, que colisiona con la propiedad que todo objeto JS hereda de
// Object.prototype, y tsc infiere `Function` en vez del tipo del select. Es el mismo bug que
// mordio en los Slices 4 y 5 — ver docs/roadmap.md, "Bug de tipos". El assertion es el unico
// approach que lo evita, confirmado empiricamente.
const constructorResultPointsSelect = {
  constructorId: true,
  totalPoints: true,
} as Prisma.ConstructorResultSelect;

const fantasyTeamSlotsSelect = {
  driver1Id: true,
  driver2Id: true,
  constructorId: true,
} as Prisma.FantasyTeamSelect;

// Una fila calculada, antes de persistirla. `position` se asigna despues de ordenar.
type ComputedStanding = {
  leagueMemberId: number;
  driverPoints: number;
  constructorPoints: number;
  predictionPoints: number;
  totalPoints: number;
};

// Puntos de un piloto y de un constructor, acumulados sobre un conjunto de carreras.
type PointsIndex = {
  byDriver: Map<number, number>;
  byConstructor: Map<number, number>;
};

/**
 * Suma los puntos de cada piloto y de cada constructor sobre las carreras dadas.
 *
 * Funcion pura, sin DB — mismo criterio que buildConstructorResults en races.service.ts.
 * Recibe filas planas ya leidas y las reduce en memoria, en vez de usar groupBy de Prisma.
 */
function indexPoints(
  raceResults: { driverId: number; points: number }[],
  constructorResults: { constructorId: number; totalPoints: number }[],
): PointsIndex {
  const byDriver = new Map<number, number>();
  for (const r of raceResults) {
    byDriver.set(r.driverId, (byDriver.get(r.driverId) ?? 0) + r.points);
  }

  const byConstructor = new Map<number, number>();
  for (const c of constructorResults) {
    byConstructor.set(c.constructorId, (byConstructor.get(c.constructorId) ?? 0) + c.totalPoints);
  }

  return { byDriver, byConstructor };
}

/**
 * Puntaje de un FantasyTeam: sus dos pilotos mas su constructor.
 *
 * Los slots vacios valen cero — un equipo con el draft a medias (o reseteado) suma lo que
 * tenga en vez de quedar afuera de la tabla. Lo mismo un piloto que no corrio esa carrera.
 */
function scoreTeam(
  team: { driver1Id: number | null; driver2Id: number | null; constructorId: number | null },
  points: PointsIndex,
): Omit<ComputedStanding, 'leagueMemberId'> {
  const driverPoints =
    (team.driver1Id ? (points.byDriver.get(team.driver1Id) ?? 0) : 0) +
    (team.driver2Id ? (points.byDriver.get(team.driver2Id) ?? 0) : 0);

  const constructorPoints = team.constructorId
    ? (points.byConstructor.get(team.constructorId) ?? 0)
    : 0;

  // Slice 10 (Predictions) es alcance voluntario y no esta construido. La columna existe en el
  // schema y se llena con 0 — cuando exista, este es el unico lugar a tocar.
  const predictionPoints = 0;

  return {
    driverPoints,
    constructorPoints,
    predictionPoints,
    totalPoints: driverPoints + constructorPoints + predictionPoints,
  };
}

/**
 * Ordena y asigna posiciones 1..N.
 *
 * Empate: gana el que lleva mas puntos de pilotos, y si sigue empatado, el leagueMemberId mas
 * bajo (el que se unio antes). No se comparten posiciones — el criterio del roadmap es que en
 * una liga de 3 las posiciones sean 1, 2 y 3. El desempate por id no es "justo", es
 * DETERMINISTICO, que es lo que importa para que recalculate dos veces de lo mismo.
 */
function rank(standings: ComputedStanding[]): (ComputedStanding & { position: number })[] {
  return [...standings]
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.driverPoints - a.driverPoints ||
        a.leagueMemberId - b.leagueMemberId,
    )
    .map((s, index) => ({ ...s, position: index + 1 }));
}

/**
 * Regenera los LeagueStanding de una carrera, para todas las ligas activas de su temporada.
 *
 * Los puntos son ACUMULADOS hasta esa carrera inclusive, no los de esa carrera sola: un
 * LeagueStanding es la foto del campeonato despues de esa fecha (ver docs/domain-entities.md
 * §LeagueStanding). Por eso se suman todas las carreras COMPLETED de la temporada con round
 * menor o igual.
 *
 * Es idempotente: upsertea por (leagueMemberId, raceId). "Snapshot inmutable" en el dominio
 * significa que no es una vista live, no que no se pueda regenerar — el endpoint se llama
 * /recalculate justamente para poder correrlo de nuevo si se corrigen resultados.
 */
export async function recalculate(raceId: number) {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  if (race.status !== 'COMPLETED') {
    throw new ConflictError(
      'Cannot compute standings for a race that is not completed',
      'RACE_NOT_COMPLETED',
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Las carreras que cuentan: esta y todas las anteriores de la temporada que ya se
    //    corrieron. Una carrera cancelada o pospuesta en el medio simplemente no suma.
    const countedRaces = await tx.race.findMany({
      where: { seasonId: race.seasonId, status: 'COMPLETED', round: { lte: race.round } },
      select: { id: true },
    });
    const countedRaceIds = countedRaces.map((r) => r.id);

    // 2. Todos los puntos de esas carreras, en dos queries planas.
    const points = indexPoints(
      await tx.raceResult.findMany({
        where: { raceId: { in: countedRaceIds } },
        select: { driverId: true, points: true },
      }),
      await tx.constructorResult.findMany({
        where: { raceId: { in: countedRaceIds } },
        select: constructorResultPointsSelect,
      }),
    );

    // 3. La carrera anterior que tenga standings, para el positionChange.
    const previousRace = await tx.race.findFirst({
      where: { seasonId: race.seasonId, status: 'COMPLETED', round: { lt: race.round } },
      orderBy: { round: 'desc' },
      select: { id: true },
    });
    const previousPositions = new Map<number, number>();
    if (previousRace) {
      const previous = await tx.leagueStanding.findMany({
        where: { raceId: previousRace.id },
        select: { leagueMemberId: true, position: true },
      });
      for (const p of previous) previousPositions.set(p.leagueMemberId, p.position);
    }

    // 4. Ligas activas de la temporada, con sus miembros ACTIVE y el FantasyTeam de cada uno.
    //    Solo ACTIVE: el que se fue o fue echado conserva sus standings viejos como historia,
    //    pero deja de generar nuevos. Mismo criterio que GET /leagues/:id/members.
    const leagues = await tx.league.findMany({
      where: { seasonId: race.seasonId, status: 'ACTIVE' },
      select: {
        id: true,
        members: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            fantasyTeam: { select: fantasyTeamSlotsSelect },
          },
        },
      },
    });

    let written = 0;
    for (const league of leagues) {
      const computed: ComputedStanding[] = league.members.map((member) => ({
        leagueMemberId: member.id,
        // Sin FantasyTeam (no deberia pasar desde Slice 4, pero el tipo lo permite) suma cero.
        ...scoreTeam(
          member.fantasyTeam ?? { driver1Id: null, driver2Id: null, constructorId: null },
          points,
        ),
      }));

      for (const row of rank(computed)) {
        const before = previousPositions.get(row.leagueMemberId);
        // Positivo = subio. Si no hay carrera anterior, o el miembro no estaba, es 0.
        const positionChange = before === undefined ? 0 : before - row.position;

        await tx.leagueStanding.upsert({
          where: {
            leagueMemberId_raceId: { leagueMemberId: row.leagueMemberId, raceId: race.id },
          },
          update: { ...row, raceId: race.id, positionChange },
          create: { ...row, raceId: race.id, positionChange },
        });
        written += 1;
      }
    }

    return { raceId: race.id, leagues: leagues.length, standings: written };
  });
}

/**
 * GET /leagues/:id/standings?raceId= — la tabla de una liga despues de una carrera.
 * Sin raceId devuelve la ultima carrera que tenga standings de esa liga.
 */
export async function findByLeague(leagueId: number, raceId?: number) {
  let targetRaceId = raceId;

  if (targetRaceId === undefined) {
    const latest = await prisma.leagueStanding.findFirst({
      where: { leagueMember: { leagueId } },
      orderBy: { race: { round: 'desc' } },
      select: { raceId: true },
    });
    // Liga sin ninguna carrera puntuada todavia: lista vacia, no 404.
    if (!latest) return { raceId: null, standings: [] };
    targetRaceId = latest.raceId;
  }

  const standings = await prisma.leagueStanding.findMany({
    where: { raceId: targetRaceId, leagueMember: { leagueId } },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      leagueMemberId: true,
      driverPoints: true,
      constructorPoints: true,
      predictionPoints: true,
      totalPoints: true,
      position: true,
      positionChange: true,
      leagueMember: { select: { user: { select: { id: true, name: true } } } },
    },
  });

  return {
    raceId: targetRaceId,
    standings: standings.map(({ leagueMember, ...row }) => ({ ...row, user: leagueMember.user })),
  };
}
