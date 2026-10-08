import type { ReactNode } from 'react';

// Contraparte de Alert para el camino feliz. Existe porque la misma caja verde estaba escrita
// dos veces a mano en RaceResultsPage, con las clases copiadas: el unico patron del proyecto
// que se repetia sin ser componente.
//
// Separado de Alert y no una prop `tone` del mismo, por dos motivos que no son esteticos:
// Alert traduce codigos de error con `errorMessageFor` y esto recibe texto ya armado, y sobre
// todo el rol ARIA es distinto. role="alert" interrumpe lo que el lector de pantalla este
// diciendo; role="status" espera a que termine. Un exito no justifica una interrupcion.
export function Success({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="enter-top mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200"
    >
      {children}
    </p>
  );
}
