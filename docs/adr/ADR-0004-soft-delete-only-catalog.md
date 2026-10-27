# ADR-0004: Soft-delete solo en entidades de catálogo

**Date:** 2026-05-26
**Status:** Accepted (retroactivo)
**Author:** Tomás Pinolini

---

## Context

Al modelar el schema, surgió la pregunta: ¿qué entidades llevan `deletedAt` (soft-delete) y cuáles se borran físicamente con `DELETE FROM`?

Opciones extremas:

- **Todo soft-delete** — nunca perdemos data pero el schema se llena de filtros `deletedAt: null` y los reads son más caros.
- **Todo hard-delete** — más simple, pero perder un Driver con RaceResults históricos rompe foreign keys y data histórica.

Necesitábamos una regla intermedia clara.

---

## Decision

Soft-delete (`deletedAt: DateTime?`) solo en **entidades de catálogo**: `Driver`, `Constructor`, `Circuit`.

Todas las demás entidades se borran físicamente (o no se borran nunca por diseño, ej: `RaceResult`, `LeagueStanding`).

---

## Alternatives considered

| Opción | Pros | Cons | Por qué rechazada |
|---|---|---|---|
| **Soft-delete solo en catálogo** | Preserva historia donde importa (un Driver retirado sigue ligado a sus RaceResults pasados), schema simple en transaccionales, queries más rápidas en tablas grandes (RaceResult no tiene `deletedAt` que filtrar) | Hay que recordar dos políticas; algunas entidades borderline (Season, Race) podrían pedir soft-delete en el futuro | **Seleccionada** |
| Soft-delete en todo | Nunca perdemos data; uniforme | Schema lleno de `deletedAt`, filtro `deletedAt: null` en cada read → fácil olvidarse y leakear borrados; Prisma no tiene soft-delete nativo → cada filtro es manual | Overhead permanente para casos que no lo necesitan (un `LeagueStanding` borrado no necesita persistir, se regenera) |
| Hard-delete en todo | Schema mínimo, sin filtros adicionales | Borrar un Driver rompe FKs en RaceResult y FantasyTeam → o se cascadea (perder data histórica) o se prohíbe (resistencia operacional sin guardrails claros) | Pérdida de data histórica inaceptable para una app que se mide a sí misma por temporada |
| Status enum (`ACTIVE/RETIRED/DELETED`) en lugar de `deletedAt` | Más expresivo, soporta más estados que solo "borrado" | Para el caso "borrado" puro es overkill, requiere migración adicional, mismos costos de queries (filtrar por status) | El caso BoxBox no necesita los estados intermedios — un Driver está activo o retirado, no hay nada más |

---

## Consequences

### Positive

- **Driver, Constructor y Circuit nunca se pierden** — un piloto retirado sigue ligado a su histórico de RaceResults sin romper FKs.
- Para evitar leaks, todos los reads en services filtran `deletedAt: null` explícitamente. Patrón aislado en una constante `const notDeleted = { deletedAt: null }` por service (ver `drivers.service.ts:12`).
- Antes de soft-deletear, los services chequean dependencias activas y tiran `X_HAS_DEPENDENCIES` si las hay → el borrado nunca rompe data viva.
- Schema permanece simple en entidades transaccionales (Race, RaceResult, LeagueStanding, FantasyTeam, etc.).

### Negative / tradeoffs

- **Política asimétrica** = el dev tiene que recordar cuál política aplica. Mitigación: las únicas con `deletedAt` son las 3 de catálogo, fácil de memorizar.
- Las 3 tablas con soft-delete tienen un campo "borrado" que el frontend probablemente no ve nunca (filtrado a nivel service) — duplicación de policy entre DB y app layer.
- `findUnique` por `externalId` en services de catálogo **no filtra `deletedAt`** intencionalmente — para detectar duplicados aunque la fila previa esté borrada. Esto crea un caso donde una creación falla con `X_ALREADY_EXISTS` aunque el item no aparezca en listados. Tradeoff aceptado: previene re-syncs desde Jolpica que recreen filas zombi.

### Risks

- **Olvidarse del `deletedAt: null` en un read nuevo** → leak de borrados en endpoints. Mitigación: code review + el patrón `notDeleted` reutilizado.
- **Tablas crecen sin parar** (no hay hard delete eventual) → en BoxBox no es realista que afecte (max ~25 drivers/año, ~12 circuitos/año), pero en una app con catálogo grande habría que considerar archive policy.

---

## Evidence in codebase

- [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma) — `deletedAt DateTime?` solo en `Driver`, `Constructor`, `Circuit`.
- [`backend/src/modules/drivers/drivers.service.ts:12`](../../backend/src/modules/drivers/drivers.service.ts#L12) — `const notDeleted = { deletedAt: null }` pattern.
- [`backend/src/modules/drivers/drivers.service.ts:66-89`](../../backend/src/modules/drivers/drivers.service.ts#L66) — chequeo de dependencias antes de soft-delete + lanza `DRIVER_HAS_DEPENDENCIES`.
- `Race`, `RaceResult`, `LeagueStanding`, `FantasyTeam`, `LeagueMember`, etc. **no** tienen `deletedAt` en el schema.

---

## References

- Patrón documentado en [`CLAUDE.md`](../../CLAUDE.md) sección *Prisma*.
- Discusión sobre dependencies-check pattern en [`recipes/add-a-module.md`](../recipes/add-a-module.md).
