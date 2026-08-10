# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BoxBox is a Formula 1 Fantasy League web app — a university project (TP) for Desarrollo de Software at UTN FRRO. Users create/join private leagues, participate in a live snake draft to build a team (2 starter drivers, 1 reserve, 1 constructor), and compete across the F1 season with real race results.

The project is early-stage: only the backend scaffold with domain CRUDs exists today. Most of the system described in `docs/` is **planned, not built**. When in doubt about what is actually implemented, trust the source, not the docs.

## Repository Layout

```
backend/      Express + TypeScript API (the only runnable code right now)
docs/         Design docs (proposal, ER diagram, API spec, architecture) + local setup tutorial
frontend/     NOT YET CREATED — planned React + Vite app
```

## Current Implementation Status

Built:

- Backend scaffold (Express 5, TypeScript, Prisma 7, Postgres)
- CRUD modules: `drivers`, `constructors`, `circuits`, `seasons`, `races`
- Zod request validation + centralized error handling
- Vitest integration tests hitting a real Postgres database
- **Auth (Slice 1)**: `User` table + `auth/` module + `requireAuth` middleware + JWT access/refresh + httpOnly refresh cookie. Endpoints: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`.
- **Leagues real (Slice 2)**: `leagues/` module reescrito con Prisma. Endpoints: `POST /leagues`, `GET /leagues`, `GET /leagues/:id`, `PATCH /leagues/:id` — todos `requireAuth`. Ownership check vía `createdById`. Archivado via `PATCH status='ARCHIVED'` (no hay endpoint DELETE). `inviteCode` user-supplied (length 4-20, regex, lowercase normalize, reserved blacklist).
- **LeagueMember / membership (Slice 3)**: `LeagueMember` table en uso (antes existía pero idle). Endpoints nuevos: `POST /leagues/join`, `POST /leagues/:id/leave`, `GET /leagues/:id/members`, `DELETE /leagues/:id/members/:userId`. Middleware scoped al recurso: `requireLeagueMember` (404 si no member — P2-1 unification) + `requireLeagueOwner` (403 si member pero no owner). `createLeague` ahora crea LeagueMember(owner=true) atómicamente via nested write. `GET /leagues` ahora filtra por ACTIVE membership (incluye juntas). Rate limit user-based en POST `/leagues` (5/min) y `/leagues/join` (10/min) via `express-rate-limit`. Skip en env `NODE_ENV=test` / `VITEST=true` / `SMOKE=1`. Path params validados con `validateParams(schema)` (Zod `.coerce.number()`).

Not yet built — **intentionally deferred**. Do not suggest implementing any of these without an explicit ask from the user; project timeline lives outside this repo:

- Role middleware (`requireAdmin`)
- Transfer ownership de leagues — owner que quiere irse hoy recibe 409 `OWNER_CANNOT_LEAVE`.
- Fantasy teams, draft picks, predictions, scoring, standings
- Socket.io draft namespace
- Frontend (no directory exists yet)
- External API sync (Jolpica, OpenF1)

## Development Commands

All commands run from `backend/`:

```bash
npm install
cp .env.example .env          # set DATABASE_URL (+ FRONTEND_URL used by CORS)
npm run db:migrate            # prisma migrate dev — also regenerates the client
npm run dev                   # ts-node-dev on http://localhost:3000

npm run build                 # tsc → dist/
npm start                     # node dist/server.js
npm run lint                  # eslint src/

npm test                      # vitest (watch mode)
npm test -- --run             # single run, non-watch
npm test -- src/modules/drivers/drivers.test.ts   # one file
npm test -- -t "returns 404"                      # match test name

npm run db:generate           # regenerate Prisma client only
npm run db:studio             # prisma studio GUI
npx prisma db seed            # populate DB with F1 dev data (idempotent)
```

Health check: `GET /api/v1/health`.

## Backend Architecture

### Module pattern (strict convention)

Every domain lives in `src/modules/<name>/` and MUST contain exactly these files:

```
<name>.routes.ts       Router — wires URL paths, applies validate() middleware
<name>.controller.ts   Thin — parses req, calls service, shapes response envelope
<name>.service.ts      Business logic + Prisma calls, throws AppError subclasses
<name>.schema.ts       Zod schemas + inferred Input types
<name>.test.ts         Supertest integration tests against the real app + DB
```

When adding a new domain, mirror an existing module (e.g. `drivers/`) exactly — same file names, same export shape, same layering. Register its router in `src/app.ts` under `/api/v1/<name>`.

### Request lifecycle

`app.ts`: `helmet → cors(FRONTEND_URL, credentials) → express.json → /api/v1/* routers → errorHandler`.

- Controllers wrap service calls in `try/catch (err) { next(err) }` so thrown `AppError`s reach the central handler.
- `middleware/validate.ts` runs Zod on `req.body`, replaces `req.body` with the parsed value (so controllers get typed data), and short-circuits with a `VALIDATION_ERROR` envelope on failure.
- `middleware/error-handler.ts` turns `AppError` into `{ error: { code, message, status } }`; anything else becomes a logged 500 `INTERNAL_ERROR` — never leak internal details.
- `shared/errors.ts` defines `AppError`, `NotFoundError(resource)` (auto-builds `"<RESOURCE>_NOT_FOUND"` code), and `ConflictError(message, code)`. Prefer these over `throw new Error`.

### Response envelope

- Success: `{ data: ... }` (list endpoints will eventually add `meta` for pagination — not implemented yet).
- Error: `{ error: { code, message, status, details? } }`.
- `201` on create, `204` (empty body) on delete, `200` otherwise.

### Prisma

- Schema: `backend/prisma/schema.prisma`. Generated client lands in `backend/src/generated/prisma/` (non-default location — do not import from `@prisma/client` directly, use `shared/prisma.ts`).
- Connection goes through the `@prisma/adapter-pg` driver adapter, not Prisma's default engine.
- Soft deletes on `Driver`, `Constructor`, `Circuit` via a `deletedAt` timestamp. Services filter with `deletedAt: null` on every read — always respect this when writing new queries.
- `externalId` columns are the join key with Jolpica/OpenF1 data. Services reject duplicates with `ConflictError`.
- Before soft-deleting, services check for active dependencies (e.g. a driver referenced by a `FantasyTeam`) and raise `ConflictError` with a domain-specific code like `DRIVER_HAS_DEPENDENCIES`.
- Prisma 7 config lives in `backend/prisma.config.ts` (not the legacy `prisma` block in `package.json`). That file points at the schema, the migrations dir, and the seed command.
- Dev seed: `backend/prisma/seed.ts` populates one Season + grid + a few Circuits/Races. Run `npx prisma db seed` (idempotent — uses `upsert` everywhere). Tests do NOT use the seed; they truncate per-test and build their own fixtures. `prisma migrate reset` in Prisma 7 does NOT auto-run the seed — run `db seed` explicitly after a reset.

### Config

`src/config/env.ts` is the single source of truth for env vars. Read from it — do not reach into `process.env` elsewhere.

## Testing

- Framework: Vitest + Supertest. Tests hit the **real Postgres** pointed at by `DATABASE_URL`, not a mock — the user deliberately chose this to catch migration/schema drift. Do not introduce Prisma mocks.
- `src/tests/setup.ts` `TRUNCATE ... CASCADE`s every table before each test, in FK-safe order. When you add a new table, add it to that list or tests will leak state.
- `vitest.config.ts` sets `fileParallelism: false` because all files share one DB — keep it off.
- Integration style: spin up the Express `app`, hit it with `request(app).post(...)`, assert on status + `body.data` / `body.error.code`.
- Run a single test file while iterating: `npm test -- src/modules/<name>/<name>.test.ts --run`.

## Browser automation (agent-browser)

The `agent-browser` CLI is installed (see `~/.claude/skills/agent-browser/`). Only applies once **Slice 13 (Frontend bootstrap)** ships — hoy no hay UI que inspeccionar, sólo API JSON.

**Core loop** — repetir en este orden:

```bash
agent-browser open <url>            # 1. Navegar
agent-browser snapshot -i           # 2. Ver refs @eN de elementos interactivos
agent-browser click @e5             # 3. Interactuar usando refs
agent-browser snapshot -i           # 4. RE-SNAPSHOT tras cualquier navegación / cambio de estado
```

**Regla clave — refs se invalidan cuando la página cambia.** Después de click que navega, submit de form, apertura de modal, o render dinámico: los `@e1`, `@e2`... del snapshot anterior ya no apuntan a lo mismo. Re-snapshotear antes de la próxima interacción, sin excepción.

**Cuándo SÍ usar en BoxBox (post Slice 13):**

- Reproducir bugs que reporta el usuario en la UI.
- Verificar flujos manualmente (login, crear liga, join, draft).
- Diffs visuales (`agent-browser diff url <a> <b>`, `agent-browser diff screenshot --baseline old.png`).
- Profiling de React renders y web vitals.

**Cuándo NO usar:**

- No reemplaza los tests Vitest+Supertest — ésos son la fuente de verdad para asserts.
- No es sustituto de un suite E2E determinístico en CI. Es para exploración, no para gating de merges.
- No inventar tests contra endpoints JSON puros — el loop asume DOM interactivo, no respuestas de API.

## Conventions

- **Language**: docs and UI are Spanish; code, identifiers, comments, commit messages are English.
- **Commits**: short imperative summaries in Spanish are used in existing history (e.g. `CRUD de Circuits, Seasons y Races con tests`) — match that style.
- **Error codes**: `SCREAMING_SNAKE_CASE`, domain-prefixed (`DRIVER_NOT_FOUND`, `DRIVER_HAS_DEPENDENCIES`).
- **Prettier + ESLint** are configured; run `npm run lint` before opening a PR. Prettier config is at the repo root (`.prettierrc`).

## Key Docs

- `docs/proposal.md` — TP scope
- `docs/data-model.mmd` — full planned ER diagram (many tables are not yet in `schema.prisma`)
- `docs/api-endpoints.md` — full planned API surface (most endpoints not yet implemented)
- `docs/tutorial.md` — local setup walkthrough for new contributors (clone → DB → seed)
