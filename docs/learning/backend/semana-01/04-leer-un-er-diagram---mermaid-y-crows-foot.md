---
concepts: ER-diagram,Mermaid,crows-foot,data-modeling
source_repo: desarrollo
description: Cómo leer un diagrama entidad-relación (ER), qué es la notación crow's foot, cómo VS Code te lo renderiza desde un archivo .mmd, y un walkthrough del data-model.mmd de BoxBox para que puedas decirle a alguien "qué es este sistema" mirando solo el diagrama.
understanding_score: 6
last_quizzed: 28-04-2026
prerequisites: []
created: 27-04-2026
last_updated: 27-04-2026
---

# Leer un ER diagram — Mermaid y crow's foot

## La historia que justifica todo

Imaginate este escenario. Llega un compañero nuevo al equipo de BoxBox a fines de junio, faltan dos semanas para el milestone del 12/7. Te pregunta:

> *"¿Qué es exactamente lo que estamos construyendo? ¿Cómo se relacionan las cosas adentro?"*

Tenés tres formas de responderle:

1. **Le explicás el dominio en voz alta** durante 40 minutos, dibujando en un pizarrón virtual.
2. **Le mandás `docs/proposal.md`** y le decís "leé esto, después hablamos". 30 páginas en español.
3. **Le mandás `docs/data-model.mmd`** y le decís "abrilo en VS Code con el preview de Mermaid". 5 minutos para entender la estructura.

La opción 3 es la que ofrece el ER diagram. **Es el plano arquitectónico de tu base de datos.** Una persona técnica que sabe leer crow's foot puede mirar tu archivo y, en 5 minutos, contestar:

- ¿Qué entidades (tablas) existen?
- ¿Cómo se relacionan?
- ¿Qué pasa si borro un User — qué cosas se llevan con él?
- ¿Hay relaciones 1:1, 1:N, N:M? ¿Cuáles?
- ¿Hay tablas de unión (junction tables)?

Sin ese diagrama, ese mismo entendimiento toma horas leyendo `schema.prisma` línea por línea. **El ER diagram es la conversación rápida con tu sistema. Hay que saber leerlo.**

---

## Qué es un ER diagram, en una oración

Un ER diagram (entity-relationship diagram) es **un dibujo del modelo de datos**: las cajas son tablas (entidades), las líneas entre cajas son relaciones, y los símbolos en las puntas de las líneas dicen **cuántos** registros de un lado se conectan con cuántos del otro.

> **Modelo mental:** un árbol genealógico, pero para datos. Las personas son las tablas. Las líneas son "padre de", "hijo de", "casado con". Y los símbolos en las puntas resumen la regla: *"cada persona tiene exactamente una madre biológica"*, *"un padre puede tener muchos hijos"*. Una vez que sabés leer los símbolos, todo el árbol cuenta una historia.

---

## Qué es Mermaid

**Mermaid** es un lenguaje de texto que se renderiza a diagramas. En lugar de usar una herramienta tipo Lucidchart o draw.io (donde dibujás con el mouse), escribís código en un archivo `.mmd` o `.md` y un renderizador lo convierte en imagen.

**Por qué importa**:

- **Versionable.** Tu `data-model.mmd` se commitea a Git como cualquier otro código. Cuando cambia el modelo, el diff de Git muestra **qué relación cambió** (no "se movió la caja un pixel a la izquierda").
- **Renderizable en cualquier lado.** GitHub renderiza Mermaid automáticamente cuando ves un `.md` con bloque ` ```mermaid `. VS Code con la extensión correcta también. No dependés de un proveedor.

**Para verlo en VS Code**:

1. Instalá la extensión **"Markdown Preview Mermaid Support"** (publisher: Matt Bierner).
2. Abrí `docs/data-model.mmd` o cualquier `.md` que contenga un bloque mermaid.
3. Apretá `Ctrl+Shift+V` (preview) o `Ctrl+K V` (split preview).
4. Aparece el diagrama renderizado al lado del texto.

> ⚠️ Si abrís `data-model.mmd` directamente y no ves preview, es porque la extensión tradicional de Mermaid renderiza dentro de Markdown. Lo más cómodo: copiá el contenido de `data-model.mmd` a un `.md` temporal con `\`\`\`mermaid` arriba, o directamente usá un `.md` desde el principio para tu modelo.

---

## La habilidad core: leer crow's foot

**Crow's foot** ("pata de cuervo") es la notación más usada para decir *"cuántos de un lado, cuántos del otro"*. Toda la dificultad de leer un ER diagram se reduce a memorizar **4 símbolos**.

| Símbolo | Significado | "Cuántos" |
|---|---|---|
| `\|\|` (dos barras) | Exactamente uno | 1 — obligatorio, único |
| `o\|` (círculo + barra) | Cero o uno | 0..1 — opcional, máximo uno |
| `\|{` o `}\|` (barra + crow's foot) | Uno o muchos | 1..N — al menos uno |
| `o{` o `}o` (círculo + crow's foot) | Cero o muchos | 0..N — opcional, ilimitado |

> **Modelo mental:** los dos símbolos componen una palabra:
> - El símbolo "cerca" del extremo (la barra `|` o el círculo `o`) dice **el mínimo**: ¿obligatorio (`|`) u opcional (`o`)?
> - El símbolo "más lejos" (la barra `|` o la crow's foot `{` / `}`) dice **el máximo**: ¿uno (`|`) o muchos (`{`)?

### Cómo leer una línea de relación

Una línea siempre tiene **dos extremos**. Cada extremo tiene su propio par de símbolos. Para entender la línea, leés ambos extremos.

Ejemplo de tu archivo:

```
User ||--o{ LeagueMember : "joins leagues"
```

Lo desempaquetamos:

- **Extremo izquierdo (`||` cerca de `User`)**: "exactamente uno" → un `LeagueMember` se conecta con **exactamente un** User.
- **Extremo derecho (`o{` cerca de `LeagueMember`)**: "cero o muchos" → un `User` se conecta con **cero o muchos** `LeagueMember`.

Traducción en español:

> *"Cada `LeagueMember` pertenece a exactamente un `User`. Un `User` puede tener cero o muchos `LeagueMember` (o sea: puede no estar en ninguna liga, o estar en varias)."*

### El truco para leer las direcciones

Esta confusión es **muy común**: ¿qué extremo del símbolo va con qué tabla?

**Regla:** los símbolos *se leen mirando hacia la otra tabla*. El símbolo cerca de `User` en `User ||--o{ LeagueMember` aplica a la **conexión saliendo de User hacia LeagueMember** — o sea, "¿cuántos LeagueMember puedo encontrar desde un User?". La respuesta la da el símbolo del **otro extremo**: `o{` = cero o muchos.

Suena al revés pero es así: **el símbolo de un extremo describe cómo el OTRO lado se ve desde acá.**

Si te confunde, la heurística simple:
- ¿Querés saber cuántos LeagueMember tiene un User? Mirá el símbolo CERCA de LeagueMember (`o{` = cero o muchos LeagueMember).
- ¿Querés saber cuántos User tiene un LeagueMember? Mirá el símbolo CERCA de User (`||` = exactamente uno).

---

## Walkthrough de TU `data-model.mmd`

> ⚠️ **Importante antes de empezar:** el archivo `data-model.mmd` muestra el modelo **planeado completo**, no lo que ya está en `schema.prisma`. Hoy en `schema.prisma` tenés `Driver`, `Constructor`, `Circuit`, `Season`, `Race` (los 5 CRUDs construidos). El resto (`User`, `League`, `FantasyTeam`, etc.) está en el diagrama pero **no construido todavía**, y eso es intencional según el `plan_de_estudio.md`. Cuando leas el diagrama, mantené presente que estás viendo "el destino", no "el estado actual".

Vamos a recorrer las relaciones más interesantes para que te sirvan de ejemplo.

### Caso 1: la relación 1:N básica

```
Season ||--o{ Race : "has"
```

Decoded:
- `||` cerca de Season → un Race pertenece a **exactamente una** Season.
- `o{` cerca de Race → una Season tiene **cero o muchas** Races.

Traducción: *"Cada carrera está en una temporada. Una temporada arranca con cero carreras y va acumulando hasta el calendario completo (~24 carreras de F1)."*

Esta es la relación más común. **La mayoría de las líneas en cualquier ER diagram son `||--o{`** (uno-a-muchos opcional).

### Caso 2: la relación 1:1 estricta

```
LeagueMember ||--|| FantasyTeam : "owns"
```

Decoded:
- `||` cerca de LeagueMember → un FantasyTeam pertenece a **exactamente un** LeagueMember.
- `||` cerca de FantasyTeam → un LeagueMember tiene **exactamente un** FantasyTeam.

Traducción: *"Cada miembro de liga tiene un único equipo fantasy, y cada equipo fantasy tiene un único dueño. Es una correspondencia perfecta 1-a-1."*

> ⚠️ Las relaciones 1:1 estrictas son **raras y sospechosas**. Si dos tablas siempre vienen juntas en una correspondencia 1-a-1, ¿por qué no son una sola tabla? La respuesta acá es buena: separan los datos del *miembro* (cuándo se unió, si es owner, status) de los datos del *equipo* (qué pilotos tiene, qué constructor, swaps). Conceptualmente distintos. Pero cuando veas un 1:1 en otros diagramas, hacete la pregunta: ¿está justificado?

### Caso 3: las relaciones múltiples entre las mismas dos tablas

Mirá esto en tu diagrama:

```
FantasyTeam }o--|| Driver : "driver1"
FantasyTeam }o--|| Driver : "driver2"
FantasyTeam }o--|| Driver : "reserve"
```

**Hay tres líneas** entre las mismas dos tablas. ¿Qué significa?

Tu modelo dice: un `FantasyTeam` tiene **tres referencias separadas** a la tabla `Driver` — un piloto titular 1, un titular 2, y un piloto reserva. No es que un FantasyTeam tenga "muchos drivers" en una lista flexible: tiene **tres slots fijos**, cada uno con su propio significado semántico.

Traducción de cada línea:
- `FantasyTeam }o--|| Driver : "driver1"` → cada FantasyTeam tiene exactamente un driver1; un Driver puede ser driver1 de cero o muchos teams.
- Idem driver2 y reserve.

> **Esta es una pista importante para el código:** en `prisma/schema.prisma`, esto se va a traducir en **tres campos foreign-key separados** en el modelo `FantasyTeam`: `driver1Id`, `driver2Id`, `reserveDriverId`. Los tres apuntan a la misma tabla pero son columnas distintas. Si tuvieras una sola línea `FantasyTeam }o--o{ Driver`, sería una relación N:M y necesitarías una tabla de unión.

### Caso 4: la junction table (tabla de unión)

```
DriverSeason {
    int id PK
    int driverId FK
    int constructorId FK
    int seasonId FK
}

Driver ||--o{ DriverSeason : "plays in"
Constructor ||--o{ DriverSeason : "has"
Season ||--o{ DriverSeason : "contains"
```

Esta es una entidad que solo existe **para conectar tres otras**: dice *"en la temporada X, el piloto Y corrió para la escudería Z"*.

¿Por qué la necesitás? Porque un mismo Driver puede correr para distintos Constructors en distintas Seasons (Hamilton: McLaren 2008, Mercedes 2013-2024, Ferrari 2025+). No podés meter `constructorId` directamente en el modelo `Driver` — perderías el historial. Tampoco podés meterlo en `Season` — ahí necesitás múltiples drivers.

**La junction table** resuelve esto: cada fila de `DriverSeason` es **un evento histórico** (driver X en season Y manejó para constructor Z).

> **Mental model:** una junction table es como una boleta de un partido de fútbol: relaciona "este día" + "este equipo local" + "este equipo visitante" + el resultado. Sin esa boleta, sabés los equipos pero no sabés cuándo jugaron ni contra quién.

---

## Atributos de las entidades

Cada caja en el diagrama tiene una lista de atributos (las columnas de esa tabla). Por ejemplo:

```
Driver {
    int id PK
    string firstName
    string lastName
    int number
    string code "VER, NOR..."
    string headshotUrl
    string externalId UK
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
}
```

Las anotaciones que vas a ver:

| Anotación | Significado |
|---|---|
| `PK` | Primary Key — el identificador único de la fila. Casi siempre es `id`. |
| `FK` | Foreign Key — apunta a una fila en otra tabla. Las relaciones se implementan con FKs. |
| `UK` | Unique Key — valor único en toda la tabla, pero no es el PK. Ej: `email`, `externalId`. |
| `"comentario"` | Notas libres del autor del diagrama, opcionales. |

Notá `deletedAt` en `Driver`. Eso es la marca del **soft delete** (lo vas a ver en `Constructor` y `Circuit` también, no en otras tablas). Es una decisión consciente del modelo: las entidades "permanentes" (un piloto que existió en la historia de F1, una escudería) **no se borran físicamente** — se marcan con un timestamp y se filtran en las queries.

---

## Predicción: las 2 confusiones que vas a tener

### "¿Por qué hay líneas que no son `||--o{`?"

La gran mayoría son `||--o{` (uno-a-muchos). Pero vas a ver casos como `}o--||` (que es el mismo `||--o{` leído al revés — son intercambiables) y `}o--o|`. La regla siempre es la misma: **lee cada extremo por separado, después junta los significados.**

### "Esto es solo un dibujo, ¿de verdad importa entenderlo?"

Sí, por dos motivos:
1. **El schema.prisma se construye desde el diagrama.** Si la cardinalidad está mal en el diagrama, vas a heredar el bug en el schema.
2. **Cuando hagas queries, esto te va a salvar.** "¿Por qué esta query devuelve registros duplicados?" → casi siempre es porque hay un join sobre una relación N:M que no entendiste bien.

---

## Try it yourself (10 min)

Abrí `docs/data-model.mmd` con preview de Mermaid (o copialo a un `.md` temporal con bloque mermaid si la extensión no agarra los `.mmd`). Después contestame esto, en una o dos oraciones cada uno:

1. Traducí esta línea a plain English/Spanish:
   ```
   League ||--o{ LeagueMember : "has"
   ```
2. Traducí esta:
   ```
   Race ||--o{ Prediction : "for"
   ```
3. **Pregunta de razonamiento:** mirando solo el diagrama, **¿qué pasa cuando alguien borra un User?** Específicamente: qué tablas tienen filas que dependen de él, y qué decisión hay que tomar (¿borrar en cascada? ¿bloquear el borrado? ¿reasignar?).

---

## Resumen — lo que tiene que quedar pegado

- **Un ER diagram es el plano de tu base de datos.** Cajas = tablas, líneas = relaciones, símbolos en las puntas = cardinalidad.
- **Crow's foot tiene 4 símbolos**: `||` (exactamente uno), `o|` (cero o uno), `|{` (uno o muchos), `o{` (cero o muchos).
- **Cada relación tiene 2 extremos**, hay que leer ambos. El símbolo cerca de una tabla describe cómo se ve **la otra** desde acá.
- **Mermaid es texto que se renderiza** — versionable en Git, GitHub lo muestra automático, en VS Code necesitás la extensión "Markdown Preview Mermaid Support".
- **Tu `data-model.mmd` muestra el modelo planeado completo, no lo que está implementado.** No te asustes si ves tablas que no existen en `schema.prisma` todavía.
- **Patrones útiles a reconocer:** 1:N (lo más común), 1:1 (raro y sospechoso, justificado solo cuando hay separación semántica), múltiples relaciones entre las mismas tablas (slots fijos, no listas), junction tables (cuando necesitás conectar 3+ entidades históricamente).

Próximo tutorial — el último de la semana 1: **leer una REST API spec**. Conecta directo con `docs/api-endpoints.md` y prepara el terreno para entender qué endpoints ya están construidos y cuáles son aspiracionales.

---

## Q&A

### 27-04-2026 — Try-it-yourself: las 3 preguntas de cierre

**Q1 (traducción de `League ||--o{ LeagueMember : "has"`).** Respuesta del learner: *"Una liga puede tener 0 o más miembros, pero un miembro pertenece a 1 sola liga."* ✅ Correcta. Pero notó "ruido": le hace ruido que un User parezca limitado a una sola liga, cuando él se imagina estando en 3 grupos de amigos a la vez.

**Resolución del ruido (importante — vale la pena dejarla escrita):** la confusión es entre `User` y `LeagueMember`. **No son la misma entidad.**
- `User` = la persona (1 fila por persona).
- `LeagueMember` = una membresía concreta (N filas por persona, una por cada liga).

Si Tomás está en 3 ligas, hay 1 fila en `User` y 3 filas en `LeagueMember`, cada una apuntando al mismo `userId` pero distinto `leagueId`. La línea `User ||--o{ LeagueMember` confirma que un User puede tener muchos LeagueMembers, lo que efectivamente le permite estar en muchas ligas.

**Lección de modelado:** cuando una tabla intermedia tiene atributos propios (`joinedAt`, `isOwner`, `status`), deja de ser solo un punto de unión y se vuelve una entidad de pleno derecho. Este es un patrón que vas a ver muchas veces.

**Q2 (traducción de `Race ||--o{ Prediction : "for"`).** Respuesta: *"Una carrera puede tener 0 o más predicciones, pero una predicción pertenece a una sola carrera."* ✅ Correcta, sin más.

**Q3 (qué pasa al borrar un User).** Respuesta del learner: *"Se borran todas las instancias dependientes/hijos de este, como ser la instancia de 'membresía' o apuesta, en cascada por ejemplo."*

**Evaluación:** parcialmente correcta. Cascade es una opción, pero NO la única ni siempre la mejor.

**Tablas que dependen de User:**
- `LeagueMember` (FK directa)
- `League` (FK `createdById`)
- `SyncLog` (FK `triggeredById`)
- Indirectas vía LeagueMember: `FantasyTeam`, `DraftPick`, `Prediction`, `LeagueStanding`

**Problema con cascade ciego:** si Tomás creó una liga con 4 amigos más y se borra con cascade, **se borra la liga entera y la data de los otros 4 usuarios**. Inaceptable.

**Las 3 estrategias reales:**

| Estrategia | Cuándo |
|---|---|
| **Cascade** | Hijos sin sentido sin el padre. Ej: Predictions de un User. |
| **Block (RESTRICT)** | El padre afecta a otros. Ej: bloquear baja si creó Leagues activas — forzar transfer de ownership primero. |
| **Soft-delete** | Marcar `deletedAt`, dejar la fila viva, FKs siguen válidas. Lo más común en apps reales. |

**Para BoxBox (post-31/7 con auth):** soft-delete del User + bloquear si tiene Leagues creadas hasta transferir ownership.

**Lección general que pegó al learner:** las 3 traducciones de notación están clavadas. El "ruido" de Q1 fue la pregunta correcta. Q3 la intuición arrancó bien pero faltó ver el efecto colateral de cascade sobre otros usuarios.



## Quiz History

[Acá quedan registradas las sesiones de quiz cuando te tome la lección.]
