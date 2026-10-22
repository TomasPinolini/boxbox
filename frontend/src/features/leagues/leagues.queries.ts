import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { League, LeagueListItem } from '../../models/league';
import type { LeagueMember } from '../../models/league-member';
import type { LeagueStandings } from '../../models/standing';
import type { DraftState } from '../../models/draft';
import { ApiError } from '../../services/api-error';
import { leaguesService, type CreateLeagueInput } from '../../services/leagues.service';

const keys = {
  all: ['leagues'] as const,
  one: (id: number) => ['leagues', id] as const,
  members: (id: number) => ['leagues', id, 'members'] as const,
  standings: (id: number) => ['leagues', id, 'standings'] as const,
  draftState: (id: number) => ['leagues', id, 'draft-state'] as const,
};

export function useLeagues() {
  return useQuery<LeagueListItem[], ApiError>({ queryKey: keys.all, queryFn: leaguesService.list });
}

export function useLeague(id: number) {
  return useQuery<League, ApiError>({
    queryKey: keys.one(id),
    queryFn: () => leaguesService.get(id),
    // Esta pantalla no escucha el socket del draft, asi que sondea mientras esta PENDING para
    // enterarse de que arranco. Limite: es polling; el reemplazo es un evento del gateway.
    refetchInterval: (query) => (query.state.data?.draftStatus === 'PENDING' ? 5000 : false),
    // Sin esto el sondeo se frena con la pestaña en segundo plano (y providers.tsx apaga
    // refetchOnWindowFocus): con turnos de 60s, el que la tenia atras perderia su turno.
    refetchIntervalInBackground: true,
  });
}

export function useMembers(id: number) {
  return useQuery<LeagueMember[], ApiError>({
    queryKey: keys.members(id),
    queryFn: () => leaguesService.members(id),
  });
}

export function useLeagueTeams(id: number, enabled: boolean) {
  return useQuery<DraftState, ApiError>({
    queryKey: keys.draftState(id),
    queryFn: () => leaguesService.draftState(id),
    enabled,
  });
}

export function useStandings(id: number) {
  return useQuery<LeagueStandings, ApiError>({
    queryKey: keys.standings(id),
    queryFn: () => leaguesService.standings(id),
  });
}

export function useCreateLeague() {
  const qc = useQueryClient();
  return useMutation<League, ApiError, Omit<CreateLeagueInput, 'seasonId'>>({
    mutationFn: async (input) => {
      const seasonId = await leaguesService.activeSeasonId();
      return leaguesService.create({ ...input, seasonId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useJoinLeague() {
  const qc = useQueryClient();
  return useMutation<LeagueMember, ApiError, string>({
    mutationFn: (inviteCode) => leaguesService.join(inviteCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

function useLeagueAction<TVars = void>(id: number, fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.one(id) });
      void qc.invalidateQueries({ queryKey: keys.members(id) });
      void qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export const useRenameLeague = (id: number) =>
  useLeagueAction<string>(id, (name) => leaguesService.rename(id, name));

// No hay DELETE de ligas: archivar es un PATCH de status.
export const useArchiveLeague = (id: number) =>
  useLeagueAction(id, () => leaguesService.archive(id));

export const useStartDraft = (id: number) =>
  useLeagueAction(id, () => leaguesService.startDraft(id));
export const useLeave = (id: number) => useLeagueAction(id, () => leaguesService.leave(id));
export const useKick = (id: number) =>
  useLeagueAction<number>(id, (userId) => leaguesService.kick(id, userId));
