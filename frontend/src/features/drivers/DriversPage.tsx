import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, PageShell } from '../../components/ui';
import { ConstructorFilter } from './ConstructorFilter';
import { DriverCard } from './DriverCard';
import { useConstructors, useDrivers } from './drivers.queries';
import { groupByConstructor } from './group-by-constructor';

export function DriversPage() {
  const navigate = useNavigate();
  // El filtro vive en la URL y no en useState: sobrevive al "atras" desde el detalle y se
  // puede compartir el link filtrado.
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('constructorId');
  const constructorId = raw ? Number(raw) : null;

  const drivers = useDrivers(constructorId ?? undefined);
  const constructors = useConstructors();

  function changeFilter(next: number | null) {
    setSearchParams(next === null ? {} : { constructorId: String(next) });
  }

  return (
    <PageShell title="Pilotos">
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
          <p className="text-slate-500 dark:text-ink-muted">No hay pilotos para esa escudería.</p>
        )}

        {/* Una grilla por escuderia: con un conteo impar, un piloto no queda al lado de
            alguien de otro equipo. */}
        <div className="flex flex-col gap-4">
          {groupByConstructor(drivers.data ?? []).map((group) => (
            <div key={group.key} className="grid grid-cols-2 gap-4">
              {group.items.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  onOpen={(id) => navigate(`/drivers/${id}`)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
