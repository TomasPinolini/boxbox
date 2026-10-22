import { Position, UserAvatar } from '../../components/ui';
import type { ConstructorRef, Driver } from '../../models/driver';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import type { Standing } from '../../models/standing';

// Las filas salen de los miembros, no de los standings: una LeagueStanding recien existe
// cuando se procesa una carrera, y la tabla no puede quedar vacia justo despues del draft.

// Ni el color ni el glifo alcanzan (daltonismo, lectores de pantalla): el simbolo se
// oculta y va la palabra en sr-only.
function Change({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="text-slate-400 dark:text-ink-muted">
        <span aria-hidden="true">—</span>
        <span className="sr-only">sin cambios</span>
      </span>
    );
  return value > 0 ? (
    <span className="text-green-700">
      <span aria-hidden="true">▲</span>
      <span className="sr-only">subió</span> {value}
    </span>
  ) : (
    <span className="text-red-700">
      <span aria-hidden="true">▼</span>
      <span className="sr-only">bajó</span> {-value}
    </span>
  );
}

export interface TeamRowData {
  leagueMemberId: number;
  memberName: string;
  memberAvatarUrl: string | null;
  isMe: boolean;
  drivers: Driver[];
  constructor: ConstructorRef | null;
  standing: Standing | null;
}

export function LeagueTeamsTable({
  rows,
  onSelect,
}: {
  rows: TeamRowData[];
  /** Avisa que fila eligieron. Sin esto el nombre es texto: no se promete un click que no hace nada. */
  onSelect?: (leagueMemberId: number) => void;
}) {
  // Sin standings las columnas de competencia no se dibujan: una tabla vacia se lee como
  // "voy primero", no como "todavia no paso nada".
  const hayCarreras = rows.some((r) => r.standing !== null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500 dark:border-ink-border dark:text-ink-muted">
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
              // Borde y no fondo: un fondo competiria con los colores de las escuderias.
              className={`border-b border-slate-100 dark:border-ink-border ${r.isMe ? 'border-l-2 border-l-red-600' : ''}`}
            >
              {hayCarreras && (
                <td className="py-2 pr-3">
                  {r.standing ? <Position value={r.standing.position} /> : null}
                </td>
              )}
              <td className="py-2 pr-3 font-medium">
                <span className="flex items-center gap-2">
                  <UserAvatar user={{ name: r.memberName, avatarUrl: r.memberAvatarUrl }} size={28} />
                  {onSelect ? (
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() => onSelect(r.leagueMemberId)}
                    >
                      {r.memberName}
                    </button>
                  ) : (
                    r.memberName
                  )}
                  {r.isMe && <span className="text-xs text-slate-400 dark:text-ink-muted">(vos)</span>}
                </span>
              </td>
              <td className="py-2 pr-3">
                {/* El title solo sirve al mouse: el nombre para el lector va en sr-only y lo
                    visible (codigo, logo) queda oculto para no oir "Max Verstappen VER". */}
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {r.drivers.map((d) => (
                    <span
                      key={d.id}
                      className="flex items-center gap-1"
                      title={`${d.firstName} ${d.lastName}`}
                    >
                      <DriverAvatar driver={d} size={24} />
                      <span className="sr-only">
                        {d.firstName} {d.lastName}
                      </span>
                      <span
                        aria-hidden="true"
                        className="font-display tabular-nums text-xs text-slate-500 dark:text-ink-muted"
                      >
                        {d.code}
                      </span>
                    </span>
                  ))}
                  {r.constructor && (
                    <span className="flex items-center gap-1" title={r.constructor.name}>
                      <ConstructorLogo constructor={r.constructor} />
                      <span className="sr-only">{r.constructor.name}</span>
                    </span>
                  )}
                  {r.drivers.length === 0 && !r.constructor && (
                    <span className="text-slate-400 dark:text-ink-muted">
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">sin equipo</span>
                    </span>
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
