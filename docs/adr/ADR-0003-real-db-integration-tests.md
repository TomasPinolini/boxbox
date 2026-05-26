# ADR-0003: Tests de integración contra Postgres real, no mocks

**Date:** 2026-05-26
**Status:** Accepted (retroactivo)
**Author:** Tomás Pinolini

---

## Context

Hay dos estrategias estándar para testear código que toca DB:

1. **Mockear el ORM** (ej: `vi.mock('@prisma/client')`) — tests rápidos, no necesitan DB corriendo, pero no detectan migrations rotas ni queries SQL malformadas.
2. **Test de integración contra DB real** — más lentos, requieren DB local, pero validan el contrato end-to-end (HTTP → router → controller → service → Prisma → SQL → DB).

Apareció la pregunta cuando se diseñó el primer módulo (`drivers`).

---

## Decision

**Tests de integración contra Postgres real.** Cada test corre contra el mismo `DATABASE_URL` configurado en `.env`. Antes de cada test, `TRUNCATE ... CASCADE` wipea todas las tablas en orden FK-safe.

---

## Alternatives considered

| Opción | Pros | Cons | Por qué rechazada |
|---|---|---|---|
| **Integración contra DB real + TRUNCATE per-test** | Detecta migrations rotas, queries SQL malformadas, constraints violados, soft-delete logic real; matchea exactamente lo que corre en prod | Más lentos (cada test = ~50-200ms), requieren DB local corriendo, tests no pueden correr en paralelo entre archivos (mismo DATABASE_URL) | **Seleccionada** |
| Mock de Prisma con `vi.mock` | Súper rápidos (<10ms), tests puros sin dependencias externas | No detectan: migrations rotas, SQL malformado, `@@unique` violados en runtime, cascade behavior, soft-delete leak; los mocks divergen del comportamiento real → tests verdes + prod roto (un escenario que ya nos pasó en otro proyecto) | El TP es chico, la velocidad ganada no compensa el riesgo de tests sin valor |
| In-memory SQLite via Prisma | Sin DB local requerida, rápido | SQLite y Postgres tienen diferencias semánticas (transacciones, ENUMs, jsonb, CITEXT, FK behavior). Tests verdes contra SQLite ≠ verdes contra Postgres | Crearía falsa confianza |
| Testcontainers (docker para tests) | Aislamiento real por test/suite, no requiere DB local pre-existente | Setup más complejo (docker desktop, healthchecks), arranque lento del container, overkill para un TP de 2 personas | Excesivo para el contexto |

---

## Consequences

### Positive

- Cada test que pasa = el endpoint funciona end-to-end. No hay categoría de "tests pasan pero prod roto por Prisma".
- Los tests **doblan como documentación viva** de los códigos de error y status HTTP esperados.
- Cuando se rompe una migración, los tests fallan al boot — no en runtime sorpresa.
- El `TRUNCATE` per-test garantiza que cada test es independiente; el orden de ejecución no importa.

### Negative / tradeoffs

- Tests son ~10-50× más lentos que los unitarios mockeados. El suite completo (5 módulos) tarda ~15-30s en mi máquina. Para un TP es aceptable; para un microservicio con 1000 tests no.
- `fileParallelism: false` obligatorio en `vitest.config.ts` — todos los tests comparten un solo DATABASE_URL, no pueden correr files en paralelo. Mitigación: si el suite crece mucho, usar Testcontainers + DBs ephemeral.
- Requiere DB local corriendo antes de `npm test`. Documentado en [`tutorial.md`](../tutorial.md).
- Si te olvidás de agregar tu tabla nueva al `TRUNCATE` de `setup.ts`, los tests filtran state entre files → fallos intermitentes random. Documentado como pitfall en [`recipes/add-a-module.md`](../recipes/add-a-module.md).

### Risks

- **El suite se vuelva insoportablemente lento.** Mitigación: si pasa, considerar partir el suite en "rápidos" (services puros sin DB) y "lentos" (HTTP integration), corriendo los lentos solo en CI.

---

## Evidence in codebase

- [`backend/src/tests/setup.ts`](../../backend/src/tests/setup.ts) — `TRUNCATE ... CASCADE` en orden FK-safe en `beforeEach`.
- [`backend/vitest.config.ts`](../../backend/vitest.config.ts) — `fileParallelism: false`.
- [`backend/src/modules/drivers/drivers.test.ts`](../../backend/src/modules/drivers/drivers.test.ts) — patrón canónico de test: `supertest` contra el `app` real, assertions sobre `body.data` / `body.error.code`, sin mocks.
- Ausencia total de `vi.mock(...)` en la suite (`grep -r "vi.mock" backend/src/` → no results).

---

## References

- Vitest docs sobre `fileParallelism`.
- Discussion thread donde se decidió: ninguna formal — decisión tomada al implementar el primer módulo, basada en experiencia previa con tests mockeados que mintieron en producción.
