import { PageShell } from '../../components/ui';
import { changelog } from './changelog';

// Sin texto a mano a proposito: todo sale de CHANGELOG.md, igual que el popover "Beta".
export function NovedadesPage() {
  return (
    <PageShell title="Novedades">
      <p className="mb-10 max-w-2xl text-slate-600 dark:text-ink-muted">
        BoxBox está en beta: anda, pero todavía le faltan cosas, y si encontramos un error en el
        cálculo de puntos y lo corregimos, las posiciones de tu liga se pueden mover. Acá queda
        anotado qué cambió en cada versión y qué falta.
      </p>

      {changelog.map((version) => (
        <section key={version.version} className="mb-10 last:mb-0">
          <h2 className="mb-4 flex flex-wrap items-baseline gap-x-3 text-xl font-bold text-slate-900 dark:text-ink-text">
            Versión {version.version}
            {version.date && (
              <span className="text-sm font-normal text-slate-500 dark:text-ink-muted">
                {version.date}
              </span>
            )}
          </h2>

          {version.sections.map((section) => (
            <div key={section.heading} className="mb-5 last:mb-0">
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-ink-text">
                {section.heading}
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-ink-muted">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </PageShell>
  );
}
