# BoxBox — Documentación

Carpeta de referencia para los dos devs del proyecto. Apunta a dos preguntas:

1. **"Me incorporo al proyecto, ¿qué leo primero?"** → seguí la lista de *Onboarding*.
2. **"Voy a construir una feature, ¿qué necesito saber?"** → seguí la lista de *Construir una feature*.

Las convenciones del backend (request lifecycle, módulos, errores, Prisma) viven en [`../CLAUDE.md`](../CLAUDE.md) — esa es la fuente de verdad de cómo se programa acá. Estos docs son referencia de **dominio** y **planificación**, no de convenciones.

---

## Para la cátedra — dónde está cada entregable

Mapa directo de lo que pide la consigna ([utnfrrodsw/tp](https://github.com/utnfrrodsw/tp), `docs.md`) al archivo que lo contiene:

| Entregable | Dónde |
|---|---|
| Propuesta actualizada | [`proposal.md`](./proposal.md) — incluye la sección *Desvíos respecto de esta propuesta* |
| Links a PR | [`proposal.md` § Pull Requests](./proposal.md#pull-requests) — listado completo y desglose por entregable |
| Instrucciones de instalación | [`tutorial.md`](./tutorial.md) |
| Tracking de features, bugs e issues | [Linear](https://linear.app/pinolini/team/BOX/all) |
| Documentación de la API | [`api-endpoints.md`](./api-endpoints.md) y [`error-codes.md`](./error-codes.md) |
| Deployment (links y credenciales) | [`entrega/deployment.md`](./entrega/deployment.md) |
| Video demo | **pendiente** — es el único entregable de Aprobación que falta |
| Contacto del grupo | [`../README.md` § Integrantes](../README.md#integrantes) — tomaspinolini2003@gmail.com, tomasrivero16@gmail.com |

---

## Onboarding (en orden)

1. [`tutorial.md`](./tutorial.md) — clonar repo, levantar Postgres, correr seed, ver data en TablePlus. **15-20 min.**
2. [`glossary.md`](./glossary.md) — definiciones de una línea para todas las entidades + términos del dominio (snake draft, soft-delete, externalId, etc.).
3. [`data-model.mmd`](./data-model.mmd) — diagrama ER completo del dominio (renderealo en VS Code con la extensión Mermaid, o en [mermaid.live](https://mermaid.live)).
4. [`domain-entities.md`](./domain-entities.md) — narrativa: qué representa cada entidad, qué atributos importan, cómo se relaciona, ciclo de vida, por qué existe.
5. [`api-endpoints.md`](./api-endpoints.md) — surface de la API, con tags `[✅ shipped]` / `[🚧 planned]` / `[🔒 outlier]` por sección.
6. [`backend/docs/roadmap.md`](../backend/docs/roadmap.md) y [`frontend/docs/roadmap.md`](../frontend/docs/roadmap.md) — los slices de cada carril, hechos y pendientes.

Al terminar este pasaje deberías poder responder: *qué hace BoxBox, qué entidades viven en el modelo, qué endpoints están vivos hoy y qué slice viene después*.

---

## Construir una feature (en orden)

1. El roadmap de tu carril — [`backend/docs/roadmap.md`](../backend/docs/roadmap.md) o [`frontend/docs/roadmap.md`](../frontend/docs/roadmap.md) — encontrá tu slice, leé `Goal` / `Touches` / `Done when` / `Blocked by`.
2. Si tu slice agrega un módulo nuevo, cloná `drivers/`: mismos nombres de archivo, misma forma de exports, mismas capas.
3. [`error-codes.md`](./error-codes.md) — si tu slice agrega errores nuevos, agregalos acá también.
4. Al terminar: abrí PR con el template del repo y referenciá el número de slice.

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
| [`backend/docs/roadmap.md`](../backend/docs/roadmap.md) | Planificación (backend) | Build |
| [`frontend/docs/roadmap.md`](../frontend/docs/roadmap.md) | Planificación (frontend) | Build |
| [`proposal.md`](./proposal.md) | Académico (congelado + desvíos) | Entrega |

---

## Reglas para mantener esto sano

- **Si agregás una entidad nueva**: actualizá `data-model.mmd` + `glossary.md` + agregá una entrada en `domain-entities.md`. Sin eso, drift garantizado.
- **Si agregás un endpoint**: actualizá `api-endpoints.md` con su tag. Si tira un código de error nuevo, agregalo a `error-codes.md`.
- **Si tomás una decisión técnica que será difícil de revertir y sorprendente sin contexto**: documentala en la descripción del PR, con las alternativas que descartaste.
- **El roadmap se mueve, no se reescribe**: cuando completás un slice, marcalo `done` y movelo a "Completados" al final del roadmap de su carril; no lo borres.
- **La numeración de slices es global a los dos carriles**: no se renumera al partir, ni al eliminar un slice. Un número más alto no implica dependencia — eso lo dice `Blocked by`.
- **`CLAUDE.md` es la fuente de convenciones**, no estos docs. Si hay drift, gana CLAUDE.md y se actualiza el doc que sobra.
