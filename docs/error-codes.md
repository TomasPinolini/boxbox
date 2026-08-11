# Error codes — Catálogo

Códigos de error tipados que la API puede devolver en el envelope `{ error: { code, message, status } }`. Mantenelo sincronizado cuando agregues errores nuevos.

**Convención de naming:**

- `SCREAMING_SNAKE_CASE`.
- Domain-prefijado: `DRIVER_NOT_FOUND`, no solo `NOT_FOUND`.
- Sufijos estándar: `_NOT_FOUND` (404), `_ALREADY_EXISTS` (409 duplicado), `_HAS_DEPENDENCIES` (409 borrar con FKs activas).

**Cómo se generan:**

- `NotFoundError('Driver')` → `DRIVER_NOT_FOUND` (404) — el sufijo lo agrega la clase ([`backend/src/shared/errors.ts:11-15`](../backend/src/shared/errors.ts#L11)).
- `ConflictError(message, 'CODE')` → 409 con el code provisto a mano ([`backend/src/shared/errors.ts:17-21`](../backend/src/shared/errors.ts#L17)).
- Zod fail vía `validate()` middleware → `VALIDATION_ERROR` (400).
- Excepción no atrapada → `INTERNAL_ERROR` (500) + log server-side.

---

## Cross-cutting

| Código             | HTTP | Origen                                                                      | Cuándo                                                                                                                                  |
| ------------------ | ---- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR` | 400  | [`middleware/validate.ts`](../backend/src/middleware/validate.ts)           | El body no matchea el Zod schema del endpoint. `error.details` lleva el detalle por campo.                                              |
| `INTERNAL_ERROR`   | 500  | [`middleware/error-handler.ts`](../backend/src/middleware/error-handler.ts) | Cualquier excepción que no es `AppError`. Se loguea en server-side; al cliente solo le llega genérico (no leakeamos detalles internos). |

---

## Drivers

| Código                    | HTTP | Origen                     | Cuándo                                                                                  |
| ------------------------- | ---- | -------------------------- | --------------------------------------------------------------------------------------- |
| `DRIVER_NOT_FOUND`        | 404  | `drivers.service.ts:40`    | GET/PATCH/DELETE de un Driver inexistente o soft-deleted.                               |
| `DRIVER_ALREADY_EXISTS`   | 409  | `drivers.service.ts:52-55` | POST con un `externalId` ya usado (incluso en filas soft-deleted).                      |
| `DRIVER_HAS_DEPENDENCIES` | 409  | `drivers.service.ts:77-80` | DELETE de un Driver referenciado por un `FantasyTeam` activo (driver1/driver2/reserve). |

## Constructors

| Código                         | HTTP | Origen                          | Cuándo                                                             |
| ------------------------------ | ---- | ------------------------------- | ------------------------------------------------------------------ |
| `CONSTRUCTOR_NOT_FOUND`        | 404  | `constructors.service.ts:19`    | GET/PATCH/DELETE de un Constructor inexistente.                    |
| `CONSTRUCTOR_ALREADY_EXISTS`   | 409  | `constructors.service.ts:29-32` | POST con `externalId` ya usado.                                    |
| `CONSTRUCTOR_HAS_DEPENDENCIES` | 409  | `constructors.service.ts:51-54` | DELETE de un Constructor referenciado por un `FantasyTeam` activo. |

## Circuits

| Código                     | HTTP | Origen                      | Cuándo                                      |
| -------------------------- | ---- | --------------------------- | ------------------------------------------- |
| `CIRCUIT_NOT_FOUND`        | 404  | `circuits.service.ts:19`    | GET/PATCH/DELETE de un Circuit inexistente. |
| `CIRCUIT_ALREADY_EXISTS`   | 409  | `circuits.service.ts:29-32` | POST con `externalId` ya usado.             |
| `CIRCUIT_HAS_DEPENDENCIES` | 409  | `circuits.service.ts:51`    | DELETE de un Circuit con Races activas.     |

## Seasons

| Código                    | HTTP | Origen                  | Cuándo                                                                                                                                                                                                                               |
| ------------------------- | ---- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SEASON_NOT_FOUND`        | 404  | `seasons.service.ts:17` | GET/PATCH/DELETE de una Season inexistente.                                                                                                                                                                                          |
| `ACTIVE SEASON_NOT_FOUND` | 404  | `seasons.service.ts:11` | `GET /seasons/active` cuando no hay ninguna Season con `isActive: true`. (Nota: el nombre con espacio es un artefacto de `NotFoundError('Active season')`; cuando se refactoree, considerar normalizar a `ACTIVE_SEASON_NOT_FOUND`.) |
| `SEASON_ALREADY_EXISTS`   | 409  | `seasons.service.ts:24` | POST con un `year` ya existente.                                                                                                                                                                                                     |
| `SEASON_HAS_DEPENDENCIES` | 409  | `seasons.service.ts:50` | DELETE de una Season con Leagues activas.                                                                                                                                                                                            |

## Races

| Código                         | HTTP | Origen                                                 | Cuándo                                                                                                                              |
| ------------------------------ | ---- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `RACE_NOT_FOUND`               | 404  | `races.service.ts` (findById, loadResults, getResults) | GET/PATCH/DELETE/results de una Race inexistente.                                                                                   |
| `RACE_ROUND_DUPLICATE`         | 409  | `races.service.ts` (create)                            | POST de una Race cuyo `(seasonId, round)` ya existe.                                                                                |
| `RACE_ALREADY_COMPLETED`       | 409  | `races.service.ts` (loadResults)                       | Slice 7. `POST /races/:id/results` cuando `race.status === 'COMPLETED'` — idempotency guard, no se cargan results dos veces.        |
| `RACE_NOT_LOADABLE`            | 409  | `races.service.ts` (loadResults)                       | Slice 7. `POST /races/:id/results` cuando `race.status ∈ {CANCELLED, POSTPONED}` — la carrera no ocurrió, no aplica cargar results. |
| `RACE_RESULT_DUPLICATE_DRIVER` | 409  | `races.service.ts` (loadResults)                       | Slice 7. El array de results contiene el mismo `driverId` más de una vez. El pre-check falla antes de la transacción.               |
| `DRIVER_NOT_FOUND`             | 404  | `races.service.ts` (loadResults)                       | Slice 7. Algún `driverId` del array no existe o está soft-deleted. Rollback garantizado (nada se inserta).                          |

> Nota: los endpoints de Races que validan la existencia de `Season` o `Circuit` referenciados también pueden lanzar `SEASON_NOT_FOUND` o `CIRCUIT_NOT_FOUND` (create/update).

## Auth

| Código                  | HTTP | Origen                                                           | Cuándo                                                                                                                                                                        |
| ----------------------- | ---- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_CREDENTIALS`   | 401  | `auth.service.ts` (login)                                        | Login con email inexistente O password incorrecto. **Mismo código y mensaje en ambos casos** para evitar account enumeration.                                                 |
| `EMAIL_ALREADY_EXISTS`  | 409  | `auth.service.ts` (register)                                     | Register con un email ya registrado (después de trim + lowercase en el schema). El catch del Prisma error `P2002` hace el chequeo race-free.                                  |
| `TOKEN_MISSING`         | 401  | `middleware/auth.ts` (requireAuth)                               | Header `Authorization` ausente, sin prefijo `Bearer `, o con bearer vacío.                                                                                                    |
| `TOKEN_INVALID`         | 401  | `middleware/auth.ts` + `shared/jwt.ts:verifyAccessToken`         | JWT corrupto, firma inválida, expirado, o payload con shape inesperado. **Mismo código** para todos los casos (no diferenciamos expirado vs firma mala al cliente).           |
| `REFRESH_TOKEN_MISSING` | 401  | `auth.controller.ts` (refresh)                                   | `POST /refresh` sin cookie `refreshToken` (típicamente despues de logout o sin login previo).                                                                                 |
| `REFRESH_TOKEN_INVALID` | 401  | `shared/jwt.ts:verifyRefreshToken` + `auth.service.ts` (refresh) | Cookie `refreshToken` con firma inválida, expirada, payload raro, o user borrado. Mismo código para todos los casos.                                                          |
| `USER_NOT_FOUND`        | 404  | `auth.service.ts` (getMe)                                        | `GET /me` con token válido pero el `userId` ya no existe en DB (user eliminado entre login y este request).                                                                   |
| `ADMIN_REQUIRED`        | 403  | `middleware/admin.ts` (requireAdmin)                             | Slice 7. Endpoint admin-only accedido con token válido pero `role !== 'ADMIN'`. Se lee del payload del JWT — no hace query a DB (staleness ~15min hasta que expire el token). |

## Leagues

| Código                  | HTTP | Origen                                                                        | Cuándo                                                                                                                                                                                                                  |
| ----------------------- | ---- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LEAGUE_NOT_FOUND`      | 404  | `middleware/leagueMembership.ts` (requireLeagueMember) + `leagues.service.ts` | Slice 3: cuando user autenticado no es ACTIVE member de la League referenced en `:id`. **Unificación P2-1**: distingue de 403 — solo devuelve 403 cuando es member pero no owner (no leakea info sobre IDs existentes). |
| `INVITE_CODE_NOT_FOUND` | 404  | `leagues.service.ts` (joinLeague)                                             | `POST /leagues/join` con un inviteCode que no existe O la liga está ARCHIVED. Mismo code para ambos casos (no leakea estado de la liga).                                                                                |
| `SEASON_NOT_FOUND`      | 404  | `leagues.service.ts` (createLeague — catch P2003)                             | POST con `seasonId` que no existe en `seasons`.                                                                                                                                                                         |
| `MEMBER_NOT_FOUND`      | 404  | `leagues.service.ts` (kickMember)                                             | DELETE `/leagues/:id/members/:userId` con un userId que no es ACTIVE member.                                                                                                                                            |
| `INVITE_CODE_TAKEN`     | 409  | `leagues.service.ts` (createLeague, updateLeague — catch P2002)               | POST/PATCH con un `inviteCode` ya usado (después de normalizar a lowercase). Catch del Prisma error `P2002` hace el chequeo race-free.                                                                                  |
| `ALREADY_MEMBER`        | 409  | `leagues.service.ts` (joinLeague)                                             | `POST /leagues/join` cuando ya soy ACTIVE member de esa liga. Rejoin de LEFT/KICKED NO tira esto — solo si estoy actualmente ACTIVE.                                                                                    |
| `LEAGUE_FULL`           | 409  | `leagues.service.ts` (joinLeague)                                             | Intento de joinear cuando `count(ACTIVE members) === maxMembers`.                                                                                                                                                       |
| `OWNER_CANNOT_LEAVE`    | 409  | `leagues.service.ts` (leaveLeague, kickMember)                                | Owner intenta `POST /leagues/:id/leave` O `DELETE /:id/members/:ownerId`. Debe transferir ownership antes (fuera de scope hoy).                                                                                         |
| `NOT_LEAGUE_OWNER`      | 403  | `middleware/leagueMembership.ts` (requireLeagueOwner)                         | User ES ACTIVE member pero la ruta requiere owner (PATCH, DELETE kick). Único caso donde 403 NO leakea info (user ya sabe que la liga existe porque es member).                                                         |
| `FANTASY_TEAM_NOT_FOUND` | 404  | `leagues.service.ts` (getMyFantasyTeam)                                       | Slice 4. Defense-in-depth — no debería ocurrir en la práctica: el FantasyTeam se crea atómicamente junto al LeagueMember en `createLeague`/`joinLeague`.                                                                |
| `RATE_LIMIT_EXCEEDED`   | 429  | `middleware/rateLimit.ts`                                                     | POST `/leagues` (5/min/user) o POST `/leagues/join` (10/min/user) excedido. Skip en `NODE_ENV=test` o `VITEST=true`.                                                                                                    |
| `VALIDATION_ERROR`      | 400  | `middleware/validate.ts` + `validateParams`                                   | inviteCode reservado/length/charset inválido, body vacío en PATCH, o path param no-int (`:id` o `:userId`). `error.details` lleva el detalle por campo.                                                                 |

---

## Códigos planeados (todavía no implementados)

Estos van a aparecer cuando se construyan los slices del [`roadmap.md`](./roadmap.md). Documentados acá para que el equipo no invente variantes inconsistentes:

### Slice 10 — Predictions

| Código               | HTTP | Cuándo                                                     |
| -------------------- | ---- | ---------------------------------------------------------- |
| `PREDICTIONS_LOCKED` | 409  | Crear/editar Prediction después del `lockDate` de la Race. |

### Slice 11 — DriverSwap

| Código                  | HTTP | Cuándo                                                |
| ----------------------- | ---- | ----------------------------------------------------- |
| `SWAPS_LOCKED`          | 409  | Swap manual después del `lockDate` de la Race.        |
| `RESERVE_NOT_AVAILABLE` | 409  | Intento de swap sin tener un piloto reserva asignado. |

---

## Draft (Slice 5)

| Código                         | HTTP | Origen                          | Cuándo                                                                                                                                            |
| ------------------------------ | ---- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DRAFT_ALREADY_STARTED`        | 409  | `draft.service.ts` (startDraft)  | `POST /leagues/:id/draft/start` cuando `League.draftStatus != PENDING` — el draft ya arrancó (o ya terminó).                                        |
| `DRAFT_NOT_LIVE`                | 409  | `draft.service.ts` (submitPick)  | `POST /leagues/:id/draft/pick` cuando `League.draftStatus != LIVE` (todavía no arrancó, o ya terminó). También defense-in-depth si no hay ningún pick abierto. |
| `NOT_YOUR_TURN`                 | 409  | `draft.service.ts` (submitPick)  | El pick actual (menor `pickNumber` sin llenar) pertenece a otro `LeagueMember`.                                                                     |
| `WRONG_PICK_CATEGORY`           | 409  | `draft.service.ts` (submitPick)  | La ronda actual espera `driverId` (rondas 1-3) o `constructorId` (ronda 4) y el body mandó el otro campo.                                           |
| `DRIVER_ALREADY_DRAFTED`        | 409  | `draft.service.ts` (submitPick)  | Ese `driverId` ya tiene un pick completado en esta liga (en cualquier ronda/miembro).                                                                |
| `CONSTRUCTOR_ALREADY_DRAFTED`   | 409  | `draft.service.ts` (submitPick)  | Ese `constructorId` ya tiene un pick completado en esta liga.                                                                                       |
| `DRIVER_NOT_FOUND`              | 404  | `draft.service.ts` (submitPick)  | El `driverId` del pick no existe o está soft-deleted. Reusa el código de Drivers/Races.                                                              |
| `CONSTRUCTOR_NOT_FOUND`         | 404  | `draft.service.ts` (submitPick)  | El `constructorId` del pick no existe o está soft-deleted. Reusa el código de Constructors.                                                          |

> Nota: `LEAGUE_NOT_FOUND` (si no soy member) y `NOT_LEAGUE_OWNER` (en `/start` y `/reset`, si soy member pero no owner) también aplican acá — vienen de `middleware/leagueMembership.ts`, mismo criterio que el resto de las rutas `/leagues/:id/*`.

---

## Notas para el frontend

- Siempre matchear contra `error.code`, **no** contra `error.message`. El message es libre y puede cambiarse sin rotura semántica; el code es contrato.
- Los códigos en la columna _planeados_ aparecerán a medida que se shippean los slices — no usar `error.code` hardcodeado de un slice que todavía no salió.
- `details` solo aparece en `VALIDATION_ERROR`. Para el resto, asumir que `details` no existe.
