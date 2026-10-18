import { describe, expect, it } from 'vitest';
import { toIsoUtc, toLocalInput } from './race-dates';

describe('race-dates', () => {
  // Lo que importa no es el string literal (depende del TZ de quien corra el test) sino que
  // ida y vuelta no muevan la hora: es el bug que el admin vería al editar una carrera.
  it('ida y vuelta no corre la hora', () => {
    expect(toLocalInput(toIsoUtc('2026-07-05T14:00'))).toBe('2026-07-05T14:00');
  });

  it('toIsoUtc devuelve ISO con zona, que es lo que el backend exige', () => {
    expect(toIsoUtc('2026-07-05T14:00')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('toLocalInput devuelve "" para las fechas opcionales que vienen en null', () => {
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput(undefined)).toBe('');
    // Un string que no es fecha tampoco puede volver como "Invalid Date" dentro del input.
    expect(toLocalInput('cualquier cosa')).toBe('');
  });

  it('recorta los segundos: el input los rechaza', () => {
    expect(toLocalInput('2026-07-05T14:00:33.123Z')).toHaveLength(16);
  });
});
