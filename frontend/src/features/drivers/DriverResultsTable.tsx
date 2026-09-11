import { Badge } from '../../components/ui';
import type { DriverRaceResult } from '../../models/driver';
import { RESULT_STATUS_LABEL } from './result-status-label';

// Tabla del historial. En mobile la cabecera se esconde y cada fila se lee sola.
export function DriverResultsTable({ results }: { results: DriverRaceResult[] }) {
  if (results.length === 0) {
    return <p className="text-slate-500">Todavía no corrió ninguna carrera esta temporada.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="hidden border-b border-slate-200 text-slate-500 sm:table-header-group">
          <tr>
            <th className="py-2 pr-3 font-medium">Fecha</th>
            <th className="py-2 pr-3 font-medium">Gran Premio</th>
            <th className="py-2 pr-3 font-medium">Posición</th>
            <th className="py-2 pr-3 font-medium">Puntos</th>
            <th className="py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const status = RESULT_STATUS_LABEL[r.status];
            return (
              <tr key={r.raceId} className="block border-b border-slate-100 py-3 sm:table-row">
                <td className="py-1 pr-3 font-mono text-slate-500 sm:py-2">{r.round}</td>
                <td className="py-1 pr-3 font-medium sm:py-2">{r.raceName}</td>
                <td className="py-1 pr-3 sm:py-2">{r.position ?? '—'}</td>
                <td className="py-1 pr-3 font-mono sm:py-2">{r.points}</td>
                <td className="py-1 sm:py-2">
                  <Badge tone={status.tone}>{status.text}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
