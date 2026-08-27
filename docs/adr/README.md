# Architecture Decision Records (ADRs)

Documentamos decisiones técnicas que son **(a) difíciles de revertir**, **(b) sorprendentes sin contexto** y **(c) producto de una trade-off real con alternativas**. Si una decisión no cumple las 3 condiciones, no hace falta ADR.

**Cuándo agregar una ADR:**

- Elegiste una librería sobre otra después de evaluar alternativas.
- Definiste un patrón estructural (módulos, capas, naming, error handling).
- Tomaste una decisión sobre tests, datos, o infraestructura que vas a explicar más de una vez.

**Cuándo NO agregar:**

- Bug fixes, renames, refactors mecánicos.
- Decisiones obvias (usar TypeScript en un proyecto TypeScript).
- Standards de formato (eso vive en `.prettierrc` / `eslint.config.ts`).

**Cómo escribir una:** corré `/draft-adr` desde tu working tree. Te genera el draft basándose en el diff actual + tu `--context="por qué elegimos X"`. Después editás y commiteás.

---

## Índice

| #                                                      | Título                                                                             | Status   | Tema                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------- | --------------------- |
| [0001](./ADR-0001-prisma-over-mikroorm.md)             | Mantener Prisma 7 + Postgres en lugar de migrar a MikroORM + MySQL                 | Accepted | ORM y DB              |
| [0002](./ADR-0002-no-repository-pattern.md)            | No agregar capa de Repository sobre Prisma                                         | Accepted | Arquitectura backend  |
| [0003](./ADR-0003-real-db-integration-tests.md)        | Tests de integración contra Postgres real, no mocks                                | Accepted | Testing               |
| [0004](./ADR-0004-soft-delete-only-catalog.md)         | Soft-delete solo en entidades de catálogo                                          | Accepted | Modelado de datos     |
| [0005](./ADR-0005-generated-prisma-client-location.md) | Cliente Prisma generado en `src/generated/prisma/` accedido vía `shared/prisma.ts` | Accepted | Convención de imports |
| [0006](./ADR-0006-draft-3-rondas-sin-reserva.md)       | Draft de 3 rondas — sin piloto reserva ni DriverSwap                               | Accepted | Dominio / alcance     |

**Nota:** Las ADRs 0001-0005 son **retroactivas** — documentan decisiones ya implementadas en el código. Status = `Accepted` desde el inicio (no `Draft`). La 0006 es la primera escrita **antes** de implementar.
