import { Badge } from '../../components/ui';
import type { ConstructorRef } from '../../models/driver';
import { textOn } from './team-color';

// Aparte del <Badge> compartido a proposito: aquel tiene una paleta cerrada de `tone` y no se
// abre a un color arbitrario.
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
