---
concepts: domain-modeling,documentation,entity-description
source_repo: desarrollo
description: Cómo escribir docs/domain-entities.md a partir del ER diagram de BoxBox — qué información va en cada entrada, cómo derivarla del data-model.mmd + proposal.md, ejemplos worked y un ejercicio que ES la entrega de la semana 2.
understanding_score: 8
last_quizzed: 05-05-2026
prerequisites: [~/coding-tutor-tutorials/backend/2026-04-27-leer-un-er-diagram---mermaid-y-crows-foot.md]
created: 01-05-2026
last_updated: 01-05-2026
---

# Cómo armar `domain-entities.md` desde un ER

## La historia que justifica todo

Imaginá esto. Un compañero del equipo (o un profe revisando el TP) abre tu repo y va a `docs/data-model.mmd`. Ve este pedazo:

```
DraftPick {
    int id PK
    int leagueId FK
    int leagueMemberId FK
    int pickNumber
    int round "1-4"
    int driverId FK "nullable"
    int constructorId FK "nullable"
    datetime pickedAt
}
```

Está leyendo la **estructura técnica**: una tabla con sus columnas, foreign keys, tipos. Pero abre todas las preguntas que importan:

- ¿Qué representa un `DraftPick` *en el dominio del negocio*? ¿Es una elección? ¿Una asignación?
- ¿Por qué `driverId` y `constructorId` son **nullable**? ¿Cuándo uno y cuándo el otro?
- ¿Qué es un "round"? ¿Por qué hay 4?
- ¿Qué pasa cuando un draft termina — los `DraftPick` quedan inmutables o se pueden editar?

El ER diagram **no responde nada de eso**. Solo te dice "hay una tabla, tiene estas columnas, se relaciona con estas otras". Para entender **qué significa**, necesitás otro documento. Ese es `domain-entities.md`.

> **Modelo mental:**
> - El **ER diagram** es el **plano arquitectónico** de un edificio. Te muestra dónde están las paredes, cuántos pisos, qué habitaciones existen.
> - **`domain-entities.md`** es la **guía del edificio**. Te explica que la habitación 3A es donde recibís pacientes, la 3B es la sala de espera, y por qué hay un lavabo en cada una.

Los dos documentos son **complementarios**, no sustitutos. Sin `data-model.mmd` no podés implementar el schema. Sin `domain-entities.md` no podés discutir el dominio con un humano.

---

## Qué pide el plan de estudio

Tu `plan_de_estudio.md`, semana 2, dice:

> *"Escribir `/docs/domain-entities.md` listando entidades y relaciones (User, League, Membership, Driver, Constructor, Race, DraftSession, DraftPick, Lineup, Prediction, RaceResult)."*

Tu entrega de la semana es **escribir ese archivo**. Lo que sigue es cómo armarlo.

---

## La estructura de una entrada de entidad

Cada entidad merece **una entrada** en el documento. La forma recomendada es flexible (es prosa, no XML), pero te conviene cubrir 5 dimensiones:

### 1. **Qué es** (1-2 oraciones)
La definición en el dominio del negocio. NO en términos técnicos.

> ❌ "Un Driver es una fila en la tabla `drivers` con id, firstName, lastName..."
> ✅ "Un Driver representa a un piloto profesional de F1 — una persona real con número de carrera, escudería actual y código de 3 letras (ej: 'VER' para Verstappen)."

### 2. **Atributos clave** (no todos, los que importan al dominio)
Las columnas que **un humano necesita conocer** para entender la entidad. Saltate cosas obvias como `id`, `createdAt`, `updatedAt` — solo mencionalas si tienen un significado especial.

> ✅ "Tiene un **número de carrera** (único en el campeonato), un **código de 3 letras** que se ve en pantalla, y un **externalId** que lo identifica en las APIs externas de F1."

### 3. **Relaciones** (qué conecta con qué, en español)
Lo que el ER te muestra con flechas, traducido a frases. **No copies la notación crow's foot** — explicá qué significa para el dominio.

> ✅ "Cada Driver puede correr para distintos Constructors a lo largo de las temporadas — esa relación se modela vía `DriverSeason` (un piloto, una escudería, una temporada). Hamilton: McLaren 2008, Mercedes 2013-2024, Ferrari 2025+."

### 4. **Ciclo de vida**
- ¿Se puede borrar? ¿Soft o hard?
- ¿Es inmutable después de cierto evento?
- ¿Cuándo se crea / actualiza?

> ✅ "Los Drivers se **soft-deletean** (mediante `deletedAt`) — nunca se borran físicamente porque tienen historial de RaceResult que apuntan a ellos. Si un piloto se retira, se marca como deleted; si vuelve, se restaura."

### 5. **Por qué existe** (la justificación de negocio)
Esto separa una entidad útil de una tabla redundante. **¿Por qué necesitamos esta entidad como tal?**

> ✅ "`LeagueMember` no es solo 'el user que está en una league'. Es la **membresía concreta** — tiene fecha de unión (`joinedAt`), si es owner (`isOwner`) y status (ACTIVE/LEFT/KICKED). Esa metadata pertenece a la pertenencia, no al user ni a la league. Por eso es entidad propia y no una columna."

---

## Cómo derivar cada entrada — el proceso de 4 pasos

Para cada entidad de la lista, seguí esto:

### Paso 1: Mirá el ER
Abrí `docs/data-model.mmd` (preferentemente con preview Mermaid) y encontrá la entidad. Anotá sus atributos y todas las líneas que la conectan a otras entidades.

### Paso 2: Mirá el proposal
Abrí `docs/proposal.md` y buscá menciones de la entidad. Ahí está **el lenguaje de negocio** que tenés que usar — términos como "draft", "fantasy team", "predicción", "scoring", "snake order", etc. **Reusá esas palabras**, no inventes nuevas.

### Paso 3: Hacete las 5 preguntas
Para cada entidad, respondé en tu cabeza (o en draft):

| # | Pregunta |
|---|---|
| 1 | ¿Qué es esto en el dominio? |
| 2 | ¿Qué atributos importan al humano? |
| 3 | ¿Con qué se relaciona y qué significan esas relaciones? |
| 4 | ¿Cómo nace, vive y muere esta entidad? |
| 5 | ¿Por qué existe como entidad propia? |

### Paso 4: Escribí en español natural
Frase completa, voz activa, presente del indicativo. Como si le explicaras a un compañero que recién entra al equipo. **No pegues** la columna del ER — re-escribí.

---

## Worked example — 3 entidades

Te muestro cómo quedaría la sección de 3 entidades distintas. Después vos hacés el resto.

### Driver

> Un **Driver** representa a un piloto profesional de F1 — una persona real que compite en el campeonato. Cada piloto tiene un **número de carrera** único en el campeonato, un **código de 3 letras** que aparece en marcadores y transmisiones (ej: "VER" para Verstappen, "NOR" para Norris), y un **externalId** que lo identifica en las APIs externas (Jolpica-F1, OpenF1) para sincronizar resultados automáticamente.
>
> A lo largo de su carrera, un piloto puede correr para distintas **Constructors** en distintas **Seasons** — esa información se modela vía `DriverSeason`. Por ejemplo: Hamilton corrió para McLaren (2008), Mercedes (2013-2024) y Ferrari (2025+); cada combinación es una fila distinta en `DriverSeason`.
>
> Los Drivers se **soft-deletean** (con `deletedAt`) — nunca se borran físicamente. Tienen historial de `RaceResult` apuntándoles, además de eventuales `Prediction` y `FantasyTeam` que los referencian. Si un piloto se retira, se marca como deleted y se filtra de listados activos. Si vuelve a competir (caso típico: pilotos reserva que reciben un asiento), se restaura limpiando el `deletedAt`.

### LeagueMember

> Un **LeagueMember** representa la **membresía concreta** de un User en una League específica. NO es lo mismo que un User — un mismo User puede tener múltiples LeagueMembers (uno por cada liga en la que participa).
>
> Cada LeagueMember tiene una fecha de unión (`joinedAt`), un flag `isOwner` que indica si fue quien creó la liga, y un `status` (ACTIVE / LEFT / KICKED) que refleja su estado actual. Esa metadata pertenece a la membresía — no al User (que existe independientemente) ni a la League (que existe sin importar quiénes son sus miembros).
>
> Cada LeagueMember **posee exactamente un FantasyTeam** (relación 1:1) y participa en el draft de su league haciendo `DraftPick`s, en cada race haciendo `Prediction`s, y acumulando puntaje vía `LeagueStanding`s. Si un miembro deja la liga (status LEFT) o es expulsado (KICKED), su FantasyTeam y resto de data histórica se conservan — no se borran, solo se ocultan de la operación activa.

### DraftPick

> Un **DraftPick** representa **una elección hecha por un LeagueMember durante el draft de su league**. El draft de BoxBox es un *snake draft* de 4 rondas: en cada ronda, cada miembro elige por turno un Driver o un Constructor para incorporar a su FantasyTeam.
>
> Cada DraftPick tiene un `pickNumber` (orden global de la elección dentro del draft, ej: el 5° pick de toda la liga), un `round` (1 a 4), y referencia **o un Driver o un Constructor** — nunca ambos en el mismo pick (por eso `driverId` y `constructorId` son nullable y mutuamente exclusivos a nivel lógica de negocio).
>
> Los DraftPicks son **inmutables después de hechos**: una vez que el LeagueMember confirmó su elección y el draft pasó al siguiente turno, no se editan ni se borran. Si querés cambiar tu equipo después, lo hacés vía `DriverSwap` (que sí permite cambios condicionados — ver entrada de `DriverSwap`). El historial completo de DraftPicks queda como evidencia auditable de cómo se armó cada FantasyTeam.

---

## Qué NO escribir (anti-patrones)

- ❌ **No copies columnas del ER**. *"Tiene id (PK), firstName (string), lastName (string)..."* es una pegada que el ER ya hace mejor. Tu trabajo es traducir al humano.
- ❌ **No traduzcas la notación crow's foot literal**. *"Driver tiene relación uno-a-muchos con DriverSeason via cardinalidad ||--o{"* es ininteligible. Decí: *"Un piloto puede correr en muchas temporadas distintas; cada participación queda registrada como un DriverSeason"*.
- ❌ **No te repitas mencionando id/createdAt/updatedAt en cada entidad**. Asumí que toda entidad tiene esos. Solo mencionalos si hay algo especial (ej: `deletedAt` por soft-delete, `pickedAt` con significado de timing).
- ❌ **No inventes terminología**. Si el `proposal.md` dice "snake draft", tu doc dice "snake draft". Si dice "fantasy team", no escribas "equipo de fantasía". La consistencia es lo que hace que el doc sirva de referencia.
- ❌ **No documentes campos que no existen**. Si el ER no tiene `userRole`, no le inventes uno aunque "tendría sentido". Documentás lo que ES, no lo que sería ideal.

---

## Try it yourself — esto ES la entrega de la semana

**Tu trabajo:**

1. Crear el archivo [`docs/domain-entities.md`](docs/domain-entities.md).
2. Escribir las entradas para **todas las entidades del modelo planeado**, una por una, siguiendo el formato del worked example.
3. Te dejo las 3 que escribí arriba como punto de partida — copialas a tu archivo si querés.

**Las entidades que tenés que cubrir** (basadas en `data-model.mmd` + `plan_de_estudio.md`):

- ✅ `Driver` (te lo regalo arriba)
- ✅ `LeagueMember` (te lo regalo arriba)
- ✅ `DraftPick` (te lo regalo arriba)
- ⬜ `User`
- ⬜ `League`
- ⬜ `Constructor`
- ⬜ `Circuit`
- ⬜ `Season`
- ⬜ `DriverSeason`
- ⬜ `Race`
- ⬜ `FantasyTeam`
- ⬜ `DriverSwap`
- ⬜ `RaceResult`
- ⬜ `ConstructorResult`
- ⬜ `Prediction`
- ⬜ `LeagueStanding`
- ⬜ `SyncLog`

**Plan de trabajo sugerido** (porque son muchas):

1. Empezá por las **simples y autocontenidas**: `Constructor`, `Circuit`, `Season`. Son entidades de catálogo, sin mucha lógica de negocio compleja.
2. Después las **historiales**: `Race`, `RaceResult`, `ConstructorResult`. Tienen relaciones pero la semántica es clara (resultados de carreras).
3. Después las **operacionales**: `User`, `League`, `FantasyTeam`. Son las que tocan al usuario directamente.
4. Después las **complejas**: `DriverSwap`, `Prediction`, `LeagueStanding`. Tienen lógica condicional y reglas que vale la pena documentar.
5. Por último: `SyncLog`. Es metadata operacional, dejala para el final.

**Tiempo estimado:** 2-3 horas de trabajo concentrado, pero **no te lo hagás de un saque**. Hacelo en sesiones de 30-45 min, escribiendo 3-4 entidades por sesión.

**Cuando termines, mandámelo.** Vamos a hacer una pasada de revisión: identificar entradas que se quedaron en lo técnico, terminología inconsistente, ciclos de vida no documentados, y atributos importantes que se te pasaron.

---

## Resumen — lo que tiene que quedar pegado

- **`domain-entities.md` es la guía narrativa de tu modelo**, complementaria al ER diagram técnico. Una explica forma; el otro explica significado.
- **Cada entrada cubre 5 dimensiones**: qué es, atributos clave, relaciones, ciclo de vida, por qué existe como entidad propia.
- **El proceso es 4 pasos**: mirá el ER → mirá el proposal → respondé las 5 preguntas → escribí en español natural.
- **Reusá el lenguaje del proposal**, no inventes terminología propia.
- **Saltate lo obvio** (id, timestamps básicos) salvo que tengan significado especial.
- **Documentás lo que ES, no lo que sería ideal**.

---

## Q&A

[Acá se van a ir agregando las preguntas que hagas mientras leés o después.]

## Quiz History

[Acá quedan registradas las sesiones de quiz cuando te tome la lección.]
