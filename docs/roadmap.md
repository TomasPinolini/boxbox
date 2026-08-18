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

_(Slices 1, 2, 3, 4, 5, 6, 7 completos. Próximo: Slice 8.)_

---

## Later — scoring + sync + frontend

_(El carril Draft — Slices 4, 5, 6 — está completo. Lo que sigue es el carril Scoring, que converge con Draft en Slice 9.)_

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

### Slice 6 — Draft realtime (Socket.io overlay)

- **Status**: done (branch `slice-6-draft-realtime`).
- **Goal**: agregar el namespace `/draft` con eventos en vivo sobre el REST de Slice 5. El timer de 60s auto-asigna un pick si el miembro no responde a tiempo.
- **Decisiones de diseño (confirmadas con el equipo antes de codear)**:
  - **Auto-pick al expirar el timer**: no existe sistema de ranking de drivers/constructors en el proyecto, así que "el mejor disponible" se resuelve como **random** entre los legales para la categoría de la ronda actual — no alfabético, no ponderado.
  - **`draft:pause`/`draft:resume`** (documentados en `api-endpoints.md` pero no pedidos por este slice del roadmap) quedan **fuera de scope** — no implementados. Si se necesitan más adelante, van en un slice aparte.
- **Shipped**: nuevo `modules/draft/draft.gateway.ts` — `registerDraftGateway(httpServer, options?)` arma el namespace completo: middleware de auth en el handshake (`{ token, leagueId }`, mismo criterio P2-1 que HTTP — token inválido o no-member rechazan la conexión por igual), rooms por liga (`league:{id}`), eventos `draft:state` (al conectar), `draft:update` y `draft:complete` (broadcast tras cada pick), `draft:timer` (al arrancar cada turno), `draft:error` (solo al socket que causó el error). `server.ts` pasó de `app.listen` a `http.createServer(app)` + Socket.io.
  - **Overlay real, no solo un canal aparte**: un pick hecho por REST también dispara los mismos broadcasts que uno hecho por socket (`shared/socket.ts` — singleton `getIo()`/`setIo()` que `draft.controller.ts` consulta tras `start`/`pick`/`reset`). Sin esto, un cliente conectado por WS se quedaría con estado viejo apenas alguien usara el REST.
  - **El timer es `setTimeout`, no `setInterval`**: el server nunca "tickea" el countdown — avisa una vez cuánto dura (`draft:timer`) y dispara una vez cuando expira. El cliente cuenta localmente.
- **Bug de concurrencia encontrado y arreglado (endurece Slice 5)**: `submitPick` pasó de `update` por `id` a `updateMany` con `WHERE ... AND driverId IS NULL AND constructorId IS NULL` + chequeo de `count`. Motivo: el timer es la primera fuente de escrituras *realmente* concurrentes sobre el mismo pick (un pick manual y el auto-pick del timer pueden dispararse casi al mismo tiempo) — sin el re-check, el que llega segundo pisaría en silencio el pick del que llego primero.
- **Touches reales**: `modules/draft/draft.gateway.ts` (nuevo), `modules/draft/draft.service.ts` (exporta `categoryForRound`; hardening de `submitPick`), `modules/draft/draft.controller.ts` (dispara broadcasts post-REST), `shared/socket.ts` (nuevo), `server.ts` (http.createServer + Socket.io), `package.json` (`socket.io` + `socket.io-client` devDep).
- **Tests**: 168 total (159 previos + 9 nuevos en `draft.gateway.test.ts`, contra un `http.Server` real con `socket.io-client` — no mocks). Cubren: auth en el handshake (sin token, no-member), `draft:state` al conectar, pick por socket broadcasteado a todos los conectados, pick fuera de turno, pick por REST reflejado en los sockets conectados (prueba el overlay), `draft:timer` al arrancar, auto-pick al expirar, `draft:complete` al terminar el draft. `pickTimeoutMs` es override-able (300ms en tests, 60s en producción) — evita esperar 60s reales por test.

### Slice 5 — Draft state machine (REST-only, sin Socket)

- **Status**: done (branch `slice-5-draft-rest`).
- **Goal**: la lógica del snake draft funciona contra REST (no realtime todavía). El owner arranca el draft, los miembros piden el estado y mandan picks vía POST.
- **Decision de diseño (confirmada con el equipo antes de codear)**: FantasyTeam tiene 4 slots (`driver1`, `driver2`, `reserveDriver`, `constructor`), así que el draft son **4 rondas fijas** — una por slot: rondas 1-3 categoría DRIVER (llenan `driver1Id`/`driver2Id`/`reserveDriverId` en ese orden), ronda 4 categoría CONSTRUCTOR (llena `constructorId`). Actualiza el "Done when" original del roadmap (que hablaba de 3 rondas genéricas) — con N miembros el draft completo son `N × 4` picks, no `N × 3`.
- **Shipped**: nuevo módulo `modules/draft/` (schema/service/controller/routes/test) montado como sub-router de `leagues.routes.ts` bajo `/:id/draft` (no se registra en `app.ts` — es un sub-recurso de League, no un módulo top-level). Endpoints: `POST /leagues/:id/draft/start` (owner, genera las `N×4` filas `DraftPick` placeholder con snake order vía Fisher-Yates + transiciona a LIVE), `GET /leagues/:id/draft/state`, `GET /leagues/:id/draft/available`, `POST /leagues/:id/draft/pick` (valida turno + categoría + disponibilidad, llena el slot del FantasyTeam, transiciona a COMPLETED en el último pick — todo en una transacción interactiva), `POST /leagues/:id/draft/reset` (owner). Sin migration: `DraftPick` y `League.draftStatus` ya existían en el schema desde el `init` (idle).
- **Decisiones clave**: el "pick actual" nunca se guarda como estado aparte — es siempre la fila `DraftPick` de menor `pickNumber` con `driverId` Y `constructorId` null. El orden del draft se materializa completo en `start` (no hay columna `draftOrder` en `LeagueMember`). `leagueId` en los controllers de draft sale de `req.leagueMember.leagueId` (poblado por `requireLeagueMember` en el mount), no de `req.params.id` — evita depender de `mergeParams` en el sub-router.
- **Bug de tipos encontrado y arreglado (afecta también Slice 4)**: `fantasyTeamSelect` en `leagues.service.ts` fallaba en `tsc --noEmit` (nunca se había corrido — solo `eslint`/`vitest`, que no lo detectan). Causa: el modelo `Constructor` genera una relación/delegate llamado literalmente `constructor`, que colisiona con la propiedad `constructor` que todo objeto JS hereda de `Object.prototype`. Fix: declarar esos `select` con type assertion (`as Prisma.XSelect`) en vez de `as const` o anotación directa — es el único approach que evita el falso positivo (confirmado empíricamente). Aplicado en `fantasyTeamSelect`, `pickSelect` y `constructorAvailableSelect`.
- **Touches reales**: `modules/draft/{schema,service,controller,routes,test}.ts` (nuevo); `modules/leagues/leagues.routes.ts` (mount del sub-router); `modules/leagues/leagues.service.ts` (fix del bug de tipos de Slice 4).
- **Tests**: 159 total (139 previos + 20 nuevos). `npx tsc --noEmit` y `npx knip` limpios (knip solo flaggea `smoke-slice-4.ts`, ya conocido).

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
