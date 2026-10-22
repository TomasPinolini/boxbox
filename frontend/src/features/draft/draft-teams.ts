import type { DraftPick } from '../../models/draft';

export interface DraftTeam {
  leagueMemberId: number;
  /** En orden de pick: el primero que eligio va primero. */
  driverIds: number[];
  constructorId: number | null;
}

// { mine, others } y no una lista plana: "mi equipo primero" es del dominio y asi lo cubre un test.
// Recibe y devuelve ids; los lookups de nombres quedan en el componente.
export function buildDraftTeams(
  picks: DraftPick[],
  myLeagueMemberId: number | null,
): { mine: DraftTeam | null; others: DraftTeam[] } {
  const porJugador = new Map<number, DraftTeam>();

  for (const pick of picks) {
    let equipo = porJugador.get(pick.leagueMemberId);
    if (!equipo) {
      equipo = { leagueMemberId: pick.leagueMemberId, driverIds: [], constructorId: null };
      porJugador.set(pick.leagueMemberId, equipo);
    }
    if (pick.driverId !== null) equipo.driverIds.push(pick.driverId);
    else if (pick.constructorId !== null) equipo.constructorId = pick.constructorId;
  }

  const equipos = [...porJugador.values()];
  return {
    mine: equipos.find((e) => e.leagueMemberId === myLeagueMemberId) ?? null,
    others: equipos.filter((e) => e.leagueMemberId !== myLeagueMemberId),
  };
}
