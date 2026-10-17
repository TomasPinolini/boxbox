import { describe, expect, it } from 'vitest';
import {
  CONSTRUCCIONES_NO_SOPORTADAS,
  changelog,
  changelogCrudo,
  limitacionesConocidas,
} from './changelog';

// Estos tests corren contra el CHANGELOG.md de verdad, no contra un fixture. Es la gracia: lo que
// tienen que detectar es que el archivo se escriba de una forma que el parser no cubre, y un
// fixture inventado nunca se desincroniza con el archivo real.
describe('changelog', () => {
  it('parsea al menos una version, con numero y fecha', () => {
    expect(changelog.length).toBeGreaterThan(0);
    for (const version of changelog) {
      expect(version.version).not.toBe('');
      // Si esto falla, un encabezado dejo de tener la forma `## [1.0.0] — 2026-10-13` y la
      // pantalla perdio la fecha sin avisar.
      expect(version.date, `la version ${version.version} quedo sin fecha`).not.toBe('');
    }
  });

  it('no pierde ningun bullet por el camino', () => {
    // Todo lo anterior a la primera version es preambulo y no se parsea a proposito.
    const desdeLaPrimeraVersion = changelogCrudo.slice(changelogCrudo.indexOf('\n## '));
    const bulletsEnElArchivo = desdeLaPrimeraVersion
      .split('\n')
      .filter((l) => l.startsWith('- ')).length;
    const bulletsParseados = changelog.reduce(
      (total, v) => total + v.sections.reduce((n, s) => n + s.items.length, 0),
      0,
    );
    // Si esto falla, lo mas probable es que un bullet haya quedado fuera de un `###` y el parser
    // lo tiro al piso: la pantalla mostraria menos de lo que el archivo dice.
    expect(bulletsParseados).toBe(bulletsEnElArchivo);
  });

  it('no usa markdown que la pantalla no sabe dibujar', () => {
    for (const version of changelog) {
      for (const section of version.sections) {
        expect(section.heading).not.toMatch(CONSTRUCCIONES_NO_SOPORTADAS);
        for (const item of section.items) {
          // Si esto falla: o se agranda el parser, o se reescribe la linea del CHANGELOG.md.
          // Lo que NO puede pasar es que el usuario vea `**texto**` crudo en pantalla.
          expect(item, `en "${section.heading}"`).not.toMatch(CONSTRUCCIONES_NO_SOPORTADAS);
        }
      }
    }
  });

  it('la ultima version declara sus limitaciones conocidas', () => {
    // El popover del rotulo "Beta" muestra esto. Vacio = el usuario abre la ayuda y no lee nada.
    expect(limitacionesConocidas().length).toBeGreaterThan(0);
  });
});
