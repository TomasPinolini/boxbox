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
        <p className="text-slate-500">Cargando…</p>
      </PageShell>
    );
  }

  const c = constructor.data;
  // Sin temporada resuelta no hay pilotos ni resultados que mostrar. Se dice con una frase, no
  // con tablas vacias: una tabla en cero parece un dato y es la ausencia de uno.
  const sinTemporada = c.seasonId === null;

  return (
    <PageShell title={c.name}>
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ConstructorLogo constructor={c} />
              {/* La franja de color es dato, no adorno: identifica la escuderia igual que en
                  la tarjeta de piloto. El nombre NO se repite aca: ya es el titulo de la
                  pagina, y dos encabezados con el mismo texto son ruido para quien navega por
                  encabezados. */}
              <span
                aria-hidden
                className="inline-block h-8 w-1.5 rounded-full"
                style={{ backgroundColor: c.color }}
              />
            </div>
            {!sinTemporada && (
              <dl className="flex gap-6">
                <div>
                  <dt className="text-xs text-slate-500">Puntos</dt>
                  <dd className="font-display text-2xl tabular-nums font-semibold">
                    {c.stats.points}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Carreras</dt>
                  <dd className="font-display text-2xl tabular-nums">{c.stats.races}</dd>
                </div>
              </dl>
            )}
          </div>
        </Card>

        {sinTemporada ? (
          <Card>
            <p className="text-slate-500">
              La temporada todavía no tiene carreras procesadas, así que no hay pilotos ni
              resultados para mostrar.
            </p>
          </Card>
        ) : (
          <>
            <Card>
              <h2 className="mb-3 text-lg font-semibold">Pilotos de la temporada</h2>
              {c.drivers.length === 0 ? (
                <p className="text-slate-500">Todavía no hay pilotos asignados.</p>
              ) : (
                <ul className="flex flex-wrap gap-4">
                  {c.drivers.map((driver) => (
                    <li key={driver.id}>
                      <Link
                        to={`/drivers/${driver.id}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        {/* Se pasa `driver` pelado: DriverAvatar solo usa nombre, apellido y foto, y
                            una prop llamada `constructor` colisiona con Object.prototype y hace
                            que tsc espere un Function. Lo caza `npm run build`, no `tsc --noEmit`. */}
                        <DriverAvatar driver={driver} size={32} />
                        <span>
                          <span className="font-display tabular-nums text-slate-500">
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
                <p className="text-slate-500">Todavía no hay carreras procesadas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className={TH}>#</th>
                        <th className={TH}>Carrera</th>
                        <th className="py-2 text-right font-medium">Piloto 1</th>
                        <th className="py-2 text-right font-medium">Piloto 2</th>
                        <th className="py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.results.map((r) => (
                        <tr key={r.raceId} className="border-b border-slate-100 last:border-0">
                          <td className={`${TD} font-display tabular-nums`}>{r.round}</td>
                          <td className={TD}>{r.raceName}</td>
                          <td className="py-2 text-right font-display tabular-nums">
                            {r.driver1Points}
                          </td>
                          <td className="py-2 text-right font-display tabular-nums">
                            {r.driver2Points}
                          </td>
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
