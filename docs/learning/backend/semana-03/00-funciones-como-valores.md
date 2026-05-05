---
concepts: first-class-functions,scope,function-values,higher-order-functions
source_repo: desarrollo
description: El concepto previo que hace falta para entender closures y callbacks — en JS las funciones son valores como cualquier otro, y una función puede "ver" las variables del lugar donde fue creada. Corto y directo.
understanding_score: null
last_quizzed: null
prerequisites: [docs/learning/backend/semana-02/01-js-types-y-memoria---del-background-python-y-c.md]
created: 05-05-2026
last_updated: 05-05-2026
---

# Funciones como valores — el concepto que desbloquea todo lo demás

Este tutorial es corto a propósito. Cubre una sola idea que, cuando la tenés clara, hace que closures y callbacks dejen de parecer magia.

---

## La idea central

En C, una función es una dirección de memoria. No la podés guardar en una variable normal, no la podés pasar como argumento fácilmente, no la podés devolver como resultado.

En JS **una función es un valor como cualquier otro**. Igual que un número, un string, o un array.

Mirá esto:

```typescript
// Un número en una variable
const edad = 25;

// Una función en una variable — exactamente igual
const saludar = function() {
  console.log("Hola");
};

// Las dos son variables. Las dos guardan un valor.
console.log(typeof edad);    // "number"
console.log(typeof saludar); // "function"
```

`saludar` no es el *resultado* de llamar una función. Es la función en sí — guardada en una variable, lista para usarse después.

Para *ejecutar* esa función, usás paréntesis:

```typescript
saludar();   // ejecuta → imprime "Hola"
saludar;     // no ejecuta → solo la función sentada ahí, sin hacer nada
```

Esa distinción — **con paréntesis ejecuta, sin paréntesis es un valor** — es clave para todo lo que viene.

---

## Pasar una función como argumento

Si las funciones son valores, puedo pasarlas como argumentos a otras funciones.

En Python ya lo hiciste:

```python
lista = [3, 1, 2]
sorted(lista, key=lambda x: -x)  # pasás una función como key
```

En JS es lo mismo, sin el `lambda`:

```typescript
const numeros = [3, 1, 2];

function esGrande(n: number) {
  return n > 2;
}

const grandes = numeros.filter(esGrande);  // pasás esGrande sin ()
console.log(grandes); // [3]
```

`filter` recibe una función y la llama internamente por cada elemento. Vos no la llamás — `filter` la llama. Por eso no va con `()`.

---

## Devolver una función como resultado

Una función también puede *devolver* otra función.

```typescript
function crearSaludo(nombre: string) {
  return function() {
    console.log("Hola, " + nombre);
  };
}

const saludarAna = crearSaludo("Ana");
const saludarLuis = crearSaludo("Luis");

saludarAna();  // "Hola, Ana"
saludarLuis(); // "Hola, Luis"
```

`crearSaludo("Ana")` no imprime nada. Devuelve una función nueva. Esa función la guardamos en `saludarAna`. Cuando queremos que imprima, llamamos `saludarAna()`.

Ahora la pregunta clave: `saludarAna` recuerda que `nombre = "Ana"` aunque `crearSaludo` ya terminó de ejecutarse hace rato. ¿Por qué?

---

## Por qué una función recuerda su entorno — scope

Cuando una función se crea, "ve" todas las variables del lugar donde fue creada. Ese conjunto de variables visibles se llama **scope**.

```typescript
function crearSaludo(nombre: string) {
  // acá nombre existe

  return function() {
    console.log("Hola, " + nombre);
    // esta función también ve nombre — porque fue creada acá adentro
  };
}
```

La función interna (la que se devuelve) fue creada *dentro* de `crearSaludo`, así que puede ver la variable `nombre`. Cuando `crearSaludo` termina, la función interna *se lleva* una referencia a `nombre` — no la copia, sino una referencia viva.

Eso es una **closure**: una función que recuerda las variables del scope donde nació.

---

## Las tres ideas en una imagen

```
┌─────────────────────────────────────────────────────┐
│  crearSaludo("Ana") corre                           │
│                                                     │
│  nombre = "Ana"  ←─────────────────────┐           │
│                                        │           │
│  return function() {                   │           │
│    console.log("Hola, " + nombre) ────┘  (ve nombre)
│  }                                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
           │
           ▼
  crearSaludo termina, pero la función interna
  sigue viva en saludarAna, y todavía recuerda nombre = "Ana"
```

---

## Resumen — las tres cosas que necesitás saber

1. **Una función es un valor.** Se puede guardar en variable, pasar como argumento, devolver como resultado. Sin `()` no se ejecuta.

2. **Una función puede ver las variables del scope donde fue creada.** Si fue creada dentro de otra función, ve las variables de esa función externa.

3. **Esa "memoria" se llama closure.** La función interna se lleva una referencia al entorno de la función externa, aunque la externa ya haya terminado.

Con esto claro, el tutorial [01 — Closures, callbacks y this](01-closures-callbacks-y-this.md) debería tener mucho más sentido. En particular:

- `validate(schema)` que devuelve una función → ya sabés que eso es posible y por qué funciona
- `driversController.getAll` sin `()` pasado a `router.get` → ya sabés que es un valor, no una llamada
- La función devuelta por `validate` que recuerda `schema` → ya sabés que eso es una closure

---

## Q&A

[Acá se van a ir agregando las preguntas que hagas mientras leés o después.]

## Quiz History

[Acá quedan registradas las sesiones de quiz cuando se tome la lección.]
