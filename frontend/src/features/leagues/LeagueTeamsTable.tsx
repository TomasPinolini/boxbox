import { Position } from '../../components/ui';
import type { ConstructorRef, Driver } from '../../models/driver';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import type { Standing } from '../../models/standing';

// La tabla de la liga despues del draft. Reemplaza a las dos tarjetas que habia antes
// —"Posiciones" y "Miembros"— que listaban la misma gente dos veces.
//
// La manejan los MIEMBROS, no las posiciones, y esa es la decision que define el componente:
// una fila de LeagueStanding recien existe cuando un admin procesa una carrera. Una liga que
// acaba de terminar el draft tiene cero. Si la tabla se dibujara con standings, la pantalla
// quedaria vacia justo en el momento de mas entusiasmo. Asi las columnas de posicion, puntos
// y movimiento aparecen cuando hay con que llenarlas, y el resto se ve desde el primer dia.

// Flecha de movimiento contra la carrera anterior. Texto ademas de color: el color solo no
// alcanza para daltonismo. (Venia de StandingsTable, que este componente reemplaza.)
function Change({ value }: { value: number }) {
  if (value === 0) return <span className="text-slate-400">—</span>;
  return value > 0 ? (
    <span className="text-green-700">▲ {value}</span>
  ) : (
    <span className="text-red-700">▼ {-value}</span>
  );
}

export interface TeamRowData {
  leagueMemberId: number;
  memberName: string;
  isMe: boolean;
  drivers: Driver[];
  constructor: ConstructorRef | null;
  standing: Standing | null;
}

export function LeagueTeamsTable({ rows }: { rows: TeamRowData[] }) {
  // Si nadie tiene standing todavia, las tres columnas de competencia no se dibujan. No es
  // lo mismo que ponerlas con guiones: una tabla de posiciones vacia se lee como "voy
  // primero", no como "todavia no paso nada".
  const hayCarreras = rows.some((r) => r.standing !== null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr>
            {hayCarreras && <th className="py-2 pr-3 font-medium">#</th>}
            <th className="py-2 pr-3 font-medium">Jugador</th>
            <th className="py-2 pr-3 font-medium">Equipo</th>
            {hayCarreras && <th className="py-2 pr-3 font-medium">Puntos</th>}
            {hayCarreras && <th className="py-2 font-medium">Mov.</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.leagueMemberId}
              // Tu fila marcada con un borde y no con un fondo de color: la tabla ya tiene
              // los colores de las once escuderias adentro, y un fondo mas competiria con ellos.
              className={`border-b border-slate-100 ${r.isMe ? 'border-l-2 border-l-red-600' : ''}`}
            >
              {hayCarreras && (
                <td className="py-2 pr-3">
                  {r.standing ? <Position value={r.standing.position} /> : null}
                </td>
              )}
              <td className="py-2 pr-3 font-medium">
                {r.memberName}
                {r.isMe && <span className="ml-1 text-xs text-slate-400">(vos)</span>}
              </td>
              <td className="py-2 pr-3">
                {/* Los pilotos y la escuderia como iconos, en una sola celda: el nombre del
                    jugador ya ocupa su columna y repetir tres nombres mas por fila hace una
                    tabla que no entra en un telefono. El nombre completo va en el title. */}
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {r.drivers.map((d) => (
                    <span
                      key={d.id}
                      className="flex items-center gap-1"
                      title={`${d.firstName} ${d.lastName}`}
                    >
                      <DriverAvatar driver={d} size={24} />
                      <span className="font-display tabular-nums text-xs text-slate-500">
                        {d.code}
                      </span>
                    </span>
                  ))}
                  {r.constructor && (
                    <span className="flex items-center gap-1" title={r.constructor.name}>
                      <ConstructorLogo constructor={r.constructor} />
                    </span>
                  )}
                  {r.drivers.length === 0 && !r.constructor && (
                    <span className="text-slate-400">—</span>
                  )}
                </span>
              </td>
              {hayCarreras && (
                <td className="py-2 pr-3 font-display tabular-nums font-semibold">
                  {r.standing?.totalPoints ?? 0}
                </td>
              )}
              {hayCarreras && (
                <td className="py-2">
                  {r.standing ? <Change value={r.standing.positionChange} /> : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
