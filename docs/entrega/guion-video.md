# Guion del video demo

Lo único que hay que preparar para BOX-64. Una sola toma, narrada en vivo, sin edición y sin
cortes: el video de referencia de la materia dura trece minutos y es cien por ciento la app en
pantalla. Lo que hace que salga en una toma es tener escrito el orden, no ensayar el texto.

Se graba **contra el deploy público**, no contra `localhost`:

| | |
| --- | --- |
| Frontend | <https://boxbox-three.vercel.app> |
| API | <https://boxbox-api.onrender.com/api/v1> |
| Credenciales de admin | `deployment.md` § Accesos |

> **Usar ese dominio y no otro.** Es el único propio; los demás alias de Vercel fallan con error
> de CORS porque el backend sólo autoriza a `FRONTEND_URL`.

---

## Antes de apretar grabar

1. **Cuidado con el rate limit de registro: 5 por minuto por IP.** Es la trampa más fácil de
   pisar, porque el guion registra **dos** usuarios por toma. Tres tomas seguidas son seis
   registros y el sexto se come un `429`. Si vas a repetir, esperá el minuto entre tomas, o
   reusá los usuarios de la toma anterior en vez de crear nuevos. El de login es más amable: 10
   intentos **fallidos** por minuto, y los exitosos no consumen presupuesto.
2. **Dos ventanas, no dos pestañas.** El token de acceso vive en memoria y sin `persist`, pero
   dos pestañas de la misma ventana comparten el refresh cookie, así que la segunda sesión tiene
   que ser **incógnito** o otro perfil del navegador. Acomodarlas lado a lado antes de grabar:
   durante el draft las dos tienen que entrar en pantalla.
3. **Un mail nuevo por usuario.** Si repetís uno ya usado sale `EMAIL_ALREADY_EXISTS` en cámara.
4. **La API ya está despierta** — un cronjob la pinga cada 10 minutos y `/health` respondió en
   **989 ms** la última medición (2026-10-16). No hace falta el ritual de despertarla, pero
   abrirla una vez antes de grabar sigue costando cero.
5. **Cerrar lo que no es la app.** Grabás la pantalla entera: pestañas de más, notificaciones y
   la terminal quedan fuera.

## La toma

Los tiempos son referencia, no cronómetro. Si algo se estira, lo que se recorta es el cierre.

**1. Qué es BoxBox — 1 min.** Arrancar en `/drivers`, sin login, para que se vea que el catálogo
es público. Las 22 tarjetas con la foto del piloto y el color de su escudería. Clic en una: el
detalle trae su historial carrera por carrera, 17 fechas. Decir que **los datos son reales**,
importados de Jolpica.

**2. La escudería, desde cualquier lado — 45 s.** La franja de abajo de cada tarjeta es un link
real: lleva al detalle de la escudería, con sus pilotos y su tabla de resultados. Lo mismo desde
el campeonato. Mostrarlo una vez y seguir.

**3. Campeonato — 45 s.** `/standings`. Las dos tablas, pilotos y constructores, calculadas al
vuelo desde los resultados que hay en la base — sin tabla intermedia ni migración. Los nombres
son clickeables en las dos.

**4. Registro — 1,5 min.** `/register` con el primer mail nuevo. Cae en `/leagues` y **se abre
solo el tour de bienvenida, cuatro pasos, una única vez por usuario**. Dejalo correr: es
exactamente lo que ve alguien que entra por primera vez, y se explica solo.

**5. Crear la liga — 1,5 min.** Nombre y **código de invitación propio** (ahí está la gracia: lo
elige el usuario, no es un hash). En el detalle: el código para compartir, un solo miembro, y el
tope de miembros que la temporada permite.

**6. El segundo jugador — 1,5 min.** Pasar a la ventana de incógnito, registrar el segundo
usuario y unirse con el código. Volver a la primera: el miembro nuevo está ahí, con su avatar.

**7. El draft en vivo — 2,5 min. Este es el minuto que importa.** Las dos ventanas lado a lado.
Iniciar el draft y narrar lo que se ve: el badge pasa a `LIVE`, aparece el cronómetro de 60 s y
de quién es el turno. El picker dibuja **las mismas tarjetas que el catálogo**, no una lista
aparte. Pickear en la ventana A y **mostrar que la B se actualiza sin refrescar** — eso es
Socket.io, no polling. Completar las tres rondas: dos pilotos y una escudería, en orden
serpiente. Si el cronómetro llega a cero, dejar que el auto-pick elija y nombrarlo: es una
feature, no un error.

**8. El equipo y la tabla de la liga — 1 min.** El equipo armado, y la tabla de posiciones de la
liga que ya tiene puntos de las fechas cargadas. Clic en el rival: su equipo en el popup.

**9. El perfil — 30 s.** Desde el menú de cuenta, editar nombre, lema y foto. Volver a la liga y
mostrar que el avatar nuevo aparece en miembros y en la tabla. Es corto y se nota.

**10. La tabla moviéndose — 2 min. El cierre del circuito.** Login como admin. Los links de
carga **no están en la barra**: viven en el menú de cuenta, bajo **"Carga"** → *Cargar
resultados*. En el `<select>`, el grupo *Cargar resultados* trae las fechas todavía no cargadas.
Completar unas cuantas posiciones a mano, guardar, y volver a la liga: los totales cambiaron y
las flechas de `positionChange` se movieron. Eso demuestra el ciclo completo — resultado →
puntos del fantasy → posiciones de la liga.

**11. Cierre — 30 s.** El repo, el board de Linear y los 12 ADR. Una frase, no un recorrido.

## Después de grabar

1. **Deshacer la fecha que cargaste** si querés dejar la base como estaba. Es opcional. Si lo
   hacés, borrá sus `race_results` y `constructor_results`, devolvé la carrera a `UPCOMING` y
   **volvé a correr el recálculo de standings** — o las posiciones quedan con los puntos de una
   carrera que ya no existe.
2. **Linkear el video** en `docs/README.md`: la fila *Video demo* de la tabla "Para la cátedra"
   hoy dice **pendiente**.

## Si el tiempo se pone feo

Grabálo igual con lo que haya. Un video de un recorrido incompleto vale muchísimo más que ningún
video. El orden de lo que se puede sacar, de menos a más doloroso: el cierre (11), el perfil (9),
la escudería (2), el campeonato (3). Los pasos 4 a 10 son los cuatro criterios que el ticket pide
y no se negocian.

---

## Verificado en producción el 2026-10-16

Medido con Playwright contra <https://boxbox-three.vercel.app>, sólo lectura:

| Qué | Resultado |
| --- | --- |
| `GET /api/v1/health` | `200` en 989 ms (sin cold start) |
| `/drivers` | 22 tarjetas, 22 fotos locales, **0 imágenes rotas** |
| Clic en una tarjeta | → `/drivers/12`, "Franco Colapinto", 17 filas de historial |
| Franja de escudería | 22 links a `/constructors/:id` en la lista |
| `/standings` | 2 tablas, 33 filas, 22 links a piloto y 33 a escudería |
| `/constructors/1` | "McLaren" + su tabla de resultados |
| Barra de navegación | Pilotos · Campeonato · Ingresar |
| Errores de consola | sólo los `401` esperables de `/auth/me` sin sesión |

**Lo que no se pudo medir así: todo lo que está detrás del login** — ligas, draft, perfil y la
pantalla de carga. Eso necesita entrar con una cuenta real al deploy público, y hay que hacerlo
a mano antes de grabar. Los pasos 4 a 10 de este guion son los que conviene probar una vez
completos, en una toma de ensayo que después se descarta.
