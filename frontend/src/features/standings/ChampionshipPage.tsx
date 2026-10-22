import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card, PageShell, Position } from '../../components/ui';
import type { ConstructorStanding, DriverStanding } from '../../models/championship';
import type { ApiError } from '../../services/api-error';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { TeamBadge } from '../drivers/TeamBadge';
import { useConstructorStandings, useDriverStandings } from './standings.queries';

const TH = 'py-2 pr-3 font-medium';
const TD = 'py-2 pr-3';

function StandingsCard<T>({
  title,
  query,
  children,
}: {
  title: string;
  query: { data?: T[]; error: ApiError | null };
  children: (rows: T[]) => ReactNode;
}) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {query.error && <Alert code={query.error.code} message={query.error.message} />}
      {!query.data && !query.error && (
        <p className="text-slate-500 dark:text-ink-muted">Cargando…</p>
      )}
      {query.data?.length === 0 && (
        <p className="text-slate-500 dark:text-ink-muted">Todavía no hay datos de esta temporada.</p>
      )}
      {query.data && query.data.length > 0 && (
        <div className="overflow-x-auto">{children(query.data)}</div>
      )}
    </Card>
  );
}

function DriversTable({ rows }: { rows: DriverStanding[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-slate-500 dark:border-ink-border dark:text-ink-muted">
        <tr>
          <th className={TH}>#</th>
          <th className={TH}>Piloto</th>
          <th className={`${TH} hidden sm:table-cell`}>Escudería</th>
          <th className={`${TH} hidden sm:table-cell`}>Victorias</th>
          <th className="py-2 text-right font-medium">Puntos</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ position, points, wins, driver }) => (
          <tr key={driver.id} className="border-b border-slate-100 dark:border-ink-border">
            {/* box-shadow y no border-left: con el border-collapse del preflight, los bordes de
                celdas vecinas se fusionan distinto en cada navegador. */}
            <td
              className={`${TD} pl-2`}
              style={{ boxShadow: `inset 4px 0 0 ${driver.constructor?.color ?? '#e2e8f0'}` }}
            >
              <Position value={position} />
            </td>
            <td className={TD}>
              <Link
                to={`/drivers/${driver.id}`}
                className="flex items-center gap-2 font-medium hover:underline"
              >
                <DriverAvatar driver={driver} size={24} />
                {driver.firstName} {driver.lastName}
              </Link>
            </td>
            <td className={`${TD} hidden sm:table-cell`}>
              {/* En su propio <td>, fuera del Link al piloto: nunca un link dentro de otro. */}
              {driver.constructor ? (
                <Link to={`/constructors/${driver.constructor.id}`} className="hover:underline">
                  <TeamBadge constructor={driver.constructor} />
                </Link>
              ) : (
                <TeamBadge constructor={driver.constructor} />
              )}
            </td>
            <td className={`${TD} hidden font-display tabular-nums sm:table-cell`}>{wins}</td>
            <td className="py-2 text-right font-display tabular-nums font-semibold">{points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConstructorsTable({ rows }: { rows: ConstructorStanding[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-slate-500 dark:border-ink-border dark:text-ink-muted">
        <tr>
          <th className={TH}>#</th>
          <th className={TH}>Escudería</th>
          <th className="py-2 text-right font-medium">Puntos</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ position, points, constructor }) => (
          <tr key={constructor.id} className="border-b border-slate-100 dark:border-ink-border">
            <td className={TD}>
              <Position value={position} />
            </td>
            {/* El logo va aca y no dentro de TeamBadge: en la tarjeta de piloto no entra a 320px. */}
            <td className={TD}>
              <Link
                to={`/constructors/${constructor.id}`}
                className="flex items-center gap-2 hover:underline"
              >
                <ConstructorLogo constructor={constructor} />
                <TeamBadge constructor={constructor} />
              </Link>
            </td>
            <td className="py-2 text-right font-display tabular-nums font-semibold">{points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ChampionshipPage() {
  const drivers = useDriverStandings();
  const constructors = useConstructorStandings();

  return (
    <PageShell title="Campeonato">
      {/* 3 columnas y no 2: a medio ancho las filas de pilotos envuelven en dos lineas. */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <StandingsCard title="Pilotos" query={drivers}>
            {(rows) => <DriversTable rows={rows} />}
          </StandingsCard>
        </div>
        <StandingsCard title="Escuderías" query={constructors}>
          {(rows) => <ConstructorsTable rows={rows} />}
        </StandingsCard>
      </div>
    </PageShell>
  );
}
