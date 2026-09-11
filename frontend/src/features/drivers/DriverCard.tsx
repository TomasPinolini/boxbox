import { Card } from '../../components/ui';
import type { Driver } from '../../models/driver';
import { DriverAvatar } from './DriverAvatar';
import { TeamBadge } from './TeamBadge';

// DriverCard: un piloto en la lista. Entrada: el piloto. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina. Mismo contrato que LeagueCard.
export function DriverCard({ driver, onOpen }: { driver: Driver; onOpen: (id: number) => void }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <DriverAvatar driver={driver} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">
            {driver.firstName} {driver.lastName}
          </h2>
          <p className="text-sm text-slate-500">
            <span className="font-mono">#{driver.number}</span> · {driver.code}
          </p>
          <div className="mt-2">
            <TeamBadge constructor={driver.constructor} />
          </div>
        </div>
      </div>
      {/* aria-label con el nombre: "Ver piloto" repetido 22 veces es indistinguible para un
          lector de pantalla, que lee los botones fuera de contexto. */}
      <button
        type="button"
        aria-label={`Ver piloto ${driver.firstName} ${driver.lastName}`}
        className="mt-4 text-sm font-semibold text-red-600 hover:underline"
        onClick={() => onOpen(driver.id)}
      >
        Ver piloto →
      </button>
    </Card>
  );
}
