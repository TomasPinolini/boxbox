# Learning Progress

Procedencia de cada afirmacion (taxonomia de rea/AGENTS.md): `[observado]` lo leimos o medimos · `[derivado]` se sigue de algo observado · `[inferido]` lo afirmo Claude y no se verifico · `[desconocido]` abierto.
Para el oral, lo defendible es observado y derivado. `grep -n '\[inferido\]' progress.md` lista lo que no.

## Derivación de la escudería en un RaceResult

**Introduced** (2026-10-05, explicado por Claude)
- [observado] `RaceResult` no tiene `constructorId`. La relación piloto→escudería es propiedad de
  `DriverSeason`, y `ConstructorResult` se deriva de ahí al cargar resultados
  (`buildConstructorResults` en `backend/src/modules/races/races.service.ts`).
- [observado] `DriverSeason` tiene `@@unique([driverId, seasonId])` — una sola escudería por piloto
  por temporada. Eso es lo que restringe el modelo.
- [inferido] Razón defendible de por qué no está: evita duplicar un dato derivable y que dos fuentes
  se contradigan. Una sola fuente de verdad.
- [observado] Limitación que se sigue: un piloto que cambia de equipo a mitad de temporada acredita
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
- [observado] **Enumeración** como clase de ataque: el atacante no entra a nada, recorre IDs midiendo
  la *diferencia* entre respuestas para aprender qué existe. Los IDs del proyecto son
  `autoincrement()`, o sea secuenciales y adivinables.
- [observado] Semántica de los tres códigos, leída en **RFC 9110** §15.5.2 / §15.5.4 / §15.5.5
  (2026-10-11): **401** `Unauthorized` = *"lacks valid authentication credentials"*, o sea "no
  sé quién sos" — el nombre está mal elegido, debería ser Unauthenticated; **403** `Forbidden`
  = el servidor *"understood the request but refuses to fulfill it"* con credenciales que
  considera insuficientes, o sea "sé quién sos y no"; **404** = no encontró representación
  *"or is not willing to disclose that one exists"*.
- [observado] La asimetría que usa el proyecto está **en el estándar, textualmente**. El 403 confirma
  que el recurso existe y el 404 no confirma nada, y por eso §15.5.4 cierra con: *"An origin
  server that wishes to 'hide' the current existence of a forbidden target resource MAY
  instead respond with a status code of 404 (Not Found)."* Si en el oral piden la
  justificación, ésa es la cita — no es una decisión casera.
- [observado] Matiz que faltaba y conviene saber antes de que lo pregunten: §15.5.2 dice que un 401
  **MUST** mandar el header `WWW-Authenticate`. `grep -rn 'WWW-Authenticate' backend/src` no
  devuelve nada: la API no lo manda. Es la práctica universal en APIs con Bearer token y SPA,
  pero es una desviación real de un MUST del estándar.
- [observado] La misma disciplina de no filtrar información ya está en el login, y está testeada:
  `backend/src/modules/auth/auth.test.ts:125,134` exige que email inexistente y password
  incorrecto devuelvan **el mismo** `401 INVALID_CREDENTIALS`. Si contestaran distinto, el
  endpoint de login sería un oráculo de qué mails están registrados.
- [observado] **Dos tipos de autorización en el proyecto**, que es la distinción que le faltaba:
  por rol ("¿qué sos?", `requireAdmin`, se lee del JWT sin ir a la base, global) versus
  por recurso ("¿esto es tuyo?", `requireLeagueMember`, propiedad de la *relación* entre
  usuario y cosa concreta, necesita consulta).
- [observado] La consulta usa las **dos** FKs a la vez (`leagueId_userId`), no sólo la del usuario. Con
  las dos juntas, la pregunta "¿esto es tuyo?" *es* la consulta: no hay paso posterior de
  comparación donde equivocarse, ni información aprendida en el camino.
- [derivado] La asimetría 404/403 se justifica por **lo que el que llama ya sabe en ese punto de la
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
- [inferido] Contraintuitivo: **cuanto más seguido se ve una interacción, menos tiene que animarse.**
  100+ veces por día = nunca animar; raro o primera vez = ahí vive el presupuesto de
  movimiento. El motivo es que una animación agrega tiempo: la primera vez se lee como
  cuidado, la número cincuenta como lentitud.
- [inferido] Segundo filtro: los datos que alguien está leyendo no se mueven por estética.
- [observado] `@starting-style` como la regla CSS que permite animar una entrada sin keyframes ni JS,
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
- [observado] Una **acción principal que es un link de texto** es el peor caso de touch: medido en el
  navegador, "Ver piloto" tenía 20px de alto contra los ~44px que piden las guías de touch
  de Apple y Google. El dedo tiene que apuntar.
- [observado] **El arreglo que resuelve dos problemas con un cambio**: hacer clickeable toda la tarjeta
  mata la línea que ocupaba el botón (densidad) y multiplica el área táctil por 4 (80px).
  Cuando un cambio arregla dos síntomas distintos, normalmente es porque los dos salían de
  la misma causa — acá, que el área clickeable y el área visual no coincidían.
- [observado] **Patrón "stretched link"**: un `<button>` vacío en `absolute inset-0` dentro de un
  contenedor `relative`. No se envuelve todo en el `<button>` porque el *content model* de
  `<button>` es contenido de frase, y `Card` renderiza un `<section>` (contenido de
  seccionamiento) — anidarlo sería HTML inválido.
- [observado] Efecto lateral gratis: el `outline` global de `:focus-visible` se dibuja en el borde del
  `inset-0`, o sea en el borde de la tarjeta. Navegando con Tab se ve la tarjeta entera
  seleccionada, sin escribir una regla nueva.
- [derivado] El `aria-label` sigue siendo necesario y por el mismo motivo de antes: el nombre accesible
  tiene que distinguir esa tarjeta de las otras 21.

**Needs reinforcement**
- Medir antes de arreglar. El número de 20px no se estimó: salió de
  `getBoundingClientRect()` en el navegador, y es lo que convierte "se ve apretado" en un
  defecto con un umbral concreto. Pendiente que el learner pida la medición por su cuenta.

## Medir el peor caso, no el primero

**Introduced** (2026-10-07, error de Claude corregido por la captura)
- [observado] Al bajar el avatar del campeonato de 32 a 24px, la medicion dijo "fila: 41px, listo".
  Estaba tomada de `rows[0]` — Albon / Williams, el nombre mas corto y la escuderia mas
  corta. La **captura de pantalla** mostro que 7 de las 22 filas envolvian en dos lineas.
- [derivado] La leccion: **en una lista, la fila representativa no es la primera, es la mas larga.**
  La medicion correcta es `Math.max` sobre todas las filas, o directamente contar cuantas
  superan el alto esperado. Medir una muestra de tamano 1 y llamarlo verificado es el mismo
  defecto que un smoke test cuyo fixture no puede fallar (ver `CLAUDE.md`, seccion de smokes).
- [observado] La causa real no era el avatar: era que `lg:grid-cols-2` le daba a la tabla de pilotos
  (5 columnas, 22 filas) exactamente el mismo ancho que a la de escuderias (3 columnas, 11
  filas). Con `lg:grid-cols-3` + `lg:col-span-2` la de pilotos se lleva 2/3 y nada envuelve.
- [inferido] Generalizable: **cuando dos cosas de peso distinto comparten un grid partido en partes
  iguales, el ancho se decidio por la sintaxis, no por el contenido.**

**Needs reinforcement**
- Pendiente que el learner pida la captura, no solo el numero. El numero dijo "41px" y era
  cierto; la pantalla dijo que el problema seguia ahi.

## El tamaño más chico es el que fija el formato del asset

**Introduced** (2026-10-07, error de Claude corregido por el learner)
- [observado] Para darle identidad de F1 a la tabla del campeonato se metieron los logos de escudería
  que ya estaban en el repo. A 24px eran una mancha: casi todos son **wordmarks**, logos
  apaisados con el nombre del equipo adentro. La primera reacción (equivocada) fue tratarlo
  como un problema de layout y agrandar la caja a 64px de ancho. El learner lo corrigió: el
  problema no era el tamaño de la caja, **era el archivo**. Lo que hacía falta era la
  **marca** sola — el speedmark de McLaren, la estrella de Mercedes, la "A" de Alpine.
- [derivado] La regla: **el tamaño más chico en que se va a usar un asset es el que decide qué asset
  conseguir**, no al revés. Un logo con texto adentro tiene un tamaño mínimo por debajo del
  cual deja de ser información y pasa a ser ruido.
- [observado] Cómo se consiguieron: la **API de Wikimedia Commons** (`action=query&generator=search`)
  devuelve ancho, alto y licencia de cada archivo. Filtrando por relación de aspecto cercana
  a 1 aparecen las marcas y desaparecen los wordmarks, sin abrir el navegador.
- [observado] Resultado honesto: **6 de 11**. El "no hay versión cuadrada con licencia libre" **no**
  es una búsqueda en un solo lugar declarada completa: está justificado caso por caso en
  `frontend/public/logos/temporales/README.md`, con cinco causas distintas. Ferrari y Red Bull
  son dibujos **figurativos** — superan el umbral de originalidad, tienen copyright propio y
  Commons no puede alojarlos. Aston Martin (2.4:1) y Audi (2.8:1) son **apaisados por diseño**
  y no sobreviven a 24 px. Racing Bulls es un equipo **demasiado nuevo**.
- [observado] "Dominio público" en Commons significa que el logo no alcanza el **umbral de originalidad**
  para tener copyright propio. **No** significa libre de marca registrada: el uso acá es
  nominativo, identificar equipos reales en un TP sin fines comerciales. La fuente está en el
  repo, no en la memoria del modelo: `frontend/public/logos/CREDITS.md` (sección "Aclaración
  importante"), contrastada con el texto de Wikimedia Commons en `research_notes/Marca BoxBox
  legalidad y mercado/riesgo_f1_fia.md:567` y con el caso límite del propio logo de F1, que
  está en Commons como PD-textlogo y aun así F1 prohíbe usar
  (`reports/Marca BoxBox legalidad y mercado.md:147`).

**Demonstrated understanding**
- El learner vio el problema en la captura antes que Claude y supo nombrar la solución
  correcta mandando tres ejemplos de la marca aislada, no una descripción.

## Un landmark describe el contenido, no el envoltorio

**Introduced** (2026-10-07, hallazgo al agregar el skip link)
- [observado] Para que el skip link tuviera destino hacia falta un `<main id="contenido">`. Al buscar
  dónde ponerlo apareció que `app/App.tsx` **ya tenía un `<main>` envolviendo TODO**,
  incluida la barra de navegación. Eso es incorrecto: `<main>` es el contenido principal de
  la página, y la navegación del sitio por definición no lo es.
- [observado] El error es fácil de cometer porque **el elemento estaba haciendo dos trabajos**: dar el
  fondo y la altura mínima (un trabajo de presentación) y declarar el landmark (un trabajo
  semántico). Se arregló separándolos: `<div>` para el fondo en `App.tsx`, `<main>` real en
  `PageShell`, que es lo que cada pantalla renderiza.
- [derivado] Regla: **un landmark se elige por lo que contiene, no por dónde queda cómodo ponerlo.**
  Si un elemento existe por una razón visual, es un `div`.
- [inferido] `tabIndex={-1}` en el destino del skip link: deja que reciba foco *programáticamente* sin
  entrar en el orden de tabulación. Sin él, varios navegadores mueven el scroll pero dejan el
  foco donde estaba, y el siguiente Tab vuelve a la barra — el salto no sirve de nada.
- [observado] El skip link usa `sr-only focus:not-sr-only`: invisible hasta que recibe foco. No es un
  truco, es el patrón estándar — aparece sólo para quien lo necesita.

**Needs reinforcement**
- Yo había marcado el skip link como "fuera de alcance" en el plan, y después agregué la
  barra de navegación, que es justo lo que lo vuelve necesario. **Cambiar las condiciones que
  justificaban una postergación obliga a revisarla**, y no lo hice hasta que el learner
  preguntó qué faltaba.

## Conceptos del frente de predicciones (2026-10-11 al 14)

**Introduced** (explicado por Claude, durante la ronda de grilling de predicciones)
- [observado] **`PUT` reemplaza, `PATCH` parchea.** `PUT` significa "acá está el recurso completo,
  dejalo así": lo que no viene en el body queda en null. Se eligió `PUT` porque con merge no hay
  forma de *borrar* una predicción sin que `null` signifique dos cosas (en JSON, `undefined` contra
  `null`; en Zod, `.optional()` contra `.nullable()`).
- [observado] **Un trigger de Postgres no tiene reloj.** Se dispara porque alguien escribió una
  fila. "Avisale una hora antes de la quali" no es un trigger: en ese momento nadie escribe nada,
  lo único que cambió es la hora. Eso necesita un job agendado, y el job trae un problema que el
  trigger no tiene: idempotencia — corre muchas veces y tiene que acordarse a quién ya le avisó.
- [observado] **Un timer en memoria no sobrevive un reinicio.** `draft.gateway.ts:73` guarda los
  timers del draft en un `Map` de módulo. Con 60 s es riesgo chico; con tres días de antelación es
  certeza, porque Render suspende el servicio por inactividad. De ahí la regla del Slice 18: el
  "cuándo" se escribe en una fila, no en un `setTimeout`.
- [observado] **SemVer y los tags de git.** Tres números, `MAJOR.MINOR.PATCH`; sube el último si
  arreglaste, el del medio si agregaste sin romper, el primero si rompés a quien lo usaba. Un tag
  de git es un nombre pegado a un commit: no cambia archivos y se borra con `git tag -d`. En BoxBox
  no hay consumidores externos, así que el valor real no es la promesa a terceros sino poder decir
  "la entrega fue la v1.0.0" y volver ahí.

**Demonstrated understanding**
- Detectó por su cuenta que el puntaje de predicción no podía ser una decisión cerrada y pidió que
  se tratara como el hueco real del frente, no el modelo de datos.
- Frenó a Claude cuando se fue del hilo a versionado ("estamos tratando este tema en una sesión
  aparte, te fuiste del hilo"). El control del alcance de la conversación lo ejerció él.
- Cuestionó por su cuenta que los tickets fueran a un milestone que ya tenía 12 cosas sueltas
  adentro, y razonó que predicciones no tiene nada que ver con regularización ni con AD. La
  conclusión era correcta; lo que le faltaba era que `Post-cursada` es justamente el tacho de "nada
  que ver con la rúbrica", no un milestone de rúbrica.

**Needs reinforcement**
- Confundió **qué automatización** decide qué: eligió persistir el estado de "ventana cerrada"
  argumentando que quería la carga de resultados automática, que es otra decisión y vive en otro
  slice. La distinción a practicar: qué dispara cada cosa (una escritura, el reloj, una ausencia).
- Pidió empezar SemVer sin tener presente que ya existía un ADR aceptado (0011) y un ticket abierto
  (BOX-66) de otra sesión con ese mismo trabajo.
- Declaró "soy muy rookie" sobre versionado después de haber pedido adoptarlo como forma de
  trabajo. Vale chequear el nivel antes de aceptar una convención, no después.

## Ayuda in-app: el popover y el tour (2026-10-15)

**Introduced** (explicado por Claude, durante la implementación de HelpPopover + WelcomeTour)
- [observado] **Un componente que ya existe vale más que uno nuevo.** `AboutBoxBox` ya tenía
  resuelto todo lo difícil de un cartel de ayuda (sheet en mobile / panel anclado en desktop,
  Escape, click afuera por `mousedown` y no por `click`, foco que entra y vuelve). Generalizarlo
  lo bajó de 109 a 19 líneas y evitó una segunda copia de esa lógica, que es donde habría
  derivado.
- [observado] **El orden de los renders decide qué se puede mostrar.** El tour iba a vivir encima
  de `/register`, y no se puede: `authService.register()` deja el token en el store y `GuestOnly`
  hace `<Navigate>` en el mismo render, así que la pantalla se desmonta antes de pintar nada. La
  recomendación de Claude fue la equivocada y la corrigió el e2e.
- [observado] **Los unit tests no pueden ver esto.** Montan el componente suelto, sin router:
  `GuestOnly` no existe para ellos. 155 tests pasaban con el tour roto. El e2e es el único que
  ejercita la composición de rutas.
- [observado] **HTML inválido que no da error.** Un `<div>` dentro de un `<p>` hace que el parser
  cierre el `<p>` solo; dentro de un `<h1>` es inválido igual. Obligó a cambiar la línea de la
  ronda en `DraftPage` por una fila flex y a agregarle `titleHelp` a `PageShell`.
- [observado] **`getByLabel` de Playwright matchea por subcadena y sin distinguir mayúsculas.**
  El `aria-label` del "?" contenía "código de invitación" y el locator resolvía al input Y al
  botón. Se arregla con `{ exact: true }`, que es lo que el test siempre quiso decir.
- [observado] **Un test que pasa no prueba que sirva.** La primera aserción de `PageShell` pasaba
  también con la versión mala; se reescribió para mirar la estructura y se comprobó que falla
  escribiendo la versión rota a propósito. Es la misma regla que las notas de smoke tests ya
  traen: el fixture tiene que poder fallar.
- [observado] **Medir antes de afirmar.** Claude sostuvo que meter el "?" dentro del `<h1>`
  cambiaba el nombre accesible del encabezado. Medido con `dom-accessibility-api`, era falso: da
  "Mis ligas" en los dos casos. El cambio se quedó, pero por la razón real (HTML inválido).

**Demonstrated understanding**
- Decidió el alcance por su cuenta y bien: aceptó la capa permanente de "?" y además propuso el
  tour post-registro, que es justo lo que tapa el agujero de que el "?" sólo sirve si lo tocás.
- Pidió que los "?" fueran menos llamativos. Era la lectura correcta: con el tour cubriendo el
  descubrimiento, la ayuda permanente puede ser discreta.

**Needs reinforcement**
- Sobre el criterio de dónde poner ayuda, su posición fue que es personal y que coincidía con la
  de Claude. Es una posición legítima y se tomó como tal, pero el criterio quedó sin enunciar por
  segunda vez (la primera, 2026-10-07). Lo que falta ejercitar no es la elección sino poder
  decir la regla en voz alta — que es la forma en que lo va a preguntar un profesor.
