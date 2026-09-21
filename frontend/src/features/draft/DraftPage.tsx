import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Card, PageShell } from '../../components/ui';
import { useDrivers, useConstructors } from '../drivers/drivers.queries';
import { DRAFT_LABEL } from '../leagues/draft-label';
import { useMembers } from '../leagues/leagues.queries';
import { useDraftState } from './useDraftState';

const CONNECTION_LABEL: Record<string, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  error: 'Sin conexión',
};

export function DraftPage() {
  const id = Number(useParams().id);
  const { state, status, errorMessage } = useDraftState(id);
  const members = useMembers(id);
  const drivers = useDrivers();
  const constructors = useConstructors();

  const memberName = (leagueMemberId: number) =>
    members.data?.find((m) => m.id === leagueMemberId)?.user.name ?? `miembro ${leagueMemberId}`;

  const pickLabel = (pick: NonNullable<typeof state>['picks'][number]) => {
    if (pick.driverId !== null) {
      const driver = drivers.data?.find((d) => d.id === pick.driverId);
      return driver ? `${driver.firstName} ${driver.lastName}` : `piloto ${pick.driverId}`;
    }
    const constructor = constructors.data?.find((c) => c.id === pick.constructorId);
    return constructor?.name ?? `escudería ${pick.constructorId}`;
  };

  return (
    <PageShell
      title="Draft en vivo"
      actions={
        <Link to={`/leagues/${id}`} className="text-sm font-semibold text-slate-600 hover:underline">
          ← Volver a la liga
        </Link>
      }
    >
      {status === 'error' && (
        <div className="mb-4">
          <Alert code="DRAFT_CONNECTION_ERROR" message={errorMessage ?? 'No se pudo conectar al draft'} />
        </div>
      )}

      {!state ? (
        <p className="text-slate-500">{CONNECTION_LABEL[status]}</p>
      ) : (
        <div className="flex flex-col gap-4">
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
              </p>
            )}
            {state.draftStatus === 'COMPLETED' && (
              <p className="mt-3 text-sm text-slate-600">El draft ya terminó.</p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Picks</h2>
            {state.picks.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no se hizo ningún pick.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {state.picks.map((pick) => (
                  <li key={pick.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-500">Ronda {pick.round}</span>
                    <span className="font-medium">{memberName(pick.leagueMemberId)}</span>
                    <span>{pickLabel(pick)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
