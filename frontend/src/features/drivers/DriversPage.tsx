import { useNavigate, useSearchParams } from 'react-router-dom';
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

        {/* Fija en 2 columnas a cualquier ancho (auditoria de UX 2026-10-09): con los pilotos
            ordenados por escuderia (ver drivers.service.ts) y 2 por equipo, cada fila de la
            grilla termina siendo un equipo completo. */}
        <div className="grid grid-cols-2 gap-4">
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
