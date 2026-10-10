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

// El "servicio" de ligas (rubrica): todo lo que habla con /leagues. Sin React, sin URLs en
// los componentes.
export const leaguesService = {
  list: () => apiClient.get<LeagueListItem[]>('/leagues'),
  create: (input: CreateLeagueInput) => apiClient.post<League>('/leagues', input),
  join: (inviteCode: string) => apiClient.post<LeagueMember>('/leagues/join', { inviteCode }),
  get: (id: number) => apiClient.get<League>(`/leagues/${id}`),
  members: (id: number) => apiClient.get<LeagueMember[]>(`/leagues/${id}/members`),
  // Sin ?raceId: el backend devuelve la ultima carrera con standings de esta liga.
  standings: (id: number) => apiClient.get<LeagueStandings>(`/leagues/${id}/standings`),
  // Los equipos armados de TODOS los miembros. No hay endpoint propio: /teams/me devuelve
  // solo el mio, y los picks del draft ya son los equipos. Mismo middleware de membresia.
  // ponytail: reusa el estado del draft; si algun dia hace falta mas que los picks, ahi si
  // vale un GET /leagues/:id/teams.
  draftState: (id: number) => apiClient.get<DraftState>(`/leagues/${id}/draft/state`),
  leave: (id: number) => apiClient.post<LeagueMember>(`/leagues/${id}/leave`),
  archive: (id: number) => apiClient.patch<League>(`/leagues/${id}`, { status: 'ARCHIVED' }),
  kick: (id: number, userId: number) => apiClient.delete(`/leagues/${id}/members/${userId}`),
  startDraft: (id: number) =>
    apiClient.post<{ draftStatus: DraftStatus; totalPicks: number }>(`/leagues/${id}/draft/start`),
  // /seasons/active es publico; vive aca porque el unico que lo usa es "crear liga".
  activeSeasonId: () => apiClient.get<{ id: number }>('/seasons/active').then((s) => s.id),
};
