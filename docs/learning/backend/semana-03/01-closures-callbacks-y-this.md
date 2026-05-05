---
concepts: closures,callbacks,this,arrow-functions,higher-order-functions
source_repo: desarrollo
description: Los tres conceptos de funciones en JS que más confunden a quien viene de Python/C — closures (funciones que recuerdan su entorno), callbacks (funciones como argumentos), y this (el contexto dinámico). Con ejemplos del código real de BoxBox.
understanding_score: null
last_quizzed: null
prerequisites: [docs/learning/backend/semana-02/01-js-types-y-memoria---del-background-python-y-c.md]
created: 05-05-2026
last_updated: 05-05-2026
---

# Closures, callbacks y `this`

## La historia que justifica todo

Abrís `backend/src/middleware/validate.ts` y ves esto:

```typescript
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    // ...
    next();
  };
}
```

Y en las rutas, esto:

```typescript
router.post('/', validate(createDriverSchema), driversController.create);
```

Si venís de Python o C, acá hay tres cosas que no existen en esos lenguajes al mismo tiempo:

1. `validate(createDriverSchema)` **devuelve una función** — no un resultado, una función entera.
2. Esa función devuelta **recuerda** que `schema = createDriverSchema` aunque `validate` ya terminó de ejecutarse.
3. `driversController.create` se está **pasando como argumento** sin llamarlo (sin paréntesis).

Eso es closures + callbacks conviviendo en dos líneas. Este tutorial los desarma uno por uno.

---

## Callbacks — funciones como datos

### La idea

En C, una función vive en una dirección de memoria fija y no la podés pasar fácilmente. En Python empezaste a ver que sí se puede (`sorted(lista, key=lambda x: x[1])`). En JS esto es absolutamente central — las funciones son valores como cualquier otro: se guardan en variables, se pasan como argumentos, se devuelven como resultado.

Una **función de orden superior** (*higher-order function*) es cualquier función que recibe o devuelve otra función. Un **callback** es la función que le pasás.

### En Express

Mirá `backend/src/modules/drivers/drivers.routes.ts`:

```typescript
router.get('/', driversController.getAll);
router.post('/', validate(createDriverSchema), driversController.create);
```

`router.get` es una función de orden superior. Su firma es, en pseudocódigo:

```
router.get(path, ...handlers)
```

Los `handlers` son callbacks — Express los va a llamar cuando llegue un request que matchee ese path. Vos no los llamás ahora: Express los llama después, cuando corresponda.

Notar que `driversController.getAll` **no tiene paréntesis**. Si escribieras `driversController.getAll()` estarías llamando la función inmediatamente y pasando su *resultado* (que sería una Promise, no una función). Eso no es lo que Express espera.

> **Regla práctica:** cuando ves una función que se pasa sin `()`, es un callback — alguien más la va a llamar después.

### El pattern try/catch/next

En `backend/src/modules/drivers/drivers.controller.ts`:

```typescript
export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const drivers = await driversService.findAll();
    res.json({ data: drivers });
  } catch (err) {
    next(err);
  }
}
```

`next` es sí mismo un callback. Express te lo inyecta cuando llama a tu handler. Si lo llamás sin argumentos (`next()`), Express pasa al siguiente middleware. Si lo llamás con un error (`next(err)`), Express va directo al error handler. Es la forma de "devolver" un error sin tirar una excepción que nadie atrape.

---

## Closures — funciones que recuerdan

### La idea

Una **closure** es una función que, cuando se crea, captura las variables del scope donde nació — y las *recuerda* aunque ese scope ya no exista.

En Python existe pero es menos obvio:

```python
def multiplicador(n):
    def multiplicar(x):
        return x * n   # n viene del scope exterior
    return multiplicar

doble = multiplicador(2)
doble(5)  # → 10
```

`multiplicar` "recuerda" `n` aunque `multiplicador` ya terminó. Eso es una closure.

En JS pasa exactamente lo mismo:

```typescript
function multiplicador(n: number) {
  return (x: number) => x * n;  // arrow function que recuerda n
}

const doble = multiplicador(2);
doble(5); // → 10
```

### En BoxBox — `validate`

El ejemplo más concreto en el código es `backend/src/middleware/validate.ts`:

```typescript
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);  // usa schema del scope exterior
    // ...
  };
}
```

Cuando hacés `validate(createDriverSchema)`:

1. `validate` corre y crea una nueva función anónima.
2. Esa función anónima captura `schema = createDriverSchema` en su closure.
3. `validate` termina y devuelve esa función.
4. Express guarda esa función como middleware del route.
5. Cuando llega un POST, Express llama esa función — y `schema` sigue siendo `createDriverSchema` aunque hace rato que `validate` terminó.

Esto te permite tener **un solo middleware genérico** (`validate`) y especializarlo con distintos schemas para distintos routes, sin repetir código.

### En BoxBox — `notDeleted`

Mirá esta línea en `backend/src/modules/drivers/drivers.service.ts`:

```typescript
const notDeleted = { deletedAt: null };

export async function findAll(constructorId?: number, seasonId?: number) {
  return prisma.driver.findMany({
    where: {
      ...notDeleted,
      // ...
    },
  });
}
```

`notDeleted` es una variable del scope del módulo que `findAll` captura. Es una closure más simple: en lugar de devolver una función, `findAll` simplemente usa una variable del scope donde fue definida. Cada función del service puede usar `notDeleted` sin recibirla como parámetro.

---

## `this` — el contexto dinámico

### La idea central

`this` es el concepto más raro de JS si venís de Python o C.

En Python, el objeto al que pertenece un método siempre es `self`, que es **explícito** — Python te lo pasa como primer argumento y vos lo declarás:

```python
class Servicio:
    def encontrar_todos(self):
        return self.datos   # self es siempre la instancia
```

En JS, el contexto se llama `this` y es **implícito e invisible** — no lo declarás, simplemente está ahí. Y lo que hace que `this` sea confuso es que **su valor depende de cómo se llama la función**, no de dónde está definida.

### Cómo funciona `this`

Hay cuatro situaciones:

**1. Método de objeto:**
```typescript
const obj = {
  valor: 42,
  getValor() {
    return this.valor;  // this = obj
  }
};
obj.getValor(); // → 42
```

**2. Función sola (o callback de función regular):**
```typescript
function mostrar() {
  console.log(this); // En strict mode: undefined. En sloppy mode: window/global
}
mostrar();
```

**3. Arrow function — NO tiene su propio `this`:**
```typescript
const obj = {
  valor: 42,
  getValor: () => {
    return this.valor;  // this NO es obj — es el this del scope exterior
  }
};
obj.getValor(); // → undefined (o error)
```

**4. Clases:**
```typescript
class Servicio {
  valor = 42;

  getValor() {
    return this.valor;  // this = instancia de Servicio
  }
}
const s = new Servicio();
s.getValor(); // → 42
```

### Por qué BoxBox no tiene problemas con `this`

Mirá cómo está escrito el código de BoxBox. El controller y el service usan **funciones sueltas exportadas**, no clases:

```typescript
// drivers.controller.ts — funciones sueltas, sin clase, sin this
export async function getAll(req, res, next) { ... }
export async function create(req, res, next) { ... }
```

```typescript
// drivers.service.ts — funciones sueltas, sin clase, sin this
export async function findAll() { ... }
export async function create(input) { ... }
```

Cuando no usás clases, `this` no entra en juego. BoxBox eligió deliberadamente este estilo para evitar la confusión. Es una decisión de diseño, no un accidente.

El problema con `this` aparece cuando usás clases y pasás métodos como callbacks:

```typescript
class DriverService {
  async findAll() {
    return prisma.driver.findMany();
  }
}

const service = new DriverService();

// ⚠️ Trampa clásica:
setTimeout(service.findAll, 1000);
// Acá service.findAll se desconecta de service.
// Cuando setTimeout lo llame, `this` ya no es service — es undefined.
```

Esto no pasa en BoxBox porque no hay clases. Pero lo vas a ver en otros proyectos o en los videos de la cátedra.

### Arrow functions y `this` — la solución moderna

Arrow functions no tienen su propio `this` — heredan el `this` del scope donde fueron creadas. Eso las hace seguras para usar como callbacks cuando necesitás acceder a `this`:

```typescript
class DriverService {
  async findAll() {
    return prisma.driver.findMany();
  }

  // Arrow function: this siempre será la instancia
  safeCallback = async () => {
    return this.findAll(); // this es la instancia, siempre
  }
}
```

---

## Try it yourself

Abrí `backend/src/middleware/validate.ts`. Ya sabés que `validate` devuelve una closure.

1. Añadí un `console.log('validate creando middleware para schema:', schema)` dentro de `validate` pero **fuera** de la función que devuelve.
2. Añadí otro `console.log('middleware ejecutándose')` **dentro** de la función devuelta.
3. Levantá el servidor (`npm run dev`) y mandá un POST a `/api/v1/drivers`.
4. Observá cuándo aparece cada log: ¿cuál corre al arrancar el servidor? ¿Cuál corre con cada request?

Esa diferencia de timing es exactamente la diferencia entre cuando se crea la closure y cuando se ejecuta.

---

## Predicción de confusiones

**"¿Por qué `router.get('/', driversController.getAll)` no tiene `()`?"**
Porque estás pasando la función, no llamándola. Express la va a llamar. Si pusieras `()` la llamarías vos ahora, en el momento del setup, y pasarías el resultado (una Promise) en vez de la función.

**"`this` me parece magia — ¿cómo sé cuál es?"**
La regla práctica: mirá a la izquierda del punto en la llamada. `objeto.metodo()` → `this` es `objeto`. Sin punto (`funcion()`) → `this` es `undefined` (en strict mode) o el global. Arrow function → `this` viene de afuera.

**"¿Las closures no generan memory leaks?"**
Solo si guardás referencias que nunca se liberan. En el patrón de BoxBox (closures efímeras por request) no hay problema — cada closure vive lo que dura un request y el garbage collector la limpia después.

**"¿Cuándo uso arrow function y cuándo función regular?"**
Para callbacks cortos que no necesitan su propio `this`: arrow function. Para métodos de módulo exportados como los de BoxBox: función regular (con `function` o `export function`). Para métodos de clase que se van a pasar como callbacks: arrow function (para preservar `this`).

---

## Q&A

[Acá se van a ir agregando las preguntas que hagas mientras leés o después.]

## Quiz History

[Acá quedan registradas las sesiones de quiz cuando se tome la lección.]
