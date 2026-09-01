export type DraftStatus = 'PENDING' | 'LIVE' | 'COMPLETED';
export type LeagueStatus = 'ACTIVE' | 'ARCHIVED' | 'CANCELLED';

export interface League {
  id: number;
  name: string;
  inviteCode: string;
  maxMembers: number;
  seasonId: number;
  createdById: number;
  draftStatus: DraftStatus;
  status: LeagueStatus;
  createdAt: string;
  updatedAt: string;
}
