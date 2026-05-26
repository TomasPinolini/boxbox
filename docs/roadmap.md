# Roadmap — Backend pendiente

Slices ordenados por dependencia para llegar de los 5 CRUDs actuales al MVP funcional del TP. Cada slice ≈ 1 PR. Ningún slice salta sobre otro si está marcado en `Blocked by`.

**Cómo se usa este archivo:**

- Cuando arrancás un slice, abrí un GitHub Issue con `/to-prd` para que genere el PRD detallado (problem / solution / user stories / acceptance / out of scope).
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

### Slice 1 — Auth básico (User + register + login + JWT)

- **Goal**: un usuario puede registrarse, loguearse y recibir un access token JWT que prueba su identidad en requests subsiguientes.
- **Touches**: nueva tabla `User` en `schema.prisma`; módulo nuevo `modules/auth/` (5 archivos); middleware `middleware/auth.ts` que valida el JWT; `shared/jwt.ts` para signing/verify; actualizar `setup.ts` (truncate `users`).
- **Done when**: `POST /api/v1/auth/register` crea User + devuelve `{ data: { user, accessToken } }`. `POST /api/v1/auth/login` con credenciales válidas devuelve lo mismo. `GET /api/v1/auth/me` con `Authorization: Bearer <token>` devuelve el User actual. Tests verdes cubriendo happy + bad credentials + token expirado + token inválido.
- **Blocked by**: ninguno.

### Slice 2 — Leagues real (reemplazar la implementación en-memoria)

- **Goal**: las ligas viven en Postgres, no en un array, y tienen `createdBy` (FK a User) + `seasonId`.
- **Touches**: tabla `League` en `schema.prisma`; rewrite completo de `modules/leagues/` para usar Prisma (mantener URL paths idénticos); aplicar middleware de auth a endpoints que requieran User logueado; `setup.ts` (truncate `leagues`); `seed.ts` opcional (una liga de prueba).
- **Done when**: `POST /api/v1/leagues` con auth crea liga + asigna `createdById` automáticamente. Resto del CRUD funciona contra DB. Tests verdes incluyendo "no autenticado → 401". El array en-memoria + `let nextId = 1` están borrados.
- **Blocked by**: Slice 1.

### Slice 3 — LeagueMember (membership)

- **Goal**: un User puede unirse a una League con un `inviteCode`, dejarla, o ser kickeado por el owner.
- **Touches**: tabla `LeagueMember` (FK a User + League, `isOwner`, `status`, `joinedAt`); endpoints `/leagues/join`, `/leagues/:id/leave`, `/leagues/:id/members`, `DELETE /leagues/:id/members/:userId`; middleware `requireLeagueMember`, `requireLeagueOwner`; cuando se crea una League en Slice 2, ahora también se crea un LeagueMember `isOwner: true` para el creador.
- **Done when**: tests cubren: join con código válido, join con código inválido (404), leave normal, owner intenta leave (409 — debe transferir antes), kick válido (owner), kick por non-owner (403), respeto al `maxMembers`.
- **Blocked by**: Slice 1, Slice 2.

---

## Next — completar el camino al draft funcional

### Slice 4 — FantasyTeam shell

- **Goal**: cuando un LeagueMember se une, se crea automáticamente su FantasyTeam vacío (todos los slots `null`). Es la entidad que después llenará el draft.
- **Touches**: tabla `FantasyTeam` (1:1 con `LeagueMember`, slots nullable); el service de Slice 3 ahora crea un FantasyTeam al crear el LeagueMember; endpoint `GET /leagues/:id/teams/me` devuelve el equipo del usuario en esa liga.
- **Done when**: al joinear una liga, `prisma.fantasyTeam.count()` para ese member es 1. Endpoint de lectura funciona. Tests cubren creación implícita + lectura.
- **Blocked by**: Slice 3.

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

### Slice 7 — RaceResult ingestion (manual primero)

- **Goal**: poder cargar resultados de carrera por API (admin-only). Sin sync externa aún.
- **Touches**: tabla `RaceResult` (FK a Race + Driver + Constructor, status `CLASSIFIED|DNF|DSQ|DNS`); endpoint `POST /api/v1/races/:id/results` (admin) que recibe un array de resultados; cuando se cargan, `Race.status` transiciona a `COMPLETED`.
- **Done when**: cargar 20 resultados para una Race y verificar `prisma.raceResult.count() = 20`. Tests cubren happy + duplicate prevention (no cargar dos veces la misma carrera) + race ya completed (409).
- **Blocked by**: ninguno técnico (Race ya existe) — pero útil **después** de Slice 6 para empezar a probar scoring.

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

_(empty — mover slices acá cuando estén done)_
