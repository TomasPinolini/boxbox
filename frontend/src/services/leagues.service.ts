import type { DraftStatus, League } from '../models/league';
import type { LeagueMember } from '../models/league-member';
import { apiClient } from './api-client';

export interface CreateLeagueInput {
  name: string;
  inviteCode: string;
  seasonId: number;
}

// El "servicio" de ligas (rubrica): todo lo que habla con /leagues. Sin React, sin URLs en
// los componentes.
export const leaguesService = {
  list: () => apiClient.get<League[]>('/leagues'),
  create: (input: CreateLeagueInput) => apiClient.post<League>('/leagues', input),
  join: (inviteCode: string) => apiClient.post<LeagueMember>('/leagues/join', { inviteCode }),
  get: (id: number) => apiClient.get<League>(`/leagues/${id}`),
  members: (id: number) => apiClient.get<LeagueMember[]>(`/leagues/${id}/members`),
  leave: (id: number) => apiClient.post<LeagueMember>(`/leagues/${id}/leave`),
  kick: (id: number, userId: number) => apiClient.delete(`/leagues/${id}/members/${userId}`),
  startDraft: (id: number) =>
    apiClient.post<{ draftStatus: DraftStatus; totalPicks: number }>(`/leagues/${id}/draft/start`),
  // /seasons/active es publico; vive aca porque el unico que lo usa es "crear liga".
  activeSeasonId: () => apiClient.get<{ id: number }>('/seasons/active').then((s) => s.id),
};
