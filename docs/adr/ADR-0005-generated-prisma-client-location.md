# ADR-0005: Cliente Prisma generado en `src/generated/prisma/` accedido vía `shared/prisma.ts`

**Date:** 2026-05-26
**Status:** Accepted (retroactivo)
**Author:** Tomás Pinolini

---

## Context

Prisma 7 permite configurar dónde se genera el cliente vía el bloque `generator client` en `schema.prisma`. Por default, Prisma genera en `node_modules/@prisma/client` y se importa con `import { PrismaClient } from '@prisma/client'`.

Apareció el caso: queremos versionar el cliente generado bajo control de versiones para diagnosticar errores de tipos en CI sin esperar al `prisma generate`. Y queremos asegurarnos que todo el codebase use **una sola instancia** del cliente (singleton) para evitar conexiones múltiples al DB en hot-reload de dev.

---

## Decision

1. El cliente generado vive en **`backend/src/generated/prisma/`** (custom location, no en `node_modules`).
2. El acceso al cliente en TODO el codebase pasa por una sola instancia exportada desde **`backend/src/shared/prisma.ts`**.
3. **Está prohibido** importar `PrismaClient` directamente desde `@prisma/client` o desde `generated/prisma/client` en código de aplicación.

---

## Alternatives considered

| Opción | Pros | Cons | Por qué rechazada |
|---|---|---|---|
| **Custom location + singleton en `shared/prisma.ts`** | Cliente versionable y diff-able, un solo punto de instanciación, hot-reload sin múltiples conexiones, easy mock-point (no que mockeemos — ver ADR-0003 — pero la opción queda abierta) | Path no estándar (`generated/prisma/`), `.gitignore` debe excluirlo explícitamente | **Seleccionada** |
| Default `@prisma/client` import everywhere | Estándar Prisma, ningún `.gitignore` extra | Múltiples instancias en hot-reload → "Too many connections" en Postgres después de unos minutos de `ts-node-dev` | Bug operacional inaceptable en dev |
| Default location + singleton wrapper | Una instancia + path estándar | El cliente generado vive en `node_modules` → no se ve en repo, harder to diagnosticar errores de tipo desfasado | Pierdes visibilidad sin ganancia real |

---

## Consequences

### Positive

- **Singleton garantizado** — `ts-node-dev` puede hacer hot-reload todo el día sin abrir conexiones de Postgres infinitas.
- **Visibilidad del cliente** — `ls backend/src/generated/prisma/` te muestra qué tipos genera Prisma. Útil para debug.
- **Punto único de configuración** — si en el futuro hace falta agregar middleware, logging, o swapear el driver (`@prisma/adapter-pg`), se hace en `shared/prisma.ts` solamente.
- **Imports consistentes** — todo service importa `import { prisma } from '../../shared/prisma'`. No hay dos formas de hacer lo mismo.

### Negative / tradeoffs

- `.gitignore` lleva una entrada explícita (`/backend/src/generated/prisma`) que hay que mantener — si Prisma cambia el shape de output, hay que actualizar.
- Junior devs que vienen de tutoriales Prisma estándar van a tener que aprender la convención (`'../../shared/prisma'` en vez de `'@prisma/client'`). Documentado en `recipes/add-a-module.md` y `CLAUDE.md`.
- Si alguien hace `npx prisma generate` sin el adapter-pg flag, podría regenerar con configuración default y romper el setup. Mitigación: usar siempre `npm run db:generate` que respeta `prisma.config.ts`.

### Risks

- **Que alguien importe de `@prisma/client` por costumbre** y rompa la singleton property en hot-reload. Mitigación: lint rule futura (`no-restricted-imports`) que prohíba `@prisma/client` en `src/` excepto desde `shared/prisma.ts`. Por ahora, code review.

---

## Evidence in codebase

- [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma) — bloque `generator client { output = "../src/generated/prisma" }`.
- [`backend/src/shared/prisma.ts`](../../backend/src/shared/prisma.ts) — instancia singleton + `@prisma/adapter-pg`.
- [`backend/.gitignore`](../../backend/.gitignore) o root `.gitignore` — entrada `/backend/src/generated/prisma`.
- Todos los services importan `import { prisma } from '../../shared/prisma'` — `grep -r "from '@prisma/client'" backend/src/` debería devolver nada en código de aplicación.
- [`CLAUDE.md`](../../CLAUDE.md) sección *Prisma* documenta la convención.

---

## References

- Prisma docs sobre custom output: <https://www.prisma.io/docs/orm/prisma-schema/overview/generators#custom-output>
- Prisma + ts-node-dev hot-reload connection leak (Prisma issue tracker — varios reportes históricos).
