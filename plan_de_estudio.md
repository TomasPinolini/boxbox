# Plan de estudio DSW 2026 — boxbox (v2)

**Inicio**: 19/4/2026
**Entregas objetivo cátedra**: 5/6 · 12/7 · 31/7
**Carga**: 2-3 hs/semana (video + codeo sobre boxbox)
**Stack boxbox**: Express + TS + **Prisma + PostgreSQL** + React + Tailwind + Socket.io + **Vitest**

---

## Cambios vs v1

1. **Prisma + Postgres se mantiene** (no hay switch a MikroORM). Costo: bridging mental con los videos de MikroORM en semanas 10-11.
2. **Unit Testing con Jest: DESCARTADA** (es Angular-específica). Reemplazada por docs Vitest + Prisma + supertest.
3. **Web Inicial: DESCARTADA** (vanilla HTML/CSS). Reemplazada por docs Vite + React + Tailwind.
4. **Semana 1 liberada** del switch de ORM → setup robusto del proyecto.
5. **Semanas 12-15 son ~100% recursos externos**.

---

## Filtro final de playlists

| Playlist                             | Status                            | Razón                                                           |
| ------------------------------------ | --------------------------------- | --------------------------------------------------------------- |
| Backend Development (77)             | ✅ Columna vertebral              | Contiene todo el backend core                                   |
| Node JS DB Access: ORM/ODM/OxM (14)  | ❌ Skip                           | = videos 64-77 de Backend Dev                                   |
| MySql + TypeScript (8)               | 🟡 Opcional                       | = videos 56-63 de Backend Dev. Para entender qué abstrae un ORM |
| MongoDB + TypeScript (10)            | ❌ Skip                           | = videos 46-55 de Backend Dev + no usás Mongo                   |
| API REST Express + TS + ORM/ODM (44) | ❌ Skip                           | = videos 34-77 de Backend Dev                                   |
| Backend nodejs (12)                  | ❌ Skip                           | TTADS viejo, callbacks + Mongo obsoleto                         |
| Javascript - Good Parts (7)          | 🟡 Opcional                       | Videos 4 (closures) y 5 (prototypes) si querés profundidad      |
| Unit Testing con Jest (9)            | ❌ Skip (salvo video 1)           | Es Angular-específica, no React                                 |
| Web Inicial (8)                      | ❌ Skip (salvo video 7 Fetch API) | Vanilla HTML/CSS, irrelevante para React                        |

**Núcleo real a mirar**: ~55-60 videos únicos de Backend Dev + 2-3 sueltos opcionales.

---

## Milestones de la cátedra

- **5/6** — 1 CRUD backend en memoria (sin persistencia)
- **12/7** — 1 CRUD por integrante con BD completa
- **31/7** — 1 GET ALL desde el frontend al backend

---

## Plan semana por semana

### Semana 1 · 19/4 - 25/4 · Setup + higiene

**Videos (Backend Dev)**: 00 Intro, 01 Entorno, 02a Ejecución, 02b Runtimes, 03 SCM → **5 videos a 1.5x**

**Acción boxbox**:

- Verificar stack local: Node 20+, Postgres 15+, `npm install`, `npx prisma migrate dev`, `npm run dev`
- Revisar higiene: `.prettierrc`, ESLint, convención de commits
- Leer docs existentes: `/docs/proposal.md`, `data-model.mmd`, `api-endpoints.md`

### Semana 2 · 26/4 - 2/5 · JS fundamentals pt.1

**Videos (Backend Dev)**: 04-11 (variables, tipos, arrays, control flow, loops, iterate) → **8 videos a 2x**

**Acción boxbox**: sin código. Escribir `/docs/domain-entities.md` listando entidades y relaciones (User, League, Membership, Driver, Constructor, Race, DraftSession, DraftPick, Lineup, Prediction, RaceResult).

### Semana 3 · 3/5 - 9/5 · JS funciones

**Videos (Backend Dev)**: 12-22 (funciones completo) → **11 videos a 2x**

**Acción boxbox**: estructura de carpetas backend (controller → service → repository → Prisma).

### Semana 4 · 10/5 - 16/5 · Objetos + TS config

**Videos (Backend Dev)**: 23-33 (objects, JSON, passing args, TS config) → **11 videos a 2x**

**Acción boxbox**: revisar `tsconfig.json`, scripts npm, confirmar nodemon/tsx.

### Semana 5 · 17/5 - 23/5 · Express CRUD pt.1

**Videos (Backend Dev)**: api01-api05 (intro, GET all, GET one, POST, PUT) → **5 videos**

**Acción boxbox**: endpoint `GET /health` + middleware de logging (pino o morgan).

### Semana 6 · 24/5 - 30/5 · Express CRUD pt.2 + MVC

**Videos (Backend Dev)**: api06-api12 (sanitize, patch, delete, errors, MVC repo, controller) → **7 videos**

**Acción boxbox**: 1 CRUD en memoria para una entidad simple (Driver o Constructor). Array en memoria, sin Prisma.

### Semana 7 · 31/5 - 5/6 🎯 · ENTREGA 5/6

**Videos**: buffer / repaso

**Acción boxbox**: ✅ **Entregar 1 CRUD en memoria**. Tests manuales con REST Client o Postman. Commit limpio, README actualizado.

### Semana 8 · 8/6 - 14/6 · (MongoDB skip)

**Videos (Backend Dev)**: db01-db02, api13-api20 (MongoDB) → ❌ SKIP

**Acción boxbox**: diseñar schema. Actualizar `data-model.mmd`. Escribir `backend/prisma/schema.prisma` completo (sin migrate aún).

### Semana 9 · 15/6 - 21/6 · MySQL raw (opcional) + Prisma hands-on

**Videos (Backend Dev)**: api21-api28 (MySQL raw) → 🟡 **Opcional a 2x**. Mostrar qué abstrae un ORM.

**Acción boxbox** (esto sí es crítico):

- `npx prisma migrate dev --name init`
- Migrar repository de memoria a Prisma para 1 entidad
- Probar CRUD contra Postgres real
- Agregar seeds (drivers y constructores reales de F1)

### Semana 10 · 22/6 - 28/6 · MikroORM videos (bridge a Prisma)

**Videos (Backend Dev)**: api29-api36 (MikroORM setup, bootstrap, CRUD básico) → **8 videos**

**Tabla de traducción mientras mirás**:

| MikroORM (videos)                   | Prisma (boxbox)                               |
| ----------------------------------- | --------------------------------------------- |
| `@Entity` + decoradores             | `model` en `schema.prisma`                    |
| `em.persist(entity)` + `em.flush()` | `prisma.entity.create({ data })`              |
| `em.findOne(Entity, { id })`        | `prisma.entity.findUnique({ where: { id } })` |
| `@ManyToOne` / `@OneToMany`         | `relation` con FK en el model                 |
| `mikro-orm migration:create`        | `prisma migrate dev --name X`                 |

**Acción boxbox**: agregar más entidades a Prisma, service layer para 2-3 core.

### Semana 11 · 29/6 - 5/7 · Relaciones y cascade

**Videos (Backend Dev)**: api37-api42 (CRUD Item, cascade, skip el último de Mongo) → **5 videos**

**Traducción Prisma**:

- Cascade: `onDelete: Cascade` en la relación del schema
- Eager loading: `prisma.entity.findMany({ include: { relation: true } })` (equivale a `populate` en MikroORM)

**Acción boxbox**: relaciones clave (`League ↔ Membership ↔ User`, `DraftSession ↔ DraftPick ↔ User`).

### Semana 12 · 6/7 - 12/7 🎯 · ENTREGA 12/7 + Testing (externo)

**Videos del canal**: Unit Testing con Jest (9) → SKIP. Solo video 1 "Configuración" a 2x como referencia conceptual.

**Recursos externos** (Vitest, reemplazando la playlist):

1. **Prisma + Vitest mocking** (canónico): <https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing>
   - Usar `vitest-mock-extended`, NO `jest-mock-extended`
2. **Vitest guide oficial**: <https://vitest.dev/guide/>
   - Leer "Getting Started", "Mocking", "Configuration"
3. **Tutorial práctico Express + Vitest + Prisma + supertest**: <https://dev.to/jay818/mastering-unit-testing-a-comprehensive-guide-ing>
4. **Prisma "Ultimate Guide to Testing"** (opcional, más profundo): <https://www.prisma.io/blog/series/ultimate-guide-to-testing-eTzz0U4wwV>

**Instalar**:

```bash
npm i -D vitest vitest-mock-extended supertest @types/supertest
```

**Acción boxbox**: ✅ **Entregar 1 CRUD por integrante con BD Prisma+Postgres**. Escribir 3-5 tests unitarios del service (mockeando repository con `vitest-mock-extended`).

### Semana 13 · 13/7 - 19/7 · React + Vite setup

**Videos del canal**: Web Inicial → SKIP casi todo. Video 7 "Fetch API" opcional (15 min a 2x).

**Recursos externos**:

- Vite guide: <https://vite.dev/guide/>
- React docs "Thinking in React": <https://react.dev/learn/thinking-in-react>
- Tailwind + Vite: <https://tailwindcss.com/docs/installation/using-vite>

**Acción boxbox**: `/frontend` con Vite + React + TS + Tailwind. CORS en backend. Primer componente con fetch mockeado.

### Semana 14 · 20/7 - 26/7 · Fetch real + estructura frontend

**Recursos externos**:

- TanStack Query (recomendado): <https://tanstack.com/query/latest/docs/framework/react/overview>
- Alternativa simple: fetch nativo + `useEffect` (peor DX pero menos dependencias)

**Acción boxbox**: `GET /drivers` desde el frontend. Listar con componente simple. Loading + error states. Routing con React Router si hay tiempo.

### Semana 15 · 27/7 - 31/7 🎯 · ENTREGA 31/7

**Acción boxbox**: ✅ **Entregar GET ALL frontend→backend funcionando**. README con instrucciones, variables de entorno documentadas, screenshot o GIF en el README.

---

## Roadmap post-31/7 (hacia 14/8 y regularidad 9/10)

- **Autenticación** (JWT + middleware + bcrypt) — 1 fin de semana
- **Socket.io** draft en vivo — 2-3 hs con docs oficiales
- **Validación** con zod (front + back) — 1-2 hs
- **Formularios React** con react-hook-form + zod — 2-3 hs
- **Integración Jolpica-F1 / OpenF1** — jobs + scheduler (cron / bullmq)
- **Frontend testing**: React Testing Library + Vitest → <https://testing-library.com/docs/react-testing-library/intro/>
- **Playwright e2e** — post 14/8 cuando haya flujo completo
- **Deploy**: Vercel + Railway

---

## Reglas del plan

1. Videos primero en la semana, código después.
2. Notas obligatorias en semanas 10-11 (MikroORM → Prisma). Escribilas mientras mirás, no después.
3. Videos 1-22 a 2x (JS fundamentals son repaso).
4. Si atrasás 1 semana: salteá MySQL raw (sem 9) y Good Parts. Son los buffers.
5. Si atrasás 2 semanas: renegociá scope con el equipo.
6. Commits semanales aunque sea progreso chico. Tu equipo y profes ven ritmo, no explosiones.

---

## Decisiones archivadas

- **ORM/BD**: Prisma + PostgreSQL. Costo asumido: bridging mental MikroORM → Prisma en semanas 10-11.
- **Test runner**: Vitest (no Jest, no Angular Jest).
- **Playlists Unit Testing y Web Inicial**: descartadas por mismatch de stack.
