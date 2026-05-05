# BoxBox — Material de aprendizaje compartido

Esta carpeta tiene tutoriales conceptuales que el equipo de BoxBox usa como referencia. Son material didáctico, no documentación técnica del proyecto en sí (para eso ver `docs/proposal.md`, `docs/data-model.mmd`, `docs/api-endpoints.md`).

## Estructura

- **[`backend/`](./backend/)** — tutoriales sobre el lado backend del stack (Express, TypeScript, Prisma, Postgres, REST, herramientas de desarrollo).
- **[`frontend/`](./frontend/)** — tutoriales sobre el lado frontend del stack (React, Vite, Tailwind, fetch, hooks, componentes). Se irá poblando a partir de mediados de 2026 cuando arranque el frontend.

## Para qué sirve este material

Tutoriales escritos en estilo conversacional bilingüe (español + términos técnicos en inglés), pensados para alguien que está aprendiendo a la par del proyecto. Cada uno cubre un concepto con:

- **La historia que justifica todo** — el problema concreto que el concepto resuelve.
- **Modelo mental** — analogía cotidiana para anclar la idea.
- **Walkthrough con código real del repo** — siempre referenciado a archivos específicos de BoxBox.
- **Try it yourself** — un ejercicio práctico de 10-15 min.
- **Predicción de confusiones** — los pisos típicos donde un beginner se traba.

## Roadmap de tutoriales por semana

Este es el plan **propuesto** de tutoriales, paceado contra `plan_de_estudio.md`. Es una **guía**, no un contrato — algunas semanas pueden tener más o menos tutoriales según la complejidad de los temas y lo que vaya surgiendo durante el aprendizaje. Las semanas de **entrega** y **buffer** son intencionalmente livianas para no saturar.

### Backend track

| Semana | Foco del plan_de_estudio | Tutoriales | Estado |
|---|---|---|---|
| **[1](backend/semana-01/)** (19/4 - 25/4) | Setup + higiene | [01 — Prettier](backend/semana-01/01-prettier---el-formateador-automatico.md) · [02 — ESLint](backend/semana-01/02-eslint---el-corrector-logico.md) · [03 — Convención de commits](backend/semana-01/03-convencion-de-commits.md) · [04 — Leer un ER diagram](backend/semana-01/04-leer-un-er-diagram---mermaid-y-crows-foot.md) · [05 — Leer una REST API spec](backend/semana-01/05-leer-una-rest-api-spec.md) | ✅ Hecho |
| **[2](backend/semana-02/)** (26/4 - 2/5) | JS fundamentals pt.1 + escribir `domain-entities.md` | [01 — JS types y memoria](backend/semana-02/01-js-types-y-memoria---del-background-python-y-c.md) · [02 — Cómo armar `domain-entities.md`](backend/semana-02/02-como-armar-domain-entities-desde-un-er.md) | ✅ Hecho |
| **[3](backend/semana-03/)** (3/5 - 9/5) | JS funciones + estructura de carpetas | [00 — Funciones como valores](backend/semana-03/00-funciones-como-valores.md) · [01 — Closures, callbacks y this](backend/semana-03/01-closures-callbacks-y-this.md) · El patrón modules de BoxBox (vs MVC clásico) | ⏳ En curso |
| **4** (10/5 - 16/5) | Objetos + TS config | TypeScript en BoxBox — interfaces, types, generics básicos · Anatomía de `package.json` y `tsconfig.json` | 🔜 |
| **5** (17/5 - 23/5) | Express CRUD pt.1 | Express request lifecycle — middleware chain · Diseñar respuestas REST (status codes, envelope) | 🔜 |
| **6** (24/5 - 30/5) | Express CRUD pt.2 + MVC | Validación con Zod — schemas, types inferidos · Centralized error handling — `AppError`, `NotFoundError`, `ConflictError` | 🔜 |
| **7** (31/5 - 5/6) | 🎯 Entrega 5/6 (CRUD en memoria) | (Buffer week — quiz baseline + repaso, sin tutoriales nuevos) | 🔜 |
| **8** (8/6 - 14/6) | Diseñar schema + escribir `schema.prisma` | Modelando con Prisma — del ER al schema · Relaciones en Prisma — sintaxis y semántica | 🔜 |
| **9** (15/6 - 21/6) | Prisma hands-on + seeds | `prisma migrate dev` — qué pasa cuando lo corrés · Seeds — datos para desarrollo realistas | 🔜 |
| **10** (22/6 - 28/6) | MikroORM videos (bridge a Prisma) | Tabla de traducción MikroORM → Prisma · Prisma client API — los métodos que usás 95% del tiempo | 🔜 |
| **11** (29/6 - 5/7) | Relaciones y cascade | Cascade, restrict, soft-delete — el toolbox real · `include`, `select`, `where` con relations | 🔜 |
| **12** (6/7 - 12/7) | 🎯 Entrega 12/7 (CRUD por integrante con DB) + Testing | Vitest + Supertest — el setup de BoxBox explicado · Tests de integración con DB real — por qué no mockeamos | 🔜 |

### Bridge backend → frontend

| Semana | Foco | Tutoriales | Estado |
|---|---|---|---|
| **13** (13/7 - 19/7) | React + Vite setup | Vite vs alternatives — por qué · Componentes y props — el mental model de React | 🔜 |
| **14** (20/7 - 26/7) | Fetch real + estructura frontend | `useEffect` y el ciclo de vida de un componente · TanStack Query — caché y states en 5 min | 🔜 |
| **15** (27/7 - 31/7) | 🎯 Entrega 31/7 (GET ALL frontend → backend) | Conectar frontend y backend — CORS, env vars, dev vs prod | 🔜 |

### Frontend track (compañero, plan paralelo a definir)

El compañero del frontend va a tener su propio listado de tutoriales paceado contra una curriculum de prep paralela durante semanas 1-12. **El listado se construye después de cerrar la semana 1 del backend.** Ver `frontend/README.md` para el estado actual.

Categorías tentativas (a confirmar cuando se arme el plan):

- **Foundations web (semanas 1-6 paralelas):** HTML5 semántico, accesibilidad básica, CSS (selectors, box model, flexbox, grid), responsive con mobile-first y breakpoints, JavaScript en el browser (DOM, events).
- **HTTP + JSON (semana 7-8 paralelas):** fetch nativo, JSON, CORS, errores HTTP del lado cliente.
- **React + tooling (semanas 9-12 paralelas):** React mental model, JSX, props (input/output), state (`useState`), effects (`useEffect`), Vite, Tailwind.
- **Project work (semanas 13-15, en sync con backend):** los mismos 3 tutoriales de la sección "Bridge" arriba, pero adaptados a frontend.

### Roadmap post-31/7 (no priorizado todavía)

Cuando se cierre la entrega del 31/7 y queden los meses hasta el milestone oficial de la cátedra (12/10), hay espacio para tutoriales avanzados:

- Auth (JWT, bcrypt, middleware de protección de rutas)
- Socket.io para el draft en vivo
- React Hook Form + Zod en frontend (forms validados end-to-end)
- Playwright e2e
- Deploy (Vercel + Railway)
- Integración con APIs externas (Jolpica-F1, OpenF1)

Estos no se planifican ahora. Cuando llegue el momento, decidimos prioridades en función del estado del proyecto.

---

## Origen

Estos tutoriales se escribieron usando el [`coding-tutor` skill](https://skills.sh/everyinc/compound-engineering-plugin/coding-tutor) (Every Inc, 2026). El skill mantiene una copia personal de cada tutorial en la máquina de cada integrante con su propio quiz history y understanding score; las copias compartidas en este repo son de referencia.

## Contribuir

Si encontrás errores, ambigüedades o querés sugerir nuevos tutoriales, abrí un issue o un PR. Los tutoriales están en español de Argentina (vos en lugar de tú).
