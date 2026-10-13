import type { Driver } from './driver';

// Lo que devuelve GET /constructors/:id. `drivers` son los de la temporada resuelta, no todos
// los que alguna vez corrieron para la escuderia.
export interface ConstructorDetail {
  id: number;
  name: string;
  color: string;
  logoUrl: string | null;
  /** null cuando no hay temporada activa: el detalle existe igual, vacio. */
  seasonId: number | null;
  drivers: Pick<Driver, 'id' | 'firstName' | 'lastName' | 'number' | 'code' | 'headshotUrl'>[];
  stats: { races: number; points: number };
  results: ConstructorRaceResult[];
}

export interface ConstructorRaceResult {
  raceId: number;
  raceName: string;
  round: number;
  raceDate: string | null;
  /**
   * NO son pilotos: driver1Points es "el mayor de los dos" y se reordena carrera a carrera.
   * Ver BOX-65. Para mostrar quien hizo cada punto está pointsByDriverId.
   */
  driver1Points: number;
  driver2Points: number;
  totalPoints: number;
  /**
   * Puntos por piloto en esa carrera, por id. Sale de RaceResult, que sí ata punto a persona.
   * Ausente cuando el backend es anterior a este desglose — ausente NO es cero.
   */
  pointsByDriverId?: Record<number, number>;
}
