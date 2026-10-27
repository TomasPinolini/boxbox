import { Modal } from '../../components/ui';
import type { ConstructorRef, Driver } from '../../models/driver';
import { TeamLineup } from '../draft/TeamLineup';

export function RivalTeamModal({
  nombre,
  motto,
  drivers,
  constructor,
  onOpenDriver,
  onClose,
}: {
  nombre: string;
  motto: string | null;
  drivers: Driver[];
  constructor: ConstructorRef | null;
  onOpenDriver: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      label={`Equipo de ${nombre}`}
      onClose={onClose}
      className="enter-scale m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-slate-50 shadow-2xl backdrop:bg-slate-900/55 dark:bg-ink"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Equipo de {nombre}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-ink-surface dark:text-ink-muted dark:hover:bg-ink-border"
          >
            ✕
          </button>
        </div>
        {/* Sin lema no se dibuja nada: la mayoría de los rivales no va a tener uno. */}
        {motto && (
          <p className="mb-3 text-sm italic text-slate-500 dark:text-ink-muted">
            &ldquo;{motto}&rdquo;
          </p>
        )}
        <TeamLineup drivers={drivers} constructor={constructor} onOpenDriver={onOpenDriver} />
      </div>
    </Modal>
  );
}
