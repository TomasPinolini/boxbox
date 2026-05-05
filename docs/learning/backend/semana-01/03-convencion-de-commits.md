---
concepts: git,commits,commit-conventions
source_repo: desarrollo
description: Las dos reglas que hacen un commit útil (imperativo + una idea por commit), la convención que usa BoxBox (descriptive imperative en español), y un ejercicio sobre los 20 cambios sin commitear que tenés ahora mismo.
understanding_score: 7
last_quizzed: 28-04-2026
prerequisites: []
created: 27-04-2026
last_updated: 27-04-2026
---

# Convención de commits — escribir historia para tu yo del futuro

## La historia que justifica todo

Sábado a las 11pm, octubre de 2026. BoxBox está en producción, alguien no puede dar de baja un piloto. Abrís `git log --oneline backend/src/modules/drivers/drivers.service.ts` para entender qué pasó:

```
8a3f2c1  fix
b2e1d4a  cambios
9c4f6b2  wip
1d3a5e7  más cosas
```

¿Cuál fue el commit que tocó la lógica de borrado? **No tenés idea.** Vas a tener que abrir cada uno con `git show` y leer el diff a esa hora un sábado.

Comparalo con esto:

```
8a3f2c1  Permitir borrar drivers sin FantasyTeams activos
b2e1d4a  Validar dependencias antes de soft-delete en drivers
9c4f6b2  Cubrir casos borde de eliminación en tests de drivers
1d3a5e7  Refactorizar error codes de drivers (DRIVER_HAS_DEPENDENCIES)
```

Leés el log y ya sabés. La diferencia entre los dos casos no es estética — es **cuántas horas perdés cuando algo se rompe.**

> **Modelo mental:** un commit es una entrada de diario del proyecto. La fecha la pone Git automáticamente. El "qué hiciste hoy" lo escribís vos. Cuando dentro de 6 meses te preguntás *"¿qué carajos pasó este día?"*, la respuesta tiene que estar en el diario — no podés depender de tu memoria.

---

## Las dos reglas que importan

### Regla 1: Modo imperativo

Escribí los commits como si le estuvieras dando una orden a Git, no como si reportaras lo que hiciste:

| ✅ Imperativo | ❌ Pasado | ❌ Gerundio |
|---|---|---|
| `Agregar validación Zod` | `Agregada validación Zod` | `Agregando validación Zod` |
| `Corregir typo en README` | `Corregido typo en README` | `Corrigiendo typo en README` |

> **Truco:** completá la oración *"Si aplico este commit, va a ___."* Si lo que sigue suena natural, estás en imperativo. Si suena raro, no.

### Regla 2: Una idea por commit

Cada commit tiene que ser **una unidad lógica** que tenga sentido revertir o cherry-pickear sola.

❌ Mal:
```
git commit -m "Agregar soft-delete, mejorar tests, actualizar README"
```
(Tres cosas distintas. Si querés revertir solo el README, te llevás los otros dos.)

✅ Bien:
```
git commit -m "Agregar soft-delete a drivers con check de dependencias"
git commit -m "Cubrir soft-delete en tests de drivers"
git commit -m "Documentar endpoint DELETE de drivers en README"
```

> **Heurística:** si dentro de 6 meses querés revertir solo X, ¿podés sin perder Y? Si la respuesta es no, era un commit que había que separar.

Estas dos reglas resuelven el 90% del problema. El otro 10% es estilo, y eso lo elige tu equipo.

---

## La convención que usa BoxBox

Hay dos estilos populares en el mundo:

- **Conventional Commits** — `feat(drivers): add soft delete` con un set de tipos fijos (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`). Útil cuando hay changelog automatizado o versionado público. Para un TP de 3-4 personas, suele ser overkill.
- **Descriptive imperative** — descripción libre en imperativo. Más relajado, más natural en español.

**BoxBox usa la segunda.** Mirá el log actual:

```
e405c01  CRUD de Circuits, Seasons y Races con tests
dd12b63  CRUD de Constructors con tests de integración
5687a63  CRUD de Drivers con tests de integración
c7569ef  Scaffold del backend: Express + TypeScript + Prisma
ccc5694  readme fix
```

El último — `readme fix` — está mal. No es imperativo, no dice qué arregló, y arranca en minúscula mientras los otros están en mayúscula. Una versión mejor sería `Corregir typo en sección de instalación del README`.

**No reescribas commits ya pusheados** (rompe los repos de tus compañeros). Lo que sí hacés es **escribir mejores commits de acá en adelante.**

---

## Cómo escribir un commit en práctica

```bash
# Lo más común — título corto, sin cuerpo
git commit -m "Agregar validación Zod a body de POST drivers"

# Sin -m, abre tu editor para mensaje multilínea
git commit

# Multilínea inline con HEREDOC (cuando el "por qué" no es obvio)
git commit -m "$(cat <<'EOF'
Permitir borrar drivers con FantasyTeams archivados

Antes el check bloqueaba eliminación si existía cualquier team. Ahora
ignora teams en ligas con status ARCHIVED, cubriendo el caso de pilotos
jubilados que solo aparecen en ligas viejas.
EOF
)"
```

**Reglas prácticas:**
- Título: **50-72 caracteres**. Más largo se trunca en `git log --oneline`.
- Cuerpo: **opcional**. Solo cuando el "por qué" no es obvio. Para un cambio chico, no hace falta.
- **Mencioná el módulo** cuando aplica (`Agregar validación a drivers`) — ayuda con `git log | grep drivers`.

---

## Las 2 confusiones que vas a tener

### "Mi cambio es chiquito, ¿necesita commit aparte?"

Sí, **si es lógicamente independiente.** Un fix de un typo es un commit válido si es un cambio aislado. Lo que NO querés es mezclarlo con un commit de feature.

### "Hice 3 cambios y ya los junté en un solo commit, ¿puedo arreglarlo?"

**Si todavía no pusheaste**, sí:

```bash
git reset --soft HEAD~1     # vuelve atrás conservando los cambios

git add archivo1
git commit -m "Mensaje 1"

git add archivo2
git commit -m "Mensaje 2"
```

> ⚠️ **Si ya pusheaste**, no reescribas. Aprendelo para el próximo.

---

## Try it yourself (15 min, fuertemente recomendado)

Esto no es opcional — vamos a usar tu situación real. Recién, al correr el scaffold de este tutorial, vimos que tenés **20 cambios sin commitear**. Eso son al menos **4 commits distintos** esperando a ser separados.

Tu ejercicio: agruparlos y commitearlos uno por uno con mensajes descriptive imperative.

**Mi propuesta de grouping** (revisá con `git status` y ajustá si los cambios reales no encajan):

| Commit | Archivos | Mensaje sugerido |
|---|---|---|
| **A** | `backend/package.json`, `backend/package-lock.json` | `Instalar Prettier como devDependency en backend` |
| **B** | Archivos `.ts` y `.md` que Prettier reformateó (servicios, tests, docs) | `Aplicar Prettier al repositorio entero` |
| **C** | `.agents/`, `.claude/skills/`, `.kiro/`, `.windsurf/`, `skills-lock.json` | `Instalar coding-tutor skill (compound-engineering-plugin)` |
| **D** | `plan_de_estudio.md`, `CLAUDE.md` actualizado | `Agregar plan de estudio DSW 2026 v2` |

Comandos:

```bash
# Commit A
git add backend/package.json backend/package-lock.json
git commit -m "Instalar Prettier como devDependency en backend"

# Commit B (verificá con git status -s qué archivos quedan)
git add backend/src/ docs/ README.md
git commit -m "Aplicar Prettier al repositorio entero"

# ...y así con C y D
```

Cuando termines, corré `git log --oneline -10` y leelo. Tiene que sonar como **una secuencia de decisiones**, no como un volcado.

> ⚠️ **No corras `git push` todavía.** Avisame primero — si te equivocaste en el grouping, todavía estás a tiempo de resetear y rehacer.

---

## Resumen — lo que tiene que quedar pegado

- **Imperativo siempre.** Truco: *"Si aplico este commit, va a ___"*.
- **Una idea lógica por commit.** Si después querés revertir solo X y no podés, era un commit que había que separar.
- **BoxBox usa descriptive imperative en español.** Mantenelo.
- **Título 50-72 chars; cuerpo opcional, solo cuando el "por qué" no es obvio.**
- **No reescribir commits ya pusheados.** El próximo siempre puede ser mejor.

Próximo tutorial: **leer un ER diagram (crow's foot y Mermaid)**. Conecta directo con la tarea de la semana 2 (`/docs/domain-entities.md`).

---

## Q&A

### 27-04-2026 — Calibración de longitud

**Feedback del learner:** "Siento que este punto no necesita ser tan largo, lo podrías resumir un poco?"

**Acción:** Tutorial reescrito en versión más corta (~50% del original). Razones para los recortes:

- Removida la deep-dive de Conventional Commits (decisión ya tomada — solo se menciona brevemente).
- Compactadas las "5 dimensiones de un buen commit" a 2 reglas core (imperativo + una idea por commit).
- Removida la confusión sobre `fixup!` commits (concepto avanzado, post-31/7).
- Removidos ejemplos extensos del cuerpo de commit (1 ejemplo en HEREDOC alcanza).
- Conservado: la historia justificadora, el modelo mental del diario, el truco de la oración imperativa, la tabla de comandos prácticos, y el ejercicio sobre los 20 cambios reales sin commitear.

**Calibración guardada en feedback memory** para futuros tutoriales: matchear longitud a complejidad conceptual del tema, no a un template fijo.

## Quiz History

[Acá quedan registradas las sesiones de quiz cuando te tome la lección.]
