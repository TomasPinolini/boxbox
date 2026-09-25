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
  if (!driver.data) return <p className="p-6 text-slate-500">Cargando…</p>;

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
        <div className="flex flex-wrap items-center gap-4">
          <DriverAvatar driver={d} size={88} />
          <div className="flex flex-col gap-2 text-slate-600">
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg">#{d.number}</span>
              <span>{d.code}</span>
              <TeamBadge constructor={d.constructor} />
            </div>
            {/* El logo solo aparece si lo tenemos: faltan Ferrari, Audi y Racing Bulls. */}
            {d.constructor?.logoUrl && (
              <img
                src={d.constructor.logoUrl}
                alt={d.constructor.name}
                className="h-10 max-w-[220px] object-contain object-left"
              />
            )}
          </div>
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Estadísticas</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STAT_LABELS.map(([key, label]) => (
              <div key={key}>
                <dt className="text-sm text-slate-500">{label}</dt>
                {/* bestFinish es null si nunca clasifico — no es un cero. */}
                <dd className="font-mono text-2xl font-semibold">{d.stats[key] ?? '—'}</dd>
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
