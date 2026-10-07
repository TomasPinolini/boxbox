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
