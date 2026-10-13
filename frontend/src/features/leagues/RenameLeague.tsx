import { useState } from 'react';
import { Button, Field, inputClass } from '../../components/ui';

// Renombrar una liga: un boton que se convierte en formulario, en el mismo lugar. Sin modal y
// sin pantalla aparte — es un campo solo, y mover el foco a un dialogo para editar una linea
// cuesta mas de lo que ordena.
//
// `currentName` entra, `onRename` sale: el componente no sabe nada de HTTP ni de React Query.
// Quien lo usa decide que hacer con el nombre nuevo.
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
      <Button variant="secondary" disabled={disabled} onClick={open}>
        Editar nombre
      </Button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="min-w-48">
        <Field label="Nombre de la liga" error={error}>
          <input
            className={inputClass}
            value={name}
            autoFocus
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" disabled={disabled}>
        Guardar
      </Button>
      <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
        Cancelar
      </Button>
    </form>
  );
}
