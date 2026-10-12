# Domain docs

Este repo **no usa `CONTEXT.md`**. El modelo de dominio vive repartido en tres
lugares, y ése es el orden en que se leen:

1. **`docs/glossary.md`** — vocabulario ubicuo. Los términos de ahí son los que se
   usan en código, en docs y hablando. Si una decisión introduce una palabra nueva
   (por ejemplo `sprint` o `sesión`), su entrada va acá.
2. **`docs/adr/ADR-NNNN-<slug>.md`** — una decisión por archivo, numeradas de forma
   creciente y en español. El último es `ADR-0009-archivar-league-en-lugar-de-borrarla.md`.
   Un ADR registra la decisión **y lo que la obliga** (en el 0009: que todo FK hacia
   `leagues` es `ON DELETE RESTRICT`, así que un borrado físico falla).
3. **`docs/data-model.mmd`** — diagrama ER. Verificado campo por campo contra
   `schema.prisma`. Su comentario de cabecera lleva la decisión de diseño que más
   conviene conocer: `RaceResult` no tiene `constructorId`, la relación
   piloto→escudería la posee `DriverSeason`.

## Regla de lectura

`backend/prisma/schema.prisma` es la fuente de verdad del modelo. Los docs se
atrasan; el schema no. `CLAUDE.md` lo dice explícito: *"When in doubt about what is
actually implemented, trust the source, not the docs."*

Verificado el 2026-10-11: `CLAUDE.md` todavía lista los Slices 9 y 12 como
*planned, not built*, y los dos están construidos (`backend/src/modules/standings/`
y `backend/src/modules/sync/` existen, con tests).
