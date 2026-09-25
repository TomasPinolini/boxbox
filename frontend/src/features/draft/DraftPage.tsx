import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Field, PageShell, selectClass } from '../../components/ui';
import { useAuthStore } from '../../store/auth.store';
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
  const me = useAuthStore((s) => s.user);
  const { state, status, errorMessage, secondsRemaining, pickError, pickPending, submitPick } =
    useDraftState(id);
  const members = useMembers(id);
  const drivers = useDrivers();
  const constructors = useConstructors();
  const [selected, setSelected] = useState('');
  // Limpiar la seleccion cuando cambia de turno o de ronda (ajuste de estado durante el
  // render, no un efecto — sin esto quedaria marcado un piloto que ya no es valido). Ver
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const turnKey = `${state?.currentTurnLeagueMemberId}:${state?.round}`;
  const [lastTurnKey, setLastTurnKey] = useState(turnKey);
  if (turnKey !== lastTurnKey) {
    setLastTurnKey(turnKey);
    setSelected('');
  }

  const myLeagueMemberId = members.data?.find((m) => m.userId === me?.id)?.id ?? null;
  const isMyTurn =
    state?.draftStatus === 'LIVE' &&
    state.currentTurnLeagueMemberId !== null &&
    state.currentTurnLeagueMemberId === myLeagueMemberId;
  const category = state?.round !== null && (state?.round ?? 0) < 3 ? 'DRIVER' : 'CONSTRUCTOR';

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

  function confirmPick() {
    if (!selected) return;
    submitPick(
      category === 'DRIVER' ? { driverId: Number(selected) } : { constructorId: Number(selected) },
    );
  }

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
                {secondsRemaining !== null && (
                  <span className="ml-2 text-slate-400">({secondsRemaining}s)</span>
                )}
              </p>
            )}
            {state.draftStatus === 'COMPLETED' && (
              <p className="mt-3 text-sm text-slate-600">El draft ya terminó.</p>
            )}

            {isMyTurn && state.available && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="mb-2 text-sm font-semibold text-slate-900">¡Te toca a vos!</p>
                {pickError && (
                  <div className="mb-3">
                    <Alert code={pickError.code} message={pickError.message} />
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field label={category === 'DRIVER' ? 'Piloto' : 'Escudería'}>
                      <select
                        className={selectClass}
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        <option value="">Elegí uno…</option>
                        {category === 'DRIVER'
                          ? state.available.drivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.firstName} {d.lastName}
                              </option>
                            ))
                          : state.available.constructors.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                      </select>
                    </Field>
                  </div>
                  <Button disabled={!selected || pickPending} onClick={confirmPick}>
                    {pickPending ? 'Mandando…' : 'Confirmar pick'}
                  </Button>
                </div>
              </div>
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
