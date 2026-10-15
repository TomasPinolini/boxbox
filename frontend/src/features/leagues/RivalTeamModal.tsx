import { useEffect, useRef } from 'react';
import type { ConstructorRef, Driver } from '../../models/driver';
import { TeamLineup } from '../draft/TeamLineup';

// El equipo de un rival ya no REEMPLAZA "Tu equipo" (como era antes) — ahora flota encima en
// un popup, y "Tu equipo" se queda atras sin cambiar. Mismo patron de dialogo que el drawer de
// AppLayout y el cartel de AboutBoxBox: Escape, click en el scrim, o la X cierran; el foco
// entra al abrir (a la X) y vuelve al gatillo al cerrar; el scroll del body se bloquea
// mientras esta abierto.
export function RivalTeamModal({
  nombre,
  drivers,
  constructor,
  onOpenDriver,
  onClose,
}: {
  nombre: string;
  drivers: Driver[];
  constructor: ConstructorRef | null;
  onOpenDriver: (id: number) => void;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="enter-fade fixed inset-0 z-40 bg-slate-900/55"
      />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Equipo de ${nombre}`}
          className="enter-scale w-full max-w-lg rounded-xl bg-slate-50 p-5 shadow-2xl dark:bg-ink"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Equipo de {nombre}</h2>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-ink-surface dark:text-ink-muted dark:hover:bg-ink-border"
            >
              ✕
            </button>
          </div>
          <TeamLineup drivers={drivers} constructor={constructor} onOpenDriver={onOpenDriver} />
        </div>
      </div>
    </>
  );
}
