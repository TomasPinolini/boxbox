import { useState } from 'react';
import { Button, Field, inputClass } from '../../components/ui';

// Renombrar una liga: un boton que se convierte en formulario, en el mismo lugar. Sin modal y
// sin pantalla aparte — es un campo solo, y mover el foco a un dialogo para editar una linea
// cuesta mas de lo que ordena.
//
// `currentName` entra, `onRename` sale: el componente no sabe nada de HTTP ni de React Query.
// Quien lo usa decide que hacer con el nombre nuevo.
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
      <Button variant="secondary" disabled={disabled} onClick={open}>
        Editar nombre
      </Button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48">
          {/* El error NO va dentro de Field, por dos razones. La de layout: Field lo renderiza
              debajo del input y el contenedor alinea por `items-end`, asi que al aparecer el
              error el "bottom" pasa a ser el texto y se corren hacia abajo los botones de al
              lado — incluido "Archivar liga", que ni siquiera es parte de este formulario. La
              de accesibilidad: Field mete el error adentro del <label>, y entonces el lector
              de pantalla lo pliega en el nombre del campo ("Nombre de la liga Pone un
              nombre") en vez de anunciarlo como error. */}
          <Field label="Nombre de la liga">
            <input
              className={inputClass}
              value={name}
              autoFocus
              maxLength={100}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ERROR_ID : undefined}
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
      </div>
      {/* Altura reservada: el bloque ocupa lo mismo con y sin error, asi la fila de arriba no
          salta cuando el mensaje aparece. */}
      <p id={ERROR_ID} role="alert" className="mt-1 min-h-5 text-sm text-red-600">
        {error}
      </p>
    </form>
  );
}
