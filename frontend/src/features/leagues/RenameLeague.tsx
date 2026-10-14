import { useState } from 'react';
import { Button } from '../../components/ui';

// Renombrar una liga: un lapiz al lado del nombre que se convierte en un input, en el mismo
// lugar — dentro del <h1> de la pantalla (ver PageShell), no un boton de texto aparte al pie
// de la pagina como era antes. Pedido del usuario 2026-10-14: "un boceto de un lapiz muy
// sencillo, como para entender que eso es para editar".
//
// Sin <form>: esto vive adentro de un <h1>, y el modelo de contenido de h1 es "phrasing
// content" — <form> es flow content, asi que anidarlo seria HTML invalido. Enter/Escape se
// manejan a mano en el input.
//
// `currentName` entra, `onRename` sale: el componente no sabe nada de HTTP ni de React Query.
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
    // Se recarga desde la prop y no se confia en el estado viejo: entre dos aperturas el
    // nombre pudo cambiar en el servidor.
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
          className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950"
        >
          {/* Lapiz, trazo simple — dos paths, nada de relleno. */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
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
      {/* Altura reservada: el bloque ocupa lo mismo con y sin error, asi la fila no salta
          cuando el mensaje aparece. */}
      <span id={ERROR_ID} role="alert" className="block w-full min-h-5 text-sm font-normal text-red-600">
        {error}
      </span>
    </span>
  );
}
