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

| Código | HTTP | Origen | Cuándo |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | [`middleware/validate.ts`](../backend/src/middleware/validate.ts) | El body no matchea el Zod schema del endpoint. `error.details` lleva el detalle por campo. |
| `INTERNAL_ERROR` | 500 | [`middleware/error-handler.ts`](../backend/src/middleware/error-handler.ts) | Cualquier excepción que no es `AppError`. Se loguea en server-side; al cliente solo le llega genérico (no leakeamos detalles internos). |

---

## Drivers

| Código | HTTP | Origen | Cuándo |
|---|---|---|---|
| `DRIVER_NOT_FOUND` | 404 | `drivers.service.ts:40` | GET/PATCH/DELETE de un Driver inexistente o soft-deleted. |
| `DRIVER_ALREADY_EXISTS` | 409 | `drivers.service.ts:52-55` | POST con un `externalId` ya usado (incluso en filas soft-deleted). |
| `DRIVER_HAS_DEPENDENCIES` | 409 | `drivers.service.ts:77-80` | DELETE de un Driver referenciado por un `FantasyTeam` activo (driver1/driver2/reserve). |

## Constructors

| Código | HTTP | Origen | Cuándo |
|---|---|---|---|
| `CONSTRUCTOR_NOT_FOUND` | 404 | `constructors.service.ts:19` | GET/PATCH/DELETE de un Constructor inexistente. |
| `CONSTRUCTOR_ALREADY_EXISTS` | 409 | `constructors.service.ts:29-32` | POST con `externalId` ya usado. |
| `CONSTRUCTOR_HAS_DEPENDENCIES` | 409 | `constructors.service.ts:51-54` | DELETE de un Constructor referenciado por un `FantasyTeam` activo. |

## Circuits

| Código | HTTP | Origen | Cuándo |
|---|---|---|---|
| `CIRCUIT_NOT_FOUND` | 404 | `circuits.service.ts:19` | GET/PATCH/DELETE de un Circuit inexistente. |
| `CIRCUIT_ALREADY_EXISTS` | 409 | `circuits.service.ts:29-32` | POST con `externalId` ya usado. |
| `CIRCUIT_HAS_DEPENDENCIES` | 409 | `circuits.service.ts:51` | DELETE de un Circuit con Races activas. |

## Seasons

| Código | HTTP | Origen | Cuándo |
|---|---|---|---|
| `SEASON_NOT_FOUND` | 404 | `seasons.service.ts:17` | GET/PATCH/DELETE de una Season inexistente. |
| `ACTIVE SEASON_NOT_FOUND` | 404 | `seasons.service.ts:11` | `GET /seasons/active` cuando no hay ninguna Season con `isActive: true`. (Nota: el nombre con espacio es un artefacto de `NotFoundError('Active season')`; cuando se refactoree, considerar normalizar a `ACTIVE_SEASON_NOT_FOUND`.) |
| `SEASON_ALREADY_EXISTS` | 409 | `seasons.service.ts:24` | POST con un `year` ya existente. |
| `SEASON_HAS_DEPENDENCIES` | 409 | `seasons.service.ts:50` | DELETE de una Season con Leagues activas. |

## Races

| Código | HTTP | Origen | Cuándo |
|---|---|---|---|
| `RACE_NOT_FOUND` | 404 | `races.service.ts:22` | GET/PATCH/DELETE de una Race inexistente. |
| `RACE_ROUND_DUPLICATE` | 409 | `races.service.ts:42-45` | POST de una Race cuyo `(seasonId, round)` ya existe. |

> Nota: los endpoints de Races que validan la existencia de `Season` o `Circuit` referenciados pueden lanzar `SEASON_NOT_FOUND` o `CIRCUIT_NOT_FOUND` respectivamente (`races.service.ts:29, 35, 57, 63`).

## Auth

| Código | HTTP | Origen | Cuándo |
|---|---|---|---|
| `INVALID_CREDENTIALS` | 401 | `auth.service.ts` (login) | Login con email inexistente O password incorrecto. **Mismo código y mensaje en ambos casos** para evitar account enumeration. |
| `EMAIL_ALREADY_EXISTS` | 409 | `auth.service.ts` (register) | Register con un email ya registrado (después de trim + lowercase en el schema). El catch del Prisma error `P2002` hace el chequeo race-free. |
| `TOKEN_MISSING` | 401 | `middleware/auth.ts` (requireAuth) | Header `Authorization` ausente, sin prefijo `Bearer `, o con bearer vacío. |
| `TOKEN_INVALID` | 401 | `middleware/auth.ts` + `shared/jwt.ts:verifyAccessToken` | JWT corrupto, firma inválida, expirado, o payload con shape inesperado. **Mismo código** para todos los casos (no diferenciamos expirado vs firma mala al cliente). |
| `REFRESH_TOKEN_MISSING` | 401 | `auth.controller.ts` (refresh) | `POST /refresh` sin cookie `refreshToken` (típicamente despues de logout o sin login previo). |
| `REFRESH_TOKEN_INVALID` | 401 | `shared/jwt.ts:verifyRefreshToken` + `auth.service.ts` (refresh) | Cookie `refreshToken` con firma inválida, expirada, payload raro, o user borrado. Mismo código para todos los casos. |
| `USER_NOT_FOUND` | 404 | `auth.service.ts` (getMe) | `GET /me` con token válido pero el `userId` ya no existe en DB (user eliminado entre login y este request). |

---

## Códigos planeados (todavía no implementados)

Estos van a aparecer cuando se construyan los slices del [`roadmap.md`](./roadmap.md). Documentados acá para que el equipo no invente variantes inconsistentes:

### Slices 2-3 — Leagues + Membership

| Código | HTTP | Cuándo |
|---|---|---|
| `LEAGUE_NOT_FOUND` | 404 | League inexistente. |
| `INVITE_CODE_INVALID` | 404 | Code de invitación no existe. |
| `LEAGUE_FULL` | 409 | Intento de joinear una League en el cap `maxMembers`. |
| `ALREADY_MEMBER` | 409 | User ya es LeagueMember de esa League. |
| `OWNER_CANNOT_LEAVE` | 409 | Owner intenta hacer leave sin transferir ownership. |
| `NOT_LEAGUE_MEMBER` | 403 | User no es miembro de la League pero accede a endpoints scoped a la League. |
| `NOT_LEAGUE_OWNER` | 403 | Acción que requiere ser owner ejecutada por miembro común. |

### Slice 5 — Draft REST

| Código | HTTP | Cuándo |
|---|---|---|
| `DRAFT_NOT_LIVE` | 409 | Acción sobre el draft cuando `League.draftStatus != LIVE`. |
| `NOT_YOUR_TURN` | 409 | Pick fuera de turno. |
| `DRIVER_ALREADY_DRAFTED` | 409 | Pick de un Driver ya tomado en esta League. |
| `CONSTRUCTOR_ALREADY_DRAFTED` | 409 | Pick de un Constructor ya tomado en esta League. |
| `WRONG_PICK_CATEGORY` | 409 | Tomar un Constructor en una ronda de Drivers (o viceversa). |

### Slice 10 — Predictions

| Código | HTTP | Cuándo |
|---|---|---|
| `PREDICTIONS_LOCKED` | 409 | Crear/editar Prediction después del `lockDate` de la Race. |

### Slice 11 — DriverSwap

| Código | HTTP | Cuándo |
|---|---|---|
| `SWAPS_LOCKED` | 409 | Swap manual después del `lockDate` de la Race. |
| `RESERVE_NOT_AVAILABLE` | 409 | Intento de swap sin tener un piloto reserva asignado. |

---

## Notas para el frontend

- Siempre matchear contra `error.code`, **no** contra `error.message`. El message es libre y puede cambiarse sin rotura semántica; el code es contrato.
- Los códigos en la columna *planeados* aparecerán a medida que se shippean los slices — no usar `error.code` hardcodeado de un slice que todavía no salió.
- `details` solo aparece en `VALIDATION_ERROR`. Para el resto, asumir que `details` no existe.
