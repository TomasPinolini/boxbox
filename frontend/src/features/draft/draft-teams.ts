import type { DraftPick } from '../../models/draft';

export interface DraftTeam {
  leagueMemberId: number;
  /** En orden de pick: el primero que eligio va primero. */
  driverIds: number[];
  constructorId: number | null;
}

// Agrupa los picks de un draft en un equipo por jugador, separando el tuyo del resto.
//
// Funcion pura y en su propio archivo por los mismos dos motivos que draft-announcement.ts:
// `react-refresh/only-export-components` no deja exportar algo que no sea un componente desde
// un archivo de componente, y asi se testea sin montar una pantalla que depende del socket,
// de tres queries y del router.
//
// Devuelve { mine, others } y no una lista plana a proposito: la pantalla existe para
// contestar "que me toco a mi", asi que esa distincion es del dominio y no del render. Con
// una lista plana, "mi equipo primero" quedaria a criterio de quien dibuje y ningun test lo
// defenderia.
//
// NO resuelve nombres ni fotos: recibe ids y devuelve ids. Los lookups contra useDrivers /
// useConstructors / useMembers quedan en el componente, igual que en draft-announcement.ts.
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
