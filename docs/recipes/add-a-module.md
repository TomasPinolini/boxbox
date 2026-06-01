# Receta — Agregar un módulo nuevo al backend

Receta paso a paso para crear un módulo de dominio nuevo (ej: `predictions`, `league_members`, `draft`). Pensada para que un dev pueda clonar el patrón sin reinventar nada.

**Modelo a clonar**: [`backend/src/modules/drivers/`](../../backend/src/modules/drivers/) — los 5 archivos están comentados línea por línea con la responsabilidad de cada uno. Léelos al menos una vez antes de empezar.

**Convención fuente**: [`CLAUDE.md`](../../CLAUDE.md) sección *Module pattern*.

---

## Cuándo crear un módulo nuevo

Un módulo es un **agregado del dominio que se expone vía HTTP**. Regla simple: si el dominio tiene una entidad principal con su propio ciclo de vida y sus propios endpoints (`GET /X`, `POST /X`, etc.), eso es un módulo.

**Sí, son módulos:** `drivers`, `constructors`, `circuits`, `seasons`, `races`, `leagues`, `auth`, `predictions`.

**No, no son módulos:**

- Helpers compartidos (van en `shared/`).
- Middleware genérico (va en `middleware/`).
- Subrecursos que no tienen lógica propia (ej: `/drivers/:id/results` es endpoint del módulo `races` o `drivers`, no un módulo `results` aparte — depende de dónde vive la lógica).

Si dudás, mirá si la entidad tiene su propia tabla en `schema.prisma`. Casi siempre un módulo = una tabla principal + sus operaciones.

---

## Los 5 archivos del módulo

Cada módulo vive en `backend/src/modules/<nombre>/` y tiene exactamente estos archivos:

| Archivo | Responsabilidad | NO hace |
|---|---|---|
| `<nombre>.routes.ts` | Mapea URL → handler. Aplica `validate()` middleware. | Lógica de negocio. Acceso a DB. |
| `<nombre>.controller.ts` | Parsea `req`, llama service, arma response envelope, `next(err)` en catch. | Lógica de negocio. Acceso a DB. |
| `<nombre>.service.ts` | Lógica + queries Prisma. Lanza `AppError`/`NotFoundError`/`ConflictError`. | Tocar `req`/`res`/`next`. |
| `<nombre>.schema.ts` | Schemas Zod + tipos `z.infer`-eados. | Cualquier lógica. |
| `<nombre>.test.ts` | Tests de integración con Supertest contra la DB real. | Mockear nada. |

**Importante**: el nombre del módulo es **plural** en inglés (`drivers`, no `driver`). Misma regla que las tablas Prisma.

---

## Pasos

### 1. Diseñar la tabla en `schema.prisma`

Antes de tocar TypeScript, modelá la entidad en [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma).

Decisiones a tomar:

- **¿Soft-delete?** Solo entidades de catálogo (Driver, Constructor, Circuit) llevan `deletedAt`. Las transaccionales (RaceResult, FantasyTeam) no. Ver ADR-0004 cuando exista.
- **¿`externalId`?** Si la entidad se sincroniza con Jolpica/OpenF1, sí. Marcalo `@unique`.
- **Constraints únicos:** ¿`@@unique([campoA, campoB])`? Pensalo ahora, no después de la migración.
- **`createdAt` / `updatedAt`:** casi siempre sí. Usá `@default(now())` y `@updatedAt`.

### 2. Generar la migración

```bash
cd backend
npm run db:migrate
# Cuando pida nombre, usá kebab-case: "add-predictions-table"
```

Esto:

1. Crea `prisma/migrations/<timestamp>_<nombre>/migration.sql`.
2. Aplica la migración a tu DB local.
3. Regenera el cliente Prisma en `src/generated/prisma/`.

**Verificá** que la migración SQL hace lo que esperás antes de pushear. `git diff prisma/migrations/` te muestra el SQL nuevo.

### 3. Actualizar `src/tests/setup.ts`

Agregá el `TRUNCATE` para tu tabla nueva en [`backend/src/tests/setup.ts`](../../backend/src/tests/setup.ts), respetando el orden FK-safe (hijos primero, padres después).

**Si te olvidás de esto**, los tests van a filtrar state entre archivos y vas a ver fallos intermitentes random.

### 4. Crear los 5 archivos del módulo

Copiá `backend/src/modules/drivers/` a `backend/src/modules/<nuevo>/`, renombrá los archivos, y empezá a editar de uno en uno en este orden:

#### 4a. `<nuevo>.schema.ts`

Definí `createXSchema` con Zod. Usá `.partial()` para `updateXSchema`. Exportá `CreateXInput` y `UpdateXInput` con `z.infer`.

```ts
export const createXSchema = z.object({ /* tus campos */ });
export const updateXSchema = createXSchema.partial();
export type CreateXInput = z.infer<typeof createXSchema>;
export type UpdateXInput = z.infer<typeof updateXSchema>;
```

#### 4b. `<nuevo>.service.ts`

- Importá `prisma` desde [`../../shared/prisma`](../../backend/src/shared/prisma.ts), **NO** desde `@prisma/client` (cliente generado vive en otro path).
- Importá `NotFoundError`, `ConflictError` desde [`../../shared/errors`](../../backend/src/shared/errors.ts).
- Si la entidad usa soft-delete: definí `const notDeleted = { deletedAt: null };` y filtralo en cada read.
- Tirá `NotFoundError('X')` cuando no exista → el handler central convierte a 404 con código `X_NOT_FOUND`.
- Tirá `ConflictError(msg, 'X_ALREADY_EXISTS')` ante duplicados; `ConflictError(msg, 'X_HAS_DEPENDENCIES')` antes de borrar entidades referenciadas.

**Patrón de soft-delete con validación de dependencias** (ejemplo en `drivers.service.ts:66-89`):

```ts
export async function softDelete(id: number) {
  await findById(id); // lanza 404 si no existe
  const deps = await prisma.<otraTabla>.count({ where: { /* fk a esta entidad */ } });
  if (deps > 0) throw new ConflictError('Cannot delete X with active dependencies', 'X_HAS_DEPENDENCIES');
  return prisma.x.update({ where: { id }, data: { deletedAt: new Date() } });
}
```

#### 4c. `<nuevo>.controller.ts`

Es delgado por diseño. Cada handler:

```ts
export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await xService.findAll();
    res.json({ data: result }); // siempre el envelope { data: ... }
  } catch (err) {
    next(err); // delega al errorHandler central
  }
}
```

**Status codes**: 201 en create, 204 (sin body) en delete, 200 en el resto.

**Si ves un `import { prisma }` o `import * as anything from 'prisma'` en el controller, está mal.** El controller no toca la DB.

#### 4d. `<nuevo>.routes.ts`

```ts
import { Router } from 'express';
import * as xController from './x.controller';
import { validate } from '../../middleware/validate';
import { createXSchema, updateXSchema } from './x.schema';

const router = Router();

router.get('/', xController.getAll);
router.get('/:id', xController.getById);
router.post('/', validate(createXSchema), xController.create);
router.patch('/:id', validate(updateXSchema), xController.update);
router.delete('/:id', xController.remove);

export default router;
```

`validate()` solo se aplica a rutas con body (POST/PATCH/PUT). GET y DELETE no lo necesitan.

#### 4e. `<nuevo>.test.ts`

Tests de integración contra la DB real (no mocks — decisión cerrada, ver ADR-0003 cuando exista). Cubrí los 5 endpoints + casos de error:

- `GET /` lista vacía y con datos
- `GET /:id` happy + 404
- `POST /` happy + validación + duplicados (si aplica)
- `PATCH /:id` happy + 404
- `DELETE /:id` happy + 404 + (si soft-delete) verificar que el item desaparece de listados pero la fila sigue en DB

Mirá `drivers.test.ts` como referencia exacta — el patrón se replica casi 1:1.

### 5. Registrar el router en `src/app.ts`

```ts
import xRoutes from './modules/x/x.routes';
// ...
app.use('/api/v1/x', xRoutes);
```

**Importante**: registrá ANTES del `app.use(errorHandler)` final.

### 6. Verificar end-to-end

```bash
cd backend
npm run dev                          # arranca el server
curl http://localhost:3000/api/v1/<nuevo>   # debería devolver { data: [] }
npm test -- src/modules/<nuevo>/<nuevo>.test.ts --run   # todos los tests verdes
```

Si tu entidad debería tener data de seed, agregala a [`backend/prisma/seed.ts`](../../backend/prisma/seed.ts) y corré `npx prisma db seed`.

### 7. Sincronizar los docs

**Esto no es opcional** — sin esto, drift garantizado para el próximo dev:

- [`docs/data-model.mmd`](../data-model.mmd) → agregar la entidad y sus relaciones.
- [`docs/glossary.md`](../glossary.md) → 1 línea con la definición.
- [`docs/domain-entities.md`](../domain-entities.md) → párrafo describiendo la entidad.
- [`docs/api-endpoints.md`](../api-endpoints.md) → la sección de la API con tag `[✅ shipped]`.
- [`docs/error-codes.md`](../error-codes.md) → los códigos nuevos que el módulo tira.

---

## Pitfalls comunes

1. **Olvidar `setup.ts`** → tests intermitentes. Síntoma: pasan solos, fallan en suite completa.
2. **Importar de `@prisma/client`** → cliente generado vive en `src/generated/prisma/`. Usá siempre `import { prisma } from '../../shared/prisma'`.
3. **Poner lógica en el controller** → si ves Prisma en el controller, refactor inmediato.
4. **Olvidar el envelope `{ data }`** → la API es consistente sobre eso. Frontend asume ese shape.
5. **Tirar `Error` genérico** → siempre `AppError`/`NotFoundError`/`ConflictError`. Sin eso, el `errorHandler` central devuelve 500 + `INTERNAL_ERROR`.
6. **No filtrar `deletedAt: null`** en reads de entidades soft-deletable → vas a devolver items borrados en listados.
7. **No actualizar `TRUNCATE` en setup.ts** ANTES de las tablas que la referencian → el truncate falla en tests por FK constraint.

---

## Checklist final antes de PR

- [ ] Migración SQL revisada y aplicada.
- [ ] Los 5 archivos del módulo creados, sin lógica leaked entre capas.
- [ ] Router registrado en `app.ts`.
- [ ] `TRUNCATE` agregado en `setup.ts` en posición FK-safe.
- [ ] Tests verdes con `npm test -- src/modules/<nuevo>/<nuevo>.test.ts --run`.
- [ ] `npm run lint` limpio.
- [ ] Los 5 docs sincronizados (data-model, glossary, domain-entities, api-endpoints, error-codes).
- [ ] PR referencia el número de slice del `roadmap.md`.
