import { describe, expect, it } from 'vitest';
import type { ConstructorRef } from '../../models/driver';
import { groupByConstructor } from './group-by-constructor';

const alpine: ConstructorRef = { id: 1, name: 'Alpine', color: '#000', logoUrl: null };
const ferrari: ConstructorRef = { id: 2, name: 'Ferrari', color: '#E8002D', logoUrl: null };

describe('groupByConstructor', () => {
  it('agrupa tandas consecutivas del mismo equipo', () => {
    const items = [
      { id: 1, constructor: alpine },
      { id: 2, constructor: alpine },
      { id: 3, constructor: ferrari },
    ];

    expect(groupByConstructor(items)).toEqual([
      { key: '1', items: [items[0], items[1]] },
      { key: '2', items: [items[2]] },
    ]);
  });

  // El caso que reporto el bug: a un piloto de Alpine lo pickean (desaparece del array) y el
  // companero que queda tiene que seguir solo en su propia fila, no pegado a Ferrari.
  it('un equipo con un solo piloto disponible queda en su propia tanda, no se mezcla con el siguiente', () => {
    const items = [
      { id: 2, constructor: alpine }, // el companero de equipo ya fue pickeado
      { id: 3, constructor: ferrari },
      { id: 4, constructor: ferrari },
    ];

    expect(groupByConstructor(items)).toEqual([
      { key: '1', items: [items[0]] },
      { key: '2', items: [items[1], items[2]] },
    ]);
  });

  it('sin equipo va a su propia tanda, no se mezcla con ningun equipo real', () => {
    const items = [
      { id: 1, constructor: alpine },
      { id: 2, constructor: null },
      { id: 3, constructor: ferrari },
    ];

    expect(groupByConstructor(items)).toEqual([
      { key: '1', items: [items[0]] },
      { key: 'sin-equipo', items: [items[1]] },
      { key: '2', items: [items[2]] },
    ]);
  });

  it('lista vacia da cero tandas', () => {
    expect(groupByConstructor([])).toEqual([]);
  });
});
