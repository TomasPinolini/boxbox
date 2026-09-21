import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, PageShell } from '../../components/ui';
import type { RaceResultStatus } from '../../models/driver';
import { useDrivers } from '../drivers/drivers.queries';
import { useActiveSeasonRaces, useProcessRace } from './admin.queries';
import { buildResultsPayload, pointsFor } from './results-payload';

const STATUSES: RaceResultStatus[] = ['CLASSIFIED', 'DNF', 'DSQ', 'DNS'];

type Entry = { position: string; status: RaceResultStatus };
const EMPTY: Entry = { position: '', status: 'CLASSIFIED' };

// Pantalla admin: cargar los resultados de una carrera y recalcular los standings de todas
// las ligas. useState y no react-hook-form: es una grilla de N filas iguales sin validacion
// por campo — toda la regla vive en buildResultsPayload, que es pura y tiene su test.
export function RaceResultsPage() {
  const races = useActiveSeasonRaces();
  const drivers = useDrivers();
  const process = useProcessRace();
  const [raceId, setRaceId] = useState<number | null>(null);
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const loadable = (races.data ?? []).filter(
    (r) => r.status === 'UPCOMING' || r.status === 'QUALIFYING_LOCKED',
  );
  // Solo pilotos con escuderia en la temporada: el backend rechaza al resto (DRIVER_NOT_IN_SEASON).
  const grid = (drivers.data ?? []).filter((d) => d.constructor !== null);
  const loadError = races.error ?? drivers.error;

  function update(driverId: number, patch: Partial<Entry>) {
    setEntries((prev) => ({ ...prev, [driverId]: { ...(prev[driverId] ?? EMPTY), ...patch } }));
  }

  function submit() {
    if (raceId === null) return;
    const out = buildResultsPayload(
      grid.map((d) => ({
        driverId: d.id,
        label: `${d.firstName} ${d.lastName}`,
        ...(entries[d.id] ?? EMPTY),
      })),
    );
    if (!out.ok) return setErrors(out.errors);
    setErrors([]);
    process.mutate(
      { raceId, results: out.results },
      {
        onSuccess: () => {
          setRaceId(null);
          setEntries({});
        },
      },
    );
  }

  return (
    <PageShell
      title="Cargar resultados"
      actions={
        <Link to="/leagues" className="text-sm font-semibold text-slate-600 hover:underline">
          ← Mis ligas
        </Link>
      }
    >
      <Card>
        {loadError && <Alert code={loadError.code} message={loadError.message} />}
        {process.error && <Alert code={process.error.code} message={process.error.message} />}
        {process.isSuccess && (
          <p role="status" className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">
            Resultados cargados. Se recalcularon {process.data.standings} standings en{' '}
            {process.data.leagues} ligas.
          </p>
        )}

        <label className="mb-4 flex flex-col gap-1 text-sm font-medium">
          Carrera
          <select
            className="rounded border border-slate-300 px-2 py-2"
            value={raceId ?? ''}
            onChange={(e) => setRaceId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Elegí una carrera…</option>
            {loadable.map((r) => (
              <option key={r.id} value={r.id}>
                Fecha {r.round} — {r.name}
              </option>
            ))}
          </select>
        </label>

        {raceId !== null && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="hidden border-b border-slate-200 text-slate-500 sm:table-header-group">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Piloto</th>
                    <th className="py-2 pr-3 font-medium">Posición</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 font-medium">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {grid.map((d) => {
                    const e = entries[d.id] ?? EMPTY;
                    const name = `${d.firstName} ${d.lastName}`;
                    return (
                      <tr key={d.id} className="block border-b border-slate-100 py-3 sm:table-row">
                        <td className="py-1 pr-3 font-medium sm:py-2">{name}</td>
                        <td className="py-1 pr-3 sm:py-2">
                          <input
                            type="number"
                            min={1}
                            aria-label={`Posición de ${name}`}
                            className="w-20 rounded border border-slate-300 px-2 py-1"
                            value={e.position}
                            onChange={(ev) => update(d.id, { position: ev.target.value })}
                          />
                        </td>
                        <td className="py-1 pr-3 sm:py-2">
                          <select
                            aria-label={`Estado de ${name}`}
                            className="rounded border border-slate-300 px-2 py-1"
                            value={e.status}
                            onChange={(ev) =>
                              update(d.id, { status: ev.target.value as RaceResultStatus })
                            }
                          >
                            {STATUSES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 font-mono sm:py-2">
                          {pointsFor(e.position === '' ? undefined : Number(e.position), e.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {errors.length > 0 && (
              <ul role="alert" className="mt-3 list-disc pl-5 text-sm text-red-700">
                {errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              <Button disabled={process.isPending} onClick={submit}>
                {process.isPending ? 'Procesando…' : 'Cargar y recalcular standings'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </PageShell>
  );
}
