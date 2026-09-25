# Gestión del proyecto

Metodología, seguimiento y registro de avance de BoxBox. Cubre los entregables
"minutas de reunión y avance" y "tracking de features, bugs e issues" que pide la cátedra
([utnfrrodsw/tp](https://github.com/utnfrrodsw/tp), `docs.md`).

---

## Metodología

**Kanban con slicing vertical.** No Scrum: no hubo sprints, ni timeboxes, ni ceremonias.

La unidad de trabajo es el **slice**: un corte vertical que atraviesa todas las capas y deja
algo demostrable. La regla que lo gobierna, escrita en [`CLAUDE.md`](../CLAUDE.md) desde el
principio, es **un slice = un PR = tests contra la base real**.

El flujo de estados en Linear es `Backlog → Todo → In Progress → Done` (más `Canceled`), sin
límite de tiempo por tarjeta. El único timebox del proyecto es la fecha de entrega, que se
representa con la etiqueta `entrega-12-10` sobre los issues que la bloquean.

**Por qué Kanban y no Scrum.** Dos personas con disponibilidad irregular a lo largo de cinco
meses. Un sprint de dos semanas exige un compromiso de capacidad que ninguno de los dos podía
sostener de forma pareja; el flujo continuo con una tarea en curso por persona sí. Se prefirió
declarar la metodología que realmente se practicó antes que describir una que no se ejecutó.

**Slices, no tareas sueltas.** Cada slice deja la aplicación funcionando de punta a punta para
un caso de uso más. Los números de slice son una secuencia global compartida por backend y
frontend, y **nunca se renumeran** — ni siquiera al cancelar el Slice 11 (ver
[`ADR-0006`](./adr/ADR-0006-draft-3-rondas-sin-reserva.md)). El orden del número dice cuándo se
descubrió el trabajo, no de qué depende; la dependencia real vive en el `Blocked by` de cada
slice, en los roadmaps de cada carril.

**Decisiones cerradas con ADR.** Cuando una decisión tenía alternativas reales y consecuencias
que no se leen en el código, se escribió un
[Architecture Decision Record](./adr/). Hay 7 a la fecha. Existen para que en la defensa se
pueda explicar *por qué* algo es como es, en vez de improvisarlo.

---

## Coordinación del equipo

**No hubo reuniones formales y no se labraron actas.** La coordinación fue asíncrona, y queda
registrada en artefactos verificables en vez de en minutas:

- **Linear** — asignación de issues, estados y comentarios largos con el contexto de cada
  decisión. Un issue por unidad de trabajo, con una sola tarea en curso por persona.
- **Pull Requests** — la revisión ocurrió en el PR. Nada entró a `main` sin pasar por uno.
- **Los ADR y los roadmaps** — donde una decisión afectaba al otro integrante, se escribió.

Se declara así, explícitamente, porque el registro honesto de una coordinación asíncrona es más
defendible que actas de reuniones que no ocurrieron.

---

## Bitácora de avance

**Reconstruida a partir del repositorio**, no de notas tomadas en el momento: cada fila sale de
`git log`, de la fecha de merge de los PR y de las transiciones de estado en Linear. Es un
registro de avance verificable, y el lector puede auditarlo contra el historial.

| Período | Avance | Evidencia |
| :------ | :----- | :-------- |
| **Abril 2026** | Arranque: scaffold de Express + TypeScript + Prisma, modelo de datos y propuesta | 12 commits |
| **Mayo 2026** | Slice 1 — autenticación con JWT, refresh en cookie httpOnly, `/auth/me` | [PR #3](https://github.com/TomasPinolini/boxbox/pull/3) |
| **Junio–Julio 2026** | CRUDs de catálogo; Slice 7 (ingesta de resultados) y Slice 4 (FantasyTeam) | [#4](https://github.com/TomasPinolini/boxbox/pull/4), [#5](https://github.com/TomasPinolini/boxbox/pull/5) |
| **Agosto 2026 (1ª quincena)** | Slice 5 (draft por REST, orden snake) y Slice 6 (draft en vivo con Socket.io) | [#9](https://github.com/TomasPinolini/boxbox/pull/9), [#12](https://github.com/TomasPinolini/boxbox/pull/12) |
| **2026-08-23** | Auditoría de código completa: 15 hallazgos cargados en Linear como `[A1]`–`[C7]`, clasificados por severidad | BOX-11 a BOX-25 |
| **2026-08-27/28** | El pico del proyecto (26 commits): hardening de los hallazgos A y B, `requireAdmin` en el catálogo, ADR-0006 y Slice 8 | [#13](https://github.com/TomasPinolini/boxbox/pull/13) a [#17](https://github.com/TomasPinolini/boxbox/pull/17) |
| **2026-09-01/02** | Slice 13a — bootstrap del frontend: login, ligas, detalle, e2e con Playwright | [#18](https://github.com/TomasPinolini/boxbox/pull/18) a [#26](https://github.com/TomasPinolini/boxbox/pull/26) |
| **2026-09-11** | Se cruza la rúbrica contra el código por primera vez y se reordena el roadmap. Slice 14 (listado + detalle) y Slice 9 (standings) | [#29](https://github.com/TomasPinolini/boxbox/pull/29) a [#32](https://github.com/TomasPinolini/boxbox/pull/32) |
| **2026-09-21** | Segunda jornada pico (21 commits): Slice 15 (rutas por rol), Slice 16 (campeonato), Slice 13b (picks en vivo) y Slice 12 (sync con Jolpica) | [#33](https://github.com/TomasPinolini/boxbox/pull/33) a [#38](https://github.com/TomasPinolini/boxbox/pull/38) |
| **2026-09-24/25** | Cierre de bugs (BOX-39, BOX-43), infraestructura en Supabase y preparación del deploy | [#39](https://github.com/TomasPinolini/boxbox/pull/39) |

**131 commits, 28 días con actividad, 37 PR mergeados**, entre el 2026-04-10 y la fecha de
entrega. El patrón es de jornadas largas y concentradas, no de goteo diario — coherente con
cursar y trabajar en paralelo.

---

## Tracking de features, bugs e issues

La herramienta es **[Linear](https://linear.app/pinolini/team/BOX/all)**, team `BoxBox`, 43+
issues. Se usa como única fuente de verdad del estado del trabajo.

**Taxonomía de etiquetas:**

| Etiqueta | Para qué |
| :------- | :------- |
| `entrega-12-10` | Bloquea la entrega. Es el filtro que se mira para saber qué falta |
| `Feature` | Funcionalidad nueva |
| `Bug` | Defecto encontrado en algo ya entregado |
| `Improvement` | Mejora sobre algo que ya funciona |
| `issue` | Hallazgo de auditoría de código |

**Práctica de auditoría.** Dos veces se frenó el desarrollo para revisar el código ya escrito y
cargar los hallazgos con un código de severidad: `[A1]`–`[A5]` para lo que rompía algo real,
`[B1]`–`[B3]` para riesgos serios, `[C1]`–`[C7]` para limitaciones conocidas. Los A y B se
arreglaron antes de seguir; los C quedaron en Backlog **documentados como limitaciones
conocidas**, que es distinto de no haberlos visto.

**Los bugs se documentan con reproducción.** BOX-39 es el ejemplo a mirar en la defensa: fue
encontrado por un smoke test contra la base de desarrollo con 231 tests en verde, e incluye la
salida que lo evidencia, el análisis de por qué la suite no podía verlo, y el arreglo propuesto.

---

## Participación por integrante

```
98  Tomás Pinolini
32  Tomás Rivero
```

*(`git shortlog -sne`, con [`.mailmap`](../.mailmap) aplicado.)*

El `.mailmap` hace falta porque a lo largo del TP se commiteó desde distintos entornos — un
`user.name` por defecto `Developer`, la interfaz web de GitHub y el cliente local — y eso
repartía los commits de una misma persona entre varios autores aparentes. El archivo los
canonicaliza sin reescribir historia; `git` y GitHub lo aplican solos.

**Reparto de epics**, que es lo que se defiende oralmente:

| Epic | Slices | Dueño |
| :--- | :----- | :---- |
| 1 — Draft en vivo | 5, 6, 13b | Rivero |
| 2 — Procesar resultados y actualizar standings | 7, 8, 9, 12, 16 | Pinolini |

Los dos epics se relacionan entre sí, que es el otro requisito de Aprobación: el draft arma el
equipo que el scoring puntúa.
