# Roadmap — Backend pendiente

Slices ordenados por dependencia para llegar de los 5 CRUDs actuales al MVP funcional del TP. Cada slice ≈ 1 PR. Ningún slice salta sobre otro si está marcado en `Blocked by`.

**Cómo se usa este archivo:**

- Cuando arrancás un slice, el plan vive inline (en chat o en `.claude/plans/`); los PRs llevan el detalle. No se abren GitHub Issues por slice.
- Cuando completás un slice, marcá `**Status:** done` y movelo a la sección "Completados" al final del archivo.
- Si un slice se vuelve demasiado grande durante la implementación, partilo en sub-slices (`5a`, `5b`). No expandas el alcance original.

**Convenciones:**

- **Goal**: una línea, qué se entrega al usuario / al sistema.
- **Touches**: módulos / archivos / tablas afectados.
- **Done when**: criterio de aceptación verificable, idealmente "endpoint X devuelve Y + tests verdes + smoke manual".
- **Blocked by**: número de slice o dependencia externa.

Stack overview rápido (ver [`../CLAUDE.md`](../CLAUDE.md) para detalle): Express 5 + TypeScript + Prisma 7 + Postgres. Tests = Vitest + Supertest contra DB real.

---

## Now — bloqueantes para todo lo demás

_(Slices 1, 2, 3, 4, 7 completos. Próximo: Slice 5.)_

---

## Next — completar el camino al draft funcional

### Slice 5 — Draft state machine (REST-only, sin Socket)

- **Goal**: la lógica del snake draft funciona contra REST (no realtime todavía). El owner arranca el draft, los miembros piden el estado y mandan picks vía POST.
- **Touches**: tabla `DraftPick` con `@@unique([leagueId, pickNumber])` y `@@unique([leagueId, leagueMemberId, round])`; nuevo módulo `modules/draft/`; endpoints `POST /leagues/:id/draft/start`, `GET /leagues/:id/draft/state`, `GET /leagues/:id/draft/available`, `POST /leagues/:id/draft/pick`, `POST /leagues/:id/draft/reset`; lógica de orden snake (1→N, N→1, 1→N) y validación de turno; la `League.draftStatus` transiciona PENDING → LIVE → COMPLETED; cuando termina, los slots del FantasyTeam se llenan con los picks de cada miembro.
- **Done when**: en una liga con 3 miembros mockeados, después de 9 picks (3 rondas × 3 miembros), `League.draftStatus = COMPLETED` y los 3 FantasyTeams tienen sus slots llenos. Tests cubren: pick fuera de turno (409), pick de un Driver ya elegido en esta liga (409), pick de la categoría equivocada para la ronda (409).
- **Blocked by**: Slice 4.

### Slice 6 — Draft realtime (Socket.io overlay)

- **Goal**: agregar el namespace `/draft` con eventos `draft:state`, `draft:pick`, `draft:update`, `draft:timer`, `draft:complete`. El timer auto-asigna el mejor disponible si el miembro no responde en 60s.
- **Touches**: instalar `socket.io`; `server.ts` integra el HTTP server con io; nuevo archivo `modules/draft/draft.gateway.ts` con los handlers de eventos; auth del socket via JWT en handshake; los handlers internamente reusan el service de Slice 5; setTimeout-based timer por turno.
- **Done when**: un cliente Socket.io de prueba puede conectarse, recibir `draft:state` al join, mandar `draft:pick` y ver `draft:update` broadcasteado al resto. Test manual con `wscat` o cliente mínimo en Node. Auto-pick funciona al expirar el timer.
- **Blocked by**: Slice 5.

---

## Later — scoring + sync + frontend

### Slice 8 — ConstructorResult (derivado de RaceResult)

- **Goal**: al cargar RaceResults, se computan automáticamente los ConstructorResult sumando puntos por equipo.
- **Touches**: tabla `ConstructorResult` con `driver1Points` y `driver2Points`; lógica en el service de races que, post-carga de RaceResult, agrupa por constructor y crea las filas.
- **Done when**: para una Race con resultados completos de los 20 pilotos, hay 10 ConstructorResults con la suma correcta. Tests cubren el cálculo + edge cases (constructor con solo 1 piloto clasificado).
- **Blocked by**: Slice 7.

### Slice 9 — LeagueStanding (snapshot por carrera)

- **Goal**: después de cada carrera completada, generar un snapshot LeagueStanding por cada miembro de cada liga activa.
- **Touches**: tabla `LeagueStanding` (driverPoints, constructorPoints, predictionPoints, totalPoints, position, positionChange); endpoint `POST /api/v1/races/:id/recalculate` (admin) que regenera standings de esa carrera para todas las ligas; endpoint `GET /leagues/:id/standings?raceId=X` para histórico.
- **Done when**: en una liga con 3 miembros y 1 carrera completada, hay 3 LeagueStandings con `position` 1, 2, 3 correctos por totalPoints. `positionChange` calculado contra la carrera anterior (o 0 si es la primera).
- **Blocked by**: Slice 7, Slice 8.

### Slice 10 — Predictions

- **Goal**: cada LeagueMember puede predecir winner/pole/topConstructor para cada carrera antes del `lockDate`. Cuando la carrera se completa, se evalúan y suman bonus.
- **Touches**: tabla `Prediction`; nuevo módulo `modules/predictions/`; endpoints `PUT /leagues/:id/predictions/:raceId`, `GET .../mine`, `GET .../all` (post-lock); evaluación se dispara en el recalculate de Slice 9.
- **Done when**: una predicción antes del lock se acepta. Después del lock se rechaza (409). Cuando se cargan los RaceResults, las predicciones acertadas suman bonus en LeagueStanding.predictionPoints.
- **Blocked by**: Slice 9.

### Slice 11 — DriverSwap (manual + AUTO_DNF)

- **Goal**: un miembro puede swapear su reserva por un titular antes del lockDate (`MANUAL`); o el sistema lo hace automáticamente cuando un titular hace DNF/DSQ/DNS (`AUTO_DNF`).
- **Touches**: tabla `DriverSwap`; endpoint `POST /leagues/:id/teams/me/swap`; lógica de AUTO_DNF en el procesamiento de RaceResult (si un Driver del FantasyTeam de un miembro tiene status DNF/DSQ/DNS, se activa el reserva); historial via `GET /leagues/:id/teams/me/swaps`.
- **Done when**: swap manual antes del lock funciona, después del lock rechaza. RaceResult con DNF dispara DriverSwap automático cuyo `type = AUTO_DNF` y el scoring usa los 2 mejores de los 3 pilotos.
- **Blocked by**: Slice 9.

### Slice 12 — Sync con Jolpica/OpenF1

- **Goal**: en vez de cargar RaceResults manualmente, un endpoint admin sincroniza con la API externa de F1.
- **Touches**: tabla `SyncLog`; nuevo módulo `modules/sync/` (o sub-rutas en `modules/admin/`); endpoints `POST /api/v1/admin/sync/drivers`, `.../constructors`, `.../circuits`, `.../races`, `.../season`; HTTP client para Jolpica (probablemente `fetch` nativo o `undici`); cada sync deja un SyncLog con counts y status.
- **Done when**: `POST /admin/sync/season?year=2026` puebla Driver/Constructor/Circuit/Race desde Jolpica y deja un SyncLog `SUCCESS`. Falla parcial deja `PARTIAL` con detalle. Re-sync no duplica (uso de `externalId` + upsert).
- **Blocked by**: Slice 1 (necesita rol admin) + acceso a las APIs de Jolpica/OpenF1.

### Slice 13 — Frontend bootstrap

- **Goal**: crear el directorio `frontend/` con Vite + React + TypeScript + Tailwind + cliente HTTP que pega al backend. Puede arrancar en paralelo a partir de Slice 4.
- **Touches**: nuevo directorio `frontend/`; setup Vite; estructura básica de páginas (login, lista de ligas, detalle de liga); cliente HTTP con el access token; configurar CORS en backend para `http://localhost:5173`.
- **Done when**: `npm run dev` en `frontend/` levanta en 5173 y puede hacer login contra el backend. Login persiste token en localStorage. Hay al menos una página autenticada (mi perfil) que llama `GET /auth/me`.
- **Blocked by**: Slice 1 (necesita auth funcionando).

---

## Sub-slices probables (anticipar)

Si alguno de estos se vuelve demasiado grande, partir así:

- **Slice 1 (Auth)**: `1a` register + login (sin /me, sin refresh), `1b` /me + middleware, `1c` refresh tokens.
- **Slice 5 (Draft REST)**: `5a` modelo + start + state, `5b` pick + validaciones, `5c` snake order + reset.
- **Slice 6 (Draft realtime)**: `6a` socket conectado + state broadcast, `6b` pick via socket + update broadcast, `6c` timer + auto-pick.
- **Slice 12 (Sync)**: por entidad — `12a` drivers + constructors, `12b` circuits + races, `12c` results.

---

## Out of scope para este TP (post-cursada)

- Refresh token rotation con httpOnly cookies y revocación.
- Rate limiting global y de auth.
- WebSocket reconnection con state recovery.
- Internacionalización del frontend.
- CI/CD multi-ambiente (staging vs prod).
- Notificaciones push / email.

---

## Completados

### Slice 4 — FantasyTeam shell

- **Status**: done (branch `slice-4-fantasy-team`).
- **Goal**: cuando un LeagueMember se une (creando la liga u joineando por inviteCode), se crea automáticamente su FantasyTeam vacío (todos los slots `null`). Es la entidad que después llenará el draft.
- **Shipped**: `createLeague` y `joinLeague` (branch `create` del upsert) ahora hacen nested write de dos niveles — League/LeagueMember(update) → FantasyTeam — en la misma transacción implícita de Prisma. Rejoin (branch `update` del upsert) NO recrea el FantasyTeam: el que ya existe se conserva. Endpoint nuevo `GET /leagues/:id/teams/me` (mismo middleware chain que `GET /:id/members`).
- **Decisiones clave**: FantasyTeam vive dentro del módulo `leagues` (no un módulo nuevo) — mismo criterio que Slice 3 (LeagueMember) y Slice 7 (RaceResult dentro de `races`): recursos fuertemente acoplados a un módulo padre se extienden ahí en vez de fragmentar en módulos nuevos por tabla. Tabla `fantasy_teams` ya existía desde la migration `init` (idle) — sin migration nueva.
- **Touches reales**: `modules/leagues/{service,controller,routes}.ts` extendidos, `modules/leagues/leagues.test.ts` (+4 tests nuevos + 2 asserts agregados a tests de POST /leagues y POST /leagues/join existentes).
- **Tests**: 139 total (135 previos + 4 nuevos).

### Slice 7 — RaceResult ingestion (manual, admin-only)

- **Status**: done (PR #4 mergeado en `dev`).
- **Goal**: poder cargar resultados de carrera por API (admin-only). Sin sync externa aún.
- **Shipped**: `POST /races/:id/results` — carga atómica vía `prisma.$transaction`, transiciona `Race.status` a `COMPLETED` en la misma tx. Guards: 404 race inexistente, 409 `RACE_ALREADY_COMPLETED`, 409 `RACE_NOT_LOADABLE` (CANCELLED/POSTPONED), 404 `DRIVER_NOT_FOUND` (con rollback), 409 `RACE_RESULT_DUPLICATE_DRIVER`. `GET /races/:id/results` — lectura pública ordenada por `position` asc (nulls last). `middleware/admin.ts` nuevo: `requireAdmin` lee `role` del JWT payload (sin DB roundtrip).
- **Touches reales**: `modules/races/{service,controller,routes,schema}.ts` extendidos; `middleware/admin.ts` (nuevo); `schema.prisma` agregó columna `laps Int?` a `RaceResult` (migration `20260716192550_add_race_result_laps`); `tests/setup.ts` agregó helpers `createTestUser` + `createTestAdmin`.
- **Tests**: incluidos en la suite total de 139.

### Slice 3 — LeagueMember (membership + join + leave + kick)

- **Status**: done (branch `slice-3-membership`).
- **Goal**: un User puede unirse a una League con `inviteCode`, dejarla, o ser kickeado por el owner. La tabla `LeagueMember` empieza a poblarse — antes existía en el schema pero no se usaba.
- **Shipped**: 4 endpoints nuevos (`POST /leagues/join`, `POST /leagues/:id/leave`, `GET /leagues/:id/members`, `DELETE /leagues/:id/members/:userId`). 2 middlewares scoped al recurso (`requireLeagueMember`, `requireLeagueOwner`) + 1 helper (`validateParams`) + rate limiter (`express-rate-limit` con user-based key). `createLeague` ahora crea LeagueMember(isOwner=true) atómicamente vía nested write. `GET /leagues` ahora filtra por ACTIVE membership (incluye las que creé y las que junte).
- **Decisiones clave**: rejoin permitido tanto desde LEFT como KICKED (status queda como audit). Transfer ownership fuera de scope. ARCHIVED leagues NO aceptan nuevos joins. P2-1 unification aplicada (404 cuando user no es member, no 403).
- **Touches reales**: `middleware/leagueMembership.ts` (nuevo), `middleware/rateLimit.ts` (nuevo), `middleware/validate.ts` (agregó `validateParams`), `modules/leagues/{schema,service,controller,routes}.ts` (extendidos), `types/express.d.ts` (agregó `req.leagueMember`), `package.json` (express-rate-limit ^8.5.2). Sin migration (tabla `league_members` ya existía en init).
- **Tests**: 119 total (100 previos + 19 nuevos). Tests Slice 2 actualizados: happy POST agrega assert de LeagueMember creado; tests "403 si no es owner" splittedos en 2 (404 si no member, 403 si member-no-owner).
- **Deuda cerrada de known-debt**: P2-1 (404/403 unification), P3-1 (rate limit), P3-2 (Zod path-params).

### Slice 1 — Auth básico (User + register + login + /me + refresh + logout + middleware)

- **Status**: done (PR #3 mergeado en `main`, 2026-05-30).
- **Goal**: un usuario puede registrarse, loguearse y recibir un access token JWT que prueba su identidad en requests subsiguientes.
- **Shipped**: 3 sub-slices — `1a` register + login, `1b` /me + middleware `requireAuth`, `1c` refresh tokens via httpOnly cookie + /logout.
- **Touches reales**: tabla `User` en schema (renombre `password` → `passwordHash`); módulo `modules/auth/` (4 archivos canónicos + test); middleware `middleware/auth.ts`; `shared/jwt.ts` (sign + verify access + refresh) y `shared/password.ts`; `types/express.d.ts` para augment `req.user`; `cookieParser` en app.ts.
- **Tests**: 82 verdes incluyendo happy + bad credentials + token expirado + token inválido + refresh + logout.
- **Deuda aceptada**: ver `known-debt.md` local — bcrypt rounds=10, sin rate limit, sin refresh rotation, etc. (P3).

### Slice 2 — Leagues real (reemplazo del módulo in-memory)

- **Status**: done (branch `slice-2-leagues`, mergeado en `main`).
- **Goal**: las ligas viven en Postgres con `createdById` (FK a User) + `seasonId`.
- **Shipped**: rewrite completo de `modules/leagues/` (schema Zod + service Prisma + controller thin + routes con auth). `inviteCode` user-supplied con validación (length 4-20, regex, lowercase normalize, reserved blacklist). Ownership check explícito en getById/update. Archivado vía `PATCH status='ARCHIVED'` — NO hay endpoint DELETE. Filtrado de GET list a `createdById = req.user.userId` (Slice 3 expande a "owner OR member").
- **Touches reales**: 4 archivos del módulo `modules/leagues/` reescritos + test nuevo; `shared/errors.ts` agregó `ForbiddenError` (403); `docs/api-endpoints.md` + `docs/error-codes.md` sincronizados. Schema `League` no requirió migration (ya existía desde pre-Slice 1). Side-quest pre-Slice 2: calendario 2026 completo en `seed.ts` (commit `e84355d`).
- **Tests**: 18 nuevos en `leagues.test.ts` (happy + validaciones + ownership + FK errors + auth). Suite total: 100/100.
- **Security review**: 0 P1, 2 P2 (ID enumeration 404 vs 403, TOCTOU cosmético en update), 3 P3 (rate limit, NaN IDs, blacklist defense-in-depth) — todo documentado en `known-debt.md` local con mapping a Slice 3 / Slice 7 según corresponda.
