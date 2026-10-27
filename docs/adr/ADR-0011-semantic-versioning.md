# ADR-0011: Semantic Versioning con un solo número para el repo

**Date:** 2026-10-13
**Status:** Accepted
**Author:** Tomás Pinolini

---

## Context

BoxBox no tiene versiones. Lo que tiene son dos números que se contradicen y nadie mira:
`backend/package.json` dice `1.0.0`, `frontend/package.json` dice `0.0.0` —el default que puso
Vite al crear el proyecto, nunca tocado— y pasaron seis meses sin que la diferencia se notara.
No hay un solo tag de git en el repositorio (`git tag | wc -l` → `0`), no hay `CHANGELOG.md`, y
la aplicación corriendo no dice qué versión es: `GET /api/v1/health` devuelve `{status, timestamp}`
y nada más (`backend/src/app.ts:32`).

**El problema no es hipotético, y la prueba ya está escrita en el repo.** En
`frontend/src/services/seasons.service.test.ts:10` hay un test cuya única razón de existir es que
los dos deploys se desincronizan:

> _«Un backend anterior a este cambio no devuelve `counts`. Pasa de verdad: el deploy de Render
> puede ir una version atras del frontend.»_

Backend en Render y frontend en Vercel son dos despliegues separados ([ADR-0008](./ADR-0008-render-backend-vercel-frontend.md)),
y "una versión atrás" es exactamente lo que Semantic Versioning existe para nombrar. El caso puntual
está resuelto con un test; lo que falta es el vocabulario para el caso general.

**Esto no lo pide la cátedra.** Verificado el 2026-10-13 contra los tres documentos fuente de
[utnfrrodsw/tp](https://github.com/utnfrrodsw/tp) —`README.md`, `FAQ.md`, `docs.md`—: **cero menciones**
a versionado, semver, tags, releases o changelog. Lo más cercano son dos cosas distintas: "definición
de ambientes" (requisito de Aprobación, habla de dev contra prod) y "se evalúa el uso de git en sí:
continuidad del desarrollo y aporte visible de cada integrante", que mide commits y participación.
Por eso **todo el trabajo de este ADR vive en el milestone Post-cursada** y no compite con el video
demo, que sí es requisito de Aprobación y todavía no existe.

El disparador fue un pedido directo del 2026-10-13: _"introducimos Semantic Versioning al proyecto,
involucremos a Linear en esto"_. El informe didáctico que acompaña a esta decisión, con el mecanismo
explicado para alguien que nunca versionó, está en `docs/research/semver-en-boxbox.pdf`.

---

## Decision

Se adopta [Semantic Versioning 2.0.0](https://semver.org) con **un solo número para todo el
repositorio**, en seis puntos:

1. **Una versión, no una por carril.** Backend y frontend comparten número. Los dos `package.json`
   se sincronizan en cada release.
2. **La versión vive en un tag anotado de git** (`git tag -a vX.Y.Z -m "..."`). No se crea un
   `package.json` en la raíz para guardarla.
3. **`v1.0.0` es `04b30ca`**, el `origin/main` que está en producción al 2026-10-13. No es un tag
   retroactivo sobre "el commit de la entrega": `main` siguió moviéndose durante la semana de entrega
   y el PR a la cátedra todavía no se puede abrir (ver `docs/roadmap.md`, el repo no está en la red
   de forks). Lo que entre después sigue el esquema normal.
4. **`CHANGELOG.md` en la raíz, escrito a mano, en español.** Una sección por versión, en lenguaje de
   usuario y no de commit.
5. **Un issue de Linear declara el tipo de salto (`major` / `minor` / `patch`), nunca el número.**
   El número se calcula recién al taggear.
6. **Una Release nativa de Linear por cada tag**, con los issues colgados. Si el plan de la cuenta no
   habilita Releases, el fallback es: `CHANGELOG.md` es la fuente de verdad y en Linear queda un
   comentario con el tag al cerrar cada issue.

El procedimiento para cortar una versión está en `docs/research/semver-en-boxbox.pdf` §5.

### Qué superficie versiona BoxBox

El spec exige declarar la API pública, porque es la que el número promete. **La superficie versionada
de BoxBox es su contrato HTTP**: el conjunto de endpoints, parámetros y formas de respuesta de
`docs/api-endpoints.md` más los códigos de `docs/error-codes.md`.

Lo que **no** es superficie versionada, y por lo tanto no puede por sí solo forzar un MAJOR:

- **El schema de Prisma y los nombres de los modelos.** Renombrar una tabla o un modelo sin tocar la
  respuesta HTTP es invisible desde afuera: no es un cambio incompatible, porque el contrato HTTP
  no cambia.
- **La estructura interna de los módulos**, los nombres de funciones y los archivos.
- **Los valores que devuelven los cálculos.** Que una tabla de posiciones pase a dar otros números
  —porque antes repartía de menos y ahora reparte bien— cambia los datos, no el contrato: ningún
  cliente deja de funcionar. Es un arreglo, y si viaja junto a funcionalidad nueva, la release es
  MINOR.

Esta regla existe porque sin ella cada migración de base parecería un MAJOR, y el número dejaría de
significar lo único que sabe significar: "¿se me rompe algo si actualizo?".

---

## Alternatives considered

**Una versión por carril.** Suena más preciso —un fix de CSS no tiene por qué mover el backend— y en
la práctica no lo mantiene nadie: la evidencia es el `1.0.0` contra `0.0.0` que ya existe. Además el
proyecto ya tomó este mismo criterio en otro eje y lo dejó escrito: _"La numeración de slices es una
sola secuencia compartida por los dos carriles"_ (`docs/roadmap.md`). Con dos números, "¿qué versión
está en producción?" tiene dos respuestas.

**Arrancar en `v0.x`.** Es lo que el spec sugiere para desarrollo inicial —_"Major version zero is for
initial development. Anything MAY change at any time"_— y es más honesto en teoría para un TP. Se
descartó porque obligaría a **bajar** el `1.0.0` que `backend/package.json` ya declara, y porque el
spec pide el `1.0.0` justamente cuando el software está en uso de producción con una API pública
declarada: BoxBox está deployado y su API está en `docs/api-endpoints.md` y `docs/error-codes.md`.

**Generar el `CHANGELOG.md` desde los commits** (`changesets`, `standard-version`, `release-please`).
Rechazado con números, no por gusto. Un generador se alimenta de Conventional Commits, y la historia
medida al 2026-10-13 da: **29 de 161** commits sin contar merges (18%) no siguen la convención —todos
de la era Slice 1–7, con la forma `Slice 5: Draft state machine (REST-only, snake order)`— y
**0 de 236** commits llevan `!` o `BREAKING CHANGE`. Con ese segundo número, un generador **nunca**
detectaría un MAJOR: ni siquiera el que ya ocurrió ([ADR-0006](./ADR-0006-draft-3-rondas-sin-reserva.md),
migración `20260827142629_remove_reserve_and_driver_swap`, que sacó una ronda del draft). Habría que
corregir su salida a mano, que es más trabajo que escribir diez líneas. Se reconsidera si alguna vez
existe el CI de BOX-33 y la historia nueva es 100% Conventional.

**Usar los milestones de Linear como versiones.** Los tres que existen —`Regularidad 12/10`,
`Aprobación`, `Post-cursada`— son **compuertas de la rúbrica, no unidades de entrega**, y su
significado está documentado en `docs/agents/issue-tracker.md`. Reusarlos lo destruiría.

**Usar cycles de Linear.** No hay ninguno en uso, y `docs/gestion-del-proyecto.md` —ya entregado a la
cátedra— declara _"Kanban con slicing vertical (no Scrum — no hubo sprints)"_. Activar cycles
contradiría un documento entregado.

**Una etiqueta de Linear por versión.** Explosión del vocabulario de etiquetas, que en este repo está
cerrado a propósito.

---

## Consequences

- **Un cambio en un solo carril mueve el número de los dos.** Es el precio aceptado de tener una sola
  respuesta a "qué versión está en producción", y es ruido real: el backend va a publicar versiones
  en las que su código no cambió.
- **El `CHANGELOG.md` hay que acordarse de escribirlo.** No hay nada que lo fuerce — ni un hook, ni
  CI. Si se olvida, el archivo miente por omisión, que es peor que no tenerlo. El primer síntoma será
  un tag sin su sección.
- **Los tags no viajan en un `push` normal.** Hay que publicarlos explícitamente (`--follow-tags` o
  `--tags`). El modo de falla es silencioso: `git tag` local muestra la versión, `git ls-remote --tags
  origin` no.
- **El `/api/v1` de las URLs sigue siendo otro eje y no se toca.** Ese prefijo versiona el *contrato*
  de la API y existe para que dos contratos convivan servidos a la vez. Un MAJOR de semver **no**
  obliga a `/api/v2`.
- **La versión sigue siendo invisible en runtime.** `GET /api/v1/health` no la devuelve. Exponerla ahí
  son dos líneas y convierte el versionado en algo observable en vez de un ejercicio de papel; queda
  propuesto, no decidido.
- **Linear queda con una dependencia externa sin verificar**: hay 0 release pipelines configurados y
  no está confirmado que el plan de la cuenta permita crear uno. El fallback está escrito arriba
  justamente para que esa verificación no bloquee nada.
- **Revertir es barato.** Un tag se borra (`git tag -d`), el `CHANGELOG.md` es un archivo. Lo único
  que cuesta revertir es haberle dicho a alguien que `v1.2.0` significa algo.
