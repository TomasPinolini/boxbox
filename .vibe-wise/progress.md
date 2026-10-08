# Learning Progress

## Derivación de la escudería en un RaceResult

**Introduced** (2026-10-05, explicado por Claude)
- `RaceResult` no tiene `constructorId`. La relación piloto→escudería es propiedad de
  `DriverSeason`, y `ConstructorResult` se deriva de ahí al cargar resultados
  (`buildConstructorResults` en `backend/src/modules/races/races.service.ts`).
- `DriverSeason` tiene `@@unique([driverId, seasonId])` — una sola escudería por piloto
  por temporada. Eso es lo que restringe el modelo.
- Razón defendible de por qué no está: evita duplicar un dato derivable y que dos fuentes
  se contradigan. Una sola fuente de verdad.
- Limitación que se sigue: un piloto que cambia de equipo a mitad de temporada acredita
  todos sus puntos a una sola escudería (Lawson 2026, Racing Bulls y Red Bull). Encontrada
  con datos reales de Jolpica, registrada en BOX-9.

**Demonstrated understanding**
- Identificó por su cuenta que la escudería sale del `DriverSeason` de la temporada de la
  carrera. El mecanismo lo tenía correcto, sin ayuda.

**Needs reinforcement**
- La causalidad estaba invertida: propuso que el caso Lawson es *la razón* por la que se usa
  `DriverSeason`, cuando es precisamente el caso que `DriverSeason` **no puede** representar.
  No tenía presente que un `@@unique` compuesto impone una sola fila por esa combinación.
- Pendiente: poder decir las dos mitades de la respuesta sin leer el archivo — por qué no
  está el campo, y cuál es la limitación conocida con su arreglo nombrado.

## Autorización scoped al recurso

**Introduced** (2026-10-05/06, explicado por Claude)
- **Enumeración** como clase de ataque: el atacante no entra a nada, recorre IDs midiendo
  la *diferencia* entre respuestas para aprender qué existe. Los IDs del proyecto son
  `autoincrement()`, o sea secuenciales y adivinables.
- Semántica de los tres códigos: **401** `Unauthorized` = "no sé quién sos" (el nombre está
  mal elegido, debería ser Unauthenticated); **403** `Forbidden` = "sé quién sos y no";
  **404** = "eso no existe". La clave: **403 confirma que la cosa existe**, 404 no confirma nada.
- **Dos tipos de autorización en el proyecto**, que es la distinción que le faltaba:
  por rol ("¿qué sos?", `requireAdmin`, se lee del JWT sin ir a la base, global) versus
  por recurso ("¿esto es tuyo?", `requireLeagueMember`, propiedad de la *relación* entre
  usuario y cosa concreta, necesita consulta).
- La consulta usa las **dos** FKs a la vez (`leagueId_userId`), no sólo la del usuario. Con
  las dos juntas, la pregunta "¿esto es tuyo?" *es* la consulta: no hay paso posterior de
  comparación donde equivocarse, ni información aprendida en el camino.
- La asimetría 404/403 se justifica por **lo que el que llama ya sabe en ese punto de la
  cadena**: a `requireLeagueOwner` sólo se llega habiendo pasado `requireLeagueMember`, o
  sea sabiendo ya que la liga existe. Ahí el 403 no enseña nada nuevo.

**Demonstrated understanding**
- Identificó **tabla asociativa** como el lugar correcto a consultar, con ese vocabulario.
  No confundió la tabla de ligas con la de membresías.
- Concluyó correctamente que 404 filtra menos información que 403.
- En la pregunta sobre el miembro `KICKED` llegó a la idea correcta: lo que se evita es que
  se pueda averiguar el estado de pertenencia.

**Needs reinforcement**
- Confundió **ser admin del sistema** con **ser dueño de una liga**, dos veces en la misma
  conversación. `requireLeagueOwner` mira `leagueMember.isOwner`, no el rol. Un admin no es
  dueño de las ligas ajenas — por eso la demo necesita los usuarios `demo1` y `demo2`.
  Es la confusión más probable de que lo traicione en el oral.
- Al explicar qué filtra un 403 describió **lo que el servidor computa por dentro** en vez
  de **lo que el atacante aprende**. La pregunta de seguridad es siempre la segunda.
- **Pendiente**: el ejercicio de articulación. Decir de corrido, en un párrafo hablado, qué
  ve alguien sin sesión que escribe `/leagues/1` a mano. Tres piezas: qué mira el sistema,
  qué le contesta, y por qué ésa y no la otra.

## Regla de frecuencia en diseño de movimiento

**Introduced** (2026-10-07, explicado por Claude)
- Contraintuitivo: **cuanto más seguido se ve una interacción, menos tiene que animarse.**
  100+ veces por día = nunca animar; raro o primera vez = ahí vive el presupuesto de
  movimiento. El motivo es que una animación agrega tiempo: la primera vez se lee como
  cuidado, la número cincuenta como lentitud.
- Segundo filtro: los datos que alguien está leyendo no se mueven por estética.
- `@starting-style` como la regla CSS que permite animar una entrada sin keyframes ni JS,
  definiendo el estado del que parte un elemento recién insertado en el DOM.

**Demonstrated understanding**
- Probó las cuatro animaciones en el navegador y **detectó por su cuenta que una no se
  percibía** (el panel de turno del draft), sin que se le señalara. Evaluó movimiento contra
  intención, que es el ejercicio real.
- Aceptó el diagnóstico de que la calibración estaba mal por aplicarle el tratamiento de un
  elemento frecuente a uno raro, y confirmó el ajuste en vivo.

**Needs reinforcement**
- Eligió las cuatro sin dar razonamiento propio sobre cuál y por qué. La decisión fue
  legítima, pero el criterio quedó sin ejercitar.

## Pending decision

Ninguna decisión de diseño pendiente de aprobación.

Dos cosas abiertas, las dos esperando al learner:
1. El ejercicio de articulación sobre autorización (ver arriba).
2. Prioridad de los próximos días: correr la auditoría de diseño (`impeccable`, que nunca
   se usó y es la única pata de "buenas prácticas de UX/UI" sin medir) o atacar el video,
   que es requisito de Aprobación y no existe. El video depende de coordinar con Rivero.

## Área táctil y el patrón "stretched link"

**Introduced** (2026-10-07, explicado por Claude, aplicado en `DriverCard.tsx`)
- Una **acción principal que es un link de texto** es el peor caso de touch: medido en el
  navegador, "Ver piloto" tenía 20px de alto contra los ~44px que piden las guías de touch
  de Apple y Google. El dedo tiene que apuntar.
- **El arreglo que resuelve dos problemas con un cambio**: hacer clickeable toda la tarjeta
  mata la línea que ocupaba el botón (densidad) y multiplica el área táctil por 4 (80px).
  Cuando un cambio arregla dos síntomas distintos, normalmente es porque los dos salían de
  la misma causa — acá, que el área clickeable y el área visual no coincidían.
- **Patrón "stretched link"**: un `<button>` vacío en `absolute inset-0` dentro de un
  contenedor `relative`. No se envuelve todo en el `<button>` porque el *content model* de
  `<button>` es contenido de frase, y `Card` renderiza un `<section>` (contenido de
  seccionamiento) — anidarlo sería HTML inválido.
- Efecto lateral gratis: el `outline` global de `:focus-visible` se dibuja en el borde del
  `inset-0`, o sea en el borde de la tarjeta. Navegando con Tab se ve la tarjeta entera
  seleccionada, sin escribir una regla nueva.
- El `aria-label` sigue siendo necesario y por el mismo motivo de antes: el nombre accesible
  tiene que distinguir esa tarjeta de las otras 21.

**Needs reinforcement**
- Medir antes de arreglar. El número de 20px no se estimó: salió de
  `getBoundingClientRect()` en el navegador, y es lo que convierte "se ve apretado" en un
  defecto con un umbral concreto. Pendiente que el learner pida la medición por su cuenta.

## Medir el peor caso, no el primero

**Introduced** (2026-10-07, error de Claude corregido por la captura)
- Al bajar el avatar del campeonato de 32 a 24px, la medicion dijo "fila: 41px, listo".
  Estaba tomada de `rows[0]` — Albon / Williams, el nombre mas corto y la escuderia mas
  corta. La **captura de pantalla** mostro que 7 de las 22 filas envolvian en dos lineas.
- La leccion: **en una lista, la fila representativa no es la primera, es la mas larga.**
  La medicion correcta es `Math.max` sobre todas las filas, o directamente contar cuantas
  superan el alto esperado. Medir una muestra de tamano 1 y llamarlo verificado es el mismo
  defecto que un smoke test cuyo fixture no puede fallar (ver `CLAUDE.md`, seccion de smokes).
- La causa real no era el avatar: era que `lg:grid-cols-2` le daba a la tabla de pilotos
  (5 columnas, 22 filas) exactamente el mismo ancho que a la de escuderias (3 columnas, 11
  filas). Con `lg:grid-cols-3` + `lg:col-span-2` la de pilotos se lleva 2/3 y nada envuelve.
- Generalizable: **cuando dos cosas de peso distinto comparten un grid partido en partes
  iguales, el ancho se decidio por la sintaxis, no por el contenido.**

**Needs reinforcement**
- Pendiente que el learner pida la captura, no solo el numero. El numero dijo "41px" y era
  cierto; la pantalla dijo que el problema seguia ahi.

## El tamaño más chico es el que fija el formato del asset

**Introduced** (2026-10-07, error de Claude corregido por el learner)
- Para darle identidad de F1 a la tabla del campeonato se metieron los logos de escudería
  que ya estaban en el repo. A 24px eran una mancha: casi todos son **wordmarks**, logos
  apaisados con el nombre del equipo adentro. La primera reacción (equivocada) fue tratarlo
  como un problema de layout y agrandar la caja a 64px de ancho. El learner lo corrigió: el
  problema no era el tamaño de la caja, **era el archivo**. Lo que hacía falta era la
  **marca** sola — el speedmark de McLaren, la estrella de Mercedes, la "A" de Alpine.
- La regla: **el tamaño más chico en que se va a usar un asset es el que decide qué asset
  conseguir**, no al revés. Un logo con texto adentro tiene un tamaño mínimo por debajo del
  cual deja de ser información y pasa a ser ruido.
- Cómo se consiguieron: la **API de Wikimedia Commons** (`action=query&generator=search`)
  devuelve ancho, alto y licencia de cada archivo. Filtrando por relación de aspecto cercana
  a 1 aparecen las marcas y desaparecen los wordmarks, sin abrir el navegador.
- Resultado honesto: **6 de 11**. De Ferrari, Red Bull, Aston Martin, Audi y Racing Bulls no
  hay versión cuadrada con licencia libre. Se documentó en `CREDITS.md` *por qué* falta cada
  una, en vez de dejarlo como un hueco sin explicar.
- "Dominio público" en Commons significa que el logo no alcanza el **umbral de originalidad**
  para tener copyright propio. **No** significa libre de marca registrada: el uso acá es
  nominativo, identificar equipos reales en un TP sin fines comerciales.

**Demonstrated understanding**
- El learner vio el problema en la captura antes que Claude y supo nombrar la solución
  correcta mandando tres ejemplos de la marca aislada, no una descripción.
