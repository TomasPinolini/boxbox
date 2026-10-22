import type { DraftStatus, League, LeagueListItem } from '../models/league';
import type { LeagueMember } from '../models/league-member';
import type { LeagueStandings } from '../models/standing';
import type { DraftState } from '../models/draft';
import { apiClient } from './api-client';

export interface CreateLeagueInput {
  name: string;
  inviteCode: string;
  seasonId: number;
}

export const leaguesService = {
  list: () => apiClient.get<LeagueListItem[]>('/leagues'),
  create: (input: CreateLeagueInput) => apiClient.post<League>('/leagues', input),
  join: (inviteCode: string) => apiClient.post<LeagueMember>('/leagues/join', { inviteCode }),
  get: (id: number) => apiClient.get<League>(`/leagues/${id}`),
  members: (id: number) => apiClient.get<LeagueMember[]>(`/leagues/${id}/members`),
  // Sin ?raceId: el backend devuelve la ultima carrera con standings de esta liga.
  standings: (id: number) => apiClient.get<LeagueStandings>(`/leagues/${id}/standings`),
  // Los equipos de todos los miembros salen de los picks del draft: no hay GET /leagues/:id/teams
  // (/teams/me devuelve solo el mio). Si hace falta mas que los picks, ahi vale ese endpoint.
  draftState: (id: number) => apiClient.get<DraftState>(`/leagues/${id}/draft/state`),
  leave: (id: number) => apiClient.post<LeagueMember>(`/leagues/${id}/leave`),
  rename: (id: number, name: string) => apiClient.patch<League>(`/leagues/${id}`, { name }),
  archive: (id: number) => apiClient.patch<League>(`/leagues/${id}`, { status: 'ARCHIVED' }),
  kick: (id: number, userId: number) => apiClient.delete(`/leagues/${id}/members/${userId}`),
  startDraft: (id: number) =>
    apiClient.post<{ draftStatus: DraftStatus; totalPicks: number }>(`/leagues/${id}/draft/start`),
  activeSeasonId: () => apiClient.get<{ id: number }>('/seasons/active').then((s) => s.id),
};
