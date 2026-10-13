// Espeja el model Circuit de backend/prisma/schema.prisma. `deletedAt` no viaja: el backend
// filtra los borrados en toda lectura, asi que el frontend nunca ve uno.
export interface Circuit {
  id: number;
  name: string;
  country: string;
  city: string;
  /** Opcional en el backend: hay circuitos del seed sin longitud cargada. */
  circuitLength: number | null;
  /** Clave de union con Jolpica/OpenF1. Unica: el backend rechaza duplicados. */
  externalId: string;
}
