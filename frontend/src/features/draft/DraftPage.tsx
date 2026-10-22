import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, HelpPopover, PageShell } from '../../components/ui';
import type { Driver } from '../../models/driver';
import type { DraftState } from '../../models/draft';
import { useAuthStore } from '../../store/auth.store';
import { useDrivers, useConstructors } from '../drivers/drivers.queries';
import { DRAFT_LABEL } from '../leagues/draft-label';
import { useMembers } from '../leagues/leagues.queries';
import { draftAnnouncement } from './draft-announcement';
import { DraftPicker } from './DraftPicker';
import { buildDraftTeams, type DraftTeam } from './draft-teams';
import { TeamLineup, TeamRow } from './TeamLineup';
import { useDraftState } from './useDraftState';

const CONNECTION_LABEL: Record<string, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  error: 'Sin conexión',
};

const PAGE_TITLE: Record<DraftState['draftStatus'], string> = {
  PENDING: 'Draft',
  LIVE: 'Draft en vivo',
  COMPLETED: 'Draft terminado',
};

export function DraftPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const {
    state,
    leagueArchived,
    status,
    errorMessage,
    secondsRemaining,
    pickError,
    pickPending,
    submitPick,
  } = useDraftState(id);
  const members = useMembers(id);
  const drivers = useDrivers();
  const constructors = useConstructors();
  const [selected, setSelected] = useState<number | null>(null);
  // Limpia la seleccion al cambiar de turno o ronda, durante el render y no en un efecto. Ver
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const turnKey = `${state?.currentTurnLeagueMemberId}:${state?.round}`;
  const [lastTurnKey, setLastTurnKey] = useState(turnKey);
  if (turnKey !== lastTurnKey) {
    setLastTurnKey(turnKey);
    setSelected(null);
  }

  const myLeagueMemberId = members.data?.find((m) => m.userId === me?.id)?.id ?? null;
  const isMyTurn =
    state?.draftStatus === 'LIVE' &&
    state.currentTurnLeagueMemberId !== null &&
    state.currentTurnLeagueMemberId === myLeagueMemberId;
  const category = state?.round !== null && (state?.round ?? 0) < 3 ? 'DRIVER' : 'CONSTRUCTOR';

  const memberName = (leagueMemberId: number) =>
    members.data?.find((m) => m.id === leagueMemberId)?.user.name ?? `miembro ${leagueMemberId}`;

  const teams = state ? buildDraftTeams(state.picks, myLeagueMemberId) : null;
  const driversOf = (team: DraftTeam) =>
    team.driverIds
      .map((driverId) => drivers.data?.find((d) => d.id === driverId))
      .filter((d): d is Driver => d !== undefined);
  const constructorOf = (team: DraftTeam) =>
    constructors.data?.find((c) => c.id === team.constructorId) ?? null;

  // `state.picks` acumula toda la liga y todas las rondas, no solo los picks propios.
  const takenDriverIds = new Set(
    state?.picks.filter((p) => p.driverId !== null).map((p) => p.driverId!) ?? [],
  );
  const takenConstructorIds = new Set(
    state?.picks.filter((p) => p.constructorId !== null).map((p) => p.constructorId!) ?? [],
  );

  const pickLabel = (pick: NonNullable<typeof state>['picks'][number]) => {
    if (pick.driverId !== null) {
      const driver = drivers.data?.find((d) => d.id === pick.driverId);
      return driver ? `${driver.firstName} ${driver.lastName}` : `piloto ${pick.driverId}`;
    }
    const constructor = constructors.data?.find((c) => c.id === pick.constructorId);
    return constructor?.name ?? `escudería ${pick.constructorId}`;
  };

  // Anuncio para lectores de pantalla: el contenido cambia por websocket, sin que nadie navegue.
  const lastPick = state?.picks.at(-1);
  const announcement = state
    ? draftAnnouncement({
        draftStatus: state.draftStatus,
        round: state.round,
        isMyTurn,
        currentTurnName:
          state.currentTurnLeagueMemberId !== null
            ? memberName(state.currentTurnLeagueMemberId)
            : null,
        lastPick: lastPick
          ? { memberName: memberName(lastPick.leagueMemberId), label: pickLabel(lastPick) }
          : null,
      })
    : '';

  function confirmPick() {
    if (selected === null) return;
    submitPick(category === 'DRIVER' ? { driverId: selected } : { constructorId: selected });
  }

  const selectedLabel =
    selected === null
      ? null
      : category === 'DRIVER'
        ? (() => {
            const d = drivers.data?.find((driver) => driver.id === selected);
            return d ? `${d.firstName} ${d.lastName}` : null;
          })()
        : (constructors.data?.find((c) => c.id === selected)?.name ?? null);

  return (
    <PageShell
      title={state ? PAGE_TITLE[state.draftStatus] : 'Draft'}
      actions={
        <Link
          to={`/leagues/${id}`}
          className="text-sm font-semibold text-slate-600 hover:underline dark:text-ink-muted"
        >
          ← Volver a la liga
        </Link>
      }
    >
      {/* "polite" y no "assertive": un cambio de turno no justifica interrumpir al lector. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      {/* Liga archivada con el draft abierto: reemplaza todo, lo de abajo ya no se puede usar. */}
      {leagueArchived ? (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Esta liga se archivó</h2>
          <p className="mb-4 text-slate-700 dark:text-ink-muted">
            Quien creó la liga la cerró mientras el draft estaba en curso. No se puede seguir.
          </p>
          <Button onClick={() => navigate('/leagues')}>Ir a mis ligas</Button>
        </Card>
      ) : (
        <>
          {status === 'error' && (
            <div className="mb-4">
              <Alert
                code="DRAFT_CONNECTION_ERROR"
                message={errorMessage ?? 'No se pudo conectar al draft'}
              />
            </div>
          )}

          {!state ? (
            <p className="text-slate-500 dark:text-ink-muted">{CONNECTION_LABEL[status]}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {state.draftStatus !== 'COMPLETED' && (
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={DRAFT_LABEL[state.draftStatus].tone}>
                      {DRAFT_LABEL[state.draftStatus].text}
                    </Badge>
                    <span className="text-xs text-slate-400 dark:text-ink-muted">{CONNECTION_LABEL[status]}</span>
                  </div>
                  {/* Fila flex y no un <p>: HelpPopover tiene un <div> en la raiz, y un <div>
                  dentro de un <p> es HTML invalido. */}
                  {state.draftStatus === 'LIVE' && state.round !== null && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm text-slate-600 dark:text-ink-muted">
                        Ronda {state.round} de 3 — le toca a{' '}
                        <span className="font-semibold text-slate-900 dark:text-ink-text">
                          {state.currentTurnLeagueMemberId !== null
                            ? memberName(state.currentTurnLeagueMemberId)
                            : '—'}
                        </span>
                      </p>
                      <HelpPopover title="¿Cómo funcionan las tres rondas?">
                        En la ronda 1 y en la 2 elegís un piloto; en la 3, una escudería. Así todos
                        terminan con 2 pilotos y 1 escudería. El orden va y vuelve: el último en
                        elegir en una ronda es el primero en la siguiente, así nadie queda siempre
                        último.
                      </HelpPopover>
                      {secondsRemaining !== null && (
                        <>
                          <span
                            className={`font-display text-base font-bold tabular-nums ${
                              secondsRemaining <= 10 ? 'text-red-600' : 'text-slate-700 dark:text-ink-muted'
                            }`}
                          >
                            {secondsRemaining}s
                          </span>
                          <HelpPopover title="¿Qué pasa si se me acaba el tiempo?">
                            El sistema elige por vos, al azar entre los que quedan disponibles, y
                            el turno sigue. No te quedás sin equipo, pero el piloto no lo elegiste
                            vos.
                          </HelpPopover>
                        </>
                      )}
                    </div>
                  )}

                  {isMyTurn && (
                    <div className="enter-scale mt-4 border-t border-slate-200 pt-4 dark:border-ink-border">
                      <p className="mb-3 text-xl font-bold text-red-600">¡Te toca a vos!</p>
                      {pickError && (
                        <div className="mb-3">
                          <Alert code={pickError.code} message={pickError.message} />
                        </div>
                      )}
                      {/* pb-20: lugar para la barra fija de confirmar, que si no tapa el ultimo item. */}
                      <div className="pb-20">
                        <DraftPicker
                          category={category}
                          drivers={drivers.data ?? []}
                          constructors={constructors.data ?? []}
                          takenIds={category === 'DRIVER' ? takenDriverIds : takenConstructorIds}
                          selectedId={selected}
                          onSelect={setSelected}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {state.draftStatus === 'COMPLETED' && teams && (
                <>
                  {teams.mine && (
                    <Card className="enter-scale">
                      <h2 className="mb-3 text-lg font-semibold">Tu equipo</h2>
                      <TeamLineup
                        drivers={driversOf(teams.mine)}
                        constructor={constructorOf(teams.mine)}
                        onOpenDriver={(driverId) => navigate(`/drivers/${driverId}`)}
                      />
                    </Card>
                  )}

                  {teams.others.length > 0 && (
                    <Card>
                      <h2 className="mb-1 text-lg font-semibold">
                        {teams.mine ? 'Los demás' : 'Equipos'}
                      </h2>
                      <ul className="divide-y divide-slate-200 dark:divide-ink-border">
                        {teams.others.map((team) => (
                          <TeamRow
                            key={team.leagueMemberId}
                            memberName={memberName(team.leagueMemberId)}
                            drivers={driversOf(team)}
                            constructor={constructorOf(team)}
                          />
                        ))}
                      </ul>
                    </Card>
                  )}

                  <div>
                    <Button onClick={() => navigate(`/leagues/${id}`)}>Volver a la liga</Button>
                  </div>
                </>
              )}

              {state.draftStatus !== 'COMPLETED' && (
                <Card>
                  <h2 className="mb-3 text-lg font-semibold">Picks</h2>
                  {state.picks.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-ink-muted">Todavía no se hizo ningún pick.</p>
                  ) : (
                    <ul className="divide-y divide-slate-200 dark:divide-ink-border">
                      {state.picks.map((pick) => (
                        <li
                          key={pick.id}
                          className="enter-bottom flex items-center justify-between py-2 text-sm"
                        >
                          <span className="text-slate-500 dark:text-ink-muted">Ronda {pick.round}</span>
                          <span className="font-medium">{memberName(pick.leagueMemberId)}</span>
                          <span>{pickLabel(pick)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
            </div>
          )}

          {isMyTurn && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-ink-border dark:bg-ink/95">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm">
                  {selectedLabel ? (
                    <>
                      <span className="text-slate-500 dark:text-ink-muted">Elegiste: </span>
                      <span className="font-semibold">{selectedLabel}</span>
                    </>
                  ) : (
                    <span className="text-slate-500 dark:text-ink-muted">
                      {category === 'DRIVER' ? 'Elegí un piloto' : 'Elegí una escudería'}
                    </span>
                  )}
                </p>
                <Button disabled={selected === null || pickPending} onClick={confirmPick}>
                  {pickPending ? 'Mandando…' : 'Confirmar pick'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
