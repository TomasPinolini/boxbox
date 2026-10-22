import { useState } from 'react';
import { Button } from './Button';

// Dos estados en el lugar y no un modal: no mueve el foco, asi que no hay que atraparlo ni devolverlo.
// `consequence` dice que va a pasar, con los numeros concretos, no un "¿estas seguro?".
export function ConfirmButton({
  label,
  ariaLabel,
  confirmLabel,
  consequence,
  variant = 'primary',
  disabled,
  onConfirm,
}: {
  label: string;
  // Cuando `label` no distingue la accion, p. ej. "Echar" repetido en cada fila.
  ariaLabel?: string;
  confirmLabel: string;
  consequence: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [armado, setArmado] = useState(false);

  if (!armado) {
    return (
      <Button
        variant={variant}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setArmado(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-slate-50 p-3 dark:border-ink-border dark:bg-ink-surface">
      {/* role="alert": el texto aparece tras un click y el lector tiene que anunciarlo. */}
      <p role="alert" className="text-sm text-slate-700 dark:text-ink-muted">
        {consequence}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant={variant} disabled={disabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={() => setArmado(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
