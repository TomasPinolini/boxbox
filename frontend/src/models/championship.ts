import type { ConstructorRef, Driver } from './driver';

// El campeonato real de F1, NO la tabla de una liga fantasy (eso es standing.ts).

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
