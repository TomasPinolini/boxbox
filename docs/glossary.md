# Glossary — Lenguaje Ubicuo de BoxBox

Definiciones de una línea de todos los términos del dominio. Si necesitás narrativa larga (lifecycle, por qué existe, qué atributos importan), ir a [`domain-entities.md`](./domain-entities.md). Si necesitás el modelo visual, ir a [`data-model.mmd`](./data-model.mmd).

**Regla del equipo**: usar estos términos exactos en código, docs, commits y conversaciones. Si encontrás un alias en uso (columna *Evitar*), corregilo.

---

## Identidad y participación

| Término | Definición | Evitar |
|---|---|---|
| **User** | Persona registrada con email y contraseña; entidad de identidad del sistema. | account, customer, profile |
| **LeagueMember** | Membresía concreta de un **User** en una **League** específica; lleva su propio status (ACTIVE/LEFT/KICKED), `isOwner` y `joinedAt`. | participant, player, "user en una league" |

---

## Catálogo de F1

| Término | Definición | Evitar |
|---|---|---|
| **Driver** | Piloto profesional de F1; entidad de catálogo con `number`, `code` (3 letras) y `externalId`. | pilot, racer |
| **Constructor** | Equipo de F1 (Mercedes, Ferrari, ...) como entidad de catálogo; sirve como pick de draft y objetivo de predicción. | team |
| **Circuit** | Pista física donde se corre un Grand Prix; tiene `country`, `city`, `circuitLength`. | track, racetrack |
| **Season** | Año del campeonato mundial (`year` único); solo una puede tener `isActive: true`. | year (suelto), championship |
| **DriverSeason** | Fila que une **Driver** × **Constructor** × **Season** — modela "este piloto corrió para este equipo en esta temporada". | DriverContract, contract |

---

## Carrera y resultados

| Término | Definición | Evitar |
|---|---|---|
| **Race** | Grand Prix del calendario de una **Season**; tiene `round`, `date`, `lockDate` y `status` operativo. | GP (en código), event |
| **RaceResult** | Resultado oficial de un **Driver** en una **Race**: position, points, gridPosition, fastestLap, status (CLASSIFIED/DNF/DSQ/DNS). | result (suelto) |
| **ConstructorResult** | Resultado agregado de un **Constructor** en una **Race**: `driver1Points` + `driver2Points`; pre-computado al cargar RaceResults. | teamResult |

---

## Liga fantasy

| Término | Definición | Evitar |
|---|---|---|
| **League** | Competencia privada de hasta 11 **LeagueMember**s sobre una **Season**, con `inviteCode` único y `draftStatus`. | room, group, lobby |
| **FantasyTeam** | Equipo armado por un **LeagueMember** en su **League**: 2 titulares, 1 reserva, 1 constructor; 1:1 estricto con LeagueMember. | team (suelto — ambiguo con Constructor), lineup |
| **DraftPick** | Una elección hecha por un **LeagueMember** durante el draft; referencia O un Driver O un Constructor (nunca ambos). | selection, choice |
| **DriverSwap** | Sustitución de un titular del **FantasyTeam** por el reserva para una **Race** específica; `type` MANUAL o AUTO_DNF. | substitution, change |
| **Prediction** | Pronóstico pre-carrera de un **LeagueMember**: ganador, pole y top constructor; suma bonus si acierta. | guess, bet, forecast |
| **LeagueStanding** | Snapshot inmutable de la posición de un **LeagueMember** en su **League** después de una **Race** específica; guarda totalPoints, position, positionChange. | leaderboard entry, ranking row |

---

## Operacional

| Término | Definición | Evitar |
|---|---|---|
| **SyncLog** | Registro auditable de una sincronización con Jolpica/OpenF1: `type`, `status`, contadores y `triggeredById` (nullable para syncs cron). | sync record, log entry |

---

## Conceptos del modelo

| Término | Definición | Evitar |
|---|---|---|
| **lockDate** | Timestamp por **Race** después del cual no se aceptan más **Prediction**s ni **DriverSwap**s manuales; típicamente 1h antes del race start, no necesariamente = qualifyingDate. | deadline, cutoff |
| **snake draft** | Modalidad de draft donde el orden de picks se revierte cada ronda (1→N, N→1, 1→N); 3 rondas en BoxBox: titular 1, titular 2, constructor. | serpentine draft, mirror draft |
| **soft-delete** | Política de borrado lógico: la fila queda en DB con `deletedAt` seteado y se filtra de reads; solo aplica a entidades de catálogo (Driver, Constructor, Circuit). | logical delete (en docs); usar "borrar" cuando se borra físicamente |
| **externalId** | ID estable que viene de Jolpica-F1 / OpenF1 para reconciliar entidades en re-syncs; `@unique` en Driver, Constructor, Circuit; `@unique` compuesto en Race. | external_key, jolpica_id |

---

## Conceptos del backend

| Término | Definición | Evitar |
|---|---|---|
| **envelope** | Shape consistente de las responses: `{ data: ... }` en éxito, `{ error: { code, message, status } }` en error; el frontend asume este shape. | response wrapper, response body |
| **AppError** | Clase base de errores de negocio (`NotFoundError`, `ConflictError` subclasses) que el `errorHandler` convierte a respuestas con `code` tipado; nunca usar `throw new Error()` en services. | custom error, business error |

---

## Relaciones clave

- Un **User** puede ser **LeagueMember** en múltiples **League**s.
- Una **League** pertenece a una **Season**. Una **Season** contiene muchas **League**s.
- Un **LeagueMember** posee exactamente un **FantasyTeam** (1:1 estricto).
- Un **DraftPick** referencia O un **Driver** O un **Constructor**, nunca ambos.
- Un **DriverSeason** une Driver × Constructor × Season con `@@unique([driverId, seasonId])`.
- Un **RaceResult** tiene su propio `constructorId` para soportar mid-season replacements — no necesariamente coincide con el `constructorId` del `DriverSeason` activo.
- Un **LeagueStanding** es snapshot inmutable por **LeagueMember** × **Race**.

---

## Diálogo de ejemplo

> **Dev A:** "Si un **Driver** hace **DNF** en una **Race**, ¿el sistema swapea automático?"
>
> **Dev B:** "Sí — al procesar el **RaceResult** con status `DNF`, se crea un **DriverSwap** con `type = AUTO_DNF` que activa el reserva del **FantasyTeam**. El scoring usa los 2 mejores de los 3 pilotos para esa carrera."
>
> **Dev A:** "¿Y si el **LeagueMember** ya había hecho un swap **MANUAL** antes del **lockDate**?"
>
> **Dev B:** "Esa decisión queda — el AUTO_DNF solo dispara si después del swap manual otro titular sigue haciendo DNF. Cada swap es inmutable; el historial completo se ve con `GET /leagues/:id/teams/me/swaps`."
>
> **Dev A:** "OK, y el **LeagueStanding** se regenera cuando se carga el RaceResult, ¿no?"
>
> **Dev B:** "Lo dispara el endpoint `/recalculate`: recalcula `driverPoints` (de los titulares con swap aplicado), `constructorPoints` (de su Constructor) y `predictionPoints` (de las Predictions evaluadas). El `positionChange` se computa contra el LeagueStanding de la Race anterior."

---

## Ambigüedades flageadas

- **"team"** — ambiguo entre **Constructor** (catálogo F1) y **FantasyTeam** (equipo fantasy de un LeagueMember). En código y conversación usar la palabra completa, nunca solo "team".
- **"user"** vs **"member"** — un **User** existe en el sistema; un **LeagueMember** existe dentro de una **League** específica. Un user con 3 ligas es 1 User + 3 LeagueMembers. Usar el término preciso según contexto.
- **"DriverContract"** (histórico) — fue rechazado a favor de **DriverSeason**. Si aparece en docs viejos o branches, corregir. La entidad no tiene semánticas de contrato (no hay fechas, salario, cláusulas).
- **"result"** suelto — ambiguo entre **RaceResult** (por piloto) y **ConstructorResult** (por equipo). Siempre prefijar.
- **"pick"** suelto — usar **DraftPick** cuando refiere a la entidad; verbo "pick" libre en conversación.
- **"swap"** suelto — usar **DriverSwap** cuando refiere a la entidad; verbo libre.
