---
concepts: JavaScript,types,memory,primitives,references
source_repo: desarrollo
description: Cómo entender el sistema de tipos y manejo de memoria de JavaScript desde el background de Python/C — qué se parece a qué, dónde JS es único, y los gotchas que vas a encontrar primero (null vs undefined, == vs ===, value vs reference, const que no es inmutable).
understanding_score: 8
last_quizzed: 05-05-2026
prerequisites: []
created: 01-05-2026
last_updated: 01-05-2026
---

# JavaScript types y memoria — desde el background Python/C

## La historia que justifica todo

Hasta ahora viste código TypeScript en BoxBox sin haber pensado mucho qué pasa cuando declarás una variable. Estás escribiendo cosas tipo:

```typescript
const driver = await prisma.driver.findUnique({ where: { id: 1 } });
```

Y "anda". Pero hay una capa abajo de eso que **viene de JavaScript**, no de TypeScript. TypeScript solo *anota* tipos en compile-time; cuando ese código corre, es JS puro. Y JS hace cosas distintas a Python y a C que vale la pena entender antes de seguir.

Tres situaciones reales que vas a vivir:

1. Vas a tener un objeto que pensás que copiaste, pero en realidad **lo compartiste** — y modificarlo afecta al original. Bug clásico de las primeras semanas.
2. Vas a comparar `null` con `undefined` y vas a encontrar que `null == undefined` es `true` pero `null === undefined` es `false`. **Los tres signos importan.**
3. Vas a declarar `const drivers = []` y vas a hacer `drivers.push(...)` sin que se queje, y te vas a preguntar para qué sirve `const`.

Cada una de estas tiene una razón clara, y la mayoría se entiende mejor poniendo JS al lado de Python y C. Eso vamos a hacer.

---

## El espectro de tipos: dónde está JS

Pongamos los tres lenguajes en una tabla mental:

| | C | JS | Python |
|---|---|---|---|
| **Tipos en variables** | Estático y explícito (`int x = 5`) | **Dinámico** (`let x = 5`) | Dinámico (`x = 5`) |
| **Chequeo en compile-time** | Sí, fuerte | No (el motor no chequea) | No |
| **Memoria** | Manual (`malloc`/`free`) | **Garbage Collected** | Garbage Collected |
| **Pointers explícitos** | Sí (`int *p`) | No | No |
| **Pass by value vs reference** | Value (salvo pointers) | **Mixed** — primitives by value, objects by reference | Mixed (similar a JS) |

> **Modelo mental:** JS está más cerca de Python que de C. Si venís pensando como Python, casi todo te va a sonar conocido. Donde JS es raro, lo voy a marcar explícitamente.

**TypeScript (que usa BoxBox) es una capa encima de JS** que agrega chequeo de tipos en compile-time. En runtime, el código que se ejecuta es JS. Por eso entender JS primero es importante: TypeScript te protege de muchos errores, pero los principios de JS siguen abajo.

---

## Los 8 tipos de JavaScript

JS tiene **7 primitivos** + **objetos**. Acá va la lista cruda con un equivalente Python/C cuando aplica:

| Tipo JS | Ejemplo | Equivalente Python | Equivalente C |
|---|---|---|---|
| `string` | `"Verstappen"` | `str` | `char *` (más o menos) |
| `number` | `42` o `3.14` | `int` Y `float` juntos | `int`/`float`/`double` (todos en uno) |
| `boolean` | `true` / `false` | `True` / `False` | `0` / `1` |
| `null` | `null` | `None` | `NULL` |
| `undefined` | `undefined` | (no existe) | (no existe) |
| `symbol` | `Symbol("foo")` | (no existe — avanzado) | (no existe) |
| `bigint` | `100n` | `int` para números grandes | `long long` |
| **`object`** | `{}`, `[]`, funciones | `dict`, `list`, `def` | `struct *` (con muchas comillas) |

Los **primitivos son inmutables y se copian por valor** (más sobre esto en un toque). Los **objetos viven en el heap y se comparten por referencia.**

### Lo raro: `null` y `undefined`

JS tiene **dos formas distintas de "nada"**. C tiene solo `NULL`. Python tiene solo `None`. ¿Por qué JS tiene dos?

**`undefined`** = "no te dije el valor". Es el estado **por default**.
- Una variable declarada sin asignar: `let x;` → `x` es `undefined`.
- Una propiedad de objeto que no existe: `obj.foo` (cuando `foo` no está) → `undefined`.
- Una función que no devuelve nada: `function f() {}; f()` → `undefined`.

**`null`** = "te estoy diciendo explícitamente que no hay nada". Es **intencional**.
- Lo asignás a propósito: `let x = null;` → "esto está vacío a propósito".
- En BoxBox: `deletedAt: null` significa "este driver NO está borrado". Si fuera `undefined`, sería "no sabemos su estado de borrado", semánticamente distinto.

> **Modelo mental:** `undefined` es el estado *por default* del universo. `null` es vos diciendo *"acá pongo nada a propósito"*. La diferencia importa porque expresan intenciones distintas. Cuando una API devuelve `null` te está diciendo "esto no existe en este momento". Cuando devuelve `undefined`, te está diciendo "ni siquiera lo busqué".

**Comparación entre los dos** (el famoso landmine):

```javascript
null == undefined   // true   ← coerción los considera "ambos son nada"
null === undefined  // false  ← strict los considera distintos (porque lo son)
```

Más sobre `==` vs `===` en un toque.

### Numbers — un solo tipo para todo

Esto es **muy raro** comparado con C. JS tiene **un solo tipo numérico**, `number`. No hay distinción entre integer y float:

```javascript
const a = 5;       // number
const b = 5.0;     // también number, mismo tipo
const c = 5 / 2;   // 2.5, también number

5 + 0.1            // 5.1, todo number, sin "integer division"
```

Internamente, todos los `number` son **64-bit floating point** (IEEE 754). Esto te trae el bug clásico:

```javascript
0.1 + 0.2 === 0.3   // false  ← qué?!
0.1 + 0.2           // 0.30000000000000004
```

No es un bug de JS — es **inherente al floating point**. C tiene exactamente el mismo problema con `float`/`double`. Python te lo esconde un poco más, pero también lo tiene. Es un gotcha del hardware, no del lenguaje.

> Para money y cosas precisas, no usés `number` directamente. En BoxBox eventualmente vas a necesitar manejar puntos de scoring y predicciones — para esos vamos a usar enteros (multiplicar por 100 si necesitás "decimales") o `bigint` si las cantidades crecen.

---

## El concepto que más bugs causa: value vs reference

Esto es la idea más importante del tutorial. Internalizalo bien.

**Primitives** (string, number, boolean, null, undefined, symbol, bigint) **se copian por valor**.

**Objects** (incluyendo arrays y funciones) **se comparten por referencia**.

### Demostración con primitives:

```javascript
let a = 5;
let b = a;        // copia el valor 5 a b
b = 10;           // cambia b
console.log(a);   // 5 — a NO se modificó
console.log(b);   // 10
```

Esto es lo que esperás viniendo de C o Python. **Cada variable tiene su propio 5.**

### Demostración con objects:

```javascript
let driver1 = { name: "Verstappen", number: 1 };
let driver2 = driver1;            // ⚠️ no copia el objeto, copia la REFERENCIA
driver2.number = 99;              // modifica el objeto compartido

console.log(driver1.number);      // 99 — driver1 también cambió!
console.log(driver1 === driver2); // true — ambos apuntan al mismo objeto
```

**Bomba.** `driver2 = driver1` no creó un objeto nuevo. Creó otra variable apuntando al **mismo objeto en memoria**. Modificás uno, ambos cambian.

> **Modelo mental:**
> - Un primitive es como un papelito con un número escrito. Si te paso una copia del papelito, vos cambiás tu copia y la mía sigue intacta.
> - Un objeto es como un Google Doc compartido. Vos y yo tenemos URLs distintas (variables), pero apuntan al mismo documento. Si vos editás, yo veo los cambios.

### En BoxBox esto importa cuando...

Cuando hacés una query Prisma y obtenés un objeto:

```typescript
const driver = await prisma.driver.findUnique({ where: { id: 1 } });
const driverCopy = driver;
driverCopy.firstName = "Lando";

// driver.firstName ahora también es "Lando" — modificaste el objeto compartido
```

Si necesitás una **copia real** de un objeto, hay opciones:

```javascript
const shallowCopy = { ...driver };           // spread operator (1 nivel)
const arrayCopy = [...drivers];               // mismo para arrays
const deepCopy = structuredClone(driver);     // copia profunda (todos los niveles)
```

**Para BoxBox actual:** Prisma te devuelve objetos nuevos cada query, así que no es un problema constante. Pero vas a necesitar este reflejo cuando trabajes con state de React (semana 13+) — ahí esto **es la fuente principal de bugs**.

---

## `==` vs `===` — el landmine famoso

JS tiene dos operadores de igualdad. Casi siempre vas a querer **`===`** (tres signos).

**`==`** (loose equality) — hace **type coercion** antes de comparar. Convierte tipos para que "encajen". Esto produce resultados raros:

```javascript
0 == false          // true
0 == ""             // true
"" == false         // true
[] == false         // true
[1] == "1"          // true
null == undefined   // true
```

**`===`** (strict equality) — no hace coerción. Si los tipos son distintos, devuelve `false` directo.

```javascript
0 === false         // false
0 === ""            // false
null === undefined  // false
```

> **Regla práctica:** **siempre usá `===`**. La única excepción legítima es `x == null` (que es shorthand para `x === null || x === undefined`), y aún así muchos linters te van a marcar warning. Si tu config de ESLint en BoxBox ve un `==`, te lo va a flagear.

> **Por qué existe `==` entonces?** Decisión de diseño temprana de JS (1995, Brendan Eich, lo escribió en 10 días). Quedó por compatibilidad. **No es una buena parte del lenguaje.**

---

## `const`, `let`, `var` — y por qué `const` no es inmutable

**`var`** — la forma vieja, function-scoped, evitar siempre. Existe por compatibilidad.

**`let`** — variable que podés reasignar:

```javascript
let count = 0;
count = count + 1;  // OK
```

**`const`** — variable que **NO podés reasignar**, pero el valor adentro **sí puede mutar** si es un objeto:

```javascript
const driver = { name: "Verstappen" };
driver.name = "Lando";              // OK — mutaste el objeto
driver.number = 1;                  // OK — agregás propiedad
driver = { name: "Otro" };          // ❌ Error — no podés reasignar la binding
```

> **Modelo mental:** `const` no congela el valor. Congela **la conexión entre el nombre y el valor**. Es como si el nombre `driver` estuviera atado con cadena al objeto — no podés cambiar a qué objeto está atado, pero el objeto sí se puede modificar adentro.

**Cuándo usar cada uno (regla):**
- `const` por default. Siempre. Salvo que sepas que vas a reasignar.
- `let` cuando vayas a reasignar (un counter, una variable que cambia en un loop).
- `var` nunca.

Mirá [`backend/src/modules/drivers/drivers.service.ts`](backend/src/modules/drivers/drivers.service.ts) — vas a ver `const notDeleted = { deletedAt: null }` arriba. Es `const` porque el equipo nunca reasigna esa variable, aunque el objeto referenciado podría mutarse (pero no se hace).

---

## Memoria — qué pasa cuando declarás algo

Esto es donde JS se aleja **mucho** de C y se parece **mucho** a Python.

**En C** vos manejás todo:
```c
char *name = malloc(20);   // pedís memoria
strcpy(name, "Verstappen");
free(name);                // la liberás
```

**En JS** no pedís ni liberás nada explícitamente:
```javascript
let name = "Verstappen";   // JS asigna memoria automáticamente
// ... usás name ...
// cuando ya no haya referencias, JS la libera (garbage collection)
```

**Cómo funciona el GC** (a grandes rasgos): el motor de JS (V8 en Node) lleva la cuenta de qué objetos siguen siendo "alcanzables" desde tu código. Cuando un objeto deja de ser referenciado por nadie, queda como candidato a ser borrado. Cada cierto tiempo, el GC corre y libera la memoria de esos objetos.

> **Modelo mental:** imaginá que cada objeto tiene una cuerda atada a él. Si vos sostenés la cuerda (con una variable que apunta al objeto), el objeto sobrevive. Si soltás todas las cuerdas, el objeto se va flotando y eventualmente desaparece.

**Implicaciones prácticas para vos viniendo de C:**
- ❌ No tenés que llamar `free()`. Olvidate.
- ❌ No hay leaks "clásicos" tipo `malloc` sin `free`. (Pero sí podés tener leaks de otro tipo — referencias circulares, listeners no removidos, etc. Cosa de más adelante.)
- ✅ Esto es exactamente como Python, así que tu intuición de Python aplica.

---

## TypeScript — la capa que agrega tipos chequeados

JS no chequea tipos. TypeScript sí. Es **una capa de annotations** que viven en compile-time, se chequean cuando corrés `tsc` (o tu IDE), y **desaparecen** al ejecutarse.

Sin TypeScript:
```javascript
function getDriver(id) {
  return prisma.driver.findUnique({ where: { id } });
}

getDriver("hola");  // JS no se queja. Va a romper en runtime.
```

Con TypeScript:
```typescript
function getDriver(id: number) {
  return prisma.driver.findUnique({ where: { id } });
}

getDriver("hola");  // ❌ TS error en compile-time: "string is not assignable to number"
```

> **Modelo mental:** TypeScript es como C en el chequeo de tipos en compile-time, pero con la flexibilidad de JS en runtime. Lo mejor de ambos.

En BoxBox, vas a ver TypeScript everywhere:

```typescript
// backend/src/modules/drivers/drivers.schema.ts
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
```

Esto declara un type derivado de un schema Zod. Cuando uses `CreateDriverInput` en una función, TypeScript te va a chequear que pases un objeto con la forma correcta. Si te falta `firstName`, te lo grita en el editor antes de correr nada.

**No vamos a profundizar en TS hoy** — habrá un tutorial dedicado en semana 4. Lo importante por ahora: **TS no cambia cómo JS funciona en runtime, solo agrega chequeos en tiempo de escritura.**

---

## Predicción: las 3 confusiones que vas a tener

### Confusión 1: "Modifiqué una copia y se rompió el original"

El error de "pasé por value, ah no, era reference". Cuando lo veas:
1. Identificá si el valor era primitive u object.
2. Si era object, te confiaste mal — eso era una referencia, no una copia.
3. Solución: usá `{ ...obj }` o `structuredClone()` para una copia real.

### Confusión 2: "Porqué `if (x)` no me funciona como esperaba?"

JS tiene **truthy/falsy** — valores que se evalúan a true/false en contextos booleanos:

| Falsy (evalúa a false) | Todo lo demás (truthy) |
|---|---|
| `false`, `0`, `""`, `null`, `undefined`, `NaN`, `-0` | `"0"`, `"false"`, `[]`, `{}`, números != 0 |

Notá: `if (x)` con `x = []` (array vacío) entra al `if` porque `[]` es truthy. En Python, `[]` es falsy. **Diferencia real.**

### Confusión 3: "El NaN se comporta raro"

`NaN === NaN` es `false`. Sí, en serio. `NaN` es **el único valor en JS que no es igual a sí mismo.**

```javascript
const x = parseInt("hola");  // NaN
x === NaN                     // false
Number.isNaN(x)               // true ← usá esto siempre
```

Cuando hagas math con strings o cosas raras, podés terminar con `NaN`. Para detectarlo, **siempre `Number.isNaN(x)`** en vez de `x === NaN`.

---

## Try it yourself (10 min, opcional)

Abrí una terminal y corré `node` (sin argumentos). Te abre un REPL interactivo de JS. Probá esto y observá:

```javascript
// Reference vs value
let a = { x: 1 }; let b = a; b.x = 99; console.log(a.x);    // ¿qué imprime?

// Coerción
0 == ""           // ¿qué devuelve?
[] == false       // ¿qué devuelve?
null == undefined // ¿qué devuelve?

// const con objeto
const obj = { count: 0 }; obj.count = 5; console.log(obj);  // ¿qué imprime?

// NaN raro
const n = "hola" / 2; console.log(n, n === NaN, Number.isNaN(n));

// Truthy/falsy con array vacío
if ([]) console.log("entró"); else console.log("no entró");
```

Anotá los resultados. Para cada uno, intentá explicarte vos mismo POR QUÉ devolvió eso, basado en lo que leíste arriba. Si alguno te sorprende, mandámelo y lo desarmamos.

---

## Resumen — lo que tiene que quedar pegado

- **JS es dinámicamente tipado, GC, similar a Python en filosofía.** TS agrega tipos en compile-time pero no cambia el runtime.
- **8 tipos: 7 primitivos + objects.** Los primitivos se copian por valor. Los objects se comparten por referencia.
- **`null` ≠ `undefined`.** El primero es intencional ("no hay nada acá"); el segundo es default ("no te dije").
- **`===` siempre, `==` casi nunca.** El segundo hace coerción y produce sorpresas.
- **`const` no congela el objeto, solo la binding.** Mutar el contenido sigue siendo válido.
- **No hay `malloc`/`free`.** GC se ocupa. Pensá como Python, no como C.
- **Truthy/falsy**: `[]` y `{}` son truthy en JS (distinto a Python). `NaN === NaN` es `false`.

---

Próximo tutorial de semana 2: **Cómo armar `domain-entities.md` desde un ER**. Ese es la **acción concreta** del plan — escribir el documento real que describe el modelo de BoxBox en español.

---

## Q&A

[Acá se van a ir agregando las preguntas que hagas mientras leés o después.]

## Quiz History

[Acá quedan registradas las sesiones de quiz cuando te tome la lección.]
