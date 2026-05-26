# BoxBox — Documentación

Carpeta de referencia para los dos devs del proyecto. Apunta a dos preguntas:

1. **"Me incorporo al proyecto, ¿qué leo primero?"** → seguí la lista de *Onboarding*.
2. **"Voy a construir una feature, ¿qué necesito saber?"** → seguí la lista de *Construir una feature*.

Las convenciones del backend (request lifecycle, módulos, errores, Prisma) viven en [`../CLAUDE.md`](../CLAUDE.md) — esa es la fuente de verdad de cómo se programa acá. Estos docs son referencia de **dominio** y **planificación**, no de convenciones.

---

## Onboarding (en orden)

1. [`tutorial.md`](./tutorial.md) — clonar repo, levantar Postgres, correr seed, ver data en TablePlus. **15-20 min.**
2. [`glossary.md`](./glossary.md) — definiciones de una línea para todas las entidades + términos del dominio (snake draft, lockDate, externalId, etc.).
3. [`data-model.mmd`](./data-model.mmd) — diagrama ER completo del dominio (renderealo en VS Code con la extensión Mermaid, o en [mermaid.live](https://mermaid.live)).
4. [`domain-entities.md`](./domain-entities.md) — narrativa: qué representa cada entidad, qué atributos importan, cómo se relaciona, ciclo de vida, por qué existe.
5. [`api-endpoints.md`](./api-endpoints.md) — surface de la API, con tags `[✅ shipped]` / `[🚧 planned]` / `[🔒 outlier]` por sección.
6. [`roadmap.md`](./roadmap.md) — qué falta construir, en qué orden, qué bloquea qué.

Al terminar este pasaje deberías poder responder: *qué hace BoxBox, qué entidades viven en el modelo, qué endpoints están vivos hoy y qué slice viene después*.

---

## Construir una feature (en orden)

1. [`roadmap.md`](./roadmap.md) — encontrá tu slice, leé `Goal` / `Touches` / `Done when` / `Blocked by`.
2. [`recipes/add-a-module.md`](./recipes/add-a-module.md) — si tu slice agrega un módulo nuevo, esta es la receta paso a paso (clonando `drivers/`).
3. [`adr/`](./adr/) — leé las ADRs relevantes a tu área (ej: si tocás tests, leé la ADR de "real-DB integration tests, no mocks"). Te ahorrás reabrir decisiones cerradas.
4. [`error-codes.md`](./error-codes.md) — si tu slice agrega errores nuevos, agregalos acá también.
5. Al terminar: abrí PR con el template del repo y referenciá el número de slice.

---

## Request lifecycle (resumen)

```
HTTP request
   │
   ▼
helmet            ← security headers
   │
   ▼
cors              ← solo orígenes en FRONTEND_URL
   │
   ▼
express.json      ← parsea body
   │
   ▼
router /api/v1/X  ← `app.ts` registra cada módulo
   │
   ▼
validate(schema)  ← Zod; reemplaza req.body con el parseado
   │
   ▼
controller        ← try/catch, llama service, arma envelope
   │
   ▼
service           ← lógica + Prisma; tira AppError/NotFoundError/ConflictError
   │
   ▼
prisma            ← consulta DB (filtrando deletedAt: null donde aplica)
   │
   ▼
errorHandler      ← convierte AppError a { error: { code, message, status } }
   │
   ▼
HTTP response     ← { data } | { error }
```

Detalles + envelope shape: ver [`../CLAUDE.md`](../CLAUDE.md) sección *Backend Architecture*.

---

## Mapa de la carpeta

| Archivo | Tipo | Vive |
|---|---|---|
| [`tutorial.md`](./tutorial.md) | Setup | Local |
| [`glossary.md`](./glossary.md) | Referencia | Dominio |
| [`data-model.mmd`](./data-model.mmd) | Referencia | Dominio |
| [`domain-entities.md`](./domain-entities.md) | Referencia | Dominio |
| [`api-endpoints.md`](./api-endpoints.md) | Referencia | API |
| [`error-codes.md`](./error-codes.md) | Referencia | API |
| [`roadmap.md`](./roadmap.md) | Planificación | Build |
| [`recipes/add-a-module.md`](./recipes/add-a-module.md) | How-to | Build |
| [`adr/`](./adr/) | Decisiones | Historia |
| [`proposal.md`](./proposal.md) | Académico (congelado) | Entrega |

---

## Reglas para mantener esto sano

- **Si agregás una entidad nueva**: actualizá `data-model.mmd` + `glossary.md` + agregá una entrada en `domain-entities.md`. Sin eso, drift garantizado.
- **Si agregás un endpoint**: actualizá `api-endpoints.md` con su tag. Si tira un código de error nuevo, agregalo a `error-codes.md`.
- **Si tomás una decisión técnica que será difícil de revertir y sorprendente sin contexto**: escribí una ADR en `adr/` con `/draft-adr`.
- **El roadmap se mueve, no se reescribe**: cuando completás un slice, marcalo `done` y movelo al final del archivo o a un `done/` log; no lo borres.
- **`CLAUDE.md` es la fuente de convenciones**, no estos docs. Si hay drift, gana CLAUDE.md y se actualiza el doc que sobra.
