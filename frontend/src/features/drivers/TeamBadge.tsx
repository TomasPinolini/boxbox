import { Badge } from '../../components/ui';
import type { ConstructorRef } from '../../models/driver';
import { textOn } from './team-color';

// Badge pintado con el color oficial de la escuderia, que ya vive en la base. Es un componente
// aparte del <Badge> compartido a proposito: aquel tiene una paleta cerrada de `tone` que usan
// las ligas, y no queria abrirla a un color arbitrario solo por esta pantalla.
//
// Sin escuderia cae al Badge neutro: no tener equipo no es un error, el piloto puede no correr
// la temporada activa.
export function TeamBadge({ constructor }: { constructor: ConstructorRef | null }) {
  if (!constructor) return <Badge tone="neutral">Sin equipo</Badge>;

  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ backgroundColor: constructor.color, color: textOn(constructor.color) }}
    >
      {constructor.name}
    </span>
  );
}
