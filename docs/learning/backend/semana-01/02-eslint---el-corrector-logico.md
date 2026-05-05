---
concepts: ESLint,linting,static-analysis
source_repo: desarrollo
description: Por qué ESLint existe y en qué se diferencia exacto de Prettier, cómo funciona un linter (lee tu código sin ejecutarlo y busca patrones sospechosos), y cómo leer el eslint.config.mjs de BoxBox — incluyendo el flat config moderno y la regla custom que tenés.
understanding_score: 3
last_quizzed: 28-04-2026
prerequisites: [~/coding-tutor-tutorials/2026-04-27-prettier---el-formateador-automatico.md]
created: 27-04-2026
last_updated: 27-04-2026
---

# ESLint — el corrector lógico

## La historia que justifica todo

Imaginá esto. Estás trabajando en `drivers.service.ts`, escribiendo una función nueva. La pegás así:

```typescript
export async function softDelete(id: number) {
  findById(id);  // ← te falta el await acá, ¿lo viste?

  const driver = await prisma.driver.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return driver;
}
```

Guardás. Prettier reformatea (quizás te pone una coma o dos), nada le llama la atención. Levantás el server con `npm run dev`. Mandás un `DELETE /api/v1/drivers/999`. Y... el server responde con un 200 normal **incluso si el driver con id 999 no existe**.

Esperabas un 404. Te pegaste 40 minutos buscando el bug. Al final lo encontrás: en la primera línea de la función, **te olvidaste `await`** delante de `findById(id)`. Eso significa que la función nunca esperó el resultado, nunca verificó que el driver existiera, nunca tiró el `NotFoundError`. Siguió de largo como si nada.

Este bug es invisible para Prettier. Prettier vio una llamada a una función, formateó el espacio en blanco perfecto, dijo "listo" y se fue. **El bug no está en cómo se ve la línea — está en lo que la línea hace.**

Y este es exactamente el tipo de error que ESLint sí puede atrapar (con la regla `@typescript-eslint/no-floating-promises`). Le pasás el archivo, lee tu código sin ejecutarlo, ve que estás invocando una función `async` y descartando la promesa que devuelve, y te marca:

```
❌ src/modules/drivers/drivers.service.ts:57:3
   Promises must be awaited, end with a call to .catch, end with a call to
   .then with a rejection handler or be explicitly marked as ignored
```

40 minutos de debugging → 1 segundo de feedback en tu editor.

Ese delta es lo que ESLint vende.

---

## ¿Qué es ESLint, en una oración?

ESLint es un programa que **lee tu código JavaScript/TypeScript sin ejecutarlo, lo compara contra un conjunto de reglas, y te avisa de los patrones que probablemente sean errores o malas prácticas.**

> **Modelo mental:** ESLint es el corrector ortográfico y gramatical de tu navegador, pero para código. Mientras escribís, va subrayando con rojo lo que probablemente esté mal. *No* corrige el sentido de tu oración — no puede leer tu mente. Solo detecta patrones que, en la mayoría de los casos, son problemas: una variable que declaraste pero no usaste, un `if` que nunca puede ser falso, un `await` olvidado.

La palabra técnica es **linter** o **static analyzer**:

- **Static** = analiza el código sin ejecutarlo. No corre tus tests, no levanta el server, no toca la base de datos. Solo lee texto.
- **Linter** = el nombre histórico viene del comando `lint` de los años 70 de Unix, que detectaba "pelusas" (lint = pelusa) en código C. La metáfora se quedó pegada.

---

## La división Prettier vs ESLint, otra vez

Acordate del cuadro del tutorial 1. Lo expandimos ahora:

|  | Prettier | ESLint |
|---|---|---|
| **Qué hace** | Reformatea | Analiza |
| **Cuándo actúa** | Al guardar | Al escribir / al correr `npm run lint` / en CI |
| **Cambia tu código?** | Sí, automáticamente | Solo si pedís `--fix` |
| **Detecta bugs?** | No | Sí (los que se pueden detectar leyendo el código) |
| **Te enseña algo?** | Casi nada | Mucho. Las reglas son consejos de seniors envasados en código |
| **Analogía** | Tipógrafo | Editor de un diario |

La frase para internalizar: **Prettier hace que tu código se vea consistente. ESLint hace que tu código sea menos peligroso.**

> ⚠️ **Confusión predicha — Prettier y ESLint NO compiten, complementan.** Algunos tutoriales viejos los presentan como alternativas: "uso ESLint, no necesito Prettier". Es un error. Querés ambos. Cada uno hace algo distinto.

---

## ¿Cómo lee el código un linter sin ejecutarlo?

Esta es la magia que vale la pena entender, aunque sea conceptualmente. ESLint hace tres pasos:

### Paso 1: Parseo

Toma tu código (texto plano) y lo convierte en una **estructura de árbol** llamada AST (*Abstract Syntax Tree* — árbol de sintaxis abstracta). Por ejemplo, esta línea:

```typescript
const drivers = await prisma.driver.findMany();
```

ESLint la transforma internamente en algo como:

```
VariableDeclaration (const)
└── Identifier (name: "drivers")
    └── AwaitExpression
        └── CallExpression
            └── MemberExpression
                ├── Object: prisma.driver
                └── Method: findMany
```

> **Modelo mental:** imaginá que ESLint es un escritor que lee tu novela y la convierte en un esquema de capítulos, escenas y diálogos. La frase "Max corrió rápido" se convierte en `[sujeto: Max, verbo: correr, adverbio: rápido]`. Una vez en esa forma estructurada, es trivial buscar patrones — "encontrame todas las oraciones donde el sujeto sea Max", "encontrame todos los verbos en pasado".

### Paso 2: Aplicación de reglas

Cada **regla** de ESLint es básicamente un programa que recorre el árbol buscando un patrón específico. Por ejemplo, la regla `no-unused-vars` recorre todas las declaraciones de variables (todos los nodos `VariableDeclaration`) y verifica: ¿alguien usa esta variable más adelante en el árbol? Si la respuesta es no, marca error.

Otra regla, `@typescript-eslint/no-floating-promises`, busca todos los nodos `CallExpression` que devuelven una promesa, y verifica: ¿el resultado de esa llamada está siendo `await`ado, devuelto, o pasado a un `.catch`? Si no — marca error.

### Paso 3: Reporte

Cada vez que una regla matchea su patrón en tu código, ESLint emite un mensaje:

```
src/modules/drivers/drivers.service.ts:57:3
  error  Promises must be awaited  @typescript-eslint/no-floating-promises
```

Y eso es lo que ves en tu terminal o como subrayado rojo en tu editor.

> **No te preocupes por memorizar AST.** Vas a usar ESLint mucho antes de necesitar entender ASTs en profundidad. Lo importante es saber que **el linter no "ejecuta" tu código — lo lee como si fuera una novela y busca patrones sospechosos.**

---

## La configuración: anatomía de TU `eslint.config.mjs`

Abrí `backend/eslint.config.mjs`. Vas a ver esto:

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'prisma/'],
  },
);
```

16 líneas. Vamos pieza por pieza, porque cada una toma una decisión.

> 💡 **Antes de empezar — el principio del tutorial anterior aplica acá también.** Tu config de ESLint es minimalista: solo arma la base con reglas recomendadas + un único override custom. No hay 30 reglas custom configuradas a mano. Eso es bueno. Más reglas custom = más decisiones que tu equipo tiene que defender. Acordate del Q&A de Prettier: **especificar solo lo que se desvía del default.**

### Las dos imports al principio

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
```

ESLint base solo entiende JavaScript puro. Para que entienda TypeScript necesita un plugin: `typescript-eslint`. Estos dos imports traen:

- **`@eslint/js`** — el conjunto base de reglas para JavaScript "vanilla".
- **`typescript-eslint`** — un paquete con dos cosas: (a) un parser que enseña a ESLint a leer sintaxis de TS (`type Foo = ...`, `interface`, generics, etc.) y (b) un set de reglas específicas de TypeScript.

> **Modelo mental:** ESLint es un editor que solo sabe español. `typescript-eslint` es el traductor + diccionario que le permite también editar textos en portugués (que es como el español pero con reglas propias).

### El `tseslint.config(...)` — flat config

```javascript
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { /* override 1 */ },
  { /* override 2 */ },
);
```

Este es el formato moderno de configuración de ESLint, llamado **flat config**. Es nuevo (2024+, ESLint 9). Antes existía `.eslintrc.json` o `.eslintrc.js` con un formato más anidado y complicado de leer. Si en algún tutorial viejo ves `.eslintrc.json`, eso es la convención antigua. Tu repo usa la nueva.

**La idea del flat config:** la configuración es un **array de objetos**. Cada objeto en el array es una "capa" que se aplica en orden, y las capas posteriores pueden sobrescribir reglas de las anteriores.

> **Modelo mental:** imaginá que estás vistiendo a un personaje en un videojuego con capas de armadura. Primero le ponés una armadura básica (recomendaciones de JS). Después una armadura especializada para TS (recomendaciones de TypeScript). Después modificás una pieza específica (el override de unused-vars). Si dos capas tocan la misma pieza, gana la última que aplicaste.

### Capa 1: las recomendaciones de JavaScript

```javascript
eslint.configs.recommended,
```

Esto activa el set "recommended" de reglas de ESLint base — unas 60 reglas que el equipo de ESLint considera obvias y de bajo costo. Cosas como:

- **`no-undef`** — error si usás una variable que no está declarada (`onsole.log("hi")` con typo en `console` te marca error).
- **`no-unused-vars`** — error si declarás una variable y no la usás.
- **`use-isnan`** — `x === NaN` es siempre falso (cosa rara de JavaScript), te corrige a `Number.isNaN(x)`.
- **`no-debugger`** — error si dejás un `debugger;` en producción.

No tenés que conocerlas todas. Lo importante es saber que **al activar `recommended`, te estás protegiendo gratis de ~60 errores comunes.** Una sola línea, decisión grande.

### Capa 2: las recomendaciones de TypeScript

```javascript
...tseslint.configs.recommended,
```

¿Notaste los `...` (spread operator) al inicio? Es porque `tseslint.configs.recommended` no es UN objeto — es un **array** de objetos. El spread "expande" ese array dentro del array padre, así cada objeto se vuelve una capa propia.

Lo que activa: reglas que solo tienen sentido en TypeScript:

- **`@typescript-eslint/no-explicit-any`** — warning si usás `any` (que tira por la borda todo el sistema de tipos).
- **`@typescript-eslint/no-floating-promises`** — error si llamás una función `async` sin `await` (el bug del ejemplo del principio).
- **`@typescript-eslint/no-misused-promises`** — error si pasás una promesa donde se espera un valor síncrono (un caso típico que rompe `forEach`).

Estas reglas son **el principal motivo por el que vale la pena el linter** en TypeScript. El sistema de tipos te protege de errores de tipo, pero el linter te protege de patrones de uso peligrosos del lenguaje.

### Capa 3: el override custom

```javascript
{
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
},
```

Esto es **una modificación específica que hizo tu equipo** sobre la regla `no-unused-vars`. Vamos a desempaquetar la sintaxis, porque vale la pena entenderla — vas a ver patrones idénticos en cualquier config de ESLint del mundo.

El valor de la regla es un array de dos cosas:

```javascript
['error', { argsIgnorePattern: '^_' }]
//  ↑               ↑
//  severity        opciones
```

- **Severity** — qué pasa cuando se rompe la regla:
  - `'off'` o `0` — la regla está apagada
  - `'warn'` o `1` — solo te avisa con un warning amarillo
  - `'error'` o `2` — error rojo, hace fallar `npm run lint`

- **Opciones** — un objeto con configuración específica de la regla. En este caso: `{ argsIgnorePattern: '^_' }` significa "no marcar como error los argumentos de función cuyo nombre empiece con `_`".

¿Por qué tu equipo necesita este override? Mirá `backend/src/middleware/error-handler.ts`:

```typescript
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  // ...
}
```

Express te obliga a aceptar 4 argumentos en un middleware de error (`err`, `req`, `res`, `next`) — si tu función tiene 3, Express ni la trata como error handler. Pero en este caso, el código adentro **no usa** `req` ni `next`. La convención de la comunidad es: prefijás los no usados con `_` para señalar "sé que está, sé que no lo uso, no me marques error".

**Sin el override**, ESLint te marcaría error en `_req` y `_next`. **Con el override**, los ignora porque empiezan con `_`. Tu equipo decidió respetar la convención del subrayado y configurarlo explícitamente.

> ⚠️ Esto es un patrón típico que vas a ver mucho: cuando una regla es buena pero tiene casos legítimos donde no aplica, en lugar de apagarla la **refinás con opciones** que excluyan los casos buenos. Mantenés la protección pero evitás los falsos positivos.

### Capa 4: la lista de exclusión

```javascript
{
  ignores: ['dist/', 'node_modules/', 'prisma/'],
},
```

Este objeto solo tiene la propiedad `ignores` — significa "no analices estos archivos". Las razones:

- **`dist/`** — código generado por el compilador de TypeScript. Si lo lintás, vas a marcarte errores en código que vos no escribiste.
- **`node_modules/`** — código de terceros. Mismo motivo. Y son MILES de archivos.
- **`prisma/`** — la carpeta donde Prisma guarda el `schema.prisma` y las migraciones. No es código JS/TS, no tiene sentido lintarla.

Es exactamente el mismo principio que `.prettierignore` del tutorial anterior: las herramientas trabajan donde tiene sentido y se mantienen lejos de las zonas auto-generadas o de terceros.

> 🔍 **Notá la diferencia con `.gitignore`**: `.gitignore` le dice a Git qué no trackear. La sección `ignores` de ESLint le dice a ESLint qué no analizar. Son archivos distintos con propósitos distintos, aunque suelen tener entradas parecidas (ambos típicamente excluyen `node_modules/`).

---

## Cómo usás ESLint en tu día a día

Tres formas, igual que con Prettier. La primera es la que más vas a usar.

### 1. La extensión de VS Code (live feedback)

En VS Code, instalá la extensión **"ESLint"** (publisher: Microsoft). Una vez instalada:

- Abrís cualquier archivo `.ts` del proyecto.
- ESLint corre **mientras escribís** y te subraya errores con rojo y warnings con amarillo.
- Si pasás el mouse sobre el subrayado, aparece el mensaje del error y el nombre de la regla.
- Si hacés `Ctrl+.` sobre el error, a veces te ofrece "fix" automático.

Esto es la red de seguridad principal. **Vas a aprender programación más rápido viendo los warnings de ESLint en vivo que leyendo libros**, porque te explica pequeños "no hagas eso" en el momento exacto en que lo estás haciendo.

### 2. El comando manual

```bash
cd backend
npm run lint
```

Esto corre `eslint src/` (lo que define el script en `package.json`) y te imprime todos los errores y warnings de todo el proyecto. Útil:

- Antes de un commit, para asegurarte de que no haya nada roto.
- Al clonar el repo, para ver el estado general.
- En CI (cuando lo configures), para rechazar PRs con errores.

### 3. El modo `--fix` (con cuidado)

Algunas reglas de ESLint son **auto-fixable**. Si corrés:

```bash
cd backend
npx eslint src/ --fix
```

ESLint reescribe automáticamente los archivos donde puede aplicar fixes seguros (por ejemplo, agregar un `;` faltante, ordenar imports, sacar una variable no usada).

> ⚠️ **Tené cuidado** con `--fix` en archivos no commiteados. Si el fix está mal, no podés volver atrás fácilmente. Hacé `git add` o `git stash` primero, y revisá los cambios con `git diff` después.

---

## Predicción: las 3 confusiones que vas a tener

### Confusión 1: "ESLint me marca error en algo que Prettier acaba de cambiar"

Esto pasa si tenés alguna regla de ESLint que también dicta estilo (por ejemplo `quotes` o `semi`). Prettier reformatea con comillas simples, ESLint te grita "uso comillas dobles". Loop infinito.

**Solución:** existe un paquete `eslint-config-prettier` que apaga todas las reglas de ESLint que pisan a Prettier. Tu config actual usa solo reglas no-estilísticas (es minimalista), así que **no creo que tengas este conflicto**. Pero si lo ves, ya sabés.

### Confusión 2: "El error dice 'no-unused-vars' pero la variable SÍ se usa"

Vas a ver casos donde ESLint te marca una variable como "unused" pero vos la estás usando claramente. Casi siempre es una de estas:

1. **La estás usando solo en un `console.log` que después borraste.**
2. **La estás "usando" en un comentario.** ESLint no lee comentarios.
3. **La estás re-exportando** con `export { foo }` desde otro archivo — esto a veces confunde a la regla.
4. **La función tiene firma de TypeScript pero el body no la usa** (caso típico del error handler de Express).

Lee el mensaje despacio. La mayoría de las veces la regla tiene razón.

### Confusión 3: "warning vs error — ¿qué hago?"

- **Error (rojo)**: hace fallar `npm run lint`. Hay que arreglarlo antes del commit.
- **Warning (amarillo)**: te avisa pero no rompe nada. Lo podés ignorar de manera disciplinada (ej. `// eslint-disable-next-line` con un comentario explicando por qué) o arreglarlo cuando tengas tiempo.

**Regla práctica:** los warnings que se acumulan se vuelven invisibles. Si ves 30 warnings en tu output, dejaste de leerlos hace rato. **Idealmente, todos los warnings deberían convertirse a errores o a "off"** — no quedarse como warning para siempre. Pero esa es discusión post-31/7.

---

## Try it yourself (10 min, opcional)

Si querés cementar esto:

1. Abrí [backend/src/modules/drivers/drivers.service.ts](backend/src/modules/drivers/drivers.service.ts).

2. **Experimento 1 — variable sin uso:** declará una variable nueva que nunca uses, por ejemplo:

   ```typescript
   const unused = 42;
   return prisma.driver.findMany({ /* ... */ });
   ```

   Guardá. Mirá si VS Code la subraya en rojo. Después corré `npm run lint` desde la terminal — debería marcarte el error con la regla `@typescript-eslint/no-unused-vars`.

3. **Experimento 2 — el escape con underscore:** renombrá la variable a `_unused`:

   ```typescript
   const _unused = 42;
   ```

   Guardá. **El error desaparece.** Esto es exactamente el `argsIgnorePattern: '^_'` del override en tu config funcionando.

   (Cuidado: `argsIgnorePattern` es para **argumentos de función**, no para variables locales. Para variables locales, hay una opción aparte llamada `varsIgnorePattern` que tu config NO tiene activada. O sea: si declarás una local llamada `_unused` directamente con `const`, ESLint puede que igual te marque error según la versión. Si pasa, hacelo dentro de una función como argumento: `function foo(_unused: number) { return 1; }` — ahí sí debería ignorarlo. Es un detalle sutil que muestra cómo las opciones de regla son específicas.)

4. **Experimento 3 — la promesa flotante (el bug del principio):** dentro de cualquier función `async`, llamá a `findById` sin `await`:

   ```typescript
   export async function update(id: number, data: UpdateDriverInput) {
     findById(id);  // ← sin await, sin return, sin .catch
     return prisma.driver.update({ where: { id }, data });
   }
   ```

   Guardá. Si tu config incluye `no-floating-promises` (lo trae `tseslint.configs.recommended`), debería marcarte error.

5. **Acordate de revertir todo** antes del próximo commit:
   ```bash
   git checkout -- backend/src/modules/drivers/drivers.service.ts
   ```

El objetivo de los tres experimentos: que **veas con tus ojos** cómo cambiar una sola palabra (`unused` → `_unused`) hace que ESLint cambie de comportamiento. Una vez que lo viste, la abstracción "regla con opciones" deja de ser teoría.

---

## Resumen — lo que tiene que quedar pegado

- **ESLint es un static analyzer.** Lee tu código sin ejecutarlo y busca patrones sospechosos.
- **Prettier vs ESLint:** Prettier es el tipógrafo (cosmética), ESLint es el editor (lógica). Querés ambos, no compiten.
- **Los linters protegen de bugs reales** — `no-floating-promises`, `no-unused-vars`, `no-misused-promises` son los más valiosos en TypeScript.
- **Tu config (`eslint.config.mjs`)** usa el formato moderno "flat config" y arma la protección en capas: recomendaciones de JS + recomendaciones de TS + un override custom + la lista de exclusión.
- **El override `argsIgnorePattern: '^_'`** es la convención que permite usar `_req` y `_next` en middlewares sin que ESLint te grite.
- **La forma principal de usarlo es la extensión de VS Code** (subrayado en vivo) + `npm run lint` antes de un commit.
- **Mismo principio que con Prettier:** config minimalista, solo lo que se desvía del default. No copies configs inflados de blogs.

Próximo tutorial: convención de commits — el último tutorial de "higiene" antes de pasar a leer la documentación de tu proyecto.

---

## Q&A

### 27-04-2026 — ¿Existen linters para otros lenguajes (Python, Java, C, C++, C#)?

**Pregunta del learner:** ESLint avisa patrones de JS/TS. ¿Existe algo equivalente para los otros lenguajes que conoce (Python, Java, C, C++, C#)?

**Respuesta corta:** Sí, todos los lenguajes serios tienen al menos uno. Tabla de los principales:

| Lenguaje | Linter principal | Notas |
|---|---|---|
| Python | **Ruff** (moderno, rapidísimo, escrito en Rust) | Reemplaza Flake8, isort, gran parte de Pylint. **Mypy** es el type checker, separado pero complementario. |
| Java | **Checkstyle**, **PMD**, **SpotBugs**, **Error Prone** (Google) | Suelen correrse juntos en Gradle/Maven. |
| C | **Clang-Tidy** (LLVM), **Cppcheck**, flags `-Wall -Wextra -Wpedantic` de GCC | Hay límites — bugs como use-after-free necesitan **sanitizers** (AddressSanitizer) o **Valgrind**, no solo lint estático. |
| C++ | **Clang-Tidy**, **Cppcheck**, **clang-format** (formato) | Misma familia que C. |
| C# | **Roslyn analyzers** (built-in al compilador), **StyleCop**, **SonarLint** | Roslyn es el gold standard porque es parte del compilador oficial. |
| Ruby | **RuboCop** | El estándar absoluto del ecosistema Ruby. |
| Go | **`go vet`** (built-in) + **golangci-lint** (umbrella) | Lo built-in es serio. |
| Rust | **Clippy** | Oficial. Considerada una de las mejores. |

**Insight más importante:** todos hacen lo mismo conceptualmente — parsear código a AST, recorrer el árbol, aplicar reglas, reportar. **La habilidad de "leer un mensaje de lint con calma" se transfiere entre lenguajes** aunque las reglas sean distintas.

**Patrón cultural:** los lenguajes modernos (Go, Rust) tienen linter oficial mantenido por el equipo del lenguaje. JavaScript es la excepción: vino del "wild west" y ESLint fue un esfuerzo comunitario que terminó ganando.

**Distinción importante:** **type checker ≠ linter**. TypeScript (TS) es type checker. ESLint es linter. Mypy (Python) es type checker. Pylint/Ruff son linters. Los type checkers preguntan "¿los tipos cierran?". Los linters preguntan "¿este código se ve sospechoso?". Se complementan.

**Para C específicamente:** mucho del bug-catching famoso (off-by-one, use-after-free, integer overflow) **no se puede detectar con lint estático**. Por eso devs de C también usan AddressSanitizer, Valgrind, fuzzers. Es una limitación del análisis estático, no de los linters específicos. Más adelante en su carrera vale la pena explorar.



## Quiz History

[Acá quedan registradas las sesiones de quiz cuando te tome la lección.]
