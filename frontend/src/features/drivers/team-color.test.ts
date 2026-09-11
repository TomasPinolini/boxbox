import { describe, expect, it } from 'vitest';
import { BADGE_DARK, BADGE_LIGHT, contrastOf, textOn } from './team-color';

// Los 11 colores reales de la grilla 2026, tal como estan en la base.
const GRID_2026 = {
  Alpine: '#0093CC',
  'Aston Martin': '#229971',
  'Audi F1 Team': '#F10040',
  'Cadillac Racing': '#101010',
  Ferrari: '#E80020',
  Haas: '#B6BABD',
  McLaren: '#FF8000',
  Mercedes: '#27F4D2',
  'Racing Bulls': '#6692FF',
  'Red Bull Racing': '#3671C6',
  Williams: '#37BEDD',
};

describe('textOn', () => {
  // El test que importa: no verifica "devuelve un color", verifica que se pueda LEER.
  it.each(Object.entries(GRID_2026))('%s alcanza el contraste minimo de WCAG AA', (_, color) => {
    expect(contrastOf(color, textOn(color))).toBeGreaterThanOrEqual(4.5);
  });

  it('usa texto claro sobre fondos oscuros', () => {
    expect(textOn('#101010')).toBe(BADGE_LIGHT);
  });

  it('usa texto oscuro sobre fondos claros', () => {
    expect(textOn('#27F4D2')).toBe(BADGE_DARK);
  });

  // Regresion del bug que tenia la primera version: con un umbral fijo en 0.5, el gris de Haas
  // (luminancia 0.487) caia del lado equivocado y quedaba en 1.95:1.
  it('no se equivoca con los grises del medio, que es donde fallaba el umbral fijo', () => {
    expect(textOn('#B6BABD')).toBe(BADGE_DARK);
    expect(contrastOf('#B6BABD', textOn('#B6BABD'))).toBeGreaterThan(4.5);
  });

  it('cae a texto claro si el color viene mal formado', () => {
    expect(textOn('no-es-un-color')).toBe(BADGE_LIGHT);
    expect(textOn('#FFF')).toBe(BADGE_LIGHT);
  });
});
