# Issue tracker

Los issues de BoxBox viven en **Linear**, no en GitHub. GitHub se usa sólo para PRs.

- **Team**: `BoxBox`, key `BOX` (`126b2e92-ef90-439b-8d64-3c0ba0da14c1`)
- **Project**: `BoxBox` (`ff7d0b0f-81fd-4905-bac5-d6922e0a5807`)
- Acceso por MCP: `mcp__plugin_engineering_linear__*` (`list_issues`, `get_issue`, `save_issue`).

## Milestones

Un issue nuevo va a uno de estos tres. Son del project, no del team.

| Milestone | Cuándo |
|---|---|
| `Regularidad 12/10` | Lo que la rúbrica pide para Regularidad. Cerrado. |
| `Aprobación` | Lo que la rúbrica pide para Aprobación. |
| `Post-cursada` | Todo lo que ninguna fila de la rúbrica pide: alcance voluntario, mejoras, limitaciones conocidas. **Acá van predicciones y sprints.** |

## Etiquetas

El vocabulario ya existe y **no se crean etiquetas nuevas** sin pedirlo. No hay
`ready-for-agent` ni `needs-triage`: este repo no usa esa cola.

| Etiqueta | Significado |
|---|---|
| `Feature` / `Improvement` / `Bug` | Tipo de trabajo. El default para un ticket de slice es `Feature`. |
| `entrega-12-10` | Bloqueante de la primera entrega. **No la pongas en trabajo de Post-cursada.** |
| `decision-needed` | Necesita una decisión del equipo antes de implementar. |
| `issue` | Hallazgo de code review o deuda técnica, no trabajo de slice. |
| `leccion` | Issue de aprendizaje. Se cierra corriendo `/lesson`, no mergeando un PR. |

## Formato de un ticket

El template que ya usa la historia (ver `BOX-9`), en español, con estas
secciones y en este orden (`Blocked by` sólo si aplica):

```markdown
**Goal**: una frase, el resultado observable.

**Touches**: tablas, módulos y endpoints que toca.

**Done when**: la condición verificable. Un comando o una aserción, no "funciona".

**Blocked by**: los issues que lo bloquean. Omitir la sección si no hay ninguno.
```

Los slices se titulan `Slice N — Nombre`. **La numeración de slices es una sola
secuencia global compartida por backend y frontend** y nunca se renumera, así que
un número más alto no implica dependencia: sólo el `Blocked by` la implica.

## Dependencias

Las dos cosas, no una: la relación **nativa** de bloqueo de Linear, y la sección
`**Blocked by**` en el cuerpo. La nativa es la que Linear entiende; la del cuerpo es
la convención del proyecto y se lee sin abrir el grafo.

Publicá en orden de dependencia (primero los bloqueantes) para que cada arista pueda
referenciar un identificador real.

No cierres ni modifiques el issue padre.
