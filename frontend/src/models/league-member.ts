export type MemberStatus = 'ACTIVE' | 'LEFT' | 'KICKED';

export interface LeagueMember {
  id: number;
  userId: number;
  isOwner: boolean;
  status: MemberStatus;
  joinedAt: string;
  user: { name: string }; // Task 0 lo agrego al backend
}

export interface FantasyTeam {
  id: number;
  leagueMemberId: number;
  driver1Id: number | null;
  driver2Id: number | null;
  constructorId: number | null;
}
