export type MemberStatus = 'ACTIVE' | 'LEFT' | 'KICKED';

export interface LeagueMember {
  id: number;
  userId: number;
  isOwner: boolean;
  status: MemberStatus;
  joinedAt: string;
  user: { name: string; motto: string | null }; // Task 0 agrego name; motto 2026-10-15
}

export interface FantasyTeam {
  id: number;
  leagueMemberId: number;
  driver1Id: number | null;
  driver2Id: number | null;
  constructorId: number | null;
}
