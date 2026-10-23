export interface Standing {
  id: number;
  leagueMemberId: number;
  driverPoints: number;
  constructorPoints: number;
  totalPoints: number;
  position: number;
  positionChange: number; // >0 subio, <0 bajo, 0 igual o primera carrera
  user: { id: number; name: string; avatarUrl: string | null };
}

export interface LeagueStandings {
  raceId: number | null; // null = la liga todavia no tiene standings
  standings: Standing[];
}
