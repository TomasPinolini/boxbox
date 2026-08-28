# BoxBox — API Endpoints

> Todos los endpoints tienen el prefijo `/api/v1/`.  
> Todos los endpoints de listado soportan paginación: `?page=1&limit=20`.

## Estado de implementación

Cada sección está taggeada con su estado actual:

- **[✅ shipped]** — implementado en `main`, con tests verdes
- **[🚧 planned]** — diseñado acá pero todavía no construido (ver [`roadmap.md`](./roadmap.md) para orden)
- **[🔒 outlier]** — implementación parcial / divergente del diseño (típicamente en-memoria sin Prisma); ver el roadmap para el reemplazo

---

## Formatos de respuesta

### Éxito

```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 47 }
}
```

### Error

```json
{
  "error": {
    "code": "DRIVER_ALREADY_DRAFTED",
    "message": "This driver has already been picked by another team",
    "status": 422
  }
}
```

---

## Middleware Stack (en orden)

1. **Helmet** — security headers
2. **CORS** — orígenes permitidos explícitos
3. **Rate limiter** — global + más estricto en auth
4. **JWT verification** — en rutas no públicas
5. **Role middleware** — `requireAdmin`, `requireLeagueMember`, `requireLeagueOwner`
6. **Zod validation** — validación de schema en todos los bodies POST/PATCH/PUT

---

## Auth [✅ shipped — /register, /login, /me, /refresh, /logout; 🚧 planned — PATCH /me]

| Método | Endpoint         | Acceso | Notas                                 |
| ------ | ---------------- | ------ | ------------------------------------- |
| POST   | `/auth/register` | Public | Rate limit: 5/min/IP                  |
| POST   | `/auth/login`    | Public | Rate limit: 5/min/IP                  |
| POST   | `/auth/refresh`  | Public | Refresh token en httpOnly cookie      |
| POST   | `/auth/logout`   | User   | Limpia el refresh token               |
| GET    | `/auth/me`       | User   |                                       |
| PATCH  | `/auth/me`       | User   | Actualizar nombre, avatar, contraseña |

---

## Drivers (CRUD Simple 1) [✅ shipped]

| Método | Endpoint       | Acceso | Notas                                          |
| ------ | -------------- | ------ | ---------------------------------------------- |
| GET    | `/drivers`     | Public | Soporta `?constructorId=X&seasonId=Y`          |
| GET    | `/drivers/:id` | Public |                                                |
| POST   | `/drivers`     | Admin  |                                                |
| PATCH  | `/drivers/:id` | Admin  |                                                |
| DELETE | `/drivers/:id` | Admin  | Soft delete. 409 si tiene dependencias activas |

---

## Constructors (CRUD Simple 2) [✅ shipped]

| Método | Endpoint            | Acceso | Notas                                          |
| ------ | ------------------- | ------ | ---------------------------------------------- |
| GET    | `/constructors`     | Public |                                                |
| GET    | `/constructors/:id` | Public |                                                |
| POST   | `/constructors`     | Admin  |                                                |
| PATCH  | `/constructors/:id` | Admin  |                                                |
| DELETE | `/constructors/:id` | Admin  | Soft delete. 409 si tiene dependencias activas |

---

## Circuits [✅ shipped]

| Método | Endpoint        | Acceso | Notas       |
| ------ | --------------- | ------ | ----------- |
| GET    | `/circuits`     | Public |             |
| GET    | `/circuits/:id` | Public |             |
| POST   | `/circuits`     | Admin  |             |
| PATCH  | `/circuits/:id` | Admin  |             |
| DELETE | `/circuits/:id` | Admin  | Soft delete |

---

## Seasons [✅ shipped]

| Método | Endpoint                | Acceso | Notas                               |
| ------ | ----------------------- | ------ | ----------------------------------- |
| GET    | `/seasons`              | User   |                                     |
| GET    | `/seasons/active`       | User   |                                     |
| POST   | `/seasons`              | Admin  |                                     |
| PATCH  | `/seasons/:id`          | Admin  |                                     |
| PATCH  | `/seasons/:id/activate` | Admin  | Desactiva las demás automáticamente |
| DELETE | `/seasons/:id`          | Admin  |                                     |

---

## Races (CRUD Dependiente) [✅ shipped — CRUD + /results (Slice 7); 🚧 planned — /process, /recalculate sub-endpoints]

| Método | Endpoint                 | Acceso | Notas                                                                                                                                                                                                                                             |
| ------ | ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/races`                 | User   | Soporta `?seasonId=X&status=Y`                                                                                                                                                                                                                    |
| GET    | `/races/:id`             | User   | Incluye estado de lock                                                                                                                                                                                                                            |
| POST   | `/races`                 | Admin  |                                                                                                                                                                                                                                                   |
| PATCH  | `/races/:id`             | Admin  |                                                                                                                                                                                                                                                   |
| DELETE | `/races/:id`             | Admin  |                                                                                                                                                                                                                                                   |
| GET    | `/races/:id/results`     | User   | Resultados crudos ordenados por `position` asc (nulls last). 404 si la Race no existe.                                                                                                                                                            |
| POST   | `/races/:id/results`     | Admin  | Slice 7. Body `{ results: [{driverId, position?, points, gridPosition?, laps?, fastestLap?, status}] }`. Atomico: crea todos los RaceResults + los ConstructorResults (Slice 8: suma de puntos por escudería vía `DriverSeason` de la temporada; `driver1Points` = el mayor, `driver2Points` = 0 si corrió uno solo) + Race pasa a `COMPLETED`, todo en la misma transacción. 409 si Race ya COMPLETED / CANCELLED / POSTPONED; 409 `DRIVER_NOT_IN_SEASON` si un piloto no tiene DriverSeason en esa temporada. |
| POST   | `/races/:id/process`     | Admin  | Fetch desde API externa + calcular puntajes                                                                                                                                                                                                       |
| POST   | `/races/:id/recalculate` | Admin  | Recalcular puntajes sin re-fetch                                                                                                                                                                                                                  |

---

## Leagues [✅ shipped — todos los endpoints (Slice 2 + Slice 3)]

| Método | Endpoint                       | Acceso        | Notas                                                                                                                                         |
| ------ | ------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/leagues`                     | User          | Rate limit 5/min/user. `createdById` del JWT. Crea liga + LeagueMember(owner=true) atómico. Body: `{name, inviteCode, seasonId, maxMembers?}` |
| GET    | `/leagues`                     | User          | Devuelve leagues donde soy ACTIVE member (incluye las que creé)                                                                               |
| GET    | `/leagues/:id`                 | League member | 404 LEAGUE_NOT_FOUND si no soy member (P2-1 unification, no 403)                                                                              |
| PATCH  | `/leagues/:id`                 | League owner  | Partial: `name`/`maxMembers`/`status`/`inviteCode`. 403 NOT_LEAGUE_OWNER si soy member sin ser owner. Body `{}` → 400                         |
| POST   | `/leagues/join`                | User          | Rate limit 10/min/user. Body: `{inviteCode}`. 404 INVITE_CODE_NOT_FOUND si inválido o archived. Soporta rejoin desde LEFT/KICKED              |
| POST   | `/leagues/:id/leave`           | League member | 409 OWNER_CANNOT_LEAVE si soy owner (debe transferir primero — fuera de scope hoy)                                                            |
| GET    | `/leagues/:id/members`         | League member | Devuelve solo ACTIVE members (LEFT/KICKED no aparecen)                                                                                        |
| DELETE | `/leagues/:id/members/:userId` | League owner  | Kick (soft → KICKED). 409 OWNER_CANNOT_LEAVE si owner intenta kickearse a sí mismo                                                            |

> **Archivado**: NO hay `DELETE /leagues/:id`. Para archivar una liga: `PATCH /leagues/:id { "status": "ARCHIVED" }`.
> **Rejoin**: tanto LEFT como KICKED pueden rejoinear vía `POST /leagues/join`. Status queda como audit trail.

---

## Draft [✅ shipped — REST (Slice 5) + WebSocket (Slice 6); 🚧 planned — draft:pause/draft:resume]

### REST Endpoints

3 rondas fijas por draft (una por slot de FantasyTeam): rondas 1-2 categoría DRIVER (llenan `driver1`/`driver2` en ese orden), ronda 3 categoría CONSTRUCTOR (llena `constructor`). Con N miembros ACTIVE, el draft completo son `N × 3` picks. No hay piloto reserva (ADR-0006). `start` rechaza con 409 `TOO_MANY_MEMBERS_FOR_DRAFT` si los miembros superan `floor(season.driverCount / 2)`.

| Método | Endpoint                       | Acceso        | Notas                             |
| ------ | ------------------------------ | ------------- | ---------------------------------- |
| POST   | `/leagues/:id/draft/start`     | League owner  | Genera draft order aleatorio (Fisher-Yates) + snake order entre rondas. 409 `DRAFT_ALREADY_STARTED` si `draftStatus != PENDING`. |
| GET    | `/leagues/:id/draft/state`     | League member | Estado actual + picks realizados. `round`/`pickNumber`/`currentTurnLeagueMemberId` en `null` si no hay pick abierto (PENDING o COMPLETED). |
| GET    | `/leagues/:id/draft/available` | League member | Drivers/constructors sin draftear en ESTA liga (otras ligas no cuentan). |
| POST   | `/leagues/:id/draft/pick`      | League member | Body: `{ driverId }` o `{ constructorId }` (exactamente uno, segun la ronda). 409 `NOT_YOUR_TURN` / `WRONG_PICK_CATEGORY` / `DRIVER_ALREADY_DRAFTED` / `CONSTRUCTOR_ALREADY_DRAFTED` / `DRAFT_NOT_LIVE`. Llena el slot del FantasyTeam correspondiente; transiciona a `COMPLETED` en el ultimo pick. |
| POST   | `/leagues/:id/draft/reset`     | League owner  | Reinicia el draft completo: borra los `DraftPick`, vacia los `FantasyTeam` de la liga, vuelve a `PENDING`. |

### WebSocket Events (Socket.io) — Slice 6

Namespace: `/draft`. Auth en el **handshake**, no en un evento separado — el cliente conecta con `auth: { token, leagueId }`. Si el token es inválido o el user no es ACTIVE member de esa liga, la conexión se rechaza (`connect_error` del lado del cliente, nunca llega a `connection`) con uno de estos motivos: `TOKEN_MISSING`, `LEAGUE_ID_REQUIRED`, `TOKEN_INVALID`, `LEAGUE_NOT_FOUND` (mismo criterio P2-1 que HTTP — no distingue "liga inexistente" de "no soy member").

| Dirección | Evento           | Payload                                                                | Descripción                                                      |
| --------- | ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ← Server  | `draft:state`    | `{ draftStatus, round, pickNumber, currentTurnLeagueMemberId, picks, available, timer }` | Enviado al conectar (estado completo). `timer` es `null` si el draft no está LIVE. |
| → Client  | `draft:pick`     | `{ driverId? }` o `{ constructorId? }`                                  | Usuario hace un pick. Exactamente uno de los dos campos.          |
| ← Server  | `draft:update`   | `{ pick, nextTurn, round, available }`                                  | Broadcast a todos en la room tras un pick (manual o auto).        |
| ← Server  | `draft:timer`    | `{ secondsRemaining }`                                                  | Enviado UNA vez al arrancar cada turno (60s) — no es un tick por segundo, el cliente cuenta localmente. |
| ← Server  | `draft:error`    | `{ code, message }`                                                     | Solo al socket que causó el error (no broadcast). Mismos códigos que el REST: `NOT_YOUR_TURN`, `WRONG_PICK_CATEGORY`, `DRIVER_ALREADY_DRAFTED`, etc. |
| ← Server  | `draft:complete` | `{ teams }`                                                              | Draft finalizado — los `FantasyTeam` completos de la liga.        |

**Overlay, no un canal aparte**: un pick/start/reset hecho por REST dispara estos mismos broadcasts a los clientes conectados por socket — no hace falta usar el socket para todo, ambas vías se mantienen sincronizadas.

Si el timer llega a 0 sin que nadie pickee, el servidor auto-asigna **al azar** entre los drivers/constructors disponibles para la categoría de esa ronda — no hay sistema de ranking en el proyecto para elegir "el mejor".

**Planeado, no en Slice 6**: `draft:pause` / `draft:resume` (el owner pausa/reanuda el draft).

---

## Fantasy Teams [✅ shipped — GET /teams/me (Slice 4); 🚧 planned — resto]

| Método | Endpoint                      | Acceso        | Notas                                                             |
| ------ | ----------------------------- | ------------- | ----------------------------------------------------------------- |
| GET    | `/leagues/:id/teams`          | League member | Todos los equipos de la liga                                      |
| GET    | `/leagues/:id/teams/:userId`  | League member | Equipo de un usuario específico                                   |
| GET    | `/leagues/:id/teams/me`       | League member | Slice 4. Mi FantasyTeam en esta liga (`driver1Id`, `driver2Id`, `constructorId`); se crea vacío (slots `null`) al crear/joinear la liga |

---

## Predictions [🚧 planned]

| Método | Endpoint                               | Acceso        | Notas                                        |
| ------ | -------------------------------------- | ------------- | -------------------------------------------- |
| PUT    | `/leagues/:id/predictions/:raceId`     | League member | Upsert. Solo antes de `lockDate`             |
| GET    | `/leagues/:id/predictions/:raceId`     | League member | Mi predicción                                |
| GET    | `/leagues/:id/predictions/:raceId/all` | League member | Predicciones de todos. Solo después del lock |

---

## Standings & Recaps [🚧 planned]

| Método | Endpoint                          | Acceso        | Notas                                         |
| ------ | --------------------------------- | ------------- | --------------------------------------------- |
| GET    | `/leagues/:id/standings`          | League member | Standings actuales                            |
| GET    | `/leagues/:id/standings?raceId=X` | League member | Standings históricos a una carrera específica |
| GET    | `/leagues/:id/recaps/:raceId`     | League member | Recap de la carrera                           |

### Contenido del Recap

```json
{
  "driverPoints": [{ "driver": "Norris", "position": 2, "points": 18, "status": "CLASSIFIED" }],
  "constructorPoints": {
    "constructor": "McLaren",
    "driver1Points": 18,
    "driver2Points": 12,
    "totalPoints": 30
  },
  "predictions": {
    "winner": { "predicted": "Verstappen", "actual": "Verstappen", "correct": true, "points": 10 },
    "pole": { "predicted": "Norris", "actual": "Norris", "correct": true, "points": 8 },
    "topConstructor": { "predicted": "McLaren", "actual": "Ferrari", "correct": false, "points": 0 }
  },
  "standings": {
    "position": 2,
    "positionChange": 1,
    "totalPoints": 156
  }
}
```

---

## Admin — Sync [🚧 planned]

| Método | Endpoint                   | Acceso | Notas                               |
| ------ | -------------------------- | ------ | ----------------------------------- |
| POST   | `/admin/sync/drivers`      | Admin  | Sync desde Jolpica/OpenF1           |
| POST   | `/admin/sync/constructors` | Admin  |                                     |
| POST   | `/admin/sync/circuits`     | Admin  |                                     |
| POST   | `/admin/sync/races`        | Admin  |                                     |
| POST   | `/admin/sync/season`       | Admin  | Calendario completo de la temporada |
| GET    | `/admin/sync/log`          | Admin  | Historial de syncs con resultados   |

---

## System [✅ shipped]

| Método | Endpoint  | Acceso | Notas                                  |
| ------ | --------- | ------ | -------------------------------------- |
| GET    | `/health` | Public | Estado del servidor y la base de datos |

---

## Scoring

### Puntos por Driver (pilotos titulares)

| Evento                       | Puntos |
| ---------------------------- | ------ |
| P1                           | 25     |
| P2                           | 18     |
| P3                           | 15     |
| P4                           | 12     |
| P5                           | 10     |
| P6                           | 8      |
| P7                           | 6      |
| P8                           | 4      |
| P9                           | 2      |
| P10                          | 1      |
| Fastest lap                  | +5     |
| Ganó 5+ posiciones (vs grid) | +3     |
| DNF                          | -10    |
| DSQ                          | -15    |

### Puntos por Constructor

Suma de los puntos reales de ambos pilotos del constructor en la carrera.

### Puntos por Predicción

| Predicción          | Puntos si es correcta |
| ------------------- | --------------------- |
| Race winner         | +10                   |
| Pole position       | +8                    |
| Team con más puntos | +12                   |

### Piloto que no termina (DNF / DSQ / DNS)

- No hay piloto reserva ni swaps (ADR-0006). Un piloto con status `DNF`, `DSQ` o `DNS` suma 0 puntos para ese slot del FantasyTeam en esa carrera.
