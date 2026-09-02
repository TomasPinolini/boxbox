import { Badge } from '../../components/ui';
import type { LeagueMember } from '../../models/league-member';

// MembersTable: lista de miembros. En SM se apila (cada miembro = 2 lineas); desde md: fila.
// `canKick` lo decide la pagina (owner + roster abierto); la tabla solo muestra el boton.
export function MembersTable({
  members,
  canKick,
  onKick,
}: {
  members: LeagueMember[];
  canKick: boolean;
  onKick: (userId: number) => void;
}) {
  return (
    <ul className="divide-y divide-slate-200">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{m.user.name}</span>
            {m.isOwner && <Badge tone="warning">owner</Badge>}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>desde {new Date(m.joinedAt).toLocaleDateString('es-AR')}</span>
            {canKick && !m.isOwner && (
              <button
                type="button"
                className="font-semibold text-red-600 hover:underline"
                onClick={() => onKick(m.userId)}
              >
                Echar
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
