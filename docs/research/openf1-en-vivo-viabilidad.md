# Leaderboard de liga en vivo con OpenF1: viabilidad, costo y qué entra gratis

**Relevado el 2026-10-13** contra `openf1.org`, su documentación, su repo (`br-g/openf1`), los
Terms of Use de Jolpica y respuestas reales de producción. Continúa
`docs/research/jolpica-openf1-superficie.md` (inventario de endpoints) y **no lo repite**: acá sólo
está lo que decide si un leaderboard que se mueve durante la carrera es recomendación o escenario
a futuro.

Clases de evidencia, iguales a las del relevamiento anterior:

- **[doc]** — escrito en la documentación oficial o en el código open source del proyecto.
- **[real]** — verificado llamando a la API el 2026-10-13; si contradice a la doc, se dice.
- **[no verificado]** — no se pudo confirmar. Nunca se completa con lo que "suele costar una API".

Cómo reproducir todo lo de acá (público, sin credenciales):

```bash
curl -s "https://openf1.org/" | grep -o '€9[^<]*'                      # precio del tier pago
curl -sL "https://raw.githubusercontent.com/br-g/openf1/main/documentation/pages/auth.html"
curl -sL "https://raw.githubusercontent.com/br-g/openf1/main/src/openf1/services/query_api/app.py"
curl -sL "https://raw.githubusercontent.com/jolpica/jolpica-f1/main/TERMS.md"
curl -s "https://api.openf1.org/v1/sessions?year=2026&session_type=Race"
curl -s "https://api.openf1.org/v1/position?session_key=11388"          # 396 filas, 48 KB
curl -s "https://api.openf1.org/v1/session_result?session_key=latest"
curl -s -X POST "https://api.openf1.org/token" -d "username=x&password=y"   # 401
```

---

## 0. La respuesta corta

| Pregunta | Respuesta |
|---|---|
| ¿Existe un tier pago? | Sí: **Sponsor, €9,90/mes** **[real]** |
| ¿Qué habilita? | Datos en vivo por REST + MQTT + WebSocket, 6 req/s y 60 req/min, hasta 10 conexiones MQTT/WS concurrentes **[doc]** |
| ¿Hay un leaderboard en vivo gratis? | **No.** El gate de los datos en vivo es la autenticación, y la autenticación se compra **[doc]** |
| ¿Qué sí es gratis? | Todo el histórico desde 2023, incluida la clasificación final con puntos (`session_result`), disponible una vez que cierra la ventana en vivo — entre ~20 y ~60 min después de la bandera a cuadros **[real, medido sobre 8 carreras]** |
| ¿Nos frena el rate limit free? | **No.** Un polling de posiciones cada 5 s son 12 req/min, el 40% del tope de 30/min. El tope no es el problema; el problema es que esas llamadas no devuelven nada nuevo sin pagar |
| ¿"Puntos en vivo" es un dato de la API? | **No.** OpenF1 no publica puntos durante la carrera. Los tendríamos que proyectar nosotros desde posiciones — lógica nueva, nuestra |
| ¿Podemos usar esto en una app pública? | Sí si sigue siendo **no comercial** y acredita la fuente: las dos APIs son CC BY-NC-SA 4.0 **[doc]** |

---

## 1. Qué cuesta exactamente

### 1.1 Los dos tiers

Textual de `openf1.org` **[real, extraído del HTML el 2026-10-13]**:

| | **Community** | **Sponsor** |
|---|---|---|
| Precio | gratis | **€9.90 / month** |
| Etiqueta | "Historical data \| Personal use" | "Historical + Live data \| Personal use" |
| Endpoints | "All 18 endpoints" | "Everything from the free tier" |
| Histórico | "All historical sessions since 2023" | ídem |
| En vivo | — | "Live data during sessions with REST, MQTT, and WebSocket" |
| Rate limit | "Up to 3 requests per second and 30 requests per minute" | "Up to 6 requests per second and 60 requests per minute" |
| Streaming | — | "up to 10 concurrent MQTT/WebSocket connections" |
| Auth | "No authentication required" | OAuth2 (ver 1.2) |

Moneda: **euros**. No hay tier intermedio, ni anual, ni por volumen: son esos dos **[real]**. La
página lo encuadra como patrocinio ("OpenF1 is free for everyone. Sponsors help cover our server
costs"), no como un plan comercial — y **las dos filas dicen "Personal use"**, incluida la paga.

### 1.2 Qué habilita técnicamente, con detalle

Todo esto sale de la página oficial de autenticación, que no está linkeada desde `openf1.org/docs/`
**[doc:
`https://raw.githubusercontent.com/br-g/openf1/main/documentation/pages/auth.html`]**:

> "Authentication increases rate limits, provides access to **both historical and real-time data**,
> and enables live data streaming through MQTT or WebSocket."

- **Token OAuth2, password grant.** `POST https://api.openf1.org/token`,
  `Content-Type: application/x-www-form-urlencoded`, body `username=...&password=...`. Devuelve
  `{"expires_in": "3600", "access_token": "...", "token_type": "bearer"}`. **El token vence en 1
  hora** y la app tiene que renovarlo sola **[doc]**.
  Verificado que el endpoint existe: sin credenciales válidas responde
  `HTTP 401 {"detail":"Incorrect username or password"}` **[real]**.
- **REST autenticado**: header `Authorization: Bearer <token>` **[doc]**.
- **MQTT**: `mqtt.openf1.org`, puerto **8883** (TLS) **[doc]**. DNS resuelve a `34.34.151.228` y el
  puerto está abierto **[real]**.
- **WebSocket**: `wss://mqtt.openf1.org:8084/mqtt` — es **MQTT sobre WSS**, no un WebSocket crudo
  con protocolo propio **[doc]**. Puerto abierto **[real]**.
- **Auth del broker**: el access token va **como password**; el username es el email registrado
  **[doc]**.
- **Topics** = las rutas REST: `v1/position`, `v1/laps`, `v1/session_result`, ... Soporta wildcard
  `#` **[doc]**.
- **Formato de mensaje**: el mismo JSON que REST más dos campos: `_id` (entero siempre creciente,
  para ordenar cronológicamente) y `_key` (identidad del documento: dos mensajes del mismo topic
  con el mismo `_key` son versiones del mismo objeto — así se actualiza una vuelta cuyo sector
  todavía no cerró) **[doc]**.
- **Recomendación del propio proyecto**: "Please prioritize MQTT or Websockets for any application
  needing live F1 data. They are significantly more efficient and provide data as soon as it's
  available." Y para el caso nuestro, textual: "it's often more secure for your backend to manage
  the MQTT/Websocket connection and stream data to your clients" **[doc]** — que es exactamente la
  forma que ya tiene BoxBox con el draft.

### 1.3 Qué NO habilita

- **No habilita uso comercial.** El tier pago sigue etiquetado "Personal use", y el FAQ manda a
  escribirles para cualquier otro caso **[real]**. Pagar €9,90 no compra una licencia comercial.
- **No hay SLA.** Ninguna de las dos APIs promete uptime; Jolpica lo dice explícito ("volunteer-run,
  donation-supported... we do not guarantee uptime, availability, or correctness") **[doc]**.
- **No hay tier de más conexiones.** 10 concurrentes es el techo publicado. Para BoxBox sobran 9:
  el backend mantendría **una**.
- **No adelanta `session_result`.** La doc dice que ese endpoint "becomes available a few minutes
  after the official results are published on the official Formula 1 website" **[doc]**: ni pagando
  hay puntos oficiales en el segundo de la bandera a cuadros.

### 1.4 Jolpica: $0, y no tiene "en vivo"

Jolpica no vende nada y no publica datos en vivo: su capa es Ergast, resultados post-carrera. Sus
docs **no mencionan "live", "real-time", "delay" ni latencia de publicación** **[real, grep sobre
`docs/README.md` y `docs/rate_limits.md`]**, así que cuánto tarda en publicar una carrera es
**[no verificado]**. Lo que sí se midió: el GP de Singapur (2026-10-11) ya estaba completo en
`/2026/last/results.json` con sus 22 filas y puntos el 2026-10-13 **[real]**. El único costo que
Jolpica menciona es el propio: "Our hosting costs are around $45 USD per month" **[doc]**.

---

## 2. Qué se puede hacer sin pagar

### 2.1 El gate es la autenticación, no el endpoint

El free tier tiene **los 18 endpoints**, incluidos `position`, `intervals` y `session_result`
**[doc]**. Lo que no tiene es la ventana en vivo. La doc de `openf1.org/docs/` lo dice así:

> "Historical data (from 2023 onwards) is free and accessible without authentication. **Real-time
> data requires a paid subscription.**"

Y "en vivo" tiene una definición operativa: "from 30 minutes before a session starts until 30
minutes after it ends" **[doc]**.

**Verificado que el histórico cubre todo lo que alguna vez fue "en vivo"** **[real]**: el GP de
Singapur 2026 (`session_key=11388`) devuelve hoy, sin autenticación, las 396 filas de `position`
desde 11:07:39Z hasta 13:46:00Z — o sea la carrera completa, incluida cada vuelta que en su momento
estuvo dentro de la ventana paga. El gate es **temporal, no de contenido**: nada queda reservado
para siempre.

### 2.2 ¿A los cuántos minutos de la bandera a cuadros llega gratis la clasificación final?

La ventana se define sobre el fin de la sesión. El dato que publica OpenF1 como fin es
`sessions.date_end`, que es el **horario programado**, no el real: para Singapur
`date_end = 2026-10-11T14:00:00Z` mientras la bandera a cuadros cayó a las **13:45:40Z**
(`race_control`, `flag=CHEQUERED`, y el `SessionStatus: SESSION FINISHED` del mismo segundo)
**[real]**.

Medido sobre las últimas 8 carreras de 2026 **[real]** — `date_end + 30 min` menos la bandera a
cuadros:

| Carrera | Bandera a cuadros (UTC) | `date_end` | Cierre de ventana tras la bandera |
|---|---|---|---|
| Spa-Francorchamps | 14:28:36 | 15:00 | **+61,4 min** |
| Budapest | 14:43:14 | 15:00 | +46,8 min |
| Zandvoort | 15:08:13 | 15:00 | **+21,8 min** (la carrera pasó su horario) |
| Monza | 14:54:46 | 15:00 | +35,2 min |
| Madrid | 14:38:28 | 15:00 | +51,5 min |
| Baku | 12:41:52 | 13:00 | +48,1 min |
| Kuala Lumpur | 10:20:15 | 09:00 | **−50,2 min** (ver abajo) |
| Marina Bay | 13:45:40 | 14:00 | +44,3 min |

**La respuesta honesta: entre ~20 y ~60 minutos después de la bandera a cuadros, ~45 min el caso
típico.** No es un número fijo porque depende de cuánto antes del horario programado termine la
carrera. Dos salvedades:

- Kuala Lumpur (`session_key=11731`, fuera de la secuencia de keys) tiene la bandera **80 min
  después** de su `date_end`: la sesión se corrió fuera de su slot y el `date_end` quedó sin
  corregir. Si el gate se calcula con ese campo, esa carrera habría estado gratis **mientras se
  corría**. Es el indicio más fuerte de que la aritmética sobre `date_end` no es confiable como
  modelo del gate.
- El cálculo asume que el gate usa `date_end + 30 min`. La doc dice "30 minutes after it ends" sin
  aclarar si "ends" es ese campo o el fin real. **[no verificado]** — ver 2.4.

### 2.3 `position` durante la carrera: inaccesible, no retrasado — con una duda abierta

Lo que está confirmado **[doc]**: el free tier es histórico y la autenticación es lo que abre el
tiempo real. No hay un camino gratuito a las posiciones mientras la carrera se corre.

Lo que **no** se pudo cerrar: **si el gate mira la hora del pedido o el timestamp del dato.** Son
dos implementaciones distintas con consecuencias muy distintas para nosotros:

- **Gate por hora del pedido** → durante las 2 h de carrera el free tier no ve nada, ni las
  posiciones de la vuelta 1. El leaderboard sólo se puede mover después.
- **Gate por timestamp del dato** → durante la carrera el free tier vería todo lo de hace más de
  30 minutos. Eso es **un leaderboard gratis con 30 minutos de atraso**, que en una carrera de 100
  minutos sí se mueve en pantalla (tres o cuatro veces, con retraso declarado).

El código open source no lo decide: `src/openf1/services/query_api/app.py` (117 líneas) **no tiene
ninguna lógica de paywall ni de fecha** — es un catch-all FastAPI que consulta Mongo con los
filtros de la query, cachea, y tiene un único `@rate_limiter.limit("30/10seconds")` por IP
(`key_func=get_remote_address`) **[doc, código]**. Ese límite **no es el que corre en producción**
(ver 4.1), así que `api.openf1.org` sirve una versión distinta de la publicada y el gate vive del
lado del deploy, invisible desde el repo.

### 2.4 El test que falta, y cómo correrlo

Es la única pregunta que ninguna cantidad de lectura resuelve: hay que pedirle a la API mientras
una sesión está viva. **Próxima oportunidad: GP de Austin, `session_key=11396`, domingo
2026-10-25 de 20:00 a 22:00 UTC** (17:00–19:00 ART) **[real, de `/v1/sessions?year=2026`]**. La
ventana paga va de 19:30 a 22:30 UTC.

```bash
# Correr a las ~20:45 UTC del 2026-10-25, sin autenticación, en este orden:
curl -s "https://api.openf1.org/v1/sessions?session_key=latest" | head -c 300
#   -> ¿resuelve a 11396 (la carrera viva) o a la última terminada?

curl -s -w "\n[HTTP %{http_code}]\n" "https://api.openf1.org/v1/position?session_key=11396" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'filas'); print('ultimo', max(r['date'] for r in d))"
#   -> 401/403            = gate por autenticación, cero acceso gratis en vivo
#   -> [] / No results    = ídem, pero silencioso
#   -> filas hasta T-30min = GATE POR TIMESTAMP: hay leaderboard gratis con 30 min de atraso
#   -> filas hasta ahora   = el free tier sirve en vivo y la doc está desactualizada

curl -s "https://api.openf1.org/v1/session_result?session_key=11396" | head -c 200
#   -> repetir a las 22:05, 22:20, 22:35 UTC para datar cuándo aparece la clasificación final
```

Tres llamadas, dos minutos de trabajo, y es lo que decide si el escenario gratuito es "la tabla se
actualiza al final" o "la tabla se mueve con 30 minutos de atraso". **Hasta que ese test corra,
todo el escenario de "en vivo gratis con retraso" es [no verificado].**

### 2.5 Un regalo del free tier: `session_key=latest`

`GET /v1/session_result?session_key=latest` **resuelve a la última sesión terminada cuando no hay
ninguna viva** **[real]**: hoy devolvió los 22 resultados de Singapur sin que haya que saber que el
key era 11388. Lo mismo `position?session_key=latest`. Para un job automático eso elimina todo el
trabajo de mapear calendarios: no hace falta resolver keys ni rondas, alcanza con pedir `latest` y
comparar contra la `Race` que tenemos en `COMPLETED`/pendiente.

---

## 3. El mínimo dato que mueve un leaderboard de fantasy

### 3.1 Qué puntúa BoxBox hoy

`backend/src/modules/standings/standings.service.ts` suma, por `FantasyTeam`: los `points` de sus
dos `RaceResult` (driver1, driver2) más el `totalPoints` del `ConstructorResult` de su constructor
(`scoreTeam` + `indexPoints`, funciones puras sobre filas ya leídas). Esas filas las crea **sólo**
`loadResults` en `races.service.ts`, desde el payload que carga un admin. O sea: hoy el leaderboard
no se mueve si nadie aprieta un botón.

### 3.2 El endpoint es `position`, y alcanza

`GET /v1/position?session_key=<race>`. Medido sobre Singapur 2026 **[real]**:

| Métrica | Valor |
|---|---|
| Filas de toda la carrera | **396** (372 entre bandera verde y cuadros) |
| Tamaño de la respuesta completa | **48 KB** |
| Pilotos | 22 |
| Minutos con al menos un cambio | **47 de 103** |
| Pico en un solo minuto | **61 filas** (la vuelta 1) |
| Promedio | ~3,9 filas/min |
| Campos | `date`, `driver_number`, `position`, `session_key`, `meeting_key` |

Es **basado en eventos, no un snapshot**: una fila por cada cambio de posición de cada piloto. Para
tener el orden actual hay que reducir el histórico a la última fila por piloto, o pollear
incremental y mantener el estado. El filtro temporal funciona y es barato: `position?session_key=11388&date>2026-10-11T13:40:00`
devolvió **4 filas / 463 bytes** **[real]**.

**¿Alcanza `position` o hace falta `intervals`? Alcanza `position`.** Dos verificaciones:

1. **Reducido a última-fila-por-piloto, `position` coincide con `session_result` en los 19 pilotos
   clasificados** (orden exacto 1..19) **[real]**. Los 3 abandonos quedan en P20/21/22 en `position`
   mientras `session_result` les pone `position: null` y `dnf: true`.
2. **El stream se corrige solo cuando alguien abandona.** El auto #5 pasó de P18 (12:15:40) a P22
   (12:15:53) en **13 segundos** **[real]**, sin que haga falta leer `race_control`. Y como de P11
   para atrás la tabla de puntos paga 0, un abandono le cuesta a su equipo de fantasy exactamente
   lo que tiene que costarle, automáticamente.

`intervals` **no se necesita para puntuar**: son gaps, 28.131 filas para la misma carrera (~70×
más pesado que `position`), y la doc dice que se actualiza "approximately every 4 seconds"
**[doc]**. Sirve sólo si la pantalla quiere mostrar "+7,3 s".

### 3.3 Los puntos en vivo los proyectamos NOSOTROS — no son un dato de la API

Esto es explícito porque es el costo escondido del escenario pago:

- **OpenF1 no publica puntos durante la carrera.** El único lugar donde aparecen `points` es
  `session_result`, y ese endpoint sale "a few minutes after the official results are published on
  the official Formula 1 website" **[doc]** — después de la bandera, no durante.
- `championship_drivers` tiene `points_current`, pero es el campeonato antes/después de una
  carrera, no puntos intra-carrera; su comportamiento en vivo es **[no verificado]**.
- Por lo tanto **"puntos en vivo" = nuestra tabla `[25,18,15,12,10,8,6,4,2,1]` aplicada al orden
  en vivo de `position`.** Lógica nueva, nuestra, y responsabilidad nuestra cuando no coincida con
  el resultado oficial.

Dónde cae ese código hoy, verificado leyéndolo:

| Pieza | Dónde está | Qué le falta |
|---|---|---|
| Tabla de puntos + `pointsFor(position, status)` | `frontend/src/features/admin/results-payload.ts` (`const POINTS = [25,18,15,12,10,8,6,4,2,1]`) | **Vive sólo en el frontend.** Una proyección en el backend necesita esa tabla ahí — moverla a `shared/`, no copiarla |
| `driver_number` → nuestro piloto | `Driver.number Int` existe en `backend/prisma/schema.prisma:87` | Nada: el join es directo, sin tabla nueva |
| Puntos por constructor | `buildConstructorResults(raceId, results, constructorOf)` en `races.service.ts` — función pura | **No está exportada.** Habría que exportarla para reusarla sin tocar la DB |
| Puntaje de un equipo | `scoreTeam` en `standings.service.ts` — función pura sobre un `PointsIndex` | Nada: ya acepta un índice en memoria, no necesita filas persistidas |
| Transporte al navegador | `draft.gateway.ts` + `shared/socket.ts` | Un namespace nuevo (`/live`), no un reemplazo. Ver 3.4 |

Y una advertencia de producto, no técnica: una proyección **no es oficial**. Una sanción post
carrera o una descalificación cambia los puntos reales. La pantalla tiene que decir "provisorio" y
la recalculación autoritativa tiene que seguir corriendo desde `session_result`/Jolpica.

### 3.4 Lo que el draft ya resolvió y se reusaría

Leído en `backend/src/modules/draft/draft.gateway.ts` y `backend/src/shared/socket.ts`:

- **Auth en el handshake**: middleware de namespace que verifica el JWT (`verifyAccessToken`) y
  exige `LeagueMember` con `status: 'ACTIVE'`, con el mismo criterio anti-enumeración que
  `requireLeagueMember` por HTTP. Un `/live` copia esa función tal cual.
- **Rooms por liga**: `league:<id>`, y `io.of('/draft').to(roomName(leagueId)).emit(...)`. Un
  leaderboard en vivo emite a los mismos rooms: **una sola suscripción MQTT se fanea a N ligas**.
- **Estado efímero en memoria del proceso**: `activeTimers` es el precedente exacto de un
  `Map<driver_number, position>`, con el mismo trade-off ya aceptado y documentado (no sobrevive un
  restart, y está bien porque se reconstruye con una llamada REST al reconectar).
- **El punto de indirección ya existe**: `shared/socket.ts` (`getIo()`/`setIo()`) se creó para que
  un módulo cualquiera pueda emitir sin import circular, y `getIo()` devuelve `null` en los tests
  que importan `app` directo. Un suscriptor MQTT emitiría por ahí, sin tocar `app.ts`.
- **El service no sabe de transporte** es la regla que ya se respeta: el gateway llama a
  `draft.service.ts` y nunca reimplementa reglas. La proyección de puntos va en un service, no en
  el suscriptor.

El `/draft` también deja una lección aplicable: el countdown lo decrementa el cliente y el server
avisa una sola vez. Mismo criterio acá — el server manda el orden cuando cambia, no un tick por
segundo.

---

## 4. ¿Entra en el rate limit? La cuenta

### 4.1 Los límites, medidos

Publicados: free **3 req/s y 30 req/min**; Sponsor **6 req/s y 60 req/min** **[doc]**.
El código open source dice otra cosa (`30/10seconds` por IP) **[doc, código]**, así que lo que
corre en producción se midió **[real]**:

| Prueba | Resultado |
|---|---|
| 8 pedidos en paralelo | **3 → HTTP 200, 5 → HTTP 429** con header `retry-after: 1`. El tope de 3 req/s es real y se aplica |
| 40 pedidos sostenidos a 29,8 req/min (80 s) | **40 × HTTP 200, cero errores**. Justo abajo del tope de 30/min se sostiene limpio |
| 50 pedidos a ~38 req/min efectivos | **37 × 200, después 9 × 429 seguidos, después recupera**. El tope por minuto existe y muerde entre 30 y 37 pedidos |

No hay headers `X-RateLimit-*`; sí `retry-after` en el 429 **[real]**. El limitador es **por IP**
(`key_func=get_remote_address`) **[doc, código]** — relevante porque BoxBox poleearía desde **una**
IP de servidor, no una por usuario.

### 4.2 Sostener 2 horas de carrera con 30 req/min

Carrera de referencia: Singapur, bandera verde 12:03:39Z → cuadros 13:45:40Z = **102 minutos**; el
slot programado es de **120 minutos**. Usando 120 para estar del lado seguro:

| Cadencia | req/min | Pedidos en 120 min | % del tope free (3.600) | ¿Entra? |
|---|---|---|---|---|
| cada 2 s | 30,0 | 3.600 | **100%** | No: cero margen, y a 38/min medidos ya hubo 429 |
| **cada 5 s** | **12,0** | **1.440** | **40%** | **Sí, con 60% de margen** |
| cada 10 s | 6,0 | 720 | 20% | Sí, de sobra |
| cada 5 s × 2 endpoints | 24,0 | 2.880 | 80% | Entra, pero sin margen para nada más desde la misma IP |

**El número: 12 req/min.** Un polling de posiciones cada 5 segundos durante dos horas usa el 40%
del límite gratuito y deja margen para cualquier otra llamada que el servidor necesite hacer. El
tráfico tampoco es un problema: incremental con `date>` son ~400 KB por carrera; incluso pidiendo
el histórico completo en cada poll serían ~36 MB, y eso es un caso absurdo que no hay que
construir.

### 4.3 Y acá va sin suavizarlo

**El rate limit no es la restricción. El rate limit nunca fue la restricción.** Un polling cada 5
segundos entra cómodo en el tier gratuito — y durante esas dos horas no devuelve nada nuevo, porque
los datos de esa ventana son los que están detrás de la suscripción. Pollear más rápido no cambia
nada: el problema no es cuántas veces podés preguntar, es que la respuesta no incluye la carrera que
se está corriendo.

Y si se paga, **tampoco hay que pollear**: la doc oficial dice "Please prioritize MQTT or Websockets
for any application needing live F1 data" **[doc]**, y con 10 conexiones concurrentes disponibles
BoxBox usaría una sola suscripción a `v1/position` desde el backend. Con MQTT la cuenta de req/min
desaparece: los 60 req/min del tier pago quedan para los pedidos puntuales (`session_result` al
final, reconexiones).

Resumen de la pregunta tal como estaba planteada: **sí, se puede sostener el polling; no, eso no
alcanza para un leaderboard en vivo; el camino en vivo es MQTT y es pago.**

---

## 5. Licencias y términos de uso

### 5.1 Las dos APIs tienen la misma licencia: CC BY-NC-SA 4.0

**OpenF1** **[real]**: el pie de `openf1.org` dice "© OpenF1. Licensed under CC BY-NC-SA 4.0", y el
`LICENSE` del repo es literalmente el texto de "Attribution-NonCommercial-ShareAlike 4.0
International". El FAQ acota el uso previsto:

> "OpenF1 is intended for educational purposes, personal learning projects, research, and
> non-commercial fan engagement. For other use cases, please contact us."

**Jolpica** **[doc, `TERMS.md`, actualizado 2025-08-27]**, que el relevamiento anterior no había
abierto:

> "The API is freely available for **non-commercial use**. The data is licensed under Creative
> Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0). For commercial
> usage, please contact us via admin@jolpi.ca. **We reserve the right to change these terms.**"

Es decir: **la distinción comercial/no comercial de Jolpica no es sólo de los dumps — rige la API
entera.** El relevamiento anterior la atribuía a los dumps; la fuente dice que aplica a todo.

### 5.2 Qué significa para una app pública de terceros

| Cláusula | Qué nos pide | Estado de BoxBox |
|---|---|---|
| **NC** (NonCommercial) | Nada de monetizar: ni suscripción, ni publicidad, ni venta de datos | Un TP universitario online y gratis entra cómodo. Si algún día se monetiza, hay que escribirle a **las dos** |
| **BY** (Attribution) | Acreditar la fuente visiblemente | **Falta.** Hoy `CREDITS.md` sólo acredita los logos de los equipos. Es una línea por fuente |
| **SA** (ShareAlike) | Material adaptado que se distribuya va bajo la misma licencia | Servir una tabla derivada por nuestra API es discutiblemente "distribuir material adaptado". No es un bloqueo, es una línea en `CREDITS.md` |
| Marcas de F1 | Ninguno de los dos proyectos está afiliado a la F1; "F1, FORMULA ONE, ... are trade marks of Formula One Licensing B.V." **[doc, los dos]** | No usar logos ni marcas oficiales de F1. Los logos de equipos ya tienen sus licencias anotadas en `CREDITS.md` |
| Sin garantías | "Use is entirely at your own risk" (Jolpica) **[doc]** | Un dato mal cargado es nuestro problema, no de la fuente. Refuerza tener dos fuentes y cruzarlas |
| Fair use / bloqueo | "Abuse or excessive use may result in temporary or permanent blocking... may block without notice" (Jolpica) **[doc]** | Acá pesa el `User-Agent` que **no mandamos** (`shared/jolpica.ts` llama a `fetch` sin headers, ya anotado en el relevamiento anterior): sin él, un bloqueo nos agarra como aplicación entera |
| Términos cambiables | Jolpica se reserva cambiarlos; OpenF1 puede cambiar el precio | Si el proyecto queda online post-cursada, no es "configurar y olvidarse" |

**Veredicto de licencia: sí, una app pública de terceros puede usar estas dos APIs**, con la
condición de que siga siendo no comercial y acredite las fuentes. La deuda concreta y de dos
minutos es la atribución en `CREDITS.md`.

---

## 6. Escenarios y veredicto

### Escenario A — Diferido automático. €0/mes. **Recomendado.**

| | |
|---|---|
| **Qué dato usa** | `GET /v1/session_result?session_key=latest` (gratis, con `points`, `dnf`/`dns`/`dsq`), o Jolpica `/{year}/{round}/results.json` que ya consumimos |
| **Qué cuesta** | €0. Cero infraestructura nueva: un job programado |
| **Qué se construye** | Un job que, a partir de `Race.date + ~2,5 h`, pollea cada 5 min hasta tener 20+ filas con puntos, y después llama al camino que ya existe (`loadResults` → `recalculate`). 5 min de polling son 0,2 req/min: irrelevante contra el tope |
| **Qué siente el usuario** | La tabla de su liga se actualiza sola entre **20 y 60 minutos después de la bandera a cuadros** (~45 min típico). Hoy se actualiza cuando un admin se acuerda |
| **Honestidad** | Esto no es "en vivo": es **automatizar el botón del admin**. El 90% del valor percibido ("la tabla se mueve sin que nadie haga nada") por el 0% del costo y sin tocar el stack de realtime |
| **Regalo de paso** | El mismo endpoint sirve el sprint con sus puntos (8/7/6... verificado en `session_key=11383` **[real]**), que es el hueco #5 del relevamiento anterior: hoy un fin de semana con sprint reparte menos puntos en BoxBox que en la F1 real |

### Escenario B — Posiciones en vivo por MQTT. €9,90/mes.

| | |
|---|---|
| **Qué dato usa** | Topic MQTT `v1/position` (el orden, ~3,9 cambios/min, pico 61 en la vuelta 1) + `v1/session_result` al final para la verdad oficial |
| **Qué cuesta** | **€9,90/mes** de suscripción, **más** la parte que no se compra: mover la tabla de puntos del frontend al backend, exportar `buildConstructorResults`, un suscriptor MQTT con `Map<driver_number, position>` en memoria, renovación del token OAuth2 cada hora, y un namespace `/live` de Socket.io |
| **Qué se reusa** | Casi todo el transporte: auth de handshake por JWT, rooms `league:<id>`, `shared/socket.ts`, `scoreTeam` — el draft ya resolvió los cuatro |
| **Qué siente el usuario** | La tabla se reordena **~3 segundos** después de un sobrepaso en pista. Un abandono le saca los puntos a su dueño en ~13 segundos, sin intervención |
| **Qué hay que decirle** | Que son **puntos proyectados, provisorios**. La pantalla necesita ese cartel, porque una sanción post carrera los cambia |
| **Riesgo real** | No son los €9,90: es que proyectar puntos es lógica de negocio nueva que hay que testear, y la licencia sigue diciendo "Personal use" incluso pagando |

### Escenario C — "En vivo gratis con 30 minutos de atraso". **Hoy: no existe. Puede existir.**

| | |
|---|---|
| **Qué dato usaría** | `position` con filtro `date>` durante la carrera, si el gate mirara el timestamp del dato y no la hora del pedido |
| **Qué cuesta** | €0, y 12 req/min de los 30 disponibles |
| **Qué sentiría el usuario** | La tabla se mueve 3 o 4 veces durante la carrera, con un retraso declarado de media hora. No es nada contra "actualiza al final" |
| **Estado** | **[no verificado], y es la única duda que vale la pena cerrar.** Se cierra con tres `curl` el **domingo 2026-10-25 a las 20:45 UTC** (§2.4). La doc dice que el free tier es histórico, así que la hipótesis probable es que C no exista — pero el costo de comprobarlo es dos minutos |

### Veredicto, en tres líneas

1. **Un leaderboard en vivo es viable y cuesta €9,90/mes, y el costo real no son los €9,90: es que
   los puntos durante la carrera no existen en ninguna API y los tendríamos que proyectar nosotros
   desde posiciones, con la etiqueta de "provisorios" que eso obliga.**
2. **Un leaderboard que se mueve solo —no en vivo, pero sin admin apretando nada— cuesta €0, no
   necesita WebSocket ni MQTT, reusa el `loadResults` que ya está escrito, y llega entre 20 y 60
   minutos después de la bandera a cuadros: eso es lo que va al reporte como recomendación.**
3. **El "en vivo" va como escenario a futuro, no como recomendación — y la única cosa que podría
   moverlo de casillero son tres `curl` sin autenticación durante el GP de Austin del 2026-10-25,
   que dirían si el free tier sirve posiciones con media hora de atraso.**

---

## 7. Fuentes

OpenF1:

- Tiers, precio (€9.90/month), rate limits de los dos tiers, FAQ de uso previsto, licencia
  CC BY-NC-SA 4.0 — https://openf1.org/ **[real, HTML extraído el 2026-10-13]**
- Ventana en vivo (±30 min), "Real-time data requires a paid subscription", latencia de
  `session_result` ("a few minutes after the official results are published on the official
  Formula 1 website"), `intervals` cada ~4 s, filtrado temporal — https://openf1.org/docs/
- **OAuth2, MQTT y WebSocket (endpoints, puertos, topics, `_id`/`_key`, token de 1 h, buenas
  prácticas de seguridad)** — https://github.com/br-g/openf1/blob/main/documentation/pages/auth.html
  (no está linkeada desde `openf1.org/docs/`)
- Código del API público, sin paywall y con `30/10seconds` por IP —
  https://github.com/br-g/openf1/blob/main/src/openf1/services/query_api/app.py
- Licencia — https://github.com/br-g/openf1/blob/main/LICENSE (CC BY-NC-SA 4.0)
- Respuestas reales del 2026-10-13: `/v1/sessions?year=2026[&session_type=Race]`,
  `/v1/session_result?session_key={11388,11383,latest}`, `/v1/position?session_key={11388,latest}`,
  `/v1/position?session_key=11388&date>...`, `/v1/race_control?session_key=11388`,
  `/v1/race_control?session_key=<8 carreras>&flag=CHEQUERED`, `POST /token` (401)
- Puertos del broker verificados: `mqtt.openf1.org` → `34.34.151.228`, 8883 y 8084 abiertos **[real]**

Jolpica:

- **Terms of Use (CC BY-NC-SA 4.0, no comercial, `admin@jolpi.ca` para uso comercial, fair use,
  sin garantías, términos cambiables)** — https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md
- Costos de hosting del proyecto ($45 USD/mes), link a los Terms —
  https://github.com/jolpica/jolpica-f1/blob/main/README.md
- Ausencia de cualquier mención a "live"/"real-time"/latencia de publicación en
  `docs/README.md` y `docs/rate_limits.md` **[real, grep]**
- Respuesta real: `https://api.jolpi.ca/ergast/f1/2026/last/results.json?limit=3` (ronda 17,
  Singapur, 22 filas, puntos presentes el 2026-10-13)

Código de BoxBox citado, todo leído en esta sesión:

- `backend/src/modules/draft/draft.gateway.ts`, `backend/src/shared/socket.ts` — el patrón de
  realtime que un `/live` reusaría
- `backend/src/modules/standings/standings.service.ts` — `scoreTeam`, `indexPoints`, `recalculate`
- `backend/src/modules/races/races.service.ts` — `loadResults`, `buildConstructorResults` (no
  exportada)
- `frontend/src/features/admin/results-payload.ts` — `POINTS = [25,18,15,12,10,8,6,4,2,1]`,
  `pointsFor`
- `backend/prisma/schema.prisma:87` — `Driver.number`, el join con `driver_number` de OpenF1
