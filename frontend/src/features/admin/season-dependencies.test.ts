import { describe, expect, it } from 'vitest';
import type { Season } from '../../models/season';
import { cupoInsuficiente, deletionBlockedBy } from './season-dependencies';

function season(counts: Partial<Season['counts']>): Season {
  return {
    id: 1,
    year: 2026,
    isActive: false,
    driverCount: 22,
    counts: { races: 0, leagues: 0, drivers: 0, ...counts },
  };
}

describe('deletionBlockedBy', () => {
  it('no bloquea una temporada vacía', () => {
    expect(deletionBlockedBy(season({}))).toBeNull();
  });

  it('nombra la única dependencia que hay', () => {
    expect(deletionBlockedBy(season({ races: 24 }))).toBe('No se puede borrar: tiene 24 carreras.');
  });

  it('usa el singular cuando hay una sola', () => {
    expect(deletionBlockedBy(season({ leagues: 1 }))).toBe('No se puede borrar: tiene 1 liga.');
  });

  it('enumera las tres con "y" antes de la última', () => {
    expect(deletionBlockedBy(season({ races: 24, leagues: 2, drivers: 22 }))).toBe(
      'No se puede borrar: tiene 24 carreras, 2 ligas y 22 pilotos.',
    );
  });

  it('saltea las que están en cero', () => {
    expect(deletionBlockedBy(season({ races: 24, drivers: 22 }))).toBe(
      'No se puede borrar: tiene 24 carreras y 22 pilotos.',
    );
  });
});

describe('cupoInsuficiente', () => {
  // maxMembersForSeason = floor(driverCount / 2): con 3 pilotos entra 1 miembro, y una liga
  // de una sola persona no se puede jugar.
  it.each([
    [0, true],
    [1, true],
    [3, true],
    [4, false],
    [22, false],
  ])('con %i pilotos de cupo devuelve %s', (driverCount, esperado) => {
    expect(cupoInsuficiente(driverCount)).toBe(esperado);
  });
});
