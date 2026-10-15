# ADR-0010: Resultados de sprint en tablas propias

**Date:** 2026-10-13
**Status:** Accepted
**Author:** Tomás Pinolini

---

## Context

En ~6 fines de semana por temporada la F1 corre un **sprint** el sábado: una carrera corta que
reparte puntos de campeonato propios. BoxBox no los cuenta. Un usuario cuyo piloto ganó el sprint
no ve esos puntos en su liga, y el campeonato de la app no cierra contra el real.

La fecha del sprint **ya entra sola**: el cliente de Jolpica la valida y el sync la mapea a
`Race.sprintDate`. Lo que no tiene dónde vivir son los resultados.

El bloqueo es una clave única. `RaceResult` termina en `@@unique([raceId, driverId])`: una fila por
piloto por fin de semana. El resultado del sprint y el de la carrera del mismo piloto en el mismo
`raceId` chocan. `ConstructorResult` tiene exactamente la misma forma de clave,
`@@unique([raceId, constructorId])`, así que el problema aparece dos veces, una por cada nivel.

Hay un **segundo bloqueo** que no es evidente y que se descubrió leyendo el código: `loadResults`
pasa la carrera a `COMPLETED` y **rechaza** cualquier carga posterior (`RACE_ALREADY_COMPLETED`).
Como `status` no está en `createRaceSchema` —y `updateRaceSchema` es su `.partial()`— una carrera
cerrada **no se puede reabrir por la API**. La primera sesión que se cargue cierra la fila para
siempre. Cualquier diseño que haga entrar el sprint por esa misma puerta se vuelve incapaz de
cargar los sprints de las fechas ya corridas.

Lo que **no** es un problema: la suma. `standings.recalculate` acumula los puntos de todas las
carreras `COMPLETED` con `round` menor o igual a la actual, y su función de indexado acumula con
`+=` por piloto. Si la fila existiera, ya contaría sola.

Al momento de decidir, la base de desarrollo tenía 16 fechas `COMPLETED` y **5 de ellas con
`sprintDate`**: cinco sprints ya corridos cuyos puntos no existen en ninguna tabla.

---

## Decision

### Dónde vive un resultado de sprint

**Tablas propias.** Una para los resultados por piloto y una hermana mínima
—`(raceId, constructorId, totalPoints)`— para los puntos por escudería, escritas en la misma
transacción, como ya se hace con los resultados de carrera. No se replica el split
`driver1Points`/`driver2Points`: nadie lo lee.

El argumento no es el tamaño del cambio, es **de qué lado cae el olvido**. Con tablas propias, los
lugares que no deben contar el sprint —victorias, podios, mejor resultado, cantidad de carreras—
quedan correctos **sin escribir un solo filtro**, porque esas filas no están en su tabla.
Olvidarse de sumar el sprint deja una funcionalidad faltante que se ve. Con un discriminador de
sesión en `RaceResult`, olvidarse de filtrar deja datos mal que no se ven.

### Qué paga el sprint, y a quién

- **Escala de la FIA tal cual**: 8-7-6-5-4-3-2-1 al top 8, sumados derecho al total. Sin
  ponderación propia de BoxBox. El sprint no reparte punto de vuelta rápida.
- **Se replica la asimetría de la F1 real**: los puntos del sprint cuentan para el campeonato de
  pilotos y de escuderías, pero **una victoria de sprint no es una victoria de Gran Premio** y no
  entra en las estadísticas de un piloto (`wins`, `podiums`, `bestFinish`, `races`).
- **Los puntos de sprint no entran en la evaluación de una Prediction.** El "top constructor" de
  una fecha se decide por los puntos del Gran Premio. Restricción comunicada al frente de
  predicciones (ADR-0012).

### Qué significa `Race.status = COMPLETED`

**No cambia**: sigue significando "el Gran Premio se corrió y sus resultados están cargados". El
enum no se toca y no se agrega un estado intermedio. `status` ya gobierna el scoring en dos
lugares —`recalculate` se niega a correr sin él, y el acumulado sólo cuenta fechas `COMPLETED`—
así que redefinirlo arrastra el cálculo de puntos y la pantalla de admin.

Consecuencia directa y buscada: **el sprint no entra por `loadResults`**. Tiene su propio endpoint
admin, que no lee ni escribe `status`, exige que la fecha tenga `sprintDate` (si no, 409 — sin eso
se puede inventar un sprint en un fin de semana que no lo tuvo) y **no dispara el recálculo**,
igual que la carga de carrera.

### Una foto de posiciones por fin de semana, no por sesión

El sprint es un **suplemento** de la fecha, no un evento puntuable propio. `LeagueStanding` sigue
keyeado por `(leagueMemberId, raceId)`: el sábado no cambia nada visible, y el domingo el total ya
incluye las dos sesiones. Nadie draftea pensando en el sábado, y seis fotos extra por temporada
harían que `positionChange` midiera "cambié entre el sprint y la carrera" en vez de entre fechas.

### Carga retroactiva

Los sprints de las fechas ya cerradas **se cargan**. Una temporada donde 5 de 6 sprints no pagaron
puntos es una tabla que no cierra contra la F1 real, y es lo primero que se nota en una demo. El
backfill no es una operación manual sobre la base: va al snapshot de resultados del seed, que el
`posttest` de la suite vuelve a cargar. Queda versionado, reproducible y funciona sin red.

### Vocabulario

- **`sprint`** entra al glosario con su definición completa, incluida la asimetría de arriba.
- **`sesión`** no entra. Con tablas separadas no hay nada en el código que se llame `session`, y la
  regla del glosario —"usar estos términos exactos en código, docs, commits"— convierte un término
  sin referente en una promesa incumplida.
- **`RaceResult` se renombra a `GrandPrixResult`**, modelo de Prisma y tabla, **sólo esa capa**. El
  nombre actual miente en cuanto existe `SprintResult`, porque el sprint también ocurre en una
  `Race`. El contrato HTTP no se toca: los error codes `RACE_RESULT_*` se quedan y el enum
  `RaceResultStatus` también, porque las dos tablas de resultados lo comparten. Según
  [ADR-0011](./ADR-0011-semantic-versioning.md) BoxBox versiona el contrato HTTP y no el schema de
  Prisma, así que **el renombre no es breaking**.

### Empaquetado

Un solo slice vertical, el **17** (BOX-69), demoable solo: se carga el sprint de una fecha y la
columna aparece con los puntos. Se parte en **tres tramos** —`17.1` tablas y endpoint de carga,
`17.2` los puntos cuentan, `17.3` Jolpica, backfill y la columna— siguiendo el precedente del
Slice 13b, que usó sub-issues con el mismo esquema de nombres. El padre es el paraguas y no tiene
PR propio: cada tramo tiene el suyo, y el `17.1` es el único que no se demuestra en pantalla. El renombre sale del slice y va **solo, en su propio PR**
(BOX-68): es un refactor sin cambio de comportamiento que toca una veintena de archivos, y
mezclarlo con una feature hace la revisión imposible.

Salto de versión del slice: **MINOR**. Contrato aditivo.

---

## Alternatives considered

**Un discriminador de sesión en `RaceResult`** (`@@unique([raceId, driverId, session])`). Una sola
tabla, una sola forma, y `GET /races/:id/results` serviría las dos sesiones gratis. Rechazado por
el modo de falla: hay cuatro lectores de esa tabla y **ninguno filtra hoy**, así que el default de
olvidarse es contar doble en silencio. Peor con la asimetría decidida arriba, porque el filtro
correcto es distinto en cada lector —los campeonatos suman el sprint, las estadísticas no—. Es el
mismo defecto que BOX-39, que apareció con 231 tests en verde.

**Una `Race` propia por cada sprint.** Rechazado por dos choques concretos: `@@unique([seasonId,
round])`, que es la clave con la que `syncRaces` empareja el calendario con Jolpica, y la foto de
`LeagueStanding` por sprint, que contradice la decisión de una foto por fin de semana.

**Calcular los puntos de escudería del sprint al leer**, sin tabla hermana. Tentador porque esa
tabla es derivada: la información ya está en los resultados por piloto. Rechazado porque agrupar
por escudería en tiempo de lectura exige pasar por `DriverSeason` y tocar la relación
`constructor`, que colisiona con `Object.prototype` y rompe el build sin que ningún test lo note
(Slices 4, 5, 9, 14 y 16). Esa es la razón por la que `ConstructorResult` existe precomputado, y
sigue vigente.

**El argumento de performance, en los dos sentidos.** Se evaluó y **se descartó por irrelevante a
esta escala**, y queda escrito para que no se re-litigue: la tabla hermana son 66 filas por
temporada (11 escuderías × 6 sprints), contra una tabla de resultados de carrera que pesa 72 kB
con 187 filas. Agrupar 132 filas en Postgres es ruido al lado del viaje de red. Ninguna de las dos
opciones se eligió por ciclos de CPU; se eligió por modo de falla.

**Una escala de puntos propia de BoxBox**, para que el sábado "pese" lo que decidiéramos.
Rechazado: lo que vende la app son resultados reales de F1, y una escala inventada agrega una
regla que hay que explicar y defender.

**Renombrar `RaceResult` en las tres capas** (modelo, contrato HTTP y frontend). Coherente de
punta a punta, pero son 32 archivos de código y 146 ocurrencias, dos error codes incompatibles, y
el frontend entrando en un slice que es "una columna". Se eligió la capa interna sola, que es
donde el nombre importa: `schema.prisma` es la fuente de verdad declarada del modelo.

**No renombrar nada** y compensar con el glosario. Era la opción más barata y se descartó a
conciencia: el ADR-0011 confirmó que el renombre no cuesta un breaking change, y eso desarmó la
única objeción fuerte.

**Cubrir el caso "el sprint se corrió y el Gran Premio se canceló".** Costaba una condición extra
en la consulta más caliente del scoring, para un caso que **nunca ocurrió en la historia de la F1**
en un fin de semana sprint. Queda como limitación conocida, abajo.

---

## Consequences

- **Limitación conocida y aceptada:** si el sprint se corre y el Gran Premio se cancela, la fecha
  queda `CANCELLED`, el acumulado sólo cuenta `COMPLETED`, y esos puntos de sprint no entran en
  ninguna tabla nunca. Es una limitación elegida, no un descubrimiento.
- **No es un defecto, es el diseño:** el sábado a la noche, con el sprint cargado y el Gran Premio
  todavía sin correr, ninguna tabla de posiciones muestra esos puntos. Aparecen el domingo.
- **El backfill cambia números que los usuarios ya vieron.** Antes repartía de menos. No es un
  breaking change —cambia datos, no contrato— y viajando con funcionalidad nueva la release sigue
  siendo MINOR.
- **Dos nombres van a convivir en el repo para siempre.** Las migraciones viejas, el
  [ADR-0004](./ADR-0004-soft-delete-only-catalog.md) y los relevamientos de `docs/research` no se
  editan: son registro histórico. Un renombre en un repo que guarda historia nunca es completo, y
  eso le come una parte del beneficio. El glosario lo dice explícitamente.
- **El enum `RaceResultStatus` queda con un nombre que ya no corresponde a ningún modelo**, porque
  lo comparten las dos tablas de resultados. Renombrarlo a `ResultStatus` obligaba a tocar el
  frontend, que lo espeja. Se aceptó la incoherencia y está anotada en el glosario.
- **Orden de implementación acordado entre los tres frentes vivos** (sprints, predicciones y
  versionado), post-presentación: **(1)** el renombre solo, **(2)** predicciones, **(3)** sprints.
  Predicciones va antes porque es el ítem 1 del Alcance Adicional Voluntario declarado a la cátedra
  en `docs/proposal.md` y hoy listado "No construido" — una promesa abierta. Los sprints no figuran
  en la propuesta en ningún lado: son alcance nuevo.
- **La migración de predicciones va antes que la de sprints.** El frente de predicciones confirmó
  que necesita una (`Race.poleDriverId` nueva y `Prediction.bonusPoints` pasando a
  `Int @default(0)`), así que la de este slice se regenera arriba de la suya.
- **Pedido abierto del frente de predicciones, sin resolver:** sumar "el recalculate que falta del
  lado del servidor" al primer PR de limpieza, junto con el renombre. No se aceptó acá: el valor de
  ese PR es ser un renombre puro sin cambio de comportamiento, y meterle una feature lo rompe. Va
  como ticket propio una vez que esté claro qué comportamiento falta exactamente.
