# ADR-0012: Reglas de las predicciones pre-carrera

**Date:** 2026-10-14
**Status:** Accepted
**Author:** Tomás Pinolini

---

## Context

El modelo de datos de las predicciones **ya existe y está completo** desde la primera migración:
`Prediction` tiene `predictedWinnerId`, `predictedPoleId`, `predictedTopConstructorId`, los tres
booleanos `winnerCorrect` / `poleCorrect` / `topConstructorCorrect`, `bonusPoints`, y un
`@@unique([leagueMemberId, raceId])` que fija una predicción por miembro por fin de semana.
`LeagueStanding.predictionPoints` existe con default 0. Los endpoints están documentados en
`docs/api-endpoints.md` y el enchufe está marcado en el código con un comentario.

**El hueco no era el modelo de datos, era la regla de juego**: cuántos puntos vale cada acierto,
qué pasa si el piloto predicho no corre, cuándo se evalúa, y si `bonusPoints` es el total o un
extra. Ninguna de esas cuatro cosas estaba decidida, y las tres fuentes que parecían contestarlas
se contradecían entre sí.

**Lo que había escrito y por qué no servía como decisión.** `docs/api-endpoints.md` §Scoring trae
una tabla de puntos por predicción (10 ganador / 8 pole / 12 top constructor). El mismo archivo trae
una tabla de puntos por piloto (25/18/15, vuelta rápida +5, DNF −10) que **nunca se implementó**: el
cálculo de standings suma los puntos reales de la carrera tal como los da la fuente externa, y no hay
un solo uso de la vuelta rápida en el scoring. Un documento que falla en su primera tabla no decide
la segunda.

**Y tres contradicciones concretas, encontradas verificando contra el código:**

1. **La pole no tenía fuente de datos.** `RaceResult.gridPosition` es la grilla de largada, que
   difiere de la pole por sanciones. El recurso `qualifying` de la API externa existe —relevado el
   2026-10-13 en `docs/research/jolpica-openf1-superficie.md`, 369 filas para 2026, con `position` y
   el piloto— pero no lo consumíamos.
2. **La ventana cerraba después de que la pole ya era pública.** `docs/proposal.md` dice "lock antes
   de la clasificación", pero el sync de calendario escribía `lockDate` **una hora antes de la
   carrera**, o sea unas 22 horas después de la clasificación. Con eso, una de las tres patas no era
   un pronóstico.
3. **`bonusPoints` es `Int?` sin default**, mientras `docs/domain-entities.md` afirma "default 0,
   nunca null".

**Esto no lo pide la cátedra.** Las predicciones pre-carrera son el ítem 1 del **Alcance Adicional
Voluntario** declarado en `docs/proposal.md`, y la tabla de estado del mismo documento las lista "No
construido". Verificado contra `README.md`, `FAQ.md` y `docs.md` de la consigna: no aparecen en
ningún requisito funcional de Regularidad ni de Aprobación Directa. Suman en la nota final y no
habilitan nada, así que **todo este trabajo vive en el milestone Post-cursada** y no compitió con la
entrega del 12 al 16/10.

---

## Decision

### La ventana

1. **Cierra un minuto antes de que arranque la clasificación.** `lockDate` pasa a derivarse de
   `qualifyingDate` menos un minuto, con fallback al cálculo actual si la fuente no manda esa sesión
   (en las 23 fechas de 2026 la manda en todas, así que el fallback es teórico). La ventana se da lo
   más larga posible **y el aviso reemplaza al colchón**: el recordatorio con una hora de
   anticipación es una notificación, no una hora menos de ventana. El motivo es concreto: en
   Argentina muchas clasificaciones caen a la mañana, y una hora de colchón obliga a estar despierto
   antes.
2. **Un solo cierre para las tres patas.** No hay un cierre por pata. Si alguien predice que un
   piloto saca la pole y gana, y ese piloto queda décimo en la clasificación, no puede corregir
   nada. La alternativa —cerrar la pole en la clasificación y el ganador en la carrera— permitiría
   corregir con la grilla en la mano, que es menos pronóstico, no más.
3. **El cierre se valida comparando la fecha en el momento de guardar**, no leyendo un estado
   persistido. Esto no es una preferencia: una tarea agendada corre cada N minutos, y entre que pasa
   la hora de cierre y que la tarea escribe el estado la ventana queda abierta hasta N minutos de
   más. Con un cierre calibrado al minuto, eso anula el punto 1. El estado `QUALIFYING_LOCKED` —que
   existe en el enum y hoy nadie escribe— lo escribe el Slice 18, y es sólo para que la pantalla no
   tenga que calcular.
4. **Las predicciones de los demás miembros se ven cuando arranca la carrera**, no cuando se cierra
   la ventana. Es una decisión de gusto, tomada explícitamente.

### El puntaje

5. **5 puntos por acierto, las tres patas iguales, máximo 15.** Iguales porque no hay un modelo de
   dificultad defendible con datos, y "las tres valen lo mismo" no necesita defensa. La escala se
   calibró contra una fecha real: dos pilotos y una escudería pueden dar del orden de 70 puntos, así
   que 30 por tres clics —lo que proponía la tabla documentada— era casi la mitad de una fecha. El
   draft es el juego; la predicción es condimento.
6. **`bonusPoints` es la suma de las patas acertadas**, sin premio por acertar las tres. Pasa a
   `Int @default(0)`, no nullable, como ya decía la documentación de dominio. El "¿ya se evaluó?" lo
   contestan los tres booleanos, que sí son nullables a propósito.
7. **Errar es errar.** Un piloto que abandona, que no larga o que no estaba en la grilla cuenta como
   fallado. "Anulada" sería un cuarto estado y `null` ya significa "todavía no se evaluó".
8. **Empate en el top constructor: aciertan todos los que predijeron a cualquiera de los
   empatados.** Es un máximo y un filtro, sin criterio de desempate que haya que inventar y
   defender.
9. **El top constructor se decide por los puntos del Gran Premio**, no por Gran Premio más sprint.
   Decidido en coordinación con el frente de sprints.
10. **El desempate de la tabla de la liga no cambia**: sigue siendo por puntos de pilotos y después
    por antigüedad del miembro. Es la misma decisión que el punto 5 vista desde otro ángulo.

### La evaluación

11. **Corre dentro del recálculo de standings**, en su misma transacción. Ya es idempotente, ya abre
    transacción, y ya es el único lugar que sabe sumar acumulado.
12. **`predictionPoints` es acumulado, no de esa fecha.** Un standing es la foto del campeonato hasta
    esa carrera, así que suma los bonus de todas las fechas completadas con `round` menor o igual.
13. **El punto de entrada no es donde dice el comentario.** El comentario junto al
    `predictionPoints = 0` afirma ser "el único lugar a tocar". No lo es: esa función recibe sólo los
    tres slots del equipo y no tiene el id del miembro, así que desde ahí es imposible saber de quién
    es la predicción. El índice de bonus por miembro se construye un paso antes, al lado del índice
    de puntos por piloto y por constructor. Ese comentario hay que corregirlo.

### La pole

14. **Se guarda sólo quién la sacó**, en una columna `poleDriverId` en `Race` (FK nullable a
    `Driver`), no en una tabla espejo con la clasificación completa. La tabla completa sirve para
    mostrar una grilla en pantalla, que nadie pidió.
15. **La trae el sync de resultados en la misma pasada**, sin endpoint nuevo ni botón nuevo para el
    admin. La evaluación corre después de la carrera, así que no hace falta tenerla el sábado.
16. **Pole significa P1 en la clasificación**, y eso **no** es `gridPosition = 1`. Son dos datos
    distintos y ahora están los dos, separados.
17. **La carga manual de resultados también puede dejar la pole**, como campo opcional. Hay dos
    puertas para cargar una carrera y la de la demo es la manual.
18. **Sin dato de pole, `poleCorrect` queda `null` y vale 0.** Volver a correr el recálculo lo repara
    cuando el dato aparezca. Marcarlo `false` congelaría un problema de infraestructura como si fuera
    un resultado del juego.

### La forma de la API y el alcance

19. **Predicción parcial permitida**: se puede mandar una sola pata, y `null` significa "no predije" y
    no se evalúa. Como errar no resta, en la práctica conviene siempre llenar las tres.
20. **`PUT` es reemplazo**, no merge: lo que no viene en el body queda en `null`. Con merge no habría
    forma de **borrar** una predicción sin que `null` signifique dos cosas a la vez. "Ir
    actualizando" se resuelve en la pantalla, que precarga con el `GET` y manda las tres.
21. **El alcance es backend más una pantalla simple.** Las notificaciones y la automatización son un
    slice aparte (Slice 18), bloqueado por éste: arrastran proveedor externo, tarea agendada, tabla
    de envíos y preferencias de silencio, y tienen decisiones propias sin contestar.

Además: el piloto y el constructor predichos tienen que pertenecer a la temporada de esa carrera
(lección de BOX-39, donde el draft ofrecía pilotos de cualquier temporada); un miembro sin fila de
predicción suma 0 y no es un error; y las fechas de 2026 ya corridas quedan con `predictionPoints` en
0 para siempre, porque nadie las predijo.

---

## Alternatives considered

**La tabla 10 / 8 / 12 de `docs/api-endpoints.md`.** Descartada por dos razones. La primera es de
calibración: 30 puntos por tres clics contra ~70 de una fecha completa de equipo. La segunda es que
reparte al revés: le da 12 al top constructor, que en una temporada con un equipo dominante lo
aciertan todos los miembros de la liga y no diferencia a nadie, y 8 a la pole, que es la más difícil
de las tres.

**Dejar el cierre una hora antes de la carrera.** Es lo que hacía el código, y lo que el glosario ya
había escrito como definición. Se descartó porque convierte la pole en información pública al momento
de cerrar: cualquiera que mire el teléfono acierta. La propuesta entregada a la cátedra decía "lock
antes de la clasificación"; entre los dos documentos, gana el que describe un pronóstico.

**Un cierre por pata.** No requiere columnas nuevas: las dos fechas ya están en `Race` y el `PUT`
podría validar cada campo contra la suya. Se descartó porque lo que compra es poder corregir el
ganador después de ver la clasificación, y porque deja `lockDate` sin uso mientras obliga a explicar
tres deadlines donde hay uno.

**Anclar el cierre a la primera sesión del fin de semana** (`min(qualifyingDate, sprintDate)`).
Medido sobre la base de desarrollo: 2026 tiene 23 fechas, **6 con sprint, y en las 6 el sprint corre
antes de la clasificación del Gran Premio**. Con el cierre en la clasificación, esas 6 predicciones
se hacen habiendo visto correr el sprint. La regla alternativa es un mínimo sobre dos columnas que ya
existen, y se descartó por una decisión de alcance explícita: **los sprints quedan fuera de las
predicciones**, y el frente de sprints es el dueño de si eso se corrige.

**Una tabla `QualifyingResult` completa**, espejo de la de resultados, con los tres tiempos por
piloto. Descartada por el punto 14: habilita una pantalla que nadie pidió. No estorba si algún día se
quiere: `poleDriverId` pasaría a ser derivable de ella.

**Anular la predicción cuando el piloto no corre.** Más justo en apariencia. Descartada por el costo
de modelado: los booleanos tienen tres estados y el tercero (`null`) ya significa "no evaluado"; una
cuarta semántica no tiene dónde vivir sin ensuciar la que hay.

**Persistir `QUALIFYING_LOCKED` como fuente de verdad del cierre.** Descartada por el punto 3: un
estado escrito por una tarea agendada está tan fresco como su última corrida, y la hora real no
miente nunca. Como efecto secundario deseable, el Slice 10 no depende del Slice 18 para funcionar.

**`PATCH` en vez de `PUT`.** Descartada por el punto 20, y porque el endpoint ya estaba documentado
como `PUT` con semántica de upsert.

---

## Consequences

- **En 6 de las 23 fechas de 2026, la predicción se hace con el sprint ya corrido.** Es una asimetría
  real y aceptada a propósito: la misma apuesta vale lo mismo pero es más fácil de ganar en un cuarto
  del calendario. La salida está identificada (anclar el cierre al mínimo de las dos sesiones) y la
  decisión de tomarla es del frente de sprints.
- **La pole no mira sanciones.** Si al poleman le sacan la posición y larga undécimo, para BoxBox la
  pole sigue siendo suya. Es lo correcto por definición de "pole", y queda escrito para que nadie lo
  lea como un bug.
- **Hay un comentario engañoso en el código que hay que corregir** al implementar: el que dice que el
  `predictionPoints = 0` es el único lugar a tocar.
- **Un recálculo de una fecha vieja arrastra.** Como `predictionPoints` es acumulado, corregir los
  resultados de una carrera intermedia y recalcular sólo esa fecha deja las fechas posteriores con
  números viejos. Ya era cierto para los puntos de equipo; las predicciones no agregan un modo de
  falla nuevo, pero lo heredan.
- **Para que las predicciones se evalúen sin intervención humana hace falta BOX-77.** Hoy el
  encadenado entre cargar resultados y recalcular standings vive en el navegador, así que una carga
  que no pase por la pantalla del admin deja las predicciones sin evaluar.
- **Las 14 fechas de 2026 ya corridas quedan en cero** y no hay nada que rellenar: nadie las predijo.
- **Revertir es barato**: una migración de dos columnas (una nueva en `Race`, un default en
  `Prediction`) y un módulo que se borra. Lo caro de revertir sería haber repartido puntos reales en
  una liga en curso.
