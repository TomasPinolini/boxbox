import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors';

// `as Prisma.XSelect` y no una anotacion ni `as const`: la relacion `constructor` choca con
// Object.prototype.constructor y tsc infiere `Function`. Solo la assertion lo evita.
const constructorResultPointsSelect = {
  constructorId: true,
  totalPoints: true,
} as Prisma.ConstructorResultSelect;

const fantasyTeamSlotsSelect = {
  driver1Id: true,
  driver2Id: true,
  constructorId: true,
} as Prisma.FantasyTeamSelect;

type ComputedStanding = {
  leagueMemberId: number;
  driverPoints: number;
  constructorPoints: number;
  totalPoints: number;
};

type PointsIndex = {
  byDriver: Map<number, number>;
  byConstructor: Map<number, number>;
};

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

// Los slots vacios valen cero: un equipo con el draft a medias suma lo que tenga en vez de
// quedar afuera de la tabla.
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


  return {
    driverPoints,
    constructorPoints,
    totalPoints: driverPoints + constructorPoints,
  };
}

// No se comparten posiciones. El desempate final por leagueMemberId no es justo sino
// deterministico: recalcular dos veces tiene que dar lo mismo.
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

// Los puntos son acumulados hasta esta carrera inclusive: un LeagueStanding es la foto del
// campeonato despues de esa fecha. Idempotente (upsert), para re-correrlo si se corrigen
// resultados.
export async function recalculate(raceId: number) {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  if (race.status !== 'COMPLETED') {
    throw new ConflictError(
      'Cannot compute standings for a race that is not completed',
      'RACE_NOT_COMPLETED',
    );
  }

  return prisma.$transaction((tx) => recalculateInTx(tx, race));
}

// Separado para que loadResults lo corra dentro de su propia transaccion: cargar la fecha y
// actualizar las ligas pasan juntos o no pasa ninguno.
export async function recalculateInTx(
  tx: Prisma.TransactionClient,
  race: { id: number; seasonId: number; round: number },
) {
  const countedRaces = await tx.race.findMany({
    where: { seasonId: race.seasonId, status: 'COMPLETED', round: { lte: race.round } },
    select: { id: true },
  });
  const countedRaceIds = countedRaces.map((r) => r.id);

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

  // Solo miembros ACTIVE: el que se fue conserva sus standings viejos pero no genera nuevos.
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
      ...scoreTeam(
        member.fantasyTeam ?? { driver1Id: null, driver2Id: null, constructorId: null },
        points,
      ),
    }));

    for (const row of rank(computed)) {
      const before = previousPositions.get(row.leagueMemberId);
      // Positivo = subio.
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
}

// Sin raceId devuelve la ultima carrera que tenga standings de esa liga.
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
      totalPoints: true,
      position: true,
      positionChange: true,
      leagueMember: { select: { user: { select: { id: true, name: true, avatarUrl: true } } } },
    },
  });

  return {
    raceId: targetRaceId,
    standings: standings.map(({ leagueMember, ...row }) => ({ ...row, user: leagueMember.user })),
  };
}
