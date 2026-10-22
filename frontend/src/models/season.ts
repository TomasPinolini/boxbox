export interface Season {
  id: number;
  year: number;
  isActive: boolean;
  /** Cupo configurado de pilotos de la temporada. No es cuantos hay cargados: eso es counts.drivers. */
  driverCount: number;
  /** Ausente cuando el backend es anterior a los conteos. Ausente NO es cero. */
  counts?: SeasonCounts;
}

interface SeasonCounts {
  races: number;
  leagues: number;
  drivers: number;
}
