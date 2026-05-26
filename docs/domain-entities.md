# BoxBox — Domain Entities

Descripción narrativa de las entidades del dominio de BoxBox. Complementa `data-model.mmd` (estructura técnica) con el significado de negocio de cada entidad: qué es, qué atributos importan, cómo se relaciona con otras, cuál es su ciclo de vida y por qué existe como entidad propia.

---

## Driver

Un **Driver** representa a un piloto profesional de F1 — una persona real que compite en el campeonato. Cada piloto tiene un **número de carrera** único en el campeonato, un **código de 3 letras** que aparece en marcadores y transmisiones (ej: "VER" para Verstappen, "NOR" para Norris), y un **externalId** que lo identifica en las APIs externas (Jolpica-F1, OpenF1) para sincronizar resultados automáticamente.

A lo largo de su carrera, un piloto puede correr para distintos **Constructors** en distintas **Seasons** — esa información se modela vía `DriverSeason`. Por ejemplo: Hamilton corrió para McLaren (2008), Mercedes (2013-2024) y Ferrari (2025+); cada combinación es una fila distinta en `DriverSeason`.

Los Drivers se **soft-deletean** (con `deletedAt`) — nunca se borran físicamente. Tienen historial de `RaceResult` apuntándoles, además de eventuales `Prediction` y `FantasyTeam` que los referencian. Si un piloto se retira, se marca como deleted y se filtra de listados activos. Si vuelve a competir (caso típico: pilotos reserva que reciben un asiento), se restaura limpiando el `deletedAt`.

---

## LeagueMember

Un **LeagueMember** representa la **membresía concreta** de un User en una League específica. NO es lo mismo que un User — un mismo User puede tener múltiples LeagueMembers (uno por cada liga en la que participa).

Cada LeagueMember tiene una fecha de unión (`joinedAt`), un flag `isOwner` que indica si fue quien creó la liga, y un `status` (ACTIVE / LEFT / KICKED) que refleja su estado actual. Esa metadata pertenece a la membresía — no al User (que existe independientemente) ni a la League (que existe sin importar quiénes son sus miembros).

Cada LeagueMember **posee exactamente un FantasyTeam** (relación 1:1) y participa en el draft de su league haciendo `DraftPick`s, en cada race haciendo `Prediction`s, y acumulando puntaje vía `LeagueStanding`s. Si un miembro deja la liga (status LEFT) o es expulsado (KICKED), su FantasyTeam y resto de data histórica se conservan — no se borran, solo se ocultan de la operación activa.

---

## DraftPick

Un **DraftPick** representa **una elección hecha por un LeagueMember durante el draft de su league**. El draft de BoxBox es un *snake draft* de 3 rondas: en cada ronda, cada miembro elige por turno un Driver (rondas 1 y 2) o un Constructor (ronda 3) para incorporar a su FantasyTeam. El driver reserva no se draftea — se asigna más adelante vía waiver cuando ocurre un swap.

Cada DraftPick tiene un `pickNumber` (orden global de la elección dentro del draft, ej: el 5° pick de toda la liga), un `round` (1 a 3), y referencia **o un Driver o un Constructor** — nunca ambos en el mismo pick (por eso `driverId` y `constructorId` son nullable y mutuamente exclusivos a nivel lógica de negocio).

Los DraftPicks son **inmutables después de hechos**: una vez que el LeagueMember confirmó su elección y el draft pasó al siguiente turno, no se editan ni se borran. Si querés cambiar tu equipo después, lo hacés vía `DriverSwap` (que sí permite cambios condicionados — ver entrada de `DriverSwap`). El historial completo de DraftPicks queda como evidencia auditable de cómo se armó cada FantasyTeam.

---

## User

Un **User** es una persona registrada en BoxBox — tiene cuenta propia con email y contraseña. Es la entidad de identidad del sistema: todo lo que hace una persona en la plataforma (crear ligas, unirse, hacer predicciones) se hace a través de un User.

Los atributos relevantes al dominio son el **email** (único, es el identificador de login), el **role** (USER para jugadores normales, ADMIN para quien puede disparar sincronizaciones con la API externa de F1) y el **name** más **avatarUrl** para la presentación en la UI. La contraseña se guarda como hash bcrypt — nunca en texto plano.

Un User puede crear múltiples **Leagues** y puede unirse a múltiples ligas como **LeagueMember**. Que un User sea "miembro de una liga" es información que vive en `LeagueMember`, no en User — User solo sabe que existe, no en qué ligas está. Los Users con role ADMIN además aparecen en `SyncLog` como quienes dispararon una sincronización manual.

Los Users no tienen `deletedAt` en el modelo actual — si un usuario se da de baja, la lógica de desactivación se resuelve a nivel de aplicación (fuera del scope del TP).

---

## Constructor

Un **Constructor** es un equipo de F1 que compite en el campeonato — Mercedes, Ferrari, Red Bull, McLaren, etc. En el contexto de BoxBox representa la unidad que los usuarios pueden elegir en el draft para sumar puntos de constructores, y sobre la cual se hacen predicciones de rendimiento por carrera.

Los atributos relevantes son el **name** (el identificador humano del equipo), el **color** principal (usado en la UI para distinguir visualmente los equipos en tablas y gráficos) y el **externalId** que lo conecta con Jolpica-F1 para sincronizar resultados automáticamente. El `logoUrl` es display data.

Un Constructor agrupa múltiples Drivers a lo largo del tiempo vía `DriverSeason` — Ferrari 2024 tenía Leclerc + Sainz, Ferrari 2025 tiene Leclerc + Hamilton, pero es el mismo Constructor en el modelo. Cada carrera genera un `ConstructorResult` para ese equipo. Los usuarios lo pueden elegir en el draft (round 3) a través de `DraftPick`, y queda registrado en `FantasyTeam.constructorId`. También es el objeto de predicciones en `Prediction.predictedTopConstructorId`.

Los Constructors se **soft-deletean** con `deletedAt` — si un equipo sale de la F1 o se rebrandea (Force India → Racing Point → Aston Martin), el registro histórico de resultados y contratos debe preservarse. El equipo viejo se marca como deleted; el nuevo entra como Constructor fresco.

---

## Circuit

Un **Circuit** es una pista de carrera física — Monza, Silverstone, Interlagos. Representa el lugar donde se disputa un Grand Prix; en BoxBox existe como entidad de catálogo que se asocia a cada carrera para saber dónde se corre.

Los atributos relevantes son **name** (ej: "Autodromo Nazionale Monza"), **country** y **city** (para presentación en la UI), y **circuitLength** en kilómetros. El **externalId** lo conecta con Jolpica-F1 para la sincronización.

Un Circuit puede albergar múltiples `Race`s a lo largo de los años — Monza ha sido sede del GP de Italia ininterrumpidamente desde 1950. Esa es la única relación que tiene: un circuito hostea muchas carreras, pero una carrera sucede en un solo circuito.

Los Circuits se **soft-deletean** — si un circuito es reemplazado o deja de estar en el calendario, sus registros históricos de `Race` deben seguir existiendo. Se marca deleted y se filtra de los listados activos.

---

## Season

Una **Season** representa un año del campeonato mundial de F1 — 2025, 2026, etc. Es la unidad de tiempo que agrupa todo lo demás: carreras, ligas, contratos de pilotos, resultados.

El atributo más importante es **year** (único en el sistema — no puede haber dos temporadas del mismo año). El flag **isActive** indica cuál es la temporada en curso; solo puede haber una activa a la vez. El **driverCount** registra cuántos pilotos compiten en esa temporada (útil para validaciones del draft y para mostrar datos de la liga).

Una Season contiene muchas `Race`s y muchas `League`s — todas las ligas se crean para una temporada específica. También agrupa los `DriverSeason`s que describen qué pilotos corren para qué equipos ese año.

Las Seasons **no se soft-deletean** — una temporada pasada tiene datos históricos permanentes que no se invalidan. Una vez que termina, simplemente `isActive` pasa a `false` y se crea la nueva.

---

## DriverSeason

Un **DriverSeason** representa la combinación concreta de un piloto, un equipo y una temporada — la fila que dice "en 2025, este piloto corrió para este equipo". Hamilton en Mercedes 2023, Hamilton en Ferrari 2025: mismo piloto, mismo modelo de entidad, dos `DriverSeason`s distintos.

No tiene atributos propios más allá de las tres foreign keys (`driverId`, `constructorId`, `seasonId`) — su valor está en la combinación. Esa combinación tiene un `@@unique([driverId, seasonId])`: un piloto no puede correr para dos equipos distintos en la misma temporada. (Mid-season replacements como Colapinto en Alpine 2024 se modelan a nivel de `RaceResult.constructorId`, no acá.)

Existe porque la relación Driver ↔ Constructor **cambia con el tiempo** y ese historial importa. Sin `DriverSeason`, no se podría responder "¿para qué equipo corría Verstappen en 2022?" ni armar el grid de una temporada pasada. La tabla Driver solo tiene datos fijos del piloto; la tabla Constructor solo tiene datos fijos del equipo; `DriverSeason` es el puente temporal entre los dos.

> **Nota de naming:** Esta entidad NO modela un contrato (no tiene fechas, salario, status, cláusulas). Es solo la asignación piloto×equipo para una temporada. El nombre `DriverSeason` refleja eso; evitamos `DriverContract` porque sugería semánticas que el modelo no tiene.

---

## Race

Una **Race** es un Gran Premio del calendario de F1 — el GP de Australia, el GP de Mónaco, etc. Es el evento que activa la mecánica central de BoxBox: bloquea las predicciones antes de que empiece, registra resultados cuando termina y actualiza los standings de la liga.

Los atributos clave son **name**, **round** (número de la carrera en la temporada: 1, 2, 3...), **date** (fecha de la carrera principal), **qualifyingDate** (nullable hasta que se confirme vía API), **sprintDate** (nullable — solo en fines de semana sprint, aprox. 6 por temporada), y **lockDate** — la fecha límite para hacer predicciones, que no necesariamente coincide con la clasificación.

El **status** modela el ciclo de vida operativo: `UPCOMING` → `QUALIFYING_LOCKED` (se cierran las predicciones) → `COMPLETED` (resultados cargados) o `CANCELLED` / `POSTPONED`. Una Race pertenece a una Season y se disputa en un Circuit.

Las Races no se borran — si una carrera se cancela, su status pasa a `CANCELLED` y se preserva el registro para el historial y para no corromper los standings ya calculados.

---

## League

Una **League** es la competencia privada en la que participan los usuarios de BoxBox. Un grupo de amigos (o compañeros de facultad) crea una liga para una temporada, invita a los demás con un código único, hace el draft juntos, y compite durante toda la temporada por el puntaje acumulado.

Los atributos clave son **name**, **inviteCode** (único en el sistema — es el código que se comparte para unirse a la liga), **maxMembers** (default 11, uno por equipo del grid 2026), **seasonId** (una liga siempre pertenece a una temporada específica) y **createdById** (el User que la creó, que también es su primer LeagueMember con `isOwner = true`).

El **draftStatus** modela el estado del snake draft: `PENDING` (todavía no arrancó), `LIVE` (en progreso, turnos activos) y `COMPLETED` (draft cerrado, los equipos están armados). El **status** general es `ACTIVE` durante la temporada, y puede pasar a `ARCHIVED` al terminar o `CANCELLED` si se abandona.

Una League contiene muchos `LeagueMember`s y genera muchos `DraftPick`s. Existe como entidad propia porque agrupa a los participantes, sus reglas (maxMembers), y su estado operativo (draftStatus) de forma independiente al User y a la Season.

---

## FantasyTeam

Un **FantasyTeam** es el equipo armado por un LeagueMember para competir en su liga. Tiene dos pilotos titulares (`driver1Id`, `driver2Id`), un Constructor (`constructorId`) y un piloto reserva (`reserveDriverId`). Es la entidad que acumula puntos reales de F1 a través de los resultados de sus pilotos y constructor.

Los tres slots de draft (`driver1Id`, `driver2Id`, `constructorId`) son **nullable hasta que el draft se completa** — el FantasyTeam existe desde que el LeagueMember se une a la liga, pero empieza vacío. El `reserveDriverId` es **nullable por razones diferentes**: el reserva no se draftea, sino que se asigna cuando ocurre el primer `DriverSwap` (un piloto titular DNF o swap manual).

La relación con LeagueMember es **1:1 estricta** — un miembro tiene exactamente un equipo en esa liga, y cada equipo pertenece a exactamente un miembro. El FantasyTeam existe como entidad propia (y no como columnas en LeagueMember) porque tiene su propia lógica de cambios: los `DriverSwap`s modifican el equipo carrera a carrera sin alterar los DraftPicks originales.

---

## DriverSwap

Un **DriverSwap** registra una sustitución de piloto en un FantasyTeam para una carrera específica. Ocurre cuando un titular es reemplazado por el reserva — ya sea porque el usuario lo decide antes del lockDate (`type: MANUAL`) o porque el sistema lo activa automáticamente después de que un titular termina con status DNF (`type: AUTO_DNF`).

Cada swap registra qué **slot** se modificó (`DRIVER_1` o `DRIVER_2`), qué piloto fue **dado de baja** (`droppedDriverId`) y qué piloto fue **activado** (`activatedDriverId`). El activado pasa a ser el nuevo `reserveDriverId` del FantasyTeam para las carreras siguientes, hasta que haya otro swap.

Los DriverSwaps son **inmutables después de creados** — son el historial de cambios del equipo. No se editan; si hay un error, la lógica de negocio lo resuelve con un swap inverso. Existen como entidad propia (en lugar de simplemente pisar `driver1Id` en FantasyTeam) porque el historial de sustituciones es información auditora: permite reconstruir qué equipo tenía cada miembro en cada carrera específica.

---

## RaceResult

Un **RaceResult** es el resultado oficial de un piloto en una carrera específica — la posición que terminó, los puntos que sumó, desde qué posición de grilla largó, si hizo la vuelta rápida y si terminó clasificado o no. Es la fuente de verdad de los puntos de BoxBox.

Los atributos clave son **position** (posición de llegada), **points** (puntos del campeonato oficial), **gridPosition** (posición de largada, para análisis), **fastestLap** (boolean — Jolpica lo reporta), y **status**: `CLASSIFIED` (terminó la carrera), `DNF` (no terminó — dispara la lógica de `AUTO_DNF` swap), `DSQ` (descalificado) o `DNS` (no largó).

El `constructorId` en RaceResult registra el equipo con el que el piloto corrió esa carrera específica — importante para mid-season replacements como Colapinto en Alpine 2025 (corría para Alpine, no para su equipo de origen). El `externalId` lo conecta con Jolpica para prevenir duplicados en la sincronización.

Los RaceResults son **inmutables en condiciones normales** — llegan de la API externa y no se editan a mano. Si Jolpica corrige un resultado (descalificaciones post-carrera, penalizaciones), la sincronización los actualiza vía el campo `updatedAt`.

---

## ConstructorResult

Un **ConstructorResult** es el resultado agregado de un Constructor en una carrera — la suma de puntos que hicieron sus dos pilotos ese fin de semana. Es la entidad que alimenta el puntaje de constructor de cada FantasyTeam en la liga.

Tiene dos campos de puntos separados: **driver1Points** y **driver2Points**, correspondientes a los dos pilotos del equipo en esa carrera. El total es la suma de ambos — no se almacena como campo propio porque es un valor derivado (si lo guardáramos, tendríamos que mantenerlo sincronizado manualmente con los otros dos).

Existe como entidad propia (en lugar de calcularse on-the-fly desde `RaceResult`) porque el sistema de scoring de BoxBox necesita consultarlo frecuentemente al calcular `LeagueStanding`s — tener el total pre-computado por equipo y carrera es una decisión de performance. Se crea cuando se procesan los `RaceResult`s de la carrera y no se modifica después.

---

## Prediction

Una **Prediction** es el pronóstico que un LeagueMember hace antes de una carrera: quién va a ganar (`predictedWinnerId`), quién va a hacer la pole position (`predictedPoleId`) y qué constructor va a quedar primero en puntos esa carrera (`predictedTopConstructorId`). Acertar suma puntos bonus adicionales a los del equipo de fantasy.

Una vez que la carrera termina, el sistema evalúa cada predicción y cachea el resultado en los campos booleanos `winnerCorrect`, `poleCorrect` y `topConstructorCorrect` (los tres son `null` hasta que la carrera es scored — no son false por default). El `bonusPoints` acumula el total de puntos extra ganados (default 0, nunca null).

Las Predictions están **bloqueadas después del lockDate** de la carrera — no se pueden editar una vez que el sistema las cierra. Se crean durante la ventana entre que se publica el calendar entry y el lockDate. Existe como entidad propia porque une tres datos independientes (predicción de ganador, pole y constructor) que se evalúan juntos en el mismo momento y generan puntaje en el mismo contexto.

---

## LeagueStanding

Un **LeagueStanding** es un snapshot de la posición de un LeagueMember en su liga después de una carrera específica. Registra cuántos puntos acumuló ese miembro hasta ese momento, desglosado por tipo: **driverPoints** (de sus pilotos titulares), **constructorPoints** (de su constructor) y **predictionPoints** (de predicciones acertadas), más el **totalPoints** como suma. También guarda la **position** en el ranking de la liga y el **positionChange** respecto a la carrera anterior (positivo = subió, negativo = bajó).

Es un snapshot inmutable, no una vista live. Cada vez que se procesan los resultados de una carrera, se crean nuevas filas de LeagueStanding para todos los miembros de todas las ligas activas. Esto permite mostrar la evolución de posiciones a lo largo de la temporada sin recalcular desde cero.

Existe como entidad propia (y no solo como un cálculo al vuelo) porque el historial de posiciones por carrera es una feature core del juego — poder ver "en qué carrera te superé" o "cómo evolucionó el campeonato semana a semana" requiere tener esos snapshots persistidos.

---

## SyncLog

Un **SyncLog** es el registro operacional de una sincronización con la API externa de F1. Cada vez que el sistema actualiza datos desde Jolpica-F1 (pilotos, constructores, circuitos, carreras o resultados), genera un SyncLog que documenta qué pasó.

Los atributos clave son **type** (qué tipo de dato se sincronizó: `DRIVERS`, `CONSTRUCTORS`, `CIRCUITS`, `RACES` o `RESULTS`), **status** (`SUCCESS`, `PARTIAL` si algo falló parcialmente, o `FAILED`), y los contadores **recordsCreated**, **recordsUpdated** y **recordsSkipped** para saber el impacto real de la operación. El campo **error** es nullable — solo está presente cuando el status no es `SUCCESS`. El **triggeredById** es nullable: es null para syncs automáticos (cron jobs) y apunta al User admin que lo disparó manualmente.

Los SyncLogs son **de solo lectura después de creados** — son evidencia de auditoría. Si una sync falla, la respuesta es disparar una nueva (que genera un SyncLog nuevo), nunca editar el registro del fallo. Existe como entidad propia para tener un historial operable: ver cuándo fue la última sync exitosa, diagnosticar fallos recurrentes, y saber quién disparó qué manualmente.
