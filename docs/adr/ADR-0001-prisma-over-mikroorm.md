# ADR-0001: Mantener Prisma 7 + Postgres en lugar de migrar a MikroORM + MySQL

**Date:** 2026-05-26
**Status:** Accepted (retroactivo)
**Author:** Tomás Pinolini

---

## Context

En el curso Desarrollo de Software (UTN FRRO) el profesor usó MikroORM + MySQL como stack del tutorial práctico de ORM. El proyecto BoxBox ya tenía implementado el scaffold backend con Prisma 7 + Postgres (5 módulos CRUD shipeados, tests verdes, migraciones aplicadas). Apareció la pregunta: ¿migrar para alinear con el material del profe?

---

## Decision

Mantenemos **Prisma 7 + Postgres**. No migramos a MikroORM + MySQL.

---

## Alternatives considered

| Opción | Pros | Cons | Por qué rechazada |
|---|---|---|---|
| **Prisma 7 + Postgres** | Ya implementado, tests verdes, schema-first declarativo, type safety end-to-end, `@@unique` compuestos, soft-delete soportado, mejor ecosistema en 2026 | Más opinionado, harder to extend en casos exóticos, generated client en directorio no estándar | **Seleccionada** |
| Migrar a MikroORM + MySQL | Alinea con tutorial del profe, EntityManager/Repository pattern explícito (didáctico), MySQL más conocido por algunos jurados | Reescritura completa de 5 módulos + tests + migraciones, romper el seed funcional, MikroORM con MySQL tiene más fricción de tipos, perder lo que ya laburamos | Costo de migración mata cualquier valor pedagógico — los conceptos del tutorial se pueden traducir mentalmente sin reescribir código |
| Hybrid: Prisma para módulos shipeados + MikroORM para nuevos | "Lo mejor de ambos" | Dos ORMs en el mismo backend → infierno de mantenimiento, tipos inconsistentes, sync entre schemas | Catastrófico — nunca |

---

## Consequences

### Positive

- Avanzamos directo sobre el roadmap sin paréntesis de 1-2 semanas para migrar.
- Type safety end-to-end con `z.infer` (Zod) + Prisma generated types.
- Una sola fuente de verdad del schema (`schema.prisma`).
- Tests siguen funcionando contra la DB real.

### Negative / tradeoffs

- Los ejemplos del profe (MikroORM EntityManager, `em.persist()`, `em.flush()`, repositories explícitos) requieren traducción mental al equivalente en Prisma (`prisma.x.upsert`, etc.). Documentado one-off en notas personales.
- Si el profe pide explicar `Repository pattern` en una defensa oral, tenemos que explicar **por qué Prisma no lo necesita** en este contexto (ver ADR-0002), no improvisar.

### Risks

- **Que el profe penalice no usar su stack.** Mitigación: el TP no exige stack específico; lo que se evalúa es funcionalidad + calidad. El stack moderno (Prisma + Postgres + TypeScript) es defendible en cualquier defensa.

---

## Evidence in codebase

- [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma) — schema declarativo Prisma con todas las tablas.
- [`backend/package.json`](../../backend/package.json) — `@prisma/client`, `@prisma/adapter-pg`, `prisma` en deps. No hay `@mikro-orm/*`.
- [`backend/src/shared/prisma.ts`](../../backend/src/shared/prisma.ts) — instancia singleton del cliente Prisma usada por todos los services.
- 5 módulos shipeados usan exclusivamente Prisma (no se introdujo capa de abstracción).

---

## References

- Prisma 7 release notes (cambios de `prisma.config.ts` y migrate reset behavior aplican a este repo).
- MikroORM docs — referencia para traducciones mentales en notas personales (no en repo, ver memoria del equipo).
