import raw from '../../../../CHANGELOG.md?raw';

// /novedades y el popover "Beta" leen el mismo CHANGELOG.md, para que la app no se desincronice.
// Vitest necesita el archivo en server.fs.allow (vite.config.ts) o falla con "Denied ID".

type ChangelogSection = { heading: string; items: string[] };
export type ChangelogVersion = { version: string; date: string; sections: ChangelogSection[] };

// Lo que el renderer no sabe dibujar; el test falla si aparece dentro de una version.
export const CONSTRUCCIONES_NO_SOPORTADAS = /\*\*|`|\[[^\]]+\]\([^)]+\)|^\s*\d+\.\s|^>|^\|/;

function parseChangelog(md: string): ChangelogVersion[] {
  const versions: ChangelogVersion[] = [];
  let version: ChangelogVersion | null = null;
  let section: ChangelogSection | null = null;

  for (const line of md.split('\n')) {
    const encabezadoVersion = /^## (.+)$/.exec(line);
    if (encabezadoVersion) {
      // `## [1.0.0] — 2026-10-13`. Si no respeta la forma, no tira: queda el encabezado crudo.
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

    // Continuacion indentada de un bullet: el salto del .md es de ancho de columna, no de contenido.
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
