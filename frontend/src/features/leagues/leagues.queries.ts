import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { League } from '../../models/league';
import type { LeagueMember } from '../../models/league-member';
import type { LeagueStandings } from '../../models/standing';
import { ApiError } from '../../services/api-error';
import { leaguesService, type CreateLeagueInput } from '../../services/leagues.service';

// Un hook por lectura, un hook por escritura. Las escrituras invalidan lo que cambian, y
// react-query vuelve a pedirlo — sin useEffect/useState a mano para datos del server.
const keys = {
  all: ['leagues'] as const,
  one: (id: number) => ['leagues', id] as const,
  members: (id: number) => ['leagues', id, 'members'] as const,
  standings: (id: number) => ['leagues', id, 'standings'] as const,
};

export function useLeagues() {
  return useQuery<League[], ApiError>({ queryKey: keys.all, queryFn: leaguesService.list });
}

export function useLeague(id: number) {
  return useQuery<League, ApiError>({
    queryKey: keys.one(id),
    queryFn: () => leaguesService.get(id),
    // Mientras el draft esta PENDING hay que enterarse de que alguien lo arranco, y la
    // pantalla de la liga no esta conectada al socket: ese namespace se abre recien al entrar
    // a /draft. Sondear cada 5s es la forma mas barata de cubrirlo, y se apaga sola en cuanto
    // el estado deja de ser PENDING — una liga con el draft terminado no pide nada.
    // ponytail: polling; si alguna vez molesta, el reemplazo es que el gateway emita el
    // cambio de estado a una sala por liga y la pantalla escuche ahi.
    refetchInterval: (query) => (query.state.data?.draftStatus === 'PENDING' ? 5000 : false),
  });
}

export function useMembers(id: number) {
  return useQuery<LeagueMember[], ApiError>({
    queryKey: keys.members(id),
    queryFn: () => leaguesService.members(id),
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

export const useStartDraft = (id: number) =>
  useLeagueAction(id, () => leaguesService.startDraft(id));
export const useLeave = (id: number) => useLeagueAction(id, () => leaguesService.leave(id));
export const useKick = (id: number) =>
  useLeagueAction<number>(id, (userId) => leaguesService.kick(id, userId));
