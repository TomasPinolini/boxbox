---
concepts: Prettier,code-formatting,prettierrc
source_repo: desarrollo
description: Por qué Prettier existe, qué hace exactamente (y qué NO hace), cómo leer el .prettierrc de BoxBox línea por línea, y cómo usarlo día a día sin pelearte con tu editor o con tus compañeros de equipo.
understanding_score: 4
last_quizzed: 28-04-2026
prerequisites: []
created: 27-04-2026
last_updated: 27-04-2026
---

# Prettier — el formateador automático

## La historia que justifica todo

Imaginá esto. Estás trabajando en BoxBox con un compañero de equipo. Vos editás `drivers.service.ts` desde tu VS Code, agregás una función nueva, hacés `git commit`, `git push`. Tu compañero hace `git pull` para traer tus cambios y abre el archivo en *su* VS Code. Le aparece esto:

```
Cambios:  158 líneas modificadas
```

Pero vos solo agregaste **5 líneas de código nuevas**.

¿Qué pasó? Tu editor usa comillas dobles (`"hola"`) y el de tu compañero usa simples (`'hola'`). Tu editor pone punto y coma al final de cada línea, el de él no. Vos indentás con 4 espacios, él con 2. Cada vez que cualquiera de los dos guarda un archivo, su editor "arregla" todo el archivo a su gusto, y eso aparece en el diff.

Resultado:

1. **El pull request se vuelve ilegible.** Los reviewers no pueden ver qué cambió de verdad porque hay 153 líneas de ruido.
2. **Aparecen merge conflicts absurdos.** Dos personas tocan la misma función pero con estilos distintos: Git ve dos versiones diferentes y no sabe cuál ganar.
3. **Las discusiones de PR se vuelven sobre estilo, no sobre lógica.** "Pero a mí me gustan más las comillas dobles" se vuelve un debate semanal.
4. **El historial de Git pierde valor.** Cuando intentás `git blame` para entender por qué una línea existe, te aparece "Tomás cambió esto hace 3 meses" — pero solo cambió las comillas. El código real lo escribió otra persona hace un año.

Esto es lo que Prettier resuelve. **No es una herramienta que catches bugs. No es una herramienta que mejore tu código. Es una herramienta que hace que las peleas estilísticas dejen de existir.**

Eso es todo. Y eso es enorme.

---

## ¿Qué es Prettier, en una oración?

Prettier es un programa que **lee tu código, lo reformatea según un conjunto de reglas configurables, y lo escribe de vuelta** — sin cambiar nunca lo que el código *hace*, solo cómo *se ve*.

> **Modelo mental:** Prettier es el autocorrector de Microsoft Word, pero para puntuación de código. Vos escribís medio desprolijo, le das save, y se acomoda solo a un estilo único. La idea no es que el estilo de Prettier sea "el mejor". La idea es que sea **uno solo, consistente, y dejes de tener una opinión al respecto.**

La frase clave es esa última: **dejes de tener una opinión al respecto.** El valor de Prettier no es la elección de comillas simples sobre dobles. Es que vos y tus compañeros gasten su energía mental en lógica de negocio, no en debates sobre indentación.

---

## Qué Prettier NO hace (importante)

Esto es donde casi todos los principiantes se confunden. Prettier es **solo un formateador**. No hace todo lo que parece.

| Prettier SÍ hace | Prettier NO hace |
|---|---|
| Mover llaves `{ }` a una línea consistente | Detectar que olvidaste un `await` |
| Cambiar `"hola"` a `'hola'` o viceversa según la config | Avisarte que una variable no está usada |
| Agregar o quitar punto y coma final | Encontrar bugs lógicos |
| Acomodar la indentación (espacios o tabs) | Renombrar variables mal nombradas |
| Romper líneas largas en varias | Optimizar tu código |
| Ordenar las llaves de un objeto en formato consistente | Cambiar `==` a `===` |

Lo que está en la columna derecha es trabajo de **ESLint** (que vamos a ver en el próximo tutorial). La división mental es:

- **Prettier** = tipógrafo. Le importa cómo se ve la página.
- **ESLint** = editor de un diario. Le importa qué dice la página.

Si confundís a uno con el otro, vas a frustrarte. Vas a esperar que Prettier te avise de un bug y no lo va a hacer — porque ese no es su trabajo.

---

## Las 5 reglas en TU `.prettierrc` de BoxBox

Abrí el archivo `.prettierrc` en la raíz del repo. Te muestro lo que ves, línea por línea:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Cinco reglas. Vamos una por una. Lo importante no es memorizarlas — es entender **qué decisión está cerrando cada una.**

### `"semi": true`

> "¿Punto y coma al final de cada statement, sí o no?"

JavaScript es raro: el punto y coma es **opcional la mayoría del tiempo** porque el motor del lenguaje "completa" puntos y comas faltantes automáticamente (esto se llama *automatic semicolon insertion*, ASI). Pero ese mecanismo tiene casos borde tramposos donde te muerde.

Con `"semi": true`, Prettier siempre los agrega:

```javascript
const x = 5;        // ✓ con semi
console.log(x);     // ✓ con semi
```

Si fuera `"semi": false`:

```javascript
const x = 5         // sin semi
console.log(x)      // sin semi
```

Ambos son válidos. Tu equipo eligió `true` (la mayoría de proyectos TypeScript lo eligen así). **Listo, no tenés que pensarlo más.**

### `"singleQuote": true`

> "¿Comillas simples o dobles para strings?"

```javascript
// Con "singleQuote": true (lo que tenés)
const name = 'Verstappen';

// Con "singleQuote": false
const name = "Verstappen";
```

Otra elección 100% arbitraria. Tu equipo eligió simples. Cualquier comilla doble que escribas, Prettier la cambia a simple cuando guardás. **Dejá de tener una opinión.**

### `"trailingComma": "all"`

> "¿Coma final después del último elemento de un array, objeto o lista de argumentos?"

Esto es sutil pero importante. Mirá:

```javascript
// Sin trailing comma
const driver = {
  firstName: 'Max',
  lastName: 'Verstappen',
  number: 1            // <- no hay coma
};

// Con trailing comma "all"
const driver = {
  firstName: 'Max',
  lastName: 'Verstappen',
  number: 1,           // <- coma extra acá
};
```

¿Por qué la coma extra? **Por los diffs.** Si mañana agregás un campo nuevo:

```javascript
// Sin trailing comma — el diff toca DOS líneas:
   number: 1            →   number: 1,         // agregaste coma
                            code: 'VER',        // línea nueva

// Con trailing comma — el diff toca UNA sola línea:
   number: 1,           →   number: 1,
                            code: 'VER',        // línea nueva
```

Cuando un compañero hace `git blame` o lee el PR, ver una línea cambiada en lugar de dos hace una diferencia real. **Esto es Prettier eligiendo por vos una práctica con beneficio concreto, no estética.**

### `"printWidth": 100`

> "¿Hasta cuántas columnas puede llegar una línea antes de que la cortes en varias?"

Cuando tenés algo así:

```javascript
const drivers = await prisma.driver.findMany({ where: { deletedAt: null, seasons: { some: { seasonId: 1 } } } });
```

Prettier mide: "esto pasa los 100 caracteres". Lo reescribe automáticamente a:

```javascript
const drivers = await prisma.driver.findMany({
  where: {
    deletedAt: null,
    seasons: { some: { seasonId: 1 } },
  },
});
```

Mismo código, ejecuta exactamente igual, pero ahora cabe en pantallas razonables y se lee.

`100` es un número de compromiso. El estándar histórico es 80 (heredado de las terminales de los años 70). Los editores modernos tienen pantallas anchas, entonces 100 o 120 es más común hoy. Tu equipo eligió 100.

### `"tabWidth": 2`

> "¿Cuántos espacios usa cada nivel de indentación?"

```javascript
// Con tabWidth: 2 (lo que tenés)
function getDriver() {
  if (active) {
    return driver;
  }
}

// Con tabWidth: 4
function getDriver() {
    if (active) {
        return driver;
    }
}
```

JavaScript/TypeScript del lado de la comunidad usa abrumadoramente `2`. Otros lenguajes (Python, Java) suelen usar `4`. Tu equipo siguió la convención del ecosistema JS. **Listo.**

---

## El otro archivo: `.prettierignore`

Al lado del `.prettierrc` hay un `.prettierignore`. Su contenido:

```
node_modules
dist
build
prisma/migrations
```

Este archivo le dice a Prettier: **"NO toques estas carpetas, ni siquiera las leas."**

¿Por qué cada una?

- **`node_modules/`** — código de terceros (Express, Prisma, etc.). No es tuyo, no lo formatees. Cada vez que corras `npm install` se reescribe. Formatearlo sería correr el formateador en miles de archivos para nada.
- **`dist/` y `build/`** — código generado automáticamente por el compilador (TypeScript → JavaScript). Si lo formateás, en el próximo `npm run build` se regenera y pierde el formato. Y nadie lo lee a mano.
- **`prisma/migrations/`** — archivos SQL generados por Prisma cuando corrés `npx prisma migrate dev`. Son inmutables: una vez creados, no se tocan más, porque son el historial de cambios de la base de datos. Formatearlos podría romper el orden de Prisma.

> **Mental model:** `.prettierignore` es la lista de "habitaciones de la casa donde no entra el robot aspirador". Ahí adentro pasa otra cosa, no querés que te limpie.

---

## Cómo usás Prettier en tu día a día

Hay tres formas. La que más vas a usar es la primera.

### 1. Format on save (la opción que recomiendo)

En VS Code:

1. Instalás la extensión **"Prettier - Code formatter"** (publisher: Prettier — la oficial).
2. Abrís Settings (`Ctrl+,`), buscás **"format on save"**, lo activás.
3. Buscás **"default formatter"**, elegís Prettier.

Listo. A partir de ahora, **cada vez que guardes un archivo (`Ctrl+S`), Prettier lo reformatea automáticamente** según las 5 reglas del `.prettierrc`.

Lo bueno: no tenés que correr ningún comando manualmente. Lo escribís medio desprolijo, guardás, queda perfecto.

### 2. Comando manual

Cuando querés formatear archivos sin abrirlos uno por uno:

```bash
# Verificar qué archivos están mal formateados (no los toca)
npx prettier --check .

# Reformatear todos los archivos del proyecto
npx prettier --write .
```

Útil cuando recién clonás un proyecto, o antes de un PR para asegurarte de que todo esté limpio.

### 3. En CI (más adelante)

En proyectos serios, el pipeline de CI corre `prettier --check .` y rechaza el PR si hay archivos mal formateados. **No lo vas a configurar ahora**, pero sabé que existe — es la red de seguridad final cuando un compañero olvida activar format-on-save.

---

## Algo honesto sobre TU repo específicamente

Tu `backend/package.json` no tiene a `prettier` listado como dependency ni devDependency. Lo verifiqué.

Eso significa que **el `.prettierrc` está, pero el programa Prettier no está instalado como dependencia del proyecto.** Tu editor lo está usando con su propia copia (la extensión de VS Code trae la suya).

¿Por qué importa? Porque si mañana entra un compañero al proyecto y no tiene la extensión instalada, **no se va a dar cuenta de que el proyecto usa Prettier**. Va a empezar a cometer con un estilo distinto y los PRs van a ser un caos.

Esto es algo que vas a querer arreglar antes del milestone del 12/7, instalando Prettier como devDependency. Es una línea:

```bash
cd backend
npm install --save-dev prettier
```

Y después agregar un script en `package.json`:

```json
"scripts": {
  "format": "prettier --write ."
}
```

Lo dejo señalado pero **no lo hagas todavía** — no está en el plan de la semana 1 ni 2, y no quiero que corras a hacer cosas que no están en el TP. Anotalo mentalmente para cuando hagas la "limpieza pre-12/7".

---

## "Pero a mí me gustan las comillas dobles"

Esta es la objeción más común que tienen los principiantes. La respuesta de senior engineer es brutal pero correcta:

**Tu opinión sobre comillas no le importa a nadie, ni siquiera a vos en 6 meses.**

El valor de Prettier no es elegir bien — es eliminar la elección. La fricción mental que ahorrás al no debatir comillas con un compañero (o con vos mismo de hace tres meses) supera ampliamente cualquier preferencia personal sobre estilo.

Hay UN caso legítimo donde se discute la config de Prettier: **cuando tu equipo se está formando y todavía no hay un `.prettierrc`**. Ahí sí, debatan, voten, decidan. Después: silencio. Nunca más se toca.

---

## Predicción: las 3 confusiones que vas a tener

Las anoto antes de que las vivas, así reconocés el patrón cuando aparezca:

### Confusión 1: "Prettier no me detecta este bug"
Vas a escribir algo como:

```typescript
const driver = await driversService.findById(1)  // sin await, supongamos
```

y vas a guardar esperando que Prettier te grite. **No lo va a hacer.** No es su trabajo. Eso lo va a hacer ESLint (próximo tutorial). Si te frustrás, recordá: **Prettier es el tipógrafo, no el editor.**

### Confusión 2: "Cada vez que guardo, me cambia los archivos enteros"
Si recién instalás la extensión en un proyecto que **nunca** corrió Prettier, la primera vez que guardes un archivo viejo, Prettier va a reformatear *todo el archivo*, no solo lo que vos editaste. Vas a ver un commit con 200 líneas cambiadas.

**Solución:** la primera vez, corré `npx prettier --write .` en un commit aparte, separado de tus cambios reales. Algo como `chore: aplicar prettier a todo el repo`. Después de eso, los siguientes commits solo van a tener los cambios reales, porque ya está todo en formato canónico.

### Confusión 3: "ESLint y Prettier pelean entre ellos"
Algunas reglas de ESLint *también* son sobre estilo (indentación, comillas, semicolons). Si activás esas reglas y Prettier tiene una opinión distinta, **ESLint te marca error en cosas que Prettier acaba de "arreglar"**, y entrás en un loop infinito.

**Solución:** existe un paquete `eslint-config-prettier` que apaga las reglas de ESLint que pisan a Prettier. Tu repo no lo tiene instalado todavía, pero tu config de ESLint es minimalista (solo usa las reglas recomendadas), así que no creo que tengas este conflicto. Si aparece, sabrás qué hacer.

---

## Try it yourself (10 min, opcional)

Si querés cementar esto con un ejercicio:

1. Abrí cualquier archivo de tu repo, por ejemplo [backend/src/modules/drivers/drivers.service.ts](backend/src/modules/drivers/drivers.service.ts).
2. Hacé un destrozo deliberado:
   - Cambiá una comilla simple por doble.
   - Sacá el punto y coma del final de una línea.
   - Pegá toda una llamada larga en una sola línea de 200 caracteres.
   - Cambiá la indentación de 2 espacios a 4 en una función.
3. Guardá (`Ctrl+S`).
4. Mirá lo que pasa.

Si tenés la extensión de Prettier activa con format-on-save, el archivo se va a "auto-reparar" enfrente tuyo en menos de un segundo. Si no pasa nada, falta configurar el editor — revisá los pasos del "Format on save" arriba.

**Después:** corré `git diff` y mirá si hay cambios. Si todo volvió a estar como estaba originalmente, **Prettier ganó silenciosamente**. Esa es la experiencia que vas a tener cada día.

No te olvides de revertir cualquier cambio antes de commitear. (`git checkout -- backend/src/modules/drivers/drivers.service.ts` lo deja como estaba.)

---

## Resumen — lo que tiene que quedar pegado

- **Prettier es un formateador automático.** Reescribe el código a un estilo consistente. **No** detecta bugs, **no** cambia lógica.
- **El valor real es eliminar opiniones de estilo del equipo**, no que el estilo elegido sea "el mejor". Vos y tus compañeros dejan de pelear y se enfocan en lógica.
- **Tu repo tiene 5 reglas en `.prettierrc`**: semicolons sí, single quotes, trailing commas en todo, líneas hasta 100 chars, indent de 2 espacios. Memorizalas si querés, pero más importante es saber que existen y por qué.
- **`.prettierignore` excluye carpetas que no son tuyas o son auto-generadas** (`node_modules`, `dist`, `build`, `prisma/migrations`).
- **La forma de usarlo es format-on-save en el editor.** No es un comando que corrás a mano salvo casos puntuales.
- **Prettier ≠ ESLint.** Prettier es el tipógrafo, ESLint es el editor. Próximo tutorial.

---

## Q&A

### 27-04-2026 — ¿Es mejor un `.prettierrc` con muchas opciones?

**Pregunta del learner:** Encontré online un `.prettierrc` con 15 opciones (`arrowParens`, `bracketSpacing`, `htmlWhitespaceSensitivity`, `insertPragma`, `jsxBracketSameLine`, `jsxSingleQuote`, `printWidth: 80`, `proseWrap: "always"`, `quoteProps`, `requirePragma`, `semi`, `singleQuote`, `tabWidth`, `trailingComma`, `useTabs`). ¿Es mejor que el que tengo (5 opciones)?

**Respuesta corta:** No. El config que encontró está inflado.

**Análisis:**
- 8 de las 15 opciones simplemente repiten defaults de Prettier (`arrowParens`, `bracketSpacing`, `insertPragma`, `quoteProps`, `requirePragma`, `useTabs`, `htmlWhitespaceSensitivity`, `jsxBracketSameLine` que además está deprecado).
- 2 son JSX-específicas (`jsxSingleQuote`, `jsxBracketSameLine`) — no aplican hasta tener frontend con React.
- 1 (`proseWrap: "always"`) afecta solo Markdown — opcional.
- 4 son decisiones reales que coinciden con su config (`semi`, `singleQuote`, `trailingComma`, `tabWidth`).
- 1 es decisión real distinta (`printWidth: 80` vs el `100` actual del proyecto).

**Principio de senior engineering:** especificar solo lo que se desvía de defaults. Más config ≠ mejor config. Un `.prettierrc` minimalista (a) lee más rápido la intención del equipo, (b) hereda automáticamente cuando Prettier actualiza defaults, (c) reduce conflicto con configs de editor.

**Recomendación:** mantener las 5 opciones actuales sin tocar. Para verificar defaults, prettier.io/docs/options — cada opción tiene línea "Default".

### 27-04-2026 — ¿Cómo automatizar Prettier dentro del repo?

**Pregunta del learner:** Ya configuré VS Code default formatter a Prettier y corrí `npx prettier --write .` manualmente. ¿Cómo lo automatizo dentro del repo?

**Las 4 capas de automatización:**

| Capa | Qué hace | Esfuerzo | Hacer ahora? |
|---|---|---|---|
| 1. Install local + npm scripts | Versión locked en el repo | 5 min | **Sí** |
| 2. Format on save (VS Code) | Auto-formato al guardar | Hecho | Hecho |
| 3. Pre-commit hook (husky + lint-staged) | Prettier corre antes de cada commit | 30 min | No, post-31/7 |
| 4. CI check (GitHub Actions) | Rechaza PRs mal formateados | 30 min | No, post-31/7 |

**Capa 1 — pasos:**

```bash
cd backend
npm install --save-dev prettier
```

Agregar a `backend/package.json`:

```json
"scripts": {
  "format": "prettier --write ..",
  "format:check": "prettier --check .."
}
```

(El `..` es para que opere desde la raíz del repo, no solo dentro de `backend/`. Cuando exista frontend, este path va a abarcar todo.)

**Lo que NO hacer ahora:** husky/lint-staged tiene footguns en Windows con line endings; CI es over-engineering para un proyecto local. Diferir a post-31/7.



## Quiz History

[Acá quedan registradas las sesiones de quiz cuando te tome la lección.]
