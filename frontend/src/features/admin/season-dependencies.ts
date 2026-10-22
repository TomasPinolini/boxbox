import type { Season } from '../../models/season';

// Anticipa el SEASON_HAS_DEPENDENCIES del backend. Devuelve el motivo, o null si se puede borrar.
export function deletionBlockedBy(season: Season): string | null {
  if (!season.counts) return null;

  const parts = [
    cuantos(season.counts.races, 'carrera', 'carreras'),
    cuantos(season.counts.leagues, 'liga', 'ligas'),
    cuantos(season.counts.drivers, 'piloto', 'pilotos'),
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return null;
  return `No se puede borrar: tiene ${enumerar(parts)}.`;
}

// maxMembersForSeason es floor(driverCount / 2): con menos de 4 pilotos no entran ni dos personas.
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
