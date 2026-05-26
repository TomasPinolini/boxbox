# ADR-0002: No agregar capa de Repository sobre Prisma

**Date:** 2026-05-26
**Status:** Accepted (retroactivo)
**Author:** Tomás Pinolini

---

## Context

El tutorial del profe (MikroORM-based) muestra una capa `Repository` que envuelve el `EntityManager`: `DriverRepository.findAll()` que internamente llama `em.find(Driver, {})`. Esa capa **es obligatoria en DataMapper-style ORMs** como MikroORM y TypeORM porque el EntityManager es genérico — el repository es donde se concentra la lógica de queries específicas por entidad.

Apareció la pregunta: ¿deberíamos hacer lo mismo en BoxBox? Es decir, crear `drivers.repository.ts` que envuelva los llamados a `prisma.driver.*`, dejando que el service llame al repository.

---

## Decision

**No agregamos capa de Repository.** El `prisma.driver.*` se llama directamente desde el service.

---

## Alternatives considered

| Opción | Pros | Cons | Por qué rechazada |
|---|---|---|---|
| **Sin repository (Prisma directo en service)** | Menos archivos (4 por módulo, no 5), menos indirección, los services siguen siendo testables porque los tests son de integración (no mockeamos), Prisma client ya provee la abstracción del DB driver | Si en el futuro queremos swappear Prisma por otra cosa, hay que tocar todos los services | **Seleccionada** |
| Repository wrapping puro (`DriverRepository.findAll() = prisma.driver.findMany()`) | "Capa para futuras abstracciones" | 0 valor agregado, +1 archivo por módulo, mismas queries dichas dos veces, los tests no se benefician (no mockeamos), zero protección real contra cambios de stack | Wrapping sin abstracción real — overhead sin beneficio |
| Repository con queries genéricas (`findAll`, `findOne`, `create`, etc.) | Algo de abstracción, base reutilizable | Genericiza demasiado: cada entidad tiene su propio shape de query (`where: { deletedAt: null }`, includes, filtros opcionales). Forzar generic = devuelve menos type safety que Prisma directo | Pierde el type safety que ganamos con Prisma — peor de los dos mundos |

---

## Consequences

### Positive

- 4 archivos por módulo, no 5 (`routes`, `controller`, `service`, `schema` + `test`). Consistencia con los 5 módulos ya shipeados.
- Cada query es explícita en el service — el lector ve el `prisma.x.findMany(...)` con el filter completo, sin saltar archivos.
- Type safety completo: Prisma genera tipos por query (incluye relaciones si las pedís), un repository genérico tendría que devolver tipos más débiles.
- Cuando un service tiene reglas de negocio complejas (ej: validar dependencias antes de soft-delete en `drivers.service.ts:67-89`), esas reglas están localizadas en un solo lugar.

### Negative / tradeoffs

- **Si llega el día de migrar a otra DB / otro ORM**, hay que tocar cada `service.ts` — no hay un único punto de cambio.
- Para alguien con background en TypeORM/MikroORM/Hibernate, "no repository" se siente raro. Hay que explicarlo a quien venga de ese mundo.
- Si dos services necesitan exactamente la misma query, la duplican (vs reusarla desde un repository compartido). En la práctica esto no aparece en CRUDs simples — aparecería cuando ya tengas que extraer un helper igual.

### Risks

- **Servicios crezcan hasta volverse monolitos de queries.** Mitigación: cuando un service supere ~200 líneas o tenga >10 queries, considerar extraer queries específicas a un módulo helper (no a un repository genérico).
- **El profe pregunte por Repository pattern en una defensa.** Mitigación: respuesta lista — "Prisma's client *es* la capa de repository en este stack; agregar otra encima sería wrapping sin abstracción. MikroORM lo necesita porque su EntityManager es genérico; el client de Prisma ya es específico por entidad."

---

## Evidence in codebase

- [`backend/src/modules/drivers/drivers.service.ts`](../../backend/src/modules/drivers/drivers.service.ts) — llama `prisma.driver.findMany`, `findFirst`, `findUnique`, `create`, `update` directo.
- Mismos 5 módulos shipeados sin `*.repository.ts`.
- [`CLAUDE.md`](../../CLAUDE.md) sección *Module pattern (strict convention)* explicita los 4 archivos obligatorios.

---

## References

- Prisma docs sobre por qué su API ya es "repository-like" por entidad: <https://www.prisma.io/docs/orm/prisma-client>
- Discusión Martin Fowler sobre Repository pattern aplicado solo en DataMapper ORMs (MikroORM, TypeORM) vs ActiveRecord-like (Prisma client).
