import type { Standing } from '../../models/standing';

// Flecha de movimiento contra la carrera anterior. Texto ademas de color: el color solo no
// alcanza para daltonismo.
function Change({ value }: { value: number }) {
  if (value === 0) return <span className="text-slate-400">—</span>;
  return value > 0 ? (
    <span className="text-green-700">▲ {value}</span>
  ) : (
    <span className="text-red-700">▼ {-value}</span>
  );
}

export function StandingsTable({ standings }: { standings: Standing[] }) {
  if (standings.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Todavía no hay posiciones: aparecen cuando se procesa la primera carrera después del draft.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Jugador</th>
            <th className="hidden py-2 pr-3 font-medium md:table-cell">Pilotos</th>
            <th className="hidden py-2 pr-3 font-medium md:table-cell">Escudería</th>
            <th className="py-2 pr-3 font-medium">Total</th>
            <th className="py-2 font-medium">Mov.</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.id} className="border-b border-slate-100">
              <td className="py-2 pr-3 font-mono">{s.position}</td>
              <td className="py-2 pr-3 font-medium">{s.user.name}</td>
              <td className="hidden py-2 pr-3 font-mono md:table-cell">{s.driverPoints}</td>
              <td className="hidden py-2 pr-3 font-mono md:table-cell">{s.constructorPoints}</td>
              <td className="py-2 pr-3 font-mono font-semibold">{s.totalPoints}</td>
              <td className="py-2">
                <Change value={s.positionChange} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
