// Espejo de findByLeague en backend/src/modules/standings/standings.service.ts.
export interface Standing {
  id: number;
  leagueMemberId: number;
  driverPoints: number;
  constructorPoints: number;
  predictionPoints: number;
  totalPoints: number;
  position: number;
  positionChange: number; // >0 subio, <0 bajo, 0 igual o primera carrera
  user: { id: number; name: string };
}

export interface LeagueStandings {
  raceId: number | null; // null = la liga todavia no tiene standings
  standings: Standing[];
}
