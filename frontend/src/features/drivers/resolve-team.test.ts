import { describe, expect, it } from 'vitest';
import type { ConstructorRef, Driver } from '../../models/driver';
import { resolveTeam } from './resolve-team';

const alpine: ConstructorRef = { id: 1, name: 'Alpine', color: '#0093CC', logoUrl: null };
const driver = (id: number, lastName: string): Driver => ({
  id,
  firstName: 'X',
  lastName,
  number: id,
  code: lastName.slice(0, 3).toUpperCase(),
  headshotUrl: null,
  constructor: alpine,
});
const colapinto = driver(43, 'Colapinto');
const gasly = driver(10, 'Gasly');

describe('resolveTeam', () => {
  it('cruza los ids con el catalogo respetando el orden', () => {
    expect(resolveTeam([10, 43], 1, [colapinto, gasly], [alpine])).toEqual({
      drivers: [gasly, colapinto],
      constructor: alpine,
    });
  });

  it('omite ids vacios o que el catalogo no tiene, y deja la escuderia en null', () => {
    expect(resolveTeam([null, 99, 43], undefined, [colapinto], [alpine])).toEqual({
      drivers: [colapinto],
      constructor: null,
    });
  });

  it('sin catalogo cargado todavia devuelve un equipo vacio', () => {
    expect(resolveTeam([43], 1)).toEqual({ drivers: [], constructor: null });
  });
});
