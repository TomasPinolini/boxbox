import { useState } from 'react';
import { Button } from './Button';

// Boton de dos estados para acciones sin vuelta atras. Primer click: muestra la consecuencia
// y pide confirmar. Segundo click: ejecuta.
//
// Por que no un modal: un <dialog> hay que montarlo, enfocarlo, atrapar el Tab adentro,
// cerrarlo con Escape y devolver el foco al volver. Dos estados en el mismo lugar no mueven
// el foco a ninguna parte, asi que no hay nada que devolver, y el texto de la consecuencia
// queda al lado del boton que la provoca en vez de tapar la pantalla que el usuario estaba
// mirando para decidir.
//
// `consequence` no es un "¿estas seguro?": tiene que decir QUE va a pasar, con los numeros
// concretos de esta liga. "¿Seguro?" no agrega informacion, solo un click.
export function ConfirmButton({
  label,
  confirmLabel,
  consequence,
  variant = 'primary',
  disabled,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  consequence: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [armado, setArmado] = useState(false);

  if (!armado) {
    return (
      <Button variant={variant} disabled={disabled} onClick={() => setArmado(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-slate-50 p-3">
      {/* role="alert" y no un <p> suelto: el texto aparece por una accion del usuario y hay
          que anunciarlo. Sin esto, quien no ve la pantalla aprieta y no se entera de nada. */}
      <p role="alert" className="text-sm text-slate-700">
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
