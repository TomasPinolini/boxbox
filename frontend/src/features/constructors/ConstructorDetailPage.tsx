import { Link, useParams } from 'react-router-dom';
import { Alert, Card, PageShell } from '../../components/ui';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { useConstructor } from './constructors.queries';

const TH = 'py-2 font-medium';
const TD = 'py-2';

export function ConstructorDetailPage() {
  const id = Number(useParams().id);
  const constructor = useConstructor(id);

  if (constructor.error) {
    return (
      <PageShell title="Escudería">
        <Alert code={constructor.error.code} message={constructor.error.message} />
      </PageShell>
    );
  }

  if (!constructor.data) {
    return (
      <PageShell title="Escudería">
        <p className="text-slate-500 dark:text-ink-muted">Cargando…</p>
      </PageShell>
    );
  }

  const c = constructor.data;
  // Sin temporada se dice con una frase, no con tablas vacias: una tabla en cero parece un dato.
  const sinTemporada = c.seasonId === null;

  return (
    <PageShell title={c.name}>
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ConstructorLogo constructor={c} />
              {/* El nombre no se repite: ya es el <h1>, y dos encabezados iguales son ruido. */}
              <span
                aria-hidden
                className="inline-block h-8 w-1.5 rounded-full"
                style={{ backgroundColor: c.color }}
              />
            </div>
            {!sinTemporada && (
              <dl className="flex gap-6">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-ink-muted">Puntos</dt>
                  <dd className="font-display text-2xl tabular-nums font-semibold">
                    {c.stats.points}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-ink-muted">Carreras</dt>
                  <dd className="font-display text-2xl tabular-nums">{c.stats.races}</dd>
                </div>
              </dl>
            )}
          </div>
        </Card>

        {sinTemporada ? (
          <Card>
            <p className="text-slate-500 dark:text-ink-muted">
              La temporada todavía no tiene carreras procesadas, así que no hay pilotos ni
              resultados para mostrar.
            </p>
          </Card>
        ) : (
          <>
            <Card>
              <h2 className="mb-3 text-lg font-semibold">Pilotos de la temporada</h2>
              {c.drivers.length === 0 ? (
                <p className="text-slate-500 dark:text-ink-muted">Todavía no hay pilotos asignados.</p>
              ) : (
                <ul className="flex flex-wrap gap-4">
                  {c.drivers.map((driver) => (
                    <li key={driver.id}>
                      <Link
                        to={`/drivers/${driver.id}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        {/* `driver` pelado: una prop `constructor` colisiona con Object.prototype
                            y tsc espera un Function. Lo caza `npm run build`, no `tsc --noEmit`. */}
                        <DriverAvatar driver={driver} size={32} />
                        <span>
                          <span className="font-display tabular-nums text-slate-500 dark:text-ink-muted">
                            #{driver.number}
                          </span>{' '}
                          {driver.lastName}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-lg font-semibold">Resultados</h2>
              {c.results.length === 0 ? (
                <p className="text-slate-500 dark:text-ink-muted">Todavía no hay carreras procesadas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 dark:border-ink-border dark:text-ink-muted">
                        <th className={TH}>#</th>
                        <th className={TH}>Carrera</th>
                        {c.drivers.map((driver) => (
                          <th key={driver.id} className="py-2 text-right font-medium">
                            {driver.lastName}
                          </th>
                        ))}
                        <th className="py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.results.map((r) => (
                        <tr key={r.raceId} className="border-b border-slate-100 last:border-0 dark:border-ink-border">
                          <td className={`${TD} font-display tabular-nums`}>{r.round}</td>
                          <td className={TD}>{r.raceName}</td>
                          {c.drivers.map((driver) => (
                            <td
                              key={driver.id}
                              className="py-2 text-right font-display tabular-nums"
                            >
                              {/* Sin desglose (backend viejo) "—" = no se sabe; con desglose, 0 es 0. */}
                              {r.pointsByDriverId ? (r.pointsByDriverId[driver.id] ?? 0) : '—'}
                            </td>
                          ))}
                          <td className="py-2 text-right font-display tabular-nums font-semibold">
                            {r.totalPoints}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
