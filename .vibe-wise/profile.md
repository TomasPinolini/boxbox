# Learner Profile

Learning mode: active
Onboarding: complete

## Project
Situation: Known
Building: BoxBox — Fantasy League de Fórmula 1. Trabajo práctico de Desarrollo de Software, UTN FRRO. Equipo de dos: Pinolini (legajo 52265) y Rivero (51070).
Codebase familiarity: Lo construyó él mismo a lo largo de ~6 meses (131 commits, 41 PRs), pero al 2026-10-05 declara "me olvidé de casi todo" — hubo parciales en el medio. Conoce que el código es suyo; no tiene fresca la arquitectura ni los motivos de las decisiones.
Learning scope: Lo que necesita para la defensa oral. No se preguntó explícitamente; se deriva del objetivo declarado.

## Experience
Overall programming: Intermediate. Se describe como SWE; proyectos universitarios en Python y C. Nunca puso nada en producción antes de este proyecto.
Stack familiarity: Beginner en TypeScript, Node, Express, React, Prisma — eligió este stack deliberadamente "por motivos de aprendizaje" porque ninguno de los dos lo había usado a esta escala (declarado en docs/proposal.md). Tiene base en Python y C, que sirven de analogía: C para tipos, compilación y qué hace un ORM al mapear; Python para middlewares y async.

## Goals
Primary: Defender BoxBox oralmente ante el profesor entre el 12 y el 16/10/2026. El código ya cumple la rúbrica; el hueco es poder explicar en voz alta las decisiones ya tomadas.
Profundidad buscada: **overview de lo más importante, NO detalle de implementación.** Declarado explícitamente el 2026-10-05: *"Tengo muy poco conocimiento técnico de lo que construímos, pero tampoco quiero tenerlo al detalle sinceramente, con un simple conocimiento/overview de lo más importante está bien."* No pedirle que recite cadenas de middlewares, nombres de archivos ni firmas de funciones.
Capability goal: Not specified.

## Preferences
Checkpoint frequency: Frequent
Question style: Open-ended
Implementation style: AI writes code

Después de cada implementación, dar una **guía de smoke test** — pedido del learner el
2026-10-07. No alcanza con reportar qué se cambió y que los tests pasan: hay que decir
cómo lo comprueba él, paso por paso, y separar lo que se puede verificar en la máquina de
lo que necesita hardware real. Incluir qué significa "está mal" en cada chequeo, no sólo
qué significa "está bien".

Cómo plantear una pregunta — corrección del learner, 2026-10-05: *"Vas derecho a puntos de los cuales me agarrás desprevenido. Necesito que amplíes un poquito más la ventana de contexto cuando me escribís."* Antes de preguntar hay que **armar la escena**: quién pregunta, sobre qué pantalla, en qué situación. Citar una pregunta textual de un profesor sacada de un PR ajeno, sin contexto, no se entiende. Pasó con *"¿cómo sabés de quién es?"*, que el learner no pudo interpretar.

## Strong Concepts
Ninguno con evidencia suficiente todavía. Ver progress.md para lo parcial.

## Developing Concepts
- Modelado de relaciones en Prisma: identifica correctamente por dónde se deriva un dato, pero no tiene presente qué restringe un `@@unique` compuesto.

## Revisit
- El razonamiento detrás de `RaceResult` sin `constructorId`: el mecanismo lo tiene, la causalidad la tenía invertida (2026-10-05).
