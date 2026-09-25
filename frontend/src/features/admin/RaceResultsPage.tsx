import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, PageShell } from '../../components/ui';
import type { RaceResultStatus } from '../../models/driver';
import { useDrivers } from '../drivers/drivers.queries';
import {
  useActiveSeasonRaces,
  useJolpicaPreview,
  useProcessRace,
  useRecalculateStandings,
} from './admin.queries';
import { buildResultsPayload, entriesFromPreview, pointsFor, type Entry } from './results-payload';

const STATUSES: RaceResultStatus[] = ['CLASSIFIED', 'DNF', 'DSQ', 'DNS'];

const EMPTY: Entry = { position: '', status: 'CLASSIFIED' };

// Pantalla admin: cargar los resultados de una carrera y recalcular los standings de todas
// las ligas. useState y no react-hook-form: es una grilla de N filas iguales sin validacion
// por campo — toda la regla vive en buildResultsPayload, que es pura y tiene su test.
// "Importar de Jolpica" solo LLENA la grilla (vista previa, no escribe nada): el admin revisa,
// edita si hace falta y confirma con el mismo boton de la carga manual.
export function RaceResultsPage() {
  const races = useActiveSeasonRaces();
  const drivers = useDrivers();
  const process = useProcessRace();
  const preview = useJolpicaPreview();
  const recalc = useRecalculateStandings();
  const [notes, setNotes] = useState<string[]>([]);
  const [raceId, setRaceId] = useState<number | null>(null);
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const loadable = (races.data ?? []).filter(
    (r) => r.status === 'UPCOMING' || r.status === 'QUALIFYING_LOCKED',
  );
  const completed = (races.data ?? []).filter((r) => r.status === 'COMPLETED');
  // Solo pilotos con escuderia en la temporada: el backend rechaza al resto (DRIVER_NOT_IN_SEASON).
  const grid = (drivers.data ?? []).filter((d) => d.constructor !== null);
  const selectedRace = races.data?.find((r) => r.id === raceId) ?? null;
  const loadError = races.error ?? drivers.error;

  function update(driverId: number, patch: Partial<Entry>) {
    setEntries((prev) => ({ ...prev, [driverId]: { ...(prev[driverId] ?? EMPTY), ...patch } }));
  }

  function selectRace(id: number | null) {
    setRaceId(id);
    setEntries({});
    setErrors([]);
    setNotes([]);
    preview.reset();
    recalc.reset();
  }

  function importFromJolpica() {
    if (raceId === null) return;
    preview.mutate(raceId, {
      onSuccess: ({ results, skipped }) => {
        const { entries: imported, pointsMismatch } = entriesFromPreview(results);
        const nameOf = (id: number) => {
          const d = grid.find((g) => g.id === id);
          return d ? `${d.firstName} ${d.lastName}` : `piloto ${id}`;
        };
        // Un titular que Jolpica no trae no corrio esa fecha (lo reemplazo un suplente). Sin
        // esto su fila queda vacia = CLASSIFIED sin posicion, y la validacion frena la carga.
        const absent = grid.filter((d) => !(d.id in imported));
        for (const d of absent) imported[d.id] = { position: '', status: 'DNS' };
        setEntries(imported);
        setErrors([]);
        setNotes([
          ...absent.map((d) => `${nameOf(d.id)} no figura en Jolpica: queda DNS, revisalo`),
          ...skipped.map((s) => `Jolpica trae a "${s.ref}", que no se importa: ${s.reason}`),
          ...pointsMismatch.map(
            (m) => `${nameOf(m.driverId)}: Jolpica le da ${m.jolpica} pts y la tabla ${m.table}`,
          ),
        ]);
      },
    });
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
        onSuccess: () => selectRace(null),
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
        {preview.error && <Alert code={preview.error.code} message={preview.error.message} />}
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
            onChange={(e) => selectRace(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Elegí una carrera…</option>
            {loadable.length > 0 && (
              <optgroup label="Cargar resultados">
                {loadable.map((r) => (
                  <option key={r.id} value={r.id}>
                    Fecha {r.round} — {r.name}
                  </option>
                ))}
              </optgroup>
            )}
            {completed.length > 0 && (
              <optgroup label="Recalcular standings">
                {completed.map((r) => (
                  <option key={r.id} value={r.id}>
                    Fecha {r.round} — {r.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {raceId !== null && selectedRace?.status === 'COMPLETED' ? (
          <>
            {recalc.error && <Alert code={recalc.error.code} message={recalc.error.message} />}
            {recalc.isSuccess && (
              <p role="status" className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">
                Standings recalculados: {recalc.data.standings} en {recalc.data.leagues} ligas.
              </p>
            )}
            <div className="mt-4">
              <Button disabled={recalc.isPending} onClick={() => recalc.mutate(raceId)}>
                {recalc.isPending ? 'Recalculando…' : 'Recalcular'}
              </Button>
            </div>
          </>
        ) : raceId !== null ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" disabled={preview.isPending} onClick={importFromJolpica}>
                {preview.isPending ? 'Importando…' : 'Importar de Jolpica'}
              </Button>
              {preview.isSuccess && (
                <p role="status" className="text-sm text-slate-600">
                  Vista previa: {preview.data.results.length} resultados. Todavía no se guardó nada
                  — revisá y confirmá abajo.
                </p>
              )}
            </div>
            {notes.length > 0 && (
              <ul className="mb-3 list-disc rounded bg-amber-50 py-2 pl-8 pr-3 text-sm text-amber-900">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}

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
        ) : null}
      </Card>
    </PageShell>
  );
}
