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
            {/* La franja va como box-shadow interior y NO como border-left: el preflight de
                Tailwind pone border-collapse: collapse, y con eso los bordes de celdas
                vecinas se fusionan y el resultado varia entre navegadores. El box-shadow no
                participa de ese colapso ni ocupa lugar en el layout. */}
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
              <TeamBadge constructor={driver.constructor} />
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
            <td className={TD}>
              <Position value={position} />
            </td>
            {/* El logo va aca y no dentro de TeamBadge: el badge tambien vive en la tarjeta
                de piloto, donde a 320px ya comparte linea con el dorsal y el codigo. Esta era
                ademas la unica tabla sin ninguna imagen, mientras la de pilotos tiene las
                fotos — esa asimetria es lo que la hacia ver mas pobre. */}
            <td className={TD}>
              <div className="flex items-center gap-2">
                <ConstructorLogo constructor={constructor} />
                <TeamBadge constructor={constructor} />
              </div>
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
      {/* 3 columnas y no 2: la tabla de pilotos tiene 5 columnas y 22 filas, la de escuderias
          3 y 11. Partiendo la pantalla por la mitad, 7 de las 22 filas de pilotos envolvian el
          nombre o la escuderia en dos lineas. Con 2/3 del ancho entran en una. */}
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
