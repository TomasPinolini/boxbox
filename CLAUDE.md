# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BoxBox is a Formula 1 Fantasy League web app — a university project (TP) for Desarrollo de Software at UTN FRRO. Users create/join private leagues, participate in a live snake draft to build a team (2 starter drivers, 1 reserve, 1 constructor), and compete across the F1 season with real race results.

The project is backend-only so far (Slices 1–7 shipped: auth, leagues, membership, fantasy teams, snake draft over REST + Socket.io, race-result ingestion). Scoring, predictions, sync and the frontend are still **planned, not built**. When in doubt about what is actually implemented, trust the source, not the docs.

## Repository Layout

```
backend/      Express 5 + Socket.io + TypeScript API (the only runnable code right now)
docs/         Design docs (proposal, ER diagram, API spec, architecture) + local setup tutorial
frontend/     NOT YET CREATED — planned React + Vite app
```

## Current Implementation Status

Built (one slice = one PR; full log in `docs/roadmap.md` → "Completados"):

- Backend scaffold (Express 5, TypeScript, Prisma 7, Postgres) + Zod validation + centralized errors + Vitest integration tests against a real Postgres DB (168 tests across 9 files).
- CRUD modules: `drivers`, `constructors`, `circuits`, `seasons`, `races`.
- **Auth (Slice 1)**: `auth/` module, `requireAuth`, JWT access (15m) + refresh (7d, httpOnly cookie). `POST /auth/register|login|refresh|logout`, `GET /auth/me`.
- **Leagues (Slice 2)**: `POST/GET /leagues`, `GET/PATCH /leagues/:id`. Archive via `PATCH status='ARCHIVED'` — no DELETE. `inviteCode` user-supplied (4-20 chars, lowercase, reserved blacklist).
- **Membership (Slice 3)**: `POST /leagues/join`, `POST /leagues/:id/leave`, `GET /leagues/:id/members`, `DELETE /leagues/:id/members/:userId`. Middleware `requireLeagueMember` (404 if not an ACTIVE member — anti-enumeration) + `requireLeagueOwner` (403). User-based rate limits on `POST /leagues` (5/min) and `/leagues/join` (10/min); skipped when `NODE_ENV=test` / `VITEST=true` / `SMOKE=1`. Path params via `validateParams(schema)`.
- **FantasyTeam shell (Slice 4)**: `GET /leagues/:id/teams/me`. Lives inside `leagues/` (no new module) — rule: resources tightly coupled to a parent stay in the parent module.
- **Draft REST (Slice 5)**: `modules/draft/` mounted as a sub-router from `leagues.routes.ts`: `router.use('/:id/draft', requireAuth, validateParams, requireLeagueMember, draftRoutes)`. `POST start|reset` (owner), `GET state|available`, `POST pick`. 4 fixed rounds (driver1, driver2, reserve, constructor); snake order materialized up-front as placeholder `DraftPick` rows; "current pick" = lowest unfilled `pickNumber`. `submitPick` uses `updateMany` + row-count check to survive concurrent writes.
- **Draft realtime (Slice 6)**: Socket.io namespace `/draft` in `modules/draft/draft.gateway.ts`, attached in `server.ts` (not `app.ts`). Handshake `auth: { token, leagueId }`; rejected unless ACTIVE member. Rooms `league:<id>`. Events out: `draft:state|update|timer|complete|error`; in: `draft:pick`. 60s `setTimeout` auto-pick (in-memory, lost on restart). REST controllers broadcast the same events through the `shared/socket.ts` singleton (`getIo()` is `null` in supertest tests → no-op). Gateway tests bind a real port and override `pickTimeoutMs` to 300ms.
- **RaceResult ingestion (Slice 7)**: `GET /races/:id/results` (public), `POST /races/:id/results` (`requireAuth → requireAdmin`), transitions the race to `COMPLETED`. `middleware/admin.ts` reads `role` from the JWT — no DB hit, stale until token expiry.

Not yet built — **intentionally deferred**. Do not suggest implementing any of these without an explicit ask from the user; ordering and blockers live in `docs/roadmap.md`:

- Slice 8 ConstructorResult, Slice 9 LeagueStanding (scoring), Slice 10 Predictions, Slice 11 DriverSwap
- Slice 12 external API sync (Jolpica, OpenF1)
- Slice 13 Frontend (no directory exists yet)
- Transfer ownership of leagues — owner trying to leave gets 409 `OWNER_CANNOT_LEAVE`
- Refresh-token rotation / server-side revocation, CI workflow, structured logging (tracked in local-only `docs/known-debt.md`, gitignored)

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

npx tsc --noEmit              # type-check — NOT run by lint or vitest; run before a PR (Slice 5 found a latent TS error this way)
npx knip                      # unused exports/deps (config in package.json)
SMOKE=1 npm run smoke:slice-4 # manual end-to-end script against a running server (src/scripts/)
```

`smoke:slice-7` in `package.json` points at `src/scripts/smoke-slice-7.ts`, which does not exist — dangling script.

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

When adding a new domain, mirror an existing module (e.g. `drivers/`) exactly — same file names, same export shape, same layering. Register its router in `src/app.ts` under `/api/v1/<name>`. Step-by-step recipe: `docs/recipes/add-a-module.md`.

Two sanctioned deviations:

- **Child resources stay in the parent module** (`LeagueMember`, `FantasyTeam` → `leagues/`; `RaceResult` → `races/`). Only `draft/` has its own module, and it is mounted as a sub-router from `leagues.routes.ts`, not from `app.ts`.
- `draft/` carries an extra `draft.gateway.ts` + `draft.gateway.test.ts` for Socket.io. The gateway calls `draft.service.ts` — it never reimplements rules, and the service never knows whether the caller is HTTP or WS.

### Request lifecycle

`app.ts`: `helmet → cors(FRONTEND_URL, credentials) → express.json → cookieParser → /api/v1/* routers → errorHandler`. `server.ts` wraps `app` in `http.createServer`, attaches the Socket.io `/draft` namespace, then listens — tests import `app` directly and never run `server.ts`.

Auth chains, outermost first:

- Logged in: `requireAuth`
- League-scoped: `requireAuth → validateParams(leagueIdParamSchema) → requireLeagueMember [→ requireLeagueOwner]`
- Admin: `requireAuth → requireAdmin`

`src/types/express.d.ts` augments `Request` with `req.user` (set by `requireAuth`) and `req.leagueMember` (set by `requireLeagueMember`).

- Controllers wrap service calls in `try/catch (err) { next(err) }` so thrown `AppError`s reach the central handler.
- `middleware/validate.ts` runs Zod on `req.body`, replaces `req.body` with the parsed value (so controllers get typed data), and short-circuits with a `VALIDATION_ERROR` envelope on failure.
- `middleware/error-handler.ts` turns `AppError` into `{ error: { code, message, status } }`; anything else becomes a logged 500 `INTERNAL_ERROR` — never leak internal details.
- `shared/errors.ts` defines `AppError`, `NotFoundError(resource)` (auto-builds `"<RESOURCE>_NOT_FOUND"` code), `ConflictError` (409), `UnauthorizedError` (401), `ForbiddenError` (403) — all `(message, code)`. Prefer these over `throw new Error`. Catalogue of codes: `docs/error-codes.md`.

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
