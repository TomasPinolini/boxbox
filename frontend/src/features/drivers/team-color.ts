// Elige el color de texto que mejor se lee sobre el color de una escuderia.
// Separado de los componentes por react-refresh/only-export-components.

// Luminancia relativa segun WCAG 2.1. No es el promedio de RGB: el ojo es mucho mas sensible
// al verde que al azul, asi que un promedio plano da resultados malos con naranjas y celestes.
function luminance(hex: string): number | null {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;

  const channel = (offset: number) => {
    const value = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

// Razon de contraste entre dos luminancias, tambien de WCAG. Va de 1 (igual) a 21 (negro
// contra blanco). El minimo para texto normal es 4.5.
function contrast(a: number, b: number): number {
  const [dark, light] = a < b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

// Negro puro, no el slate-900 del resto del sistema de diseno. La diferencia no es cosmetica:
// con #111827 el rojo de Audi (#F10040) topaba en 4.07:1 y NINGUNA de las dos opciones llegaba
// al minimo. Con negro puro llega a 4.82 y los 11 equipos pasan. El costo es una inconsistencia
// de un tono en un badge chico; el beneficio es que se lee.
export const BADGE_DARK = '#000000';
export const BADGE_LIGHT = '#ffffff';

/**
 * Devuelve negro o blanco, el que tenga MAS contraste contra `hex`.
 *
 * Comparar la luminancia contra un umbral fijo (el clasico `> 0.5 ? negro : blanco`) falla con
 * los colores del medio: con umbral 0.5, el gris de Haas (#B6BABD, luminancia 0.487) elegia
 * blanco y quedaba en 1.95:1, ilegible. Lo mismo con el naranja de McLaren y el celeste de
 * Williams. Eligiendo el maximo, los 11 equipos de la grilla 2026 pasan el minimo de 4.5:1.
 */
export function textOn(hex: string): string {
  const l = luminance(hex);
  if (l === null) return BADGE_LIGHT; // color raro: el blanco es la apuesta mas segura

  return contrast(l, 0) > contrast(l, 1) ? BADGE_DARK : BADGE_LIGHT;
}

// Exportada para el test: permite afirmar el contraste real, no solo que devuelve un color.
export function contrastOf(hex: string, textHex: string): number {
  const bg = luminance(hex);
  const fg = luminance(textHex);
  if (bg === null || fg === null) return 0;
  return contrast(bg, fg);
}
