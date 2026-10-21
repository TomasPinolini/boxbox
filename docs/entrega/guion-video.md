# Guion del video demo

Lo único que hay que preparar para BOX-64. Una sola toma, narrada en vivo, sin edición y sin
cortes, de unos catorce minutos (el video de referencia de la materia dura trece y es cien
por ciento la app en pantalla). Lo que hace que salga en una toma es tener escrito el orden, no ensayar el texto.

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

0. **Producción tiene que tener el CRUD de carreras.** Ya está en `main` (PR #106); abrir
   `/admin/races` en el dominio público. Si no aparece "Carreras" bajo "Carga", no grabes.
1. **Rate limit de registro: 20 por minuto por IP.** El guion registra dos usuarios por toma,
   así que sólo molesta si encadenás muchas tomas seguidas.
2. **Dos ventanas, no dos pestañas.** El token vive en memoria, pero dos pestañas de la misma
   ventana comparten el refresh cookie: la segunda sesión va en **incógnito**. Lado a lado antes
   de grabar — durante el draft las dos tienen que entrar en pantalla.
3. **Un mail nuevo por usuario.** Repetir uno saca `EMAIL_ALREADY_EXISTS` en cámara.
4. **Elegir de antemano la fecha del paso 12**: una carrera ya corrida en la realidad pero
   todavía no cargada en prod. Si no queda ninguna, el paso 12 se hace a mano, sin Jolpica.
5. **Cerrar lo que no es la app.** Notificaciones y pestañas de más fuera de cuadro. La terminal
   sí queda abierta, minimizada, con `npm test` listo para el cierre.

## La toma

Cada paso dice entre corchetes qué requisito de la rúbrica cubre. Los tiempos son referencia.

**1. Catálogo público — 1 min.** `[Listado + filtro + detalle]` Arrancar en `/drivers` sin
login. Las 22 tarjetas con foto y color de escudería. **Usar el filtro por escudería** y mostrar
que el valor queda en la URL. Clic en un piloto: historial carrera por carrera. Decir que los
datos son reales, importados de Jolpica.

**2. Campeonato — 30 s.** `/standings`: pilotos y constructores, calculados al vuelo desde los
resultados. Clic en una escudería para mostrar que los nombres son links.

**3. Responsive — 20 s.** `[Mobile-first, 3 breakpoints]` Achicar la ventana a ancho de celular
(o DevTools a 375 → 768 → 1024): la grilla se reacomoda y la barra pasa a drawer.

**4. Registro — 1 min.** `/register` con el primer mail. Cae en `/leagues` y se abre solo el tour
de bienvenida, una única vez por usuario. Dejarlo correr.

**5. Crear la liga — 1 min.** Nombre y código de invitación elegido por el usuario. En el
detalle: código para compartir, un miembro, y el tope de miembros (11, la mitad de la grilla).

**6. El segundo jugador — 1 min.** En incógnito: registrar el segundo usuario y unirse con el
código. Volver a la primera ventana: el miembro nuevo aparece con su avatar.

**7. Draft en vivo — 2,5 min.** `[Epic 1]` Las dos ventanas lado a lado. Iniciar: badge `LIVE`,
cronómetro de 60 s, de quién es el turno. Pickear en A y **mostrar que B se actualiza sin
refrescar** — Socket.io, no polling. Tres rondas en serpiente: dos pilotos y una escudería. Si el
reloj llega a cero, el auto-pick elige solo: es una feature.

**8. Equipo y tabla de la liga — 45 s.** El equipo armado y la tabla con puntos. Clic en el
rival: su equipo en el popup.

**9. Un usuario común no entra a admin — 15 s.** `[Login con 2 niveles]` En la ventana del
segundo jugador, tipear `/admin/races` en la barra: rebota a `/leagues`. Una frase: el front
esconde la pantalla, pero quien autoriza es `requireAdmin` en el backend.

**10. CRUD simple — 1 min.** `[CRUD simple ×2]` En la primera ventana, salir y entrar como admin.
Menú de cuenta → **Carga**. *Temporadas*: crear una temporada demo (año lejano, **sin
activarla**). *Circuitos*: crear "Circuito demo" y editarle un campo.

**11. CRUD dependiente — 1,5 min.** `[CRUD dependiente]` *Carga → Carreras*. Crear una carrera
eligiendo en los dos `<select>` la temporada demo y el Circuito demo: **ésa es la dependencia**.
La tabla muestra nombres, no ids. Editar la fecha. Después, en este orden:
   1. Intentar borrar el **Circuito demo** → rechazado: tiene una carrera.
   2. Intentar borrar una carrera **Corrida** de 2026 → rechazada: tiene resultados.
   3. Borrar la carrera demo → se borra. Borrar el Circuito demo → ahora sí.

**12. La tabla moviéndose — 2 min.** `[Epic 2]` *Carga → Cargar resultados*. Elegir la fecha del
punto 4 de la preparación y apretar **Importar de Jolpica**: llena la grilla como vista previa,
sin escribir nada. Revisar y guardar. Volver a la liga: los totales cambiaron y las flechas de
`positionChange` se movieron. Resultado real → puntos del fantasy → posiciones de la liga.

**13. Perfil — 20 s.** Editar foto y lema; el avatar nuevo aparece en la tabla de la liga.

**14. Cierre — 30 s.** `[Tests]` Terminal con `npm test` en verde (backend y frontend), el board
de Linear y los 12 ADR. Una frase cada uno.

## Después de grabar

1. **Borrar la temporada demo** desde *Carga → Temporadas*.
2. **Deshacer la fecha cargada en el paso 12**, si querés dejar la base como estaba: borrar sus
   `race_results` y `constructor_results`, devolver la carrera a `UPCOMING` y **volver a correr
   el recálculo de standings** — si no, las posiciones quedan con puntos de una carrera que ya no
   existe.
3. **Linkear el video** en `docs/README.md`: la fila *Video demo* hoy dice **pendiente**.

## Si el tiempo se pone feo

Grabálo igual con lo que haya. Lo que se puede sacar, de menos a más doloroso: el perfil (13),
el campeonato (2), el cierre (14). Los pasos 1 y 3 a 12 cubren la rúbrica y no se negocian.

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
