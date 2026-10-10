import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, PageShell } from '../../components/ui';
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

// El titulo sigue al estado en vez de estar escrito a mano: con "Draft en vivo" fijo, la
// pagina seguia anunciando un draft en curso despues de que terminara.
const PAGE_TITLE: Record<DraftState['draftStatus'], string> = {
  PENDING: 'Draft',
  LIVE: 'Draft en vivo',
  COMPLETED: 'Draft terminado',
};

export function DraftPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const { state, status, errorMessage, secondsRemaining, pickError, pickPending, submitPick } =
    useDraftState(id);
  const members = useMembers(id);
  const drivers = useDrivers();
  const constructors = useConstructors();
  const [selected, setSelected] = useState<number | null>(null);
  // Limpiar la seleccion cuando cambia de turno o de ronda (ajuste de estado durante el
  // render, no un efecto — sin esto quedaria marcado un piloto que ya no es valido). Ver
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

  // Los equipos armados. Se calculan siempre y se usan solo en COMPLETED: es agrupar un
  // arreglo de seis elementos, no justifica una rama.
  const teams = state ? buildDraftTeams(state.picks, myLeagueMemberId) : null;
  // buildDraftTeams devuelve ids a proposito; los lookups viven aca, donde estan las queries.
  const driversOf = (team: DraftTeam) =>
    team.driverIds
      .map((driverId) => drivers.data?.find((d) => d.id === driverId))
      .filter((d): d is Driver => d !== undefined);
  const constructorOf = (team: DraftTeam) =>
    constructors.data?.find((c) => c.id === team.constructorId) ?? null;

  const pickLabel = (pick: NonNullable<typeof state>['picks'][number]) => {
    if (pick.driverId !== null) {
      const driver = drivers.data?.find((d) => d.id === pick.driverId);
      return driver ? `${driver.firstName} ${driver.lastName}` : `piloto ${pick.driverId}`;
    }
    const constructor = constructors.data?.find((c) => c.id === pick.constructorId);
    return constructor?.name ?? `escudería ${pick.constructorId}`;
  };

  // Anuncio para lectores de pantalla. El draft es la unica pantalla donde el contenido
  // cambia SOLO porque llego un mensaje de websocket: nadie navego ni apreto nada. Sin esto,
  // un cambio de turno o el pick de otro jugador no existen para quien no ve la pantalla.
  // El porque de cada decision esta en draft-announcement.ts.
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

  return (
    <PageShell
      title={state ? PAGE_TITLE[state.draftStatus] : 'Draft'}
      actions={
        <Link
          to={`/leagues/${id}`}
          className="text-sm font-semibold text-slate-600 hover:underline"
        >
          ← Volver a la liga
        </Link>
      }
    >
      {/* aria-live="polite" y no "assertive": polite espera a que el lector termine lo que
          esta diciendo, assertive lo interrumpe. Un cambio de turno no justifica cortarle la
          palabra a alguien que esta leyendo la lista de picks.
          sr-only lo saca de la pantalla sin sacarlo del arbol de accesibilidad (display:none
          lo ocultaria tambien al lector, que es justo lo contrario de lo que queremos). */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      {status === 'error' && (
        <div className="mb-4">
          <Alert
            code="DRAFT_CONNECTION_ERROR"
            message={errorMessage ?? 'No se pudo conectar al draft'}
          />
        </div>
      )}

      {!state ? (
        <p className="text-slate-500">{CONNECTION_LABEL[status]}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Toda la tarjeta de estado es de antes y durante: badge, conexion, ronda y el
              selector de turno. Terminado el draft el badge repetiria el <h1> y el indicador
              de conexion dejo de querer decir algo, asi que no se dibuja. */}
          {state.draftStatus !== 'COMPLETED' && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone={DRAFT_LABEL[state.draftStatus].tone}>
                  {DRAFT_LABEL[state.draftStatus].text}
                </Badge>
                <span className="text-xs text-slate-400">{CONNECTION_LABEL[status]}</span>
              </div>
              {state.draftStatus === 'LIVE' && state.round !== null && (
                <p className="mt-3 text-sm text-slate-600">
                  Ronda {state.round} de 3 — le toca a{' '}
                  <span className="font-semibold text-slate-900">
                    {state.currentTurnLeagueMemberId !== null
                      ? memberName(state.currentTurnLeagueMemberId)
                      : '—'}
                  </span>
                  {/* El contador tiene que poder leerse de un vistazo (no un detalle gris
                      entre parentesis) y avisar cuando se acaba el tiempo, no solo cuando
                      llega a cero — por eso cambia de color antes, no en el ultimo instante. */}
                  {secondsRemaining !== null && (
                    <span
                      className={`ml-2 font-display text-base font-bold tabular-nums ${
                        secondsRemaining <= 10 ? 'text-red-600' : 'text-slate-700'
                      }`}
                    >
                      {secondsRemaining}s
                    </span>
                  )}
                </p>
              )}

              {isMyTurn && state.available && (
                <div className="enter-scale mt-4 border-t border-slate-200 pt-4">
                  {/* "Te toca a vos" es la unica razon por la que esta tarjeta tiene accion
                      ahora mismo — tiene que pesar mas que cualquier otro titulo de la
                      pantalla (incluido "Picks", mas abajo), no 14px perdido entre textos
                      secundarios. */}
                  <p className="mb-3 text-xl font-bold text-red-600">¡Te toca a vos!</p>
                  {pickError && (
                    <div className="mb-3">
                      <Alert code={pickError.code} message={pickError.message} />
                    </div>
                  )}
                  <DraftPicker
                    category={category}
                    drivers={state.available.drivers}
                    constructors={state.available.constructors}
                    selectedId={selected}
                    onSelect={setSelected}
                  />
                  <Button
                    className="mt-3 w-full sm:w-auto"
                    disabled={selected === null || pickPending}
                    onClick={confirmPick}
                  >
                    {pickPending ? 'Mandando…' : 'Confirmar pick'}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Terminado el draft, los equipos armados REEMPLAZAN la lista cruda de picks: son
              el mismo dato, agrupado por quien lo eligio en vez de por cuando se eligio. La
              lista plana sirve mientras el draft corre, no despues. */}
          {state.draftStatus === 'COMPLETED' && teams && (
            <>
              {teams.mine && (
                <Card className="enter-scale">
                  <h2 className="mb-3 text-lg font-semibold">Tu equipo</h2>
                  <TeamLineup
                    drivers={driversOf(teams.mine)}
                    constructor={constructorOf(teams.mine)}
                  />
                </Card>
              )}

              {teams.others.length > 0 && (
                <Card>
                  <h2 className="mb-1 text-lg font-semibold">
                    {teams.mine ? 'Los demás' : 'Equipos'}
                  </h2>
                  <ul className="divide-y divide-slate-200">
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
                <p className="text-sm text-slate-500">Todavía no se hizo ningún pick.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {state.picks.map((pick) => (
                    <li
                      key={pick.id}
                      className="enter-bottom flex items-center justify-between py-2 text-sm"
                    >
                      <span className="text-slate-500">Ronda {pick.round}</span>
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
    </PageShell>
  );
}
