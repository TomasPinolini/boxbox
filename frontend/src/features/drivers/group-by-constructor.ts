import type { ConstructorRef } from '../../models/driver';

export interface ConstructorGroup<T> {
  key: string;
  items: T[];
}

// Agrupa una lista YA ORDENADA por escuderia en tandas consecutivas: cada equipo es su propia
// fila, asi el compañero que queda cuando falta un piloto no se reacomoda al lado de otro equipo.
// No reordena: si el input viene desordenado, deja tandas separadas antes que fusionar mal.
export function groupByConstructor<T extends { constructor: ConstructorRef | null }>(
  items: T[],
): ConstructorGroup<T>[] {
  const groups: ConstructorGroup<T>[] = [];
  for (const item of items) {
    const key = item.constructor ? String(item.constructor.id) : 'sin-equipo';
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, items: [item] });
    }
  }
  return groups;
}
