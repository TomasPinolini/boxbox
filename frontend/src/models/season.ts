// Espeja el model Season de backend/prisma/schema.prisma. `createdAt` existe en la base pero
// ninguna pantalla lo muestra, asi que no viaja a este tipo: lo que no se usa no se declara.
export interface Season {
  id: number;
  year: number;
  isActive: boolean;
  /** Cupo configurado de pilotos de la temporada. No es cuantos hay cargados: eso es counts.drivers. */
  driverCount: number;
  /** Ausente cuando el backend es anterior a los conteos. Ausente NO es cero. */
  counts?: SeasonCounts;
}

// Lo que cuelga de la temporada. El backend los devuelve en el listado porque son los tres
// numeros que dicen si una temporada esta lista para usarse, y por que no se deja borrar.
export interface SeasonCounts {
  races: number;
  leagues: number;
  drivers: number;
}
