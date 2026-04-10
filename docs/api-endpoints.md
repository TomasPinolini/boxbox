# BoxBox — API Endpoints

> Todos los endpoints tienen el prefijo `/api/v1/`.  
> Todos los endpoints de listado soportan paginación: `?page=1&limit=20`.

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

## Auth

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| POST | `/auth/register` | Public | Rate limit: 5/min/IP |
| POST | `/auth/login` | Public | Rate limit: 5/min/IP |
| POST | `/auth/refresh` | Public | Refresh token en httpOnly cookie |
| POST | `/auth/logout` | User | Limpia el refresh token |
| GET | `/auth/me` | User | |
| PATCH | `/auth/me` | User | Actualizar nombre, avatar, contraseña |

---

## Drivers (CRUD Simple 1)

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| GET | `/drivers` | Public | Soporta `?constructorId=X&seasonId=Y` |
| GET | `/drivers/:id` | Public | |
| POST | `/drivers` | Admin | |
| PATCH | `/drivers/:id` | Admin | |
| DELETE | `/drivers/:id` | Admin | Soft delete. 409 si tiene dependencias activas |

---

## Constructors (CRUD Simple 2)

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| GET | `/constructors` | Public | |
| GET | `/constructors/:id` | Public | |
| POST | `/constructors` | Admin | |
| PATCH | `/constructors/:id` | Admin | |
| DELETE | `/constructors/:id` | Admin | Soft delete. 409 si tiene dependencias activas |

---

## Circuits

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| GET | `/circuits` | Public | |
| GET | `/circuits/:id` | Public | |
| POST | `/circuits` | Admin | |
| PATCH | `/circuits/:id` | Admin | |
| DELETE | `/circuits/:id` | Admin | Soft delete |

---

## Seasons

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| GET | `/seasons` | User | |
| GET | `/seasons/active` | User | |
| POST | `/seasons` | Admin | |
| PATCH | `/seasons/:id` | Admin | |
| PATCH | `/seasons/:id/activate` | Admin | Desactiva las demás automáticamente |
| DELETE | `/seasons/:id` | Admin | |

---

## Races (CRUD Dependiente)

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| GET | `/races` | User | Soporta `?seasonId=X&status=Y` |
| GET | `/races/:id` | User | Incluye estado de lock |
| POST | `/races` | Admin | |
| PATCH | `/races/:id` | Admin | |
| DELETE | `/races/:id` | Admin | |
| GET | `/races/:id/results` | User | Resultados crudos de la carrera |
| POST | `/races/:id/results` | Admin | Entrada manual (fallback si la API externa falla) |
| POST | `/races/:id/process` | Admin | Fetch desde API externa + calcular puntajes |
| POST | `/races/:id/recalculate` | Admin | Recalcular puntajes sin re-fetch |

---

## Leagues

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| POST | `/leagues` | User | El creador se convierte en owner |
| GET | `/leagues/mine` | User | Todas las ligas del usuario |
| GET | `/leagues/:id` | League member | |
| PATCH | `/leagues/:id` | League owner | Actualizar nombre, configuración |
| DELETE | `/leagues/:id` | League owner | |
| POST | `/leagues/join` | User | Body: `{ code: "ABC123" }` |
| POST | `/leagues/:id/leave` | League member | No puede ser el owner |
| GET | `/leagues/:id/members` | League member | Lista de miembros |
| DELETE | `/leagues/:id/members/:userId` | League owner | Kickear miembro |

---

## Draft

### REST Endpoints

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| POST | `/leagues/:id/draft/start` | League owner | Genera draft order aleatorio |
| GET | `/leagues/:id/draft/state` | League member | Estado actual + picks realizados |
| GET | `/leagues/:id/draft/available` | League member | Drivers/constructors disponibles |
| POST | `/leagues/:id/draft/reset` | League owner | Reinicia el draft completo |

### WebSocket Events (Socket.io)

Autenticación via JWT en el handshake. Namespace: `/draft`.

| Dirección | Evento | Payload | Descripción |
|-----------|--------|---------|-------------|
| ← Server | `draft:state` | `{ picks, currentTurn, round, timer, available }` | Enviado al conectar (estado completo) |
| → Client | `draft:pick` | `{ driverId?, constructorId? }` | Usuario hace un pick |
| ← Server | `draft:update` | `{ pick, nextTurn, round, available }` | Broadcast a todos tras un pick |
| ← Server | `draft:timer` | `{ secondsRemaining }` | Countdown por pick (60s) |
| ← Server | `draft:error` | `{ code, message }` | Pick inválido, no es tu turno, etc. |
| ← Server | `draft:complete` | `{ teams }` | Draft finalizado, equipos armados |
| ← Server | `draft:pause` | `{ reason }` | Owner pausa el draft |
| ← Server | `draft:resume` | `{}` | Owner reanuda el draft |

> Si el timer llega a 0, el servidor auto-asigna el mejor driver/constructor disponible según ranking.

---

## Fantasy Teams

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| GET | `/leagues/:id/teams` | League member | Todos los equipos de la liga |
| GET | `/leagues/:id/teams/:userId` | League member | Equipo de un usuario específico |
| GET | `/leagues/:id/teams/me` | League member | Mi equipo |
| POST | `/leagues/:id/teams/me/swap` | League member | Solo antes de `lockDate`. Body: `{ slot, reserveIn: true/false }` |
| GET | `/leagues/:id/teams/me/swaps` | League member | Historial de swaps |

---

## Predictions

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| PUT | `/leagues/:id/predictions/:raceId` | League member | Upsert. Solo antes de `lockDate` |
| GET | `/leagues/:id/predictions/:raceId` | League member | Mi predicción |
| GET | `/leagues/:id/predictions/:raceId/all` | League member | Predicciones de todos. Solo después del lock |

---

## Standings & Recaps

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| GET | `/leagues/:id/standings` | League member | Standings actuales |
| GET | `/leagues/:id/standings?raceId=X` | League member | Standings históricos a una carrera específica |
| GET | `/leagues/:id/recaps/:raceId` | League member | Recap de la carrera |

### Contenido del Recap

```json
{
  "driverPoints": [
    { "driver": "Norris", "position": 2, "points": 18, "status": "CLASSIFIED" }
  ],
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

## Admin — Sync

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| POST | `/admin/sync/drivers` | Admin | Sync desde Jolpica/OpenF1 |
| POST | `/admin/sync/constructors` | Admin | |
| POST | `/admin/sync/circuits` | Admin | |
| POST | `/admin/sync/races` | Admin | |
| POST | `/admin/sync/season` | Admin | Calendario completo de la temporada |
| GET | `/admin/sync/log` | Admin | Historial de syncs con resultados |

---

## System

| Método | Endpoint | Acceso | Notas |
|--------|----------|--------|-------|
| GET | `/health` | Public | Estado del servidor y la base de datos |

---

## Scoring

### Puntos por Driver (pilotos titulares)

| Evento | Puntos |
|--------|--------|
| P1 | 25 |
| P2 | 18 |
| P3 | 15 |
| P4 | 12 |
| P5 | 10 |
| P6 | 8 |
| P7 | 6 |
| P8 | 4 |
| P9 | 2 |
| P10 | 1 |
| Fastest lap | +5 |
| Ganó 5+ posiciones (vs grid) | +3 |
| DNF | -10 |
| DSQ | -15 |

### Puntos por Constructor

Suma de los puntos reales de ambos pilotos del constructor en la carrera.

### Puntos por Predicción

| Predicción | Puntos si es correcta |
|------------|----------------------|
| Race winner | +10 |
| Pole position | +8 |
| Team con más puntos | +12 |

### Piloto Reserva

- **Auto-sustitución**: Si un titular hace DNF/DSQ/DNS, el reserva lo reemplaza automáticamente. Se toman los mejores 2 puntajes de los 3 pilotos.
- **Swap manual**: Antes del `lockDate`, el usuario puede intercambiar un titular por el reserva para esa carrera.
