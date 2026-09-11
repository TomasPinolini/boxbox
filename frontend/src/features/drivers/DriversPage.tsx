import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, PageShell } from '../../components/ui';
import { ConstructorFilter } from './ConstructorFilter';
import { DriverCard } from './DriverCard';
import { useConstructors, useDrivers } from './drivers.queries';

export function DriversPage() {
  const navigate = useNavigate();
  // El filtro vive en la URL y no en useState: sobrevive al "atras" del browser desde el
  // detalle, se puede compartir el link ya filtrado, y el e2e tiene algo determinístico
  // contra que assertar.
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('constructorId');
  const constructorId = raw ? Number(raw) : null;

  const drivers = useDrivers(constructorId ?? undefined);
  const constructors = useConstructors();

  function changeFilter(next: number | null) {
    setSearchParams(next === null ? {} : { constructorId: String(next) });
  }

  return (
    <PageShell
      title="Pilotos"
      actions={
        <Link to="/leagues" className="text-sm font-semibold text-red-600 hover:underline">
          Mis ligas
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="max-w-xs">
          <ConstructorFilter
            constructors={constructors.data ?? []}
            value={constructorId}
            onChange={changeFilter}
          />
        </div>

        {drivers.error && <Alert code={drivers.error.code} message={drivers.error.message} />}
        {drivers.data?.length === 0 && (
          <p className="text-slate-500">No hay pilotos para esa escudería.</p>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.data?.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onOpen={(id) => navigate(`/drivers/${id}`)}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
