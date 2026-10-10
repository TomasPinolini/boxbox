import type { ConstructorRef } from '../../models/driver';

export interface ConstructorGroup<T> {
  key: string;
  items: T[];
}

// Agrupa una lista YA ORDENADA por escudería (ver drivers.service.ts / draft.service.ts) en
// tandas consecutivas del mismo equipo. Una grilla de 2 columnas por tanda, no una grilla
// continua con todos los items: si un piloto desaparece (lo pickean en el draft, o
// simplemente no corre esta temporada), el compañero que queda NO tiene que reacomodarse al
// lado de alguien de otro equipo — cada tanda es su propia fila, aunque le falte un piloto.
//
// No reordena nada: si el input no viene agrupado (dos tandas separadas del mismo id), las
// deja separadas en vez de fusionarlas — mejor dos filas sueltas que una fusión incorrecta
// si algún día el orden de entrada cambia sin que nadie actualice este archivo.
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
