// Espejo de lo que devuelve backend/src/modules/drivers/drivers.service.ts.
// El campo se llama `constructor`, no `team`: docs/glossary.md prohibe "team" suelto porque
// se confunde con FantasyTeam. Ojo que `constructor` es tambien una propiedad heredada de
// Object.prototype — en tipos de objeto planos como estos no molesta (a diferencia de los
// `select` de Prisma, donde si rompio en los Slices 4 y 5).

export type RaceResultStatus = 'CLASSIFIED' | 'DNF' | 'DSQ' | 'DNS';

// Version reducida de Constructor: solo lo que hace falta para pintar el chip de equipo.
export interface ConstructorRef {
  id: number;
  name: string;
  color: string; // hex, ej "#3671C6" — es el color oficial del equipo
  logoUrl: string | null; // estatico servido desde /public/logos; null si no tenemos logo
}

export interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  number: number;
  code: string;
  headshotUrl: string | null;
  // null si el piloto no corre la temporada resuelta, o si su escuderia esta borrada.
  constructor: ConstructorRef | null;
}

export interface DriverStats {
  races: number;
  points: number;
  wins: number;
  podiums: number; // incluye las victorias, convencion de F1
  bestFinish: number | null; // null si nunca clasifico
  dnfs: number;
}

export interface DriverRaceResult {
  raceId: number;
  raceName: string;
  round: number;
  raceDate: string;
  position: number | null; // null = no clasifico
  points: number;
  gridPosition: number | null;
  fastestLap: boolean;
  status: RaceResultStatus;
}

export interface DriverDetail extends Driver {
  seasonId: number | null; // la temporada de la que salen stats y results
  stats: DriverStats;
  results: DriverRaceResult[]; // ordenados por round asc
}
