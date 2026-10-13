import type { Season } from '../../models/season';

// Una temporada con carreras, ligas o pilotos asignados no se puede borrar: el backend lo
// rechaza con SEASON_HAS_DEPENDENCIES. Mostrar el motivo ANTES de que el usuario apriete es
// mas barato que explicarle despues por que falló.
//
// Devuelve el motivo listo para mostrar, o null cuando la temporada se puede borrar.
export function deletionBlockedBy(season: Season): string | null {
  const parts = [
    cuantos(season.counts.races, 'carrera', 'carreras'),
    cuantos(season.counts.leagues, 'liga', 'ligas'),
    cuantos(season.counts.drivers, 'piloto', 'pilotos'),
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return null;
  return `No se puede borrar: tiene ${enumerar(parts)}.`;
}

// El cupo de pilotos define cuantos miembros entran en una liga: maxMembersForSeason es
// floor(driverCount / 2), porque cada equipo se lleva dos pilotos. Con menos de 4 pilotos no
// entran ni dos personas, y una liga de un solo miembro no es una liga.
export function cupoInsuficiente(driverCount: number): boolean {
  return Math.floor(driverCount / 2) < 2;
}

function cuantos(n: number, singular: string, plural: string): string | null {
  if (n === 0) return null;
  return `${n} ${n === 1 ? singular : plural}`;
}

function enumerar(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}
