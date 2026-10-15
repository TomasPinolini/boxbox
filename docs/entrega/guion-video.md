# Guion del video demo

Lo único que hay que preparar para BOX-64. Una sola toma, narrada en vivo, sin edición y sin
cortes: el video de referencia de la materia dura trece minutos y es cien por ciento la app en
pantalla. Lo que hace que salga en una toma es tener escrito el orden, no ensayar el texto.

Se graba **contra el deploy público**, no contra `localhost`:

| | |
| --- | --- |
| Frontend | <https://boxbox-tomas-pinolinis-projects.vercel.app> |
| API | <https://boxbox-api.onrender.com/api/v1> |
| Credenciales de admin | `deployment.md` § Accesos |

---

## Antes de apretar grabar

1. **Despertar la API.** Abrir <https://boxbox-api.onrender.com/api/v1/health> y esperar el
   `200`. Render suspende el servicio por inactividad en el plan gratuito y la primera llamada
   tardó **9,3 s** la última vez que se midió. Si grabás con la API dormida, el primer login
   parece colgado y es el peor momento posible para eso.
2. **Dos ventanas, no dos pestañas.** El token de acceso vive en memoria y sin `persist`, pero
   dos pestañas de la misma ventana comparten el mismo origen y el mismo refresh cookie, así
   que la segunda sesión tiene que ser **incógnito** o otro perfil del navegador. Acomodarlas
   lado a lado antes de grabar: durante el draft las dos tienen que entrar en pantalla.
3. **Un mail nuevo para el registro.** Si repetís uno ya usado sale `EMAIL_ALREADY_EXISTS` en
   cámara. Dos mails nuevos, en realidad: uno por ventana.
4. **Cerrar lo que no es la app.** Grabás la pantalla entera: pestañas de más, notificaciones y
   la terminal quedan fuera.

## La toma

Los tiempos son referencia, no cronómetro. Si algo se estira, lo que se recorta es el cierre.

**1. Qué es BoxBox — 1 min.** Arrancar en `/drivers`, sin login, para que se vea que el catálogo
es público. Los 22 pilotos con foto y el color de su escudería. Clic en uno: el detalle trae su
historial carrera por carrera. Decir que **los datos son reales**, importados de Jolpica, con 17
fechas de la temporada 2026 cargadas.

**2. Campeonato — 1 min.** `/standings`. Las dos tablas, pilotos y constructores, calculadas al
vuelo desde los 371 resultados que hay en la base. Sin tabla intermedia ni migración: se derivan
en cada request.

**3. Registro — 1,5 min.** `/register` con el primer mail nuevo. Cae en `/leagues`, vacío. Eso es
el punto: un usuario nuevo no tiene nada hasta que crea o se une a una liga.

**4. Crear la liga — 1,5 min.** Nombre y **código de invitación propio** (ahí está la gracia: lo
elige el usuario, no es un hash). En el detalle: el código para compartir, un solo miembro, y el
tope de miembros que la temporada permite.

**5. El segundo jugador — 1,5 min.** Pasar a la ventana de incógnito, registrar el segundo
usuario y unirse con el código. Volver a la primera: el miembro nuevo está ahí.

**6. El draft en vivo — 2,5 min. Este es el minuto que importa.** Las dos ventanas lado a lado.
Iniciar el draft y narrar lo que se ve: el badge pasa a `LIVE`, aparece el cronómetro de 60 s y
de quién es el turno. Pickear en la ventana A y **mostrar que la B se actualiza sin refrescar** —
eso es Socket.io, no polling. Completar las tres rondas: dos pilotos y una escudería, en orden
serpiente. Si el cronómetro llega a cero, dejar que el auto-pick elija y nombrarlo: es una
feature, no un error.

**7. El equipo y la tabla de la liga — 1,5 min.** El equipo armado, y la tabla de posiciones de
la liga que ya tiene puntos de las 17 fechas. Clic en el rival: su equipo en el popup.

**8. La tabla moviéndose — 2 min. El cierre del circuito.** Login como admin, `/admin/results`.
En el `<select>`, el grupo *Cargar resultados* tiene el **Round 18, United States Grand Prix** —
está `UPCOMING`, así que todavía se puede cargar. Completar unas cuantas posiciones a mano,
guardar, y volver a la liga: los totales cambiaron y las flechas de `positionChange` se movieron.
Eso demuestra el ciclo completo — resultado real → puntos del fantasy → posiciones de la liga.

**9. Cierre — 30 s.** El repo, el board de Linear y los 12 ADR. Una frase, no un recorrido.

## Después de grabar

1. **Deshacer el Round 18** si querés dejar la base como estaba. Es opcional: tener una fecha
   cargada no molesta a nadie. Si lo hacés, borrá sus `race_results` y `constructor_results` y
   devolvé la carrera a `UPCOMING` — y volvé a correr el recálculo de standings después, o las
   posiciones quedan con los puntos de una carrera que ya no existe.
2. **Linkear el video** en `docs/README.md`: la fila *Video demo* de la tabla "Para la cátedra"
   hoy dice **pendiente**.

## Si el tiempo se pone feo

Grabálo igual con lo que haya. Un video de un recorrido incompleto vale muchísimo más que ningún
video. El orden de lo que se puede sacar, de menos a más doloroso: el cierre (9), el campeonato
(2), el detalle de piloto (1). Los pasos 3 a 8 son los cuatro criterios que el ticket pide y no
se negocian.
