import { Badge, ConfirmButton, UserAvatar } from '../../components/ui';
import type { LeagueMember } from '../../models/league-member';

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
    <ul className="divide-y divide-slate-200 dark:divide-ink-border">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar user={m.user} size={32} />
            <span className="truncate font-medium">{m.user.name}</span>
            {m.isOwner && <Badge tone="warning">owner</Badge>}
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm text-slate-500 dark:text-ink-muted">
            <span>desde {new Date(m.joinedAt).toLocaleDateString('es-AR')}</span>
            {/* Echar no tiene vuelta atras desde la UI, por eso se confirma. El aria-label
                nombra a quien se echa: "Echar" repetido no distingue nada para un lector. */}
            {canKick && !m.isOwner && (
              <ConfirmButton
                variant="danger"
                label="Echar"
                ariaLabel={`Echar a ${m.user.name} de la liga`}
                confirmLabel="Sí, echar"
                consequence={`${m.user.name} va a salir de la liga. Para volver a entrar, va a necesitar el código de invitación de nuevo.`}
                onConfirm={() => onKick(m.userId)}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
