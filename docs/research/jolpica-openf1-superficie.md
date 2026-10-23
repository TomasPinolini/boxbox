# Superficie real de Jolpica y OpenF1, y qué fracción consume BoxBox

**Relevado el 2026-10-13** contra la documentación oficial de cada proyecto y contra respuestas
reales de producción. Ergast está discontinuada: aparece sólo como contexto histórico.

Cada afirmación lleva su clase de evidencia:

- **[doc]** — está escrito en la documentación oficial (repo `jolpica/jolpica-f1`, `openf1.org/docs/`).
- **[real]** — verificado por mí llamando a la API el 2026-10-13; si contradice a la doc, se dice.
- **[no verificado]** — no lo pude confirmar; nunca se completa con lo que "suele traer una API de F1".

Cómo reproducir el relevamiento (todo es público y sin credenciales):

```bash
curl -s "https://api.jolpi.ca/ergast/"                       # índice de recursos de Jolpica
curl -s "https://api.jolpi.ca/ergast/f1/2026/results.json?limit=2"
curl -s "https://raw.githubusercontent.com/jolpica/jolpica-f1/main/docs/README.md"
curl -s "https://openf1.org/docs/"                            # doc completa de OpenF1 (HTML)
curl -s "https://api.openf1.org/v1/session_result?session_key=11388"
```

---

## 1. Inventario de Jolpica (`api.jolpi.ca`)

### 1.1 Forma general

- Base de la capa compatible con Ergast: `https://api.jolpi.ca/ergast/f1/` **[doc]**. Es la única
  capa pública hoy: `GET /data/`, `/v1/`, `/schema/` y `/openapi.json` responden 404 **[real]**.
  La API nueva, no compatible con Ergast, está anunciada pero no publicada (`docs/v1/schema_guidelines.md`
  es sólo guía de diseño) **[doc]**.
- Índice de recursos autodescubrible: `GET https://api.jolpi.ca/ergast/` devuelve un objeto
  `{recurso: url}` con los 13 recursos **[real]**.
- Toda ruta debe terminar en `/` o en `.json` **[doc]**. No hay XML **[doc]**.
- Envoltorio común `MRData`: `series` (siempre `f1`), `xmlns` (vacío, legado), `url`, `limit`,
  `offset`, `total` **[doc, real]**.
- **Paginación**: `limit` (default **30**, máximo **100**) y `offset` **[doc]**. `MRData.total` trae
  el total real, así que es paginación por offset clásica **[real]**.
- **Rate limits sin autenticar**: **4 req/s** de burst y **500 req/hora** sostenidas; al excederlos
  devuelve `HTTP 429 Too Many Requests` **[doc]**. Los tokens de API están "en proceso de
  implementación" y la doc avisa que **los límites sin token van a bajar** **[doc]**. No hay
  headers `X-RateLimit-*` en la respuesta **[real]**.
- **User-Agent propio requerido** (`MiApp/1.2.3`), para poder bloquear versiones puntuales en vez
  de aplicaciones enteras **[doc]**. **BoxBox no lo manda**: `backend/src/shared/jolpica.ts` usa
  `fetch` pelado sin headers **[real, verificado en el código]**.
- `Cache-Control: max-age=600` y Cloudflare por delante **[real]**.
- Filtros por *path*, no por query string. Si se repite el mismo filtro, Jolpica usa el último
  (Ergast devolvía 400) **[doc]**.

### 1.2 Los 13 recursos

Totales medidos sobre 2026 el 2026-10-13 **[real]**.

| Recurso | Ruta | Devuelve | Campos | Filtros de ruta aceptados |
|---|---|---|---|---|
| Seasons | `/seasons` | `SeasonTable.Seasons` — 77 temporadas | `season`, `url` | season, circuits, constructors, drivers, grid, status |
| Circuits | `/circuits` | `CircuitTable.Circuits` — 78 circuitos | `circuitId`, `url`, `circuitName`, `Location{lat,long,locality,country}` | season, round, circuits, constructors, drivers, fastest, grid, results, status |
| Races | `/{season}/races` | `RaceTable.Races` — 23 en 2026 | `season`, `round`, `url`, `raceName`, `Circuit{...}`, `date`, `time`, `FirstPractice`, `SecondPractice`, `ThirdPractice`, `Qualifying`, `Sprint`, `SprintQualifying`/`SprintShootout` (cada sesión es `{date,time}`) | season, round, circuits, constructors, drivers, grid, status |
| Constructors | `/{season}/constructors` | `ConstructorTable.Constructors` — 11 en 2026 | `constructorId`, `url`, `name`, `nationality` | igual que Circuits |
| Drivers | `/{season}/drivers` | `DriverTable.Drivers` — **32 en 2026** | `driverId`, `permanentNumber`, `code`, `url`, `givenName`, `familyName`, `dateOfBirth`, `nationality` | igual que Circuits |
| Results | `/{season}[/{round}]/results` | `RaceTable.Races[].Results` — 374 filas en 2026 | por resultado: `number`, `position`, `positionText`, `points`, `Driver{...}`, `Constructor{...}`, `grid`, `laps`, `status`, `Time{millis,time}`, `FastestLap{rank,lap,Time{time},AverageSpeed{units,speed}}` | season, round, circuits, constructors, drivers, fastest/{lapRank}, grid/{pos}, status/{statusId} |
| Sprint | `/{season}[/{round}]/sprint` | `RaceTable.Races[].SprintResults` — 132 filas en 2026 | mismos campos que Results | season, round, circuits, constructors, drivers, grid, status |
| Qualifying | `/{season}[/{round}]/qualifying` | `RaceTable.Races[].QualifyingResults` — 369 filas en 2026 | `number`, `position`, `Driver{...}`, `Constructor{...}`, `Q1`, `Q2`, `Q3` | season, round, circuits, constructors, drivers, grid, fastest, status |
| Pitstops | `/{season}/{round}/pitstops` | `RaceTable.Races[].PitStops` — 32 en 2026 r1 | `driverId`, `lap`, `stop`, `time` (HH:mm:ss), `duration` | season (req), round (req), stop number, drivers, laps |
| Laps | `/{season}/{round}/laps` | `RaceTable.Races[].Laps[].Timings` — 1003 vueltas en 2026 r1 | `number` (vuelta) + `Timings[]{driverId, position, time}` | season (req), round (req), lap number, drivers, constructors |
| Driver standings | `/{season}/driverstandings` | `StandingsTable.StandingsLists[].DriverStandings` | `position`, `positionText`, `points`, `wins`, `Driver{...}`, `Constructors[]` | **season obligatoria**, round, drivers, position |
| Constructor standings | `/{season}/constructorstandings` | `StandingsTable.StandingsLists[].ConstructorStandings` | `position`, `positionText`, `points`, `wins`, `Constructor{...}` | **season obligatoria**, round, constructors, position |
| Status | `/status` | `StatusTable.Status` — 136 valores | `statusId`, `count`, `status` | season, round, circuits, constructors, drivers, grid, results, fastest, status |

`season` acepta `current` y `round` acepta `last` **[doc]**.

### 1.3 Dumps de la base (fuera de la capa Ergast)

`GET https://api.jolpi.ca/data/dumps/download/` **[doc, real]** devuelve `available_types`
(`["csv","sql"]`), `delay_days`, `latest_dumps` y `delayed_dumps`; cada dump trae `dump_type`,
`file_hash` (SHA256), `file_size`, `uploaded_at`, `download_url`. Medido el 2026-10-13: CSV
de 14.6 MB subido ese mismo día **[real]**. Los *latest* exigen API key y licencia comercial;
los *delayed* (14 días de atraso) son libres para uso no comercial y no piden autenticación **[doc]**.
Es la salida recomendada por el propio proyecto cuando el rate limit aprieta **[doc]**.

### 1.4 Diferencias con Ergast que nos afectan **[doc]**

- `positionText` **ya no usa `N`**; usa `R`. El comentario de `shared/jolpica.ts` y el de
  `mapStatus` todavía mencionan `N` — inofensivo (cae en el `else` → `DNF`), pero desactualizado.
- **Desde 2025, todos los abandonos y accidentes se reportan como `status: "Retired"`**: Jolpica no
  tiene fuente para distinguirlos. El `status` largo perdió resolución, lo cual refuerza la decisión
  de mapear por `positionText` y no por `status`.
- Standings exigen año explícito.
- 2023: la "Sprint Shootout" venía como `SecondPractice`; Jolpica la renombró a `SprintShootout`,
  y desde 2024 `SprintQualifying`.

---

## 2. Inventario de OpenF1 (`api.openf1.org`)

### 2.1 Forma general

- Base: `https://api.openf1.org/v1/` **[doc]**. **18 endpoints** **[doc]**.
- Histórico **desde 2023**: gratis y sin autenticación. Los datos en vivo requieren suscripción
  paga **[doc]**.
- "En vivo" = desde 30 minutos antes de una sesión hasta 30 minutos después; el dato aparece ~3 s
  después de la realidad. Fuera de esa ventana todo es histórico **[doc]**.
- Transportes en vivo: REST, **MQTT y WebSocket** (pago) **[doc]**.
- **Rate limits**: free **3 req/s y 30 req/min**; supporters el doble, más hasta 10 conexiones
  MQTT/WebSocket concurrentes **[doc]**.
- **Sin paginación**: no hay `limit`/`offset`. `?limit=1` se interpreta como filtro por un atributo
  llamado `limit`, que no existe, y la respuesta es `{"detail":"No results found."}` **[real]** —
  una llamada sin filtros puede devolver mucho: `intervals?session_key=11388` trajo **28.131
  objetos** **[real]**.
- Filtrado: por cualquier atributo salvo arrays, con operadores `=`, `>`, `<`, `>=`, `<=`, incluso
  sobre fechas (`date>2026-10-11T12:03:40`) **[doc, real]**. `csv=true` cambia el formato de salida **[doc]**.
- `session_key=latest` y `meeting_key=latest` apuntan a la sesión/meeting en curso **[doc]**.
- Respuestas: array JSON plano, sin envoltorio; error como `{"detail": "..."}` **[real]**.

### 2.2 Los 18 endpoints

Claves jerárquicas: `meeting_key` (fin de semana) → `session_key` (sesión) → `driver_number`.
Las muestras reales son del GP de Singapur 2026 (`meeting_key=1296`, carrera `session_key=11388`) **[real]**.

| Endpoint | Qué devuelve | Campos |
|---|---|---|
| `meetings` | Fin de semana de GP (27 registros para 2026, incluye tests) | `meeting_key`, `meeting_name`, `meeting_official_name`, `location`, `country_key`, `country_code`, `country_name`, `country_flag` (imagen), `circuit_key`, `circuit_short_name`, `circuit_type` (Permanent / Temporary - Street / Temporary - Road), `circuit_info_url` (JSON de MultiViewer con la geometría), `circuit_image`, `gmt_offset`, `date_start`, `date_end`, `year`, `is_cancelled` |
| `sessions` | Sesiones (31 de tipo Race/Sprint en 2026) | `session_key`, `session_name`, `session_type`, `date_start`, `date_end`, `gmt_offset`, `meeting_key`, `circuit_key`, `circuit_short_name`, `country_key`, `country_code`, `country_name`, `location`, `year`, `is_cancelled` |
| `drivers` | Pilotos de una sesión (22 en Singapur) | `driver_number`, `broadcast_name`, `full_name`, `first_name`, `last_name`, `name_acronym`, `team_name`, `team_colour` (RRGGBB), `headshot_url`, `country_code` (**deprecado, se elimina a fin de 2026**; `null` en 2026 **[real]**), `meeting_key`, `session_key` |
| `session_result` | Clasificación final de la sesión | `position`, `driver_number`, `number_of_laps`, **`points`**, `dnf`, `dns`, `dsq`, `duration`, `gap_to_leader`, `meeting_key`, `session_key`. En qualy, `duration` y `gap_to_leader` son arrays de 3 (Q1/Q2/Q3) **[real]** |
| `starting_grid` | Grilla de largada | `position`, `driver_number`, `lap_duration`, `meeting_key`, `session_key` |
| `championship_drivers` (beta) | Campeonato de pilotos antes/después de una carrera | `driver_number`, `position_start`, `position_current`, `points_start`, `points_current`, `meeting_key`, `session_key` |
| `championship_teams` (beta) | Ídem por equipo | `team_name`, `position_start`, `position_current`, `points_start`, `points_current`, `meeting_key`, `session_key` |
| `laps` | Una fila por vuelta y piloto (1240 en Singapur) | `lap_number`, `date_start`, `driver_number`, `lap_duration`, `duration_sector_1/2/3`, `i1_speed`, `i2_speed`, `st_speed`, `is_pit_out_lap`, `segments_sector_1/2/3` (arrays de mini-sectores: 2048 amarillo, 2049 verde, 2051 violeta), `meeting_key`, `session_key` |
| `pit` | Paradas en boxes (25 en Singapur) | `date`, `driver_number`, `lap_number`, `lane_duration`, `stop_duration` (sólo desde el GP de EEUU 2024; `null` en Singapur 2026 **[real]**), `pit_duration` (**deprecado**, igual a `lane_duration`), `meeting_key`, `session_key` |
| `stints` | Tandas de neumáticos (47 en Singapur) | `stint_number`, `driver_number`, `lap_start`, `lap_end`, `compound` (SOFT/MEDIUM/HARD/...), `tyre_age_at_start`, `meeting_key`, `session_key` |
| `position` | Cambios de posición con timestamp (396 en Singapur) | `date`, `driver_number`, `position`, `meeting_key`, `session_key` |
| `intervals` | Gap al líder y al de adelante (28.131 filas en Singapur) | `date`, `driver_number`, `gap_to_leader`, `interval` (segundos, `+1 LAP` si doblado, `null` para el líder), `meeting_key`, `session_key` |
| `overtakes` | Sobrepasos (191 en Singapur) | `date`, `overtaking_driver_number`, `overtaken_driver_number`, `position`, `meeting_key`, `session_key` |
| `race_control` | Mensajes de dirección de carrera (155 en Singapur) | `date`, `category` (SessionStatus, CarEvent, Drs, Flag, SafetyCar...), `flag` (GREEN, YELLOW, DOUBLE YELLOW, CHEQUERED...), `scope` (Track/Driver/Sector), `sector`, `lap_number`, `driver_number`, `qualifying_phase`, `message`, `meeting_key`, `session_key` |
| `team_radio` | Audios de radio (32 en Singapur) | `date`, `driver_number`, `recording_url` (mp3 en `livetiming.formula1.com`), `meeting_key`, `session_key` |
| `weather` | Clima sobre pista, 1 muestra/minuto (160 en Singapur) | `date`, `air_temperature`, `track_temperature`, `humidity`, `pressure`, `rainfall`, `wind_direction`, `wind_speed`, `meeting_key`, `session_key` |
| `car_data` | Telemetría a ~3,7 Hz | `date`, `driver_number`, `speed`, `rpm`, `n_gear`, `throttle`, `brake` (0/100), `drs` (tabla de mapeo 0–14; `null` en 2026 **[real]**), `meeting_key`, `session_key` |
| `location` | Posición del auto en pista a ~3,7 Hz | `date`, `driver_number`, `x`, `y`, `z`, `meeting_key`, `session_key` |

### 2.3 Hallazgos de respuestas reales que la doc no dice

- **`session_result` incluye `points`** (25.0 para el ganador en Singapur 2026). No figura en la
  tabla de atributos ni en el ejemplo de `openf1.org/docs/` **[real, no documentado]**. Es el único
  lugar de OpenF1 donde aparecen los puntos de la carrera.
- **`starting_grid` se indexa por el `session_key` de la *qualy*, no de la carrera**: con
  `session_key=11388` (Race) responde `No results found`; con `11384` (Qualifying) devuelve la
  grilla completa **[real]**. La doc dice "grilla de la carrera siguiente" sin aclararlo.
- `championship_drivers` devolvió **23** filas para 2026 (hubo pilotos extra en el año), igual que
  el `total: 23` de `driverstandings` de Jolpica **[real]** — los dos coinciden.
- `headshot_url` hoy viene con prefijo `d_driver_fallback_image.png` y escalón `1col`; las URLs
  que guardó nuestro seed son `2col` sin ese prefijo **[real]**.

---

## 3. Tabla de consumo

Qué toca BoxBox hoy. El código de referencia: `backend/src/shared/jolpica.ts` (el único cliente
HTTP externo del repo — confirmado con grep: no hay ningún `fetch`/axios a OpenF1 en runtime),
`backend/src/modules/sync/sync.service.ts`, `backend/prisma/schema.prisma`.

### 3.1 Jolpica — recursos

| Recurso | Lo consumimos | Está en la DB y no se muestra | No lo traemos |
|---|---|---|---|
| `/{year}/races.json?limit=100` | ✅ `syncRaces` (`POST /admin/sync/races?year=`) | — | — |
| `/{year}/{round}/results.json?limit=100` | ✅ `syncResults` (`POST /admin/sync/races/:id/results`, con `?dryRun=true` para la vista previa del admin) | — | — |
| `/seasons` | — | — | ❌ la Season la crea el admin a mano |
| `/circuits` | — | — | ❌ los circuitos entran por el seed o derivados de `races` |
| `/{year}/drivers` | — | — | ❌ **decisión explícita** (BOX-9): Jolpica lista 32 pilotos para 2026 y `maxMembersForSeason` depende de `driverCount` |
| `/{year}/constructors` | — | — | ❌ ídem: los 11 equipos vienen del seed |
| `/{year}/qualifying` | — | — | ❌ nunca se pidió |
| `/{year}/sprint` | — | — | ❌ nunca se pidió |
| `/{year}/{round}/pitstops` | — | — | ❌ sin modelo donde guardarlo |
| `/{year}/{round}/laps` | — | — | ❌ ídem |
| `/{year}/driverstandings` | — | — | ❌ calculamos el campeonato nosotros (`GET /drivers/standings`, Slice 16) |
| `/{year}/constructorstandings` | — | — | ❌ ídem (`GET /constructors/standings`) |
| `/status` | — | — | ❌ usamos nuestro enum `RaceResultStatus` de 4 valores |
| `/data/dumps/download/` | — | — | ❌ |

### 3.2 Jolpica — campos de `races`

| Campo remoto | Lo consumimos | Está en la DB y no se muestra | No lo traemos |
|---|---|---|---|
| `round` | ✅ clave `(seasonId, round)` | — | — |
| `raceName` | ✅ `Race.name` | — | — |
| `date` + `time` | ✅ `Race.date` | — | — |
| `Qualifying{date,time}` | — | ⚠️ `Race.qualifyingDate` — se escribe en el sync y **ninguna pantalla lo lee** (0 referencias en `frontend/src`) | — |
| `Sprint{date,time}` | — | ❌ sin columna | — |
| `Circuit.circuitId` | ✅ `Circuit.externalId` (clave de upsert y chequeo anti-desfasaje) | — | — |
| `Circuit.circuitName` | ✅ `Circuit.name` (sólo al crear; nunca pisa uno existente) | — | — |
| `Location.locality` / `country` | ✅ `Circuit.city` / `Circuit.country` | ⚠️ se guardan pero ninguna pantalla muestra circuitos (`circuit` no aparece en `frontend/src`) | — |
| `Location.lat` / `long` | — | — | ❌ sin columnas: el mapa no existe |
| `FirstPractice`, `SecondPractice`, `ThirdPractice` | — | — | ❌ sin columnas |
| `SprintQualifying` / `SprintShootout` | — | — | ❌ sin columnas |
| `url` (Wikipedia), `season`, `Circuit.url` | — | — | ❌ |
| (no existe en Jolpica) | — | — | `Circuit.circuitLength` lo carga el seed a mano; el propio seed anota "Jolpica no lo publica" **[verificado contra la API: Circuits no trae longitud]** |

### 3.3 Jolpica — campos de `results`

| Campo remoto | Lo consumimos | Está en la DB y no se muestra | No lo traemos |
|---|---|---|---|
| `position` | ✅ `RaceResult.position`, **sólo si `CLASSIFIED`** | — | — |
| `positionText` | ✅ es la fuente de `RaceResult.status` (`mapStatus`) | — | — |
| `points` | ✅ `RaceResult.points`; la grilla del admin avisa si no coincide con su tabla de puntos | — | — |
| `grid` | ✅→ `RaceResult.gridPosition` (`0` = salió de boxes → se omite) | ⚠️ viaja en `GET /drivers/:id` pero `DriverResultsTable.tsx` no lo pinta; la grilla del admin lo arrastra como `imported` sin mostrarlo | — |
| `laps` | ✅→ `RaceResult.laps` | ⚠️ **no sale del backend**: `findDetail` no lo incluye en la respuesta | — |
| `FastestLap.rank` | ✅ `rank === '1'` → `RaceResult.fastestLap` | ⚠️ ídem `gridPosition`: viaja y no se muestra | — |
| `status` (texto largo) | — | — | ❌ se descarta a propósito (desde 2025 Jolpica colapsa todo en "Retired") |
| `Driver.driverId` | ✅ matcheo con `Driver.externalId` | — | — |
| `Driver.permanentNumber`, `code`, `givenName`, `familyName`, `dateOfBirth`, `nationality`, `url` | — | — | ❌ el piloto ya existe por seed; `dateOfBirth` y `nationality` no tienen columna |
| `Constructor{...}` | — | — | ❌ la relación piloto→equipo la posee `DriverSeason` (ver `docs/data-model.mmd`); `ConstructorResult` se deriva de ahí |
| `Time{millis,time}` | — | — | ❌ sin columna: no hay tiempo de carrera ni gap |
| `FastestLap.lap`, `FastestLap.Time`, `FastestLap.AverageSpeed` | — | — | ❌ sólo guardamos el booleano |
| `number` | — | — | ❌ redundante con `Driver.number` |
| `RaceResult.externalId` | — | — | ⚠️ la columna existe y **nadie la escribe** (el sync no la setea) |

### 3.4 OpenF1 — endpoints

| Endpoint | Lo consumimos | Está en la DB y no se muestra | No lo traemos |
|---|---|---|---|
| `drivers` → `headshot_url` | ✅ una sola vez, **offline**: las URLs están pegadas a mano en `backend/prisma/seed.ts` (21 de 22 pilotos; falta Hadjar) y se guardan en `Driver.headshotUrl` | — | — |
| `drivers` → `team_colour` | — | — | ❌ `Constructor.color` es curado (ver `features/drivers/team-color.ts`) |
| `drivers` → `name_acronym`, `broadcast_name`, `full_name`, `team_name` | — | — | ❌ equivalentes nuestros ya vienen del seed |
| `meetings` → `country_flag`, `circuit_image`, `circuit_info_url`, `circuit_type`, `gmt_offset` | — | — | ❌ |
| `sessions` | — | — | ❌ |
| `session_result` (incluye `points`, `dnf`/`dns`/`dsq`, `gap_to_leader`, `duration`) | — | — | ❌ segunda fuente posible de resultados, hoy sin usar |
| `starting_grid` | — | — | ❌ la grilla la trae Jolpica (`grid`) |
| `championship_drivers` / `championship_teams` (beta) | — | — | ❌ el campeonato lo calculamos nosotros |
| `laps`, `pit`, `stints`, `position`, `intervals`, `overtakes`, `race_control`, `team_radio`, `weather`, `car_data`, `location` | — | — | ❌ **ninguno**: no hay cliente HTTP a OpenF1 en runtime (grep sobre `backend/src`: el único `fetch` externo es a Jolpica) |
| Datos en vivo (REST/MQTT/WebSocket) | — | — | ❌ pago, y nuestro "en vivo" es el draft por Socket.io, no la carrera |

**Resumen numérico.** Jolpica: 13 recursos + 1 de dumps; consumimos **2**. OpenF1: 18 endpoints;
consumimos **1 campo de 1 endpoint**, copiado a mano al seed, sin llamadas en runtime.

---

## 4. Huecos, ordenados por lo que desbloquean

Sin estimaciones de esfuerzo: sólo qué dato existe, que hoy no traemos, y qué habilitaría.

1. **Qualifying de Jolpica (`/{year}/qualifying`: `Q1`, `Q2`, `Q3`, `position`) y/o `starting_grid`
   de OpenF1.** Habilita la pole real. Hoy no hay ninguna fuente de pole en la DB:
   `RaceResult.gridPosition` es la grilla de largada, que puede diferir de la pole por sanciones.
2. **`session_result.points` de OpenF1 + `/{year}/driverstandings` de Jolpica.** Habilita una
   verificación independiente del campeonato que calculamos en el Slice 16: dos fuentes que
   tienen que dar el mismo número. Es el chequeo que más barato cubre un bug de puntuación
   (medios puntos, sanciones post-carrera).
3. **`Constructor` por resultado en `results` de Jolpica.** Habilita cargar resultados de una
   carrera sin depender de que exista `DriverSeason` para cada piloto: hoy un piloto sin
   `DriverSeason` se reporta `skipped` y el `SyncLog` queda `PARTIAL`. Es el motivo exacto por el
   que el sync de 2026 nunca termina en `SUCCESS` limpio.
4. **`laps` que ya guardamos y no mostramos, más `gridPosition` y `fastestLap` que llegan al
   frontend sin pintarse.** Habilita que la tabla de `/drivers/:id` deje de ser cuatro columnas:
   el dato ya está en la base y en la respuesta, falta la columna. Es el hueco más corto del
   listado porque no toca la red.
5. **`Sprint` de Jolpica (`/{year}/sprint`, 132 filas en 2026).** Habilita puntuar los sprints:
   hoy los puntos del sprint no entran nunca a `RaceResult`,
   así que un fin de semana con sprint reparte menos puntos en BoxBox que en la F1 real.
6. **`Location.lat`/`long` de Jolpica y `circuit_image`/`country_flag`/`circuit_info_url` de
   OpenF1.** Habilita una pantalla de circuitos y banderas de país en el calendario. Hoy ni
   `Circuit` se muestra en ninguna pantalla, aunque tenga ciudad, país y longitud cargados.
7. **`pitstops`, `laps` y `stints`/`intervals`/`overtakes`.** Habilitan contenido de carrera
   (vuelta a vuelta, estrategia de neumáticos, sobrepasos) que haría de BoxBox algo más que una
   tabla de puntos. Ninguno tiene modelo en `schema.prisma`: es alcance nuevo, no un ajuste.
8. **Dumps de Jolpica (`/data/dumps/download/`, CSV/SQL de ~14 MB).** Habilita poblar temporadas
   históricas enteras sin pelear con 500 req/h, y es lo que el propio proyecto recomienda cuando
   el rate limit molesta. Ojo con la licencia: los *latest* son de uso comercial con API key; los
   *delayed* (14 días) son libres sólo para uso no comercial.
9. **`weather`, `team_radio`, `car_data`, `location` de OpenF1.** Material de color y de
   visualización. Es el eje donde más superficie no usamos, y también el de menor relación con la
   consigna del TP.

Dos cosas que no son huecos de datos y conviene no mezclar con lo anterior:

- **No mandamos `User-Agent`**, y la doc de Jolpica dice que lo requiere: `shared/jolpica.ts` llama
  a `fetch` sin headers. Es la diferencia entre que nos bloqueen una versión o la app entera.
- **Tratamos el `429` como "la fuente no responde"**: cae en el mismo `catch` que un timeout y sale
  como `502 JOLPICA_UNAVAILABLE`. El admin no puede distinguir "hay que esperar" de "Jolpica está caída".

---

## 5. Fuentes

Jolpica (doc oficial en su repo y respuestas reales del 2026-10-13):

- Índice y parámetros comunes, `limit` default 30 / máx 100, User-Agent requerido, campos de
  `MRData` — https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md
- Rate limits (4 req/s, 500 req/h, 429, tokens futuros) — https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md
- Diferencias con Ergast (`positionText` sin `N`, "Retired" desde 2025, standings con año) — https://github.com/jolpica/jolpica-f1/blob/main/docs/ergast_differences.md
- Campos por recurso — `https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/<recurso>.md`
  (`races`, `results`, `qualifying`, `sprint`, `laps`, `pitstops`, `drivers`, `constructors`,
  `circuits`, `seasons`, `status`, `driverStandings`, `constructorStandings`)
- Dumps — https://github.com/jolpica/jolpica-f1/blob/main/docs/database_dumps.md y
  https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/data/dumps.md
- README del proyecto (costos, Terms of Use, dbdocs del modelo) — https://github.com/jolpica/jolpica-f1/blob/main/README.md
- Respuestas reales: `https://api.jolpi.ca/ergast/`, `https://api.jolpi.ca/ergast/f1/{seasons|circuits|status}.json?limit=2`,
  `https://api.jolpi.ca/ergast/f1/2026/{races|drivers|constructors|results|sprint|qualifying|driverstandings|constructorstandings}.json?limit=2`,
  `https://api.jolpi.ca/ergast/f1/2026/1/{laps|pitstops}.json?limit=2`,
  `https://api.jolpi.ca/data/dumps/download/`
- Swagger de la capa `/data/` — https://api.jolpi.ca/docs/ (se renderiza por JS; no pude extraer el
  esquema crudo: `/openapi.json` y `/schema/` devuelven 404 **[no verificado]**)

OpenF1:

- Doc completa (18 endpoints, atributos, filtrado, filtrado temporal, CSV) — https://openf1.org/docs/
- Rate limits, ventana de "en vivo" (±30 min), latencia ~3 s, MQTT/WebSocket, suscripción — https://openf1.org/
- OpenAPI del servicio — https://api.openf1.org/openapi.json (es un FastAPI con ruta catch-all
  `/{path}`: **no describe los campos de cada endpoint**, así que no sirve como fuente de esquema)
- Respuestas reales (GP de Singapur 2026, `meeting_key=1296`): `https://api.openf1.org/v1/<endpoint>?session_key=11388`
  para `session_result`, `championship_drivers`, `championship_teams`, `drivers`, `stints`, `pit`,
  `laps`, `overtakes`, `race_control`, `weather`, `intervals`, `position`, `team_radio`;
  `?session_key=11384` para `starting_grid`; `car_data` y `location` con filtro de fecha.

Código de BoxBox citado (todo verificado leyéndolo en esta sesión):

- `backend/src/shared/jolpica.ts` — el único cliente HTTP a una API externa
- `backend/src/modules/sync/{sync.service,sync.routes,sync.schema,sync.controller,sync.fixtures}.ts`
- `backend/src/modules/races/races.schema.ts` (`loadRaceResultsSchema`), `backend/src/modules/drivers/drivers.service.ts` (`findDetail`)
- `backend/prisma/schema.prisma`, `backend/prisma/seed.ts` (headshots de OpenF1, `circuitLength` a mano)
- `frontend/src/features/drivers/DriverResultsTable.tsx`, `frontend/src/features/admin/results-payload.ts`, `frontend/src/models/driver.ts`
