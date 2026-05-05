---
concepts: REST,HTTP,API-spec,endpoints
source_repo: desarrollo
description: Cómo leer una REST API spec — qué responde cada fila (verbo, URL, acceso, body/response), cómo identificar qué está construido vs qué es aspiracional, y un walkthrough del docs/api-endpoints.md de BoxBox con curl en vivo contra los endpoints reales.
understanding_score: 8
last_quizzed: 28-04-2026
prerequisites: [~/coding-tutor-tutorials/2026-04-27-leer-un-er-diagram---mermaid-y-crows-foot.md]
created: 28-04-2026
last_updated: 28-04-2026
---

# Leer una REST API spec — el menú del restaurante

## La historia que justifica todo

Imaginate este escenario. Es 13 de julio de 2026, recién pasaron el milestone del 12/7, y tu compañero arranca con el frontend. Te pregunta:

> *"Che, ¿cuál es la URL para traer la lista de pilotos? ¿Va con paginación? ¿Necesito mandar un token? ¿Qué devuelve si no hay drivers?"*

Tenés tres formas de responderle:

1. **Le explicás de memoria** — y te equivocás en algún detalle (¿era `/api/v1/drivers` o `/api/drivers`? ¿el envelope era `{ data }` o `{ result }`?), después él escribe el frontend mal y se rompe todo.
2. **Lo mandás a leer el código del backend** — abre `drivers.controller.ts`, lee la función, infiere el contrato. 30 minutos por endpoint × 20 endpoints = una semana perdida.
3. **Le mandás `docs/api-endpoints.md`** — está todo escrito en una tabla. 5 minutos para entender el contrato completo.

La opción 3 es la que ofrece la **REST API spec**. Es **el contrato escrito entre el backend y el frontend.** Sin él:
- El backend decide arbitrariamente y el frontend descubre por error.
- O el frontend asume cosas que el backend no garantiza.
- Cada cambio en el backend rompe al frontend silenciosamente.

Con él, los dos lados se ponen de acuerdo *antes* de escribir código. **Esto es lo que vale.**

---

## ¿Qué es una REST API spec, en una oración?

Una REST API spec es **un documento que lista, para cada URL del backend, qué verbo HTTP usa, quién puede llamarla, qué se le manda y qué devuelve.**

> **Modelo mental:** la spec es el menú de un restaurante. Cada fila es un plato. La cocina (backend) y el mozo (frontend) tienen que estar de acuerdo en el menú antes de empezar el servicio. Si la cocina cocina algo que no está en el menú, el mozo no sabe ofrecerlo. Si el mozo ofrece algo que no está en el menú, la cocina dice "no tengo eso". El menú es la única fuente de verdad.

---

## Las cuatro preguntas que respondés en cada fila

Cuando leés una fila del spec, te estás haciendo cuatro preguntas, en este orden:

| Pregunta | Lo que responde la fila |
|---|---|
| **1. ¿Qué verbo?** | `GET` (leer), `POST` (crear), `PATCH` (actualizar), `PUT` (reemplazar), `DELETE` (borrar) |
| **2. ¿Qué URL?** | `/api/v1/drivers/:id` — el `:id` significa "variable, va el número real" |
| **3. ¿Quién puede llamarla?** | `Public` (cualquiera), `User` (logueado), `Admin` (solo admins), `League Owner` (solo owner de esa liga) |
| **4. ¿Qué le mandás y qué devuelve?** | El body para POST/PATCH; los query params para GET; el formato de la respuesta |

Si esas cuatro preguntas tienen respuesta, sabés todo lo que necesitás para llamar al endpoint. **Listo.**

---

## Los 5 HTTP verbs

Cada verbo significa una acción específica. Esto **no es opcional** — los verbos están estandarizados desde 1996 y todo el ecosistema (caches, proxies, browsers, frameworks) asume que vos los respetás.

| Verbo | Significa | Idempotente? | Cambia datos? | Ejemplo BoxBox |
|---|---|---|---|---|
| **GET** | Leer | Sí | No | `GET /drivers` → lista de pilotos |
| **POST** | Crear | No | Sí | `POST /drivers` con body → crea un piloto |
| **PATCH** | Actualizar parcialmente | Sí | Sí | `PATCH /drivers/14` con `{firstName: "Lando"}` → cambia solo ese campo |
| **PUT** | Reemplazar completo | Sí | Sí | `PUT /drivers/14` con todo el objeto → reemplaza la fila entera |
| **DELETE** | Borrar | Sí | Sí | `DELETE /drivers/14` → soft-delete del piloto 14 |

> **Idempotente** = si lo llamás 5 veces seguidas, el resultado es el mismo que llamarlo una vez. **GET y DELETE son idempotentes**: leer 5 veces no cambia nada; borrar algo ya borrado no lo "más-borra". **POST no es idempotente**: cada llamada crea una fila nueva.

> ⚠️ **PATCH vs PUT — la confusión típica.** PATCH manda **solo los campos que cambian**. PUT manda **el objeto completo, incluso los campos que no cambian**. En la práctica casi todos los APIs modernos usan PATCH y casi nadie usa PUT. BoxBox usa PATCH.

---

## Patrones de URL

### Path params (`:id`)

```
GET /drivers/:id
```

El `:id` no es literal — es un **placeholder**. Cuando llamás de verdad, ponés el número:

```bash
curl http://localhost:3000/api/v1/drivers/14
```

### Query params (`?key=value`)

```
GET /drivers?constructorId=5&seasonId=2026
```

Los query params son **filtros opcionales**, separados con `?` (primero) y `&` (los siguientes). Útil para listas: filtrás sin cambiar la URL base.

### Combinados

```
GET /leagues/:leagueId/members?status=ACTIVE
```

Path param para el "qué entidad" (esta liga), query param para "filtro opcional" (solo activos).

---

## Niveles de acceso

La columna "Acceso" del spec te dice **quién puede llamar** ese endpoint. Los más comunes en BoxBox:

| Nivel | Quién |
|---|---|
| `Public` | Cualquiera, incluso sin login. Ej: ver la lista de drivers. |
| `User` | Cualquier usuario autenticado. Ej: crear una liga. |
| `Admin` | Solo usuarios con rol ADMIN. Ej: borrar un driver. |
| `League Member` | Solo miembros de **esa liga específica**. Ej: ver el draft. |
| `League Owner` | Solo el creador de **esa liga específica**. Ej: kickear miembros. |

> Cuando el frontend llama un endpoint que no le corresponde (un User intenta `DELETE /drivers/14` que requiere Admin), el backend responde **`401 Unauthorized`** (no estás logueado) o **`403 Forbidden`** (estás logueado pero no tenés permiso). El nivel de acceso es lo que decide cuál de las dos.

---

## El response envelope de BoxBox

Cuando un endpoint te responde, **siempre devuelve JSON** con una estructura consistente. BoxBox eligió este formato:

**Éxito:**
```json
{
  "data": { "id": 14, "firstName": "Max", "lastName": "Verstappen" }
}
```

**Listas:**
```json
{
  "data": [ { ... }, { ... } ]
}
```
(Eventualmente con `meta` para paginación — `{ "meta": { "page": 1, "limit": 20, "total": 47 } }` — pero **no está implementado todavía**.)

**Error:**
```json
{
  "error": {
    "code": "DRIVER_NOT_FOUND",
    "message": "Driver not found",
    "status": 404
  }
}
```

> **Por qué un envelope?** Porque hace que el frontend sepa siempre dónde mirar. Si el response devolviera el objeto desnudo (`{ id: 14, firstName: "Max" }`), el frontend tendría que adivinar si fue éxito o error mirando el status HTTP. Con envelope, **el frontend hace `if (response.error) handle(error); else use(response.data)`** — predecible siempre.

---

## Status codes — los que vas a ver

El **status code** es el número que devuelve el server (200, 404, etc.). Es independiente del body. Los más comunes en BoxBox:

| Código | Significa | Cuándo |
|---|---|---|
| `200 OK` | Éxito genérico | GET, PATCH exitoso |
| `201 Created` | Algo se creó | POST exitoso |
| `204 No Content` | Éxito sin body | DELETE exitoso |
| `400 Bad Request` | El request está mal armado | Body inválido (ej: Zod rechazó) |
| `401 Unauthorized` | No estás logueado | Falta el JWT |
| `403 Forbidden` | Estás logueado pero no podés | Acceso insuficiente |
| `404 Not Found` | El recurso no existe | `GET /drivers/9999` |
| `409 Conflict` | Choque con el estado actual | Crear algo que ya existe |
| `500 Internal Server Error` | El backend explotó | Bug del backend |

> **Regla mental:** `2xx` = éxito, `4xx` = el cliente pidió mal, `5xx` = el servidor explotó. Si el frontend recibe un `4xx`, el bug es del frontend (mandó algo mal). Si recibe un `5xx`, el bug es del backend.

---

## Walkthrough de TU `docs/api-endpoints.md`

> ⚠️ **Importante antes de empezar (mismo patrón que el ER diagram):** el archivo lista la API **planeada completa**, no la construida. Al día de hoy solo tenés construidos 5 grupos: **Drivers, Constructors, Circuits, Seasons, Races**. El resto (Auth, Leagues, Predictions, Draft, etc.) está en el documento pero **no implementado**. Cuando leas el spec, tené presente que estás viendo "el destino", no "el estado actual".

### Sección que SÍ funciona — Drivers

```
| Método | Endpoint                | Acceso | Notas                                  |
|--------|-------------------------|--------|----------------------------------------|
| GET    | /drivers                | Public | Soporta ?constructorId=X&seasonId=Y    |
| GET    | /drivers/:id            | Public |                                        |
| POST   | /drivers                | Admin  | Body validado con Zod                  |
| PATCH  | /drivers/:id            | Admin  | Body validado con Zod                  |
| DELETE | /drivers/:id            | Admin  | Soft-delete, falla con dependencias    |
```

Vamos a leer la primera fila completa, aplicando las 4 preguntas:

1. **Verbo:** `GET` → estoy leyendo, no modificando.
2. **URL:** `/drivers` → la lista completa, sin path param.
3. **Acceso:** `Public` → cualquiera puede llamarlo, sin login.
4. **Qué mando / qué devuelve:** ningún body (es GET); query params opcionales (`constructorId`, `seasonId`); devuelve `{ data: [...] }` con la lista de drivers (no soft-deleted).

> ⚠️ **Caveat real**: en el spec dice que las listas tienen paginación con `meta`, pero **el backend actual no la implementó todavía**. Si llamás `GET /drivers?page=1&limit=20`, el backend ignora esos query params y devuelve la lista completa. Esto es un *gap entre la spec y el código*. Hasta que se implemente la paginación, el frontend no debería confiar en `meta`.

### Sección que NO funciona todavía — Auth

```
| POST | /auth/register | Public | Rate limit: 5/min/IP |
| POST | /auth/login    | Public | Rate limit: 5/min/IP |
```

Si llamás `POST /api/v1/auth/login` ahora, vas a recibir **`404 Not Found`** porque la ruta no está registrada en `app.ts`. Es **ruido aspiracional** — útil saber qué se va a construir, pero no la uses como referencia para programar nada hoy.

### Pruebalo en vivo (con tu server corriendo)

Si tenés `npm run dev` levantado, en otra terminal:

```bash
# Lista vacía (probable, salvo que hayas creado pilotos)
curl http://localhost:3000/api/v1/drivers

# Health check
curl http://localhost:3000/api/v1/health

# Driver inexistente
curl http://localhost:3000/api/v1/drivers/999
```

El último te debería responder con status `404` y body:
```json
{ "error": { "code": "DRIVER_NOT_FOUND", "message": "Driver not found", "status": 404 } }
```

Esto es **el spec hecho realidad**. Lo que está escrito en `api-endpoints.md` para drivers es lo que efectivamente responde el server.

---

## Predicción: las 2 confusiones que vas a tener

### "¿Por qué el frontend no usa directamente la base de datos?"

Pregunta legítima de alguien sin experiencia web. La razón corta: **la base de datos no debería ser accesible desde el navegador** — eso sería un riesgo de seguridad enorme (cualquiera podría borrar tablas con un `DROP TABLE`). El backend es la **capa de control** que recibe pedidos del frontend, valida quién es, qué quiere, si puede, y recién después toca la base. El API es la única vía de comunicación.

### "Cómo sé qué está implementado y qué no si la spec lista todo?"

Tres formas:

1. **Mirá `app.ts`** — los `app.use('/api/v1/<x>', ...)` te muestran qué routers están registrados. Si no aparece `auth`, no hay endpoints de auth funcionando.
2. **Mirá `src/modules/`** — las carpetas que existen ahí son los módulos construidos.
3. **Probá con curl** — si recibís `404` para una URL que está en la spec, es aspiracional.

---

## Try it yourself (10 min)

Con tu server corriendo (`cd backend && npm run dev`):

1. **Hacé una request real** que cree un driver, después listalo, después borralo:

   ```bash
   # Crear (debería devolver 201 con el driver creado)
   curl -X POST http://localhost:3000/api/v1/drivers \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Franco","lastName":"Colapinto","number":43,"code":"COL","externalId":"colapinto"}'

   # Listar (debería incluir a Colapinto)
   curl http://localhost:3000/api/v1/drivers

   # Borrar (debería devolver 204 sin body)
   # Reemplazá <ID> con el id que devolvió el POST
   curl -X DELETE http://localhost:3000/api/v1/drivers/<ID>

   # Confirmar borrado (debería devolver 404)
   curl http://localhost:3000/api/v1/drivers/<ID>
   ```

2. **Identificá los status codes** que recibiste en cada paso. ¿Coinciden con lo que dice este tutorial?

3. **Pregunta de razonamiento:** ¿qué `status` y `code` esperarías recibir si hicieras `POST /drivers` con body inválido (ej: sin `firstName`)? ¿Y si intentaras crear dos drivers con el mismo `externalId`?

Mandame las respuestas a las 3.

---

## Resumen — lo que tiene que quedar pegado

- **Una REST API spec es el contrato escrito entre backend y frontend.** Sin spec, los dos lados adivinan y se rompen.
- **Cada fila responde 4 preguntas:** verbo, URL, acceso, body/response.
- **5 verbos HTTP** con semánticas estandarizadas: GET (leer), POST (crear), PATCH (actualizar parcial), PUT (reemplazar), DELETE (borrar).
- **Status codes**: `2xx` éxito, `4xx` cliente mal, `5xx` server roto.
- **El response envelope de BoxBox** es `{ data }` para éxito, `{ error: { code, message, status } }` para fallo. Predecible siempre.
- **El spec lista la API completa planeada, no solo la construida.** Verificá con `app.ts`, `src/modules/`, o `curl` qué está vivo.

---

Con este tutorial cerramos la **semana 1**. Cuando termines la lectura + el ejercicio, hacemos un **quiz baseline** sobre los 5 tutoriales (1 pregunta por concepto, 1-10 honesto) para tener un punto de partida medible. Después arrancamos formalmente con la semana 2 (cuya tarea es escribir `docs/domain-entities.md`, donde aplicamos lo aprendido del ER diagram).

---

## Q&A

[Acá se van a ir agregando las preguntas que hagas mientras leés o después.]

## Quiz History

[Acá quedan registradas las sesiones de quiz cuando te tome la lección.]
