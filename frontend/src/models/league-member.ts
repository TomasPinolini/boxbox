type MemberStatus = 'ACTIVE' | 'LEFT' | 'KICKED';

export interface LeagueMember {
  id: number;
  userId: number;
  isOwner: boolean;
  status: MemberStatus;
  joinedAt: string;
  user: { name: string; motto: string | null; avatarUrl: string | null }; // Task 0 agrego name; motto y avatarUrl 2026-10-15
}

export interface FantasyTeam {
  id: number;
  leagueMemberId: number;
  driver1Id: number | null;
  driver2Id: number | null;
  constructorId: number | null;
}
