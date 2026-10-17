import raw from '../../../../CHANGELOG.md?raw';

// La pantalla /novedades y el popover del rotulo "Beta" leen EL MISMO CHANGELOG.md de la raiz.
// Es a proposito: con el texto escrito a mano en los dos lados, el dia que arreglemos una
// limitacion habria que acordarse de editar tres archivos, y el que se olvide hace que la app le
// mienta al usuario — sin romper ningun test, sin error en consola, para siempre.
//
// `?raw` es de Vite: trae el archivo como string sin interpretarlo. Verificado que anda en las
// dos formas (2026-10-16): en `vite build` queda inline en el bundle, y en dev Vite reescribe el
// import a /@fs/<ruta absoluta>?import&raw y lo sirve 200. Vitest es el que SI necesita que el
// archivo este en server.fs.allow (ver vite.config.ts): levanta su propio server, con la lista
// mas angosta, y sin eso falla con "Denied ID .../CHANGELOG.md?raw".
//
// El preambulo del archivo —el que explica ADR-0011 y el contrato HTTP— NO se renderiza: esta
// escrito para quien tiene el repo abierto. El parseo arranca en la primera version.

export type ChangelogSection = { heading: string; items: string[] };
export type ChangelogVersion = { version: string; date: string; sections: ChangelogSection[] };

// Lo que el renderer NO sabe dibujar: negrita, codigo inline, links, listas numeradas, citas y
// tablas. Hoy ninguna aparece dentro de una seccion de version, y el test falla el dia que
// alguien escriba una — ahi se decide si se agranda el parser o se reescribe la linea.
export const CONSTRUCCIONES_NO_SOPORTADAS = /\*\*|`|\[[^\]]+\]\([^)]+\)|^\s*\d+\.\s|^>|^\|/;

export function parseChangelog(md: string): ChangelogVersion[] {
  const versions: ChangelogVersion[] = [];
  let version: ChangelogVersion | null = null;
  let section: ChangelogSection | null = null;

  for (const line of md.split('\n')) {
    const encabezadoVersion = /^## (.+)$/.exec(line);
    if (encabezadoVersion) {
      // Forma real del archivo: `## [1.0.0] — 2026-10-13`. Si alguna version no la respeta, no
      // tiramos: queda el encabezado crudo como nombre y la fecha vacia, y el test lo marca.
      const partes = /^\[(.+?)\]\s*[—–-]\s*(.+)$/.exec(encabezadoVersion[1].trim());
      version = {
        version: partes ? partes[1] : encabezadoVersion[1].trim(),
        date: partes ? partes[2].trim() : '',
        sections: [],
      };
      versions.push(version);
      section = null;
      continue;
    }

    // Todo lo anterior a la primera version es el preambulo, y no se muestra.
    if (!version) continue;

    const encabezadoSeccion = /^### (.+)$/.exec(line);
    if (encabezadoSeccion) {
      section = { heading: encabezadoSeccion[1].trim(), items: [] };
      version.sections.push(section);
      continue;
    }

    const bullet = /^- (.+)$/.exec(line);
    if (bullet) {
      section?.items.push(bullet[1].trim());
      continue;
    }

    // Continuacion de un bullet que wrapea: en el archivo van indentadas dos espacios. Se pegan
    // al item anterior con un espacio, porque el salto de linea del .md es de ancho de columna,
    // no del contenido.
    if (/^\s+\S/.test(line) && section && section.items.length > 0) {
      section.items[section.items.length - 1] += ` ${line.trim()}`;
    }
  }

  return versions;
}

export const changelogCrudo = raw;
export const changelog = parseChangelog(raw);

// Keep a Changelog pone la version mas nueva arriba, asi que la primera es la que corre.
export function limitacionesConocidas(): string[] {
  const seccion = changelog[0]?.sections.find((s) => s.heading.startsWith('Limitaciones conocidas'));
  return seccion?.items ?? [];
}
