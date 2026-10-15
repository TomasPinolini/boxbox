import { Link, useParams } from 'react-router-dom';
import { Alert, Card, PageShell } from '../../components/ui';
import type { DriverStats } from '../../models/driver';
import { DriverAvatar } from './DriverAvatar';
import { DriverResultsTable } from './DriverResultsTable';
import { TeamBadge } from './TeamBadge';
import { useDriver } from './drivers.queries';

// Las seis estadisticas que devuelve el backend, en el orden en que se leen.
const STAT_LABELS: [keyof DriverStats, string][] = [
  ['races', 'Carreras'],
  ['points', 'Puntos'],
  ['wins', 'Victorias'],
  ['podiums', 'Podios'],
  ['bestFinish', 'Mejor puesto'],
  ['dnfs', 'Abandonos'],
];

export function DriverDetailPage() {
  const id = Number(useParams().id);
  const driver = useDriver(id);

  if (driver.error) {
    return (
      <PageShell title="Piloto">
        <Alert code={driver.error.code} message={driver.error.message} />
      </PageShell>
    );
  }
  // Adentro de PageShell y no suelto: si no, el texto aparece pegado al borde mientras el
  // contenido real va mucho mas adentro, y la pagina salta al llegar los datos (mismo defecto
  // que tenia LeagueDetailPage, arreglado ahi primero).
  if (!driver.data) {
    return (
      <PageShell title="Piloto">
        <p className="text-slate-500 dark:text-ink-muted">Cargando…</p>
      </PageShell>
    );
  }

  const d = driver.data;

  return (
    <PageShell
      title={`${d.firstName} ${d.lastName}`}
      actions={
        <Link to="/drivers" className="text-sm font-semibold text-red-600 hover:underline">
          ← Pilotos
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        {/* La cabecera pasa a Card para poder llevar la banda del equipo arriba. Antes era
            un div suelto: el unico bloque de la pantalla sin la caja blanca del resto. */}
        <Card className="border-t-4" style={{ borderTopColor: d.constructor?.color ?? '#e2e8f0' }}>
          <div className="flex flex-wrap items-center gap-4">
            <DriverAvatar driver={d} size={88} />
            <div className="flex flex-col gap-2 text-slate-600 dark:text-ink-muted">
              <div className="flex items-center gap-3">
                <span className="font-display tabular-nums text-lg">#{d.number}</span>
                <span>{d.code}</span>
                {/* Desde el piloto se llega a su escuderia. No hay otro click alrededor. */}
                {d.constructor ? (
                  <Link to={`/constructors/${d.constructor.id}`} className="hover:underline">
                    <TeamBadge constructor={d.constructor} />
                  </Link>
                ) : (
                  <TeamBadge constructor={d.constructor} />
                )}
              </div>
              {/* Las 11 escuderias tienen logo (ver frontend/public/logos/CREDITS.md). Sin
                  dark:bg-white: son marcas a color con fondo transparente, se leen bien
                  directo contra la Card oscura — forzar una caja blanca ahi encima quedaba
                  feo. Pedido del usuario 2026-10-15, mismo criterio en ConstructorLogo.tsx. */}
              {d.constructor?.logoUrl && (
                <img
                  src={d.constructor.logoUrl}
                  // alt vacio + aria-hidden: el <Link> con el TeamBadge, tres lineas mas
                  // arriba, YA se llama como la escuderia. Con alt se escuchaba "Ferrari,
                  // enlace" e inmediatamente despues "Ferrari, imagen".
                  alt=""
                  aria-hidden="true"
                  className="h-10 max-w-[220px] object-contain object-left"
                />
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Estadísticas</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STAT_LABELS.map(([key, label]) => (
              <div key={key}>
                <dt className="text-sm text-slate-500 dark:text-ink-muted">{label}</dt>
                {/* bestFinish es null si nunca clasifico — no es un cero. */}
                <dd className="font-display tabular-nums text-2xl font-semibold">
                  {d.stats[key] ?? '—'}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Resultados</h2>
          <DriverResultsTable results={d.results} />
        </Card>
      </div>
    </PageShell>
  );
}
