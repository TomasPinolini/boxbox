import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card, PageShell } from '../../components/ui';
import type { ConstructorStanding, DriverStanding } from '../../models/championship';
import type { ApiError } from '../../services/api-error';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { TeamBadge } from '../drivers/TeamBadge';
import { useConstructorStandings, useDriverStandings } from './standings.queries';

const TH = 'py-2 pr-3 font-medium';
const TD = 'py-2 pr-3';

// Las dos tablas comparten carga / error / vacio; lo unico que cambia son las filas.
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
      {!query.data && !query.error && <p className="text-slate-500">Cargando…</p>}
      {query.data?.length === 0 && (
        <p className="text-slate-500">Todavía no hay datos de esta temporada.</p>
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
      <thead className="border-b border-slate-200 text-slate-500">
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
          <tr key={driver.id} className="border-b border-slate-100">
            <td className={`${TD} font-mono text-slate-500`}>{position}</td>
            <td className={TD}>
              <Link
                to={`/drivers/${driver.id}`}
                className="flex items-center gap-2 font-medium hover:underline"
              >
                <DriverAvatar driver={driver} size={32} />
                {driver.firstName} {driver.lastName}
              </Link>
            </td>
            <td className={`${TD} hidden sm:table-cell`}>
              <TeamBadge constructor={driver.constructor} />
            </td>
            <td className={`${TD} hidden font-mono sm:table-cell`}>{wins}</td>
            <td className="py-2 text-right font-mono font-semibold">{points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConstructorsTable({ rows }: { rows: ConstructorStanding[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-slate-500">
        <tr>
          <th className={TH}>#</th>
          <th className={TH}>Escudería</th>
          <th className="py-2 text-right font-medium">Puntos</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ position, points, constructor }) => (
          <tr key={constructor.id} className="border-b border-slate-100">
            <td className={`${TD} font-mono text-slate-500`}>{position}</td>
            <td className={TD}>
              <TeamBadge constructor={constructor} />
            </td>
            <td className="py-2 text-right font-mono font-semibold">{points}</td>
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
    <PageShell
      title="Campeonato"
      actions={
        <div className="flex items-center gap-3 text-sm">
          <Link to="/drivers" className="font-semibold text-red-600 hover:underline">
            Pilotos
          </Link>
          <Link to="/leagues" className="font-semibold text-red-600 hover:underline">
            Mis ligas
          </Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <StandingsCard title="Pilotos" query={drivers}>
          {(rows) => <DriversTable rows={rows} />}
        </StandingsCard>
        <StandingsCard title="Escuderías" query={constructors}>
          {(rows) => <ConstructorsTable rows={rows} />}
        </StandingsCard>
      </div>
    </PageShell>
  );
}
