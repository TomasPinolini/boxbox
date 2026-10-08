import { Badge, Button } from '../../components/ui';
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
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">{m.user.name}</span>
            {m.isOwner && <Badge tone="warning">owner</Badge>}
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm text-slate-500">
            <span>desde {new Date(m.joinedAt).toLocaleDateString('es-AR')}</span>
            {/* Boton y no un link de texto: echar a alguien es destructivo e irreversible
                desde la UI, y hasta aca era el elemento con MENOS peso visual de la pantalla
                y 20px de alto tactil. El aria-label nombra a quien se echa: "Echar" repetido
                una vez por miembro no distingue nada para un lector de pantalla. */}
            {canKick && !m.isOwner && (
              <Button
                variant="danger"
                aria-label={`Echar a ${m.user.name} de la liga`}
                onClick={() => onKick(m.userId)}
              >
                Echar
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
