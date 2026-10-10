import type { FantasyTeam } from './league-member';

export type DraftStatus = 'PENDING' | 'LIVE' | 'COMPLETED';
export type LeagueStatus = 'ACTIVE' | 'ARCHIVED' | 'CANCELLED';

// GET /leagues trae ademas el equipo del que pide, para que la tarjeta lo muestre sin una
// request por liga. GET /leagues/:id no lo trae: ahi los equipos de todos salen del draft.
export interface LeagueListItem extends League {
  myTeam: FantasyTeam | null;
}

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
