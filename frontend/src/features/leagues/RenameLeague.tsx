import { useState } from 'react';
import { Button, PencilIcon } from '../../components/ui';

// Sin <form>: esto vive adentro del <h1> y un <form> ahi es HTML invalido (h1 solo admite
// phrasing content). Enter/Escape se manejan a mano en el input.
const ERROR_ID = 'rename-league-error';

export function RenameLeague({
  currentName,
  onRename,
  disabled,
}: {
  currentName: string;
  onRename: (name: string) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);

  function open() {
    // Desde la prop: entre dos aperturas el nombre pudo cambiar en el servidor.
    setName(currentName);
    setError(null);
    setEditing(true);
  }

  function submit() {
    const limpio = name.trim();
    if (limpio === '') {
      setError('Poné un nombre');
      return;
    }
    onRename(limpio);
    setEditing(false);
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        {currentName}
        <button
          type="button"
          aria-label="Editar nombre de la liga"
          disabled={disabled}
          onClick={open}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950"
        >
          <PencilIcon size={18} />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 align-middle">
      <input
        className="min-w-0 max-w-full rounded-md border border-slate-300 px-2 py-0.5 text-2xl font-bold text-slate-900 md:text-3xl dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
        value={name}
        autoFocus
        maxLength={100}
        aria-label="Nombre de la liga"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? ERROR_ID : undefined}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
          if (event.key === 'Escape') setEditing(false);
        }}
      />
      <Button disabled={disabled} onClick={submit} className="text-sm">
        Guardar
      </Button>
      <Button variant="secondary" onClick={() => setEditing(false)} className="text-sm">
        Cancelar
      </Button>
      {/* Altura reservada para que la fila no salte cuando aparece el error. */}
      <span id={ERROR_ID} role="alert" className="block w-full min-h-5 text-sm font-normal text-red-600">
        {error}
      </span>
    </span>
  );
}
