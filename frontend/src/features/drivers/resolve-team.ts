import type { ConstructorRef, Driver } from '../../models/driver';

export interface ResolvedTeam {
  /** En el orden de los ids; un id que el catalogo no tiene (borrado) se omite. */
  drivers: Driver[];
  constructor: ConstructorRef | null;
}

// El unico lugar que cruza los ids de un equipo (FantasyTeam o picks del draft) con el
// catalogo de pilotos y escuderias. El catalogo viene de useDrivers/useConstructors, que
// React Query comparte entre pantallas: el cruce es local, no cuesta otro pedido.
export function resolveTeam(
  driverIds: (number | null | undefined)[],
  constructorId: number | null | undefined,
  drivers: Driver[] = [],
  constructors: ConstructorRef[] = [],
): ResolvedTeam {
  return {
    drivers: driverIds
      .map((id) => drivers.find((d) => d.id === id))
      .filter((d): d is Driver => d !== undefined),
    constructor: constructors.find((c) => c.id === constructorId) ?? null,
  };
}
