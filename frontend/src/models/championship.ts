import type { ConstructorRef, Driver } from './driver';

// Espejo de GET /drivers/standings y GET /constructors/standings (Slice 16).
// Es el campeonato real de F1, NO la tabla de una liga fantasy (LeagueStanding) — por eso el
// archivo no se llama standing.ts.

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driver: Pick<Driver, 'id' | 'firstName' | 'lastName' | 'code' | 'headshotUrl' | 'constructor'>;
}

export interface ConstructorStanding {
  position: number;
  points: number;
  constructor: ConstructorRef;
}
