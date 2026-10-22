export interface Circuit {
  id: number;
  name: string;
  country: string;
  city: string;
  /** Opcional en el backend: hay circuitos del seed sin longitud cargada. */
  circuitLength: number | null;
  /** Clave de union con Jolpica/OpenF1. */
  externalId: string;
}
