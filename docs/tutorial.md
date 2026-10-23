# Setup local de BoxBox

Guía rápida para clonar el repo, levantar la DB local y tener data de F1 2026 lista para empezar a tocar. Apuntada a alguien que se incorpora al proyecto desde cero.

**Tiempo estimado**: 15-20 minutos si ya tenés Node y Postgres instalados; 30-40 si los tenés que instalar.

---

## Prerrequisitos

- **Node.js 22+** — `node -v` para verificar.
- **PostgreSQL 17+** corriendo local en el puerto 5432.
  - Windows: instalador oficial de [postgresql.org](https://www.postgresql.org/download/windows/). Durante la instalación te pide setear un password para el usuario `postgres` — anotalo.
  - Mac: `brew install postgresql@17 && brew services start postgresql@17`.
  - Linux: el package manager de tu distro.
- **Git** (obvio).

**Recomendado pero opcional**: [TablePlus](https://tableplus.com/) (o cualquier cliente SQL gráfico) para mirar la DB mientras laburás. La versión gratis alcanza.

---

## Pasos

### 1. Clonar y entrar al backend

```bash
git clone <repo-url> boxbox
cd boxbox/backend
```

### 2. Crear la database en Postgres

```bash
createdb boxbox
```

Si tu Postgres requiere usuario, agregalo: `createdb -U postgres boxbox`. Te va a pedir el password del usuario `postgres` que seteaste al instalar.

### 3. Configurar las variables de entorno

```bash
cp .env.example .env
```

Abrí `.env` y completá los valores mínimos:

- **`DATABASE_URL`** — string de conexión a Postgres en formato estándar (protocolo `postgresql`). Tiene que incluir:
  - usuario y password de Postgres (el password lo seteaste al instalar)
  - host (`localhost`) y port (`5432`)
  - nombre de la database (`boxbox`)
  - el sufijo `?schema=public` al final

  Si tu password tiene caracteres especiales (`@`, `#`, `:`, `/`, `?`), URL-encodealos en esta string (ej: `@` → `%40`, `#` → `%23`). Lo más rápido es cambiarlo a uno alfanumérico y evitar el quilombo.

- **`JWT_SECRET`** y **`REFRESH_TOKEN_SECRET`** — cualquier string random largo. Podés generarlos con `openssl rand -hex 32` o pegar texto random.

Si dejás alguno vacío o mal formado, el server no arranca — lo validamos al boot con Zod (ver `src/config/env.ts`).

### 4. Instalar dependencias

```bash
npm install
```

**Y activá los git hooks del repo, una sola vez:**

```bash
cd ..   # a la raíz del repo
git config core.hooksPath .githooks
```

Git ignora `.githooks/` hasta que se lo decís, porque `.git/hooks/` no se versiona y por
eso no viaja en el clone. Con esa línea, cuando un `pull` traiga cambios en
`backend/prisma/` te avisa que tenés que correr `db:migrate` o `db seed`. No corre nada
solo: sólo te lo dice.

Sin esto la app se ve rota de una forma que no apunta a su causa — nos pasó el 15/10/2026
con los logos de las escuderías: el código al día, la DB vieja, y un cuadradito de color
gris en `/standings` como única pista.

### 5. Aplicar las migraciones (crear las tablas)

```bash
npm run db:migrate
```

Esto crea todas las tablas del schema en tu DB local. Por debajo corre `prisma migrate dev`.

### 6. Cargar la data de seed

```bash
npx prisma db seed
```

Esto puebla la DB con datos de F1 2026:

| Tabla | Filas |
|---|---|
| `seasons` | 1 (2026, activa) |
| `constructors` | 11 (parrilla completa, incluyendo Cadillac) |
| `drivers` | 22 (2 por equipo) |
| `driver_seasons` | 22 (uniendo cada driver a su constructor para 2026) |
| `circuits` | 8 |
| `races` | 5 (primeras 5 fechas) |
| `users` | 1 admin: `admin@boxbox.test` / `admin1234` (rol `ADMIN`) |

El seed es **idempotente** — podés correrlo cuantas veces quieras, no duplica nada.

**El admin importa**: crear, editar o borrar pilotos, escuderías, circuitos, temporadas y carreras (y cargar resultados) requiere un token de `ADMIN`. `POST /auth/register` siempre crea usuarios `USER`, así que la única forma de tener un admin en dev es este seed. Logueate con `POST /auth/login` usando esas credenciales y usá el `accessToken` en `Authorization: Bearer …`. Los `GET` del catálogo siguen siendo públicos.

### 7. Verificar

**Opción A — terminal**:

```bash
npm run dev
# en otra terminal:
curl http://localhost:3000/api/v1/drivers
```

Tenés que ver un JSON con los 22 pilotos.

**Opción B — TablePlus**:

| Campo | Valor |
|---|---|
| Driver | **PostgreSQL** (¡no MySQL!) |
| Host | localhost |
| Port | 5432 |
| User | `postgres` (o el tuyo) |
| Password | el del `.env` |
| Database | `boxbox` |
| SSL Mode | disable |

Una vez conectado, mirá `driver_seasons` — esa tabla une driver ↔ constructor ↔ season y es la que confirma que el seed armó bien las relaciones.

---

## Comandos útiles

```bash
npm run dev                 # server con hot reload (http://localhost:3000)
npm run db:migrate          # aplica migraciones nuevas
npm run db:studio           # GUI de Prisma para inspeccionar la DB
npm run db:generate         # regenera solo el cliente Prisma (sin tocar la DB)
npx prisma db seed          # carga data de F1 2026 (idempotente)
npx prisma migrate reset    # ⚠️ WIPEA la DB + reaplica migrations (NO corre el seed después)
npm test                    # tests con vitest (cuidado: trunca la DB en cada test)
npm test -- --run           # tests sin watch mode, un solo run
npm test -- src/modules/drivers/drivers.test.ts --run   # un archivo solo
npm run lint                # eslint sobre src/
npm run format              # prettier --write sobre todo el repo
npm run format:check        # prettier --check (sin escribir)
```

---

## Gotchas que ya sufrimos (te ahorramos el dolor)

**1. Los tests te borran el seed.**
Los tests usan `TRUNCATE ... CASCADE` antes de cada test para garantizar aislamiento (ver `src/tests/setup.ts`). Si querés tener data para mirar en TablePlus, **corré `npx prisma db seed` después de `npm test`**. No al revés.

**2. En TablePlus, elegí PostgreSQL — no MySQL.**
Los dos drivers usan protocolos distintos. Si elegís MySQL, vas a ver el error `Lost connection to MySQL server at 'reading initial communication packet'`. Cancelá esa conexión y creá una nueva con driver PostgreSQL.

**3. `prisma migrate reset` no corre el seed automáticamente.**
En Prisma 7 (la versión que usa este proyecto) cambió respecto a versiones viejas: `migrate reset` te wipea la DB y aplica migraciones, pero **no** corre el seed después. Corré `npx prisma db seed` aparte.

**4. Postgres en Docker con port mapping raro.**
Si tenés un container con Postgres en `54322:5432` (típico de Supabase local), ajustá tu `DATABASE_URL` para apuntar al puerto correcto. Chequealo con `docker ps`.

**5. Caracteres especiales en el password.**
Si tu password tiene `@`, `#`, `:`, etc., en la `DATABASE_URL` van URL-encodeados (`%40`, `%23`, `%3A`). En TablePlus poné el password decodificado, no el de la URL.

**6. Agregaste una tabla y los tests filtran data entre archivos.**
Si tu PR agrega una tabla nueva al schema, agregala también al `TRUNCATE ... CASCADE` en [`backend/src/tests/setup.ts`](../backend/src/tests/setup.ts), respetando el orden FK-safe (hijos primero, padres después). Sin esto, los tests filtran state y vas a ver fallos intermitentes random. Documentado en [`recipes/add-a-module.md`](./recipes/add-a-module.md).

---

## 8. Levantar el frontend

El frontend (`frontend/`) es una SPA Vite + React + TypeScript + Tailwind. Necesita el backend corriendo (paso 7 arriba, o `npm run dev` en `backend/` en otra terminal).

```bash
cd ../frontend        # desde backend/, o cd boxbox/frontend desde la raíz
cp .env.example .env
npm install
npm run dev
```

`.env` trae dos variables (ver `frontend/.env.example`):

- **`VITE_API_URL`** — base de la API REST, por defecto `http://localhost:3000/api/v1`.
- **`VITE_SOCKET_URL`** — base del servidor Socket.io (draft en vivo), por defecto `http://localhost:3000`.

Con los defaults alcanza si el backend corre local en el puerto 3000. Abrí `http://localhost:5173` — deberías ver la pantalla de login. Registrate con `POST /auth/register` (desde la UI, en `/register`) y probá crear una liga.

**Nota**: el draft en vivo (Socket.io) todavía no tiene pantalla propia en el frontend — eso es Slice 13b, pendiente. Lo que hoy funciona end-to-end desde la UI es: registro/login, crear/unirse a una liga por código de invitación, ver el detalle de la liga (miembros, invitar, iniciar el draft, salir/echar).

Comandos útiles (todos desde `frontend/`):

```bash
npm run dev          # vite dev server (http://localhost:5173)
npm run build         # tsc -b && vite build
npm run lint          # eslint .
npm test              # vitest run (un solo run, no watch)
npm run test:watch    # vitest en watch mode
npm run e2e           # playwright — levanta los dos servidores solo; vos solo necesitás la DB seedeada
                      # (el spec de pilotos depende de las 3 fechas COMPLETED del seed)
```

---

## 9. Supabase (para deployment y demostración)

BoxBox tiene dos bases Postgres hosteadas en Supabase: `boxbox-dev` (us-west-2) y `boxbox-prod` (us-east-1). El Postgres local sigue siendo la base para tests y desarrollo offline — **los tests nunca apuntan a Supabase**.

### Conectar a boxbox-dev

Si sos parte del equipo y necesitás acceder a la base de demostración:

1. **Conseguir el password**. Pediselo al dueño del proyecto (quien lo creó en Supabase). El password se genera con `openssl rand -hex 32` y **no se guarda en el repo**.

2. **Crear `.env.supabase-dev.local`** en `backend/`:

   ```bash
   cp .env.example .env.supabase-dev.local
   ```

   Editá la variable `DATABASE_URL` con los datos de Supabase:
   - **Host**: en la interfaz de Supabase → Settings → Database → Connection info → Host (URL tipo `xxxx.supabase.co`)
   - **Port**: 5432 (session pooler port, **no** 6543)
   - **User**: `postgres`
   - **Password**: la que recibiste
   - **Database**: `postgres`
   - **Sufijo**: `?schema=public` (obligatorio)

   Ejemplo:
   ```
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"
   ```

   ⚠️ Si el password tiene caracteres especiales (`@`, `#`, `:`), tienen que ir URL-encodados en la string (`@` → `%40`, `#` → `%23`, `:` → `%3A`).

3. **Correr migraciones** (solo dev, prod ya está migrado):

   ```bash
   NODE_ENV=development DATABASE_URL="..." npx prisma migrate status
   npx prisma migrate deploy
   ```

   Si es la primera vez, `migrate deploy` aplica todas las migraciones de una vez. Verificá que siga el resultado "Database schema is up to date!".

4. **Seed en prod: sólo con `SEED_ADMIN_PASSWORD`.** El seed crea `admin@boxbox.test` y, sin esa variable, le pone la password de desarrollo `admin1234`, que está publicada en este repo — en una base alcanzable desde internet, cualquiera que lea el repo entra como ADMIN. Con `NODE_ENV=production` la variable es obligatoria y el seed aborta si falta.

   Sin seed la app queda inservible (sin pilotos no hay draft) y promover un USER a ADMIN requiere un `UPDATE` a mano: `POST /auth/register` siempre crea `USER`, no hay endpoint que cambie el rol. Entonces el seed en prod se corre así:

   ```bash
   NODE_ENV=production \
     SEED_ADMIN_PASSWORD="$(openssl rand -base64 18)" \
     SEED_SKIP_RESULTS=1 \
     DATABASE_URL="..." npx prisma db seed
   ```

   Guardá esa password antes de perderla — no hay recuperación por mail. `SEED_SKIP_RESULTS=1` carga grilla y calendario con el campeonato en cero, que es lo que hace que una liga nueva se pueda jugar de verdad: con los resultados ya cargados, el draft reparte pilotos y la tabla sale resuelta de entrada.

   **Ojo: `boxbox-prod` no se seedeó así.** El 2026-10-17 se corrió el seed **sin** esa variable y las 17 fechas de 2026 quedaron cargadas — ver [`entrega/deployment.md`](./entrega/deployment.md) → "Carga de resultados en prod". Si querés el campeonato en cero para jugar una liga desde la fecha 1, eso hoy está sin decidir.

### Importante: tests siempre locales

**No hay cascada de archivos `.env`.** `src/config/env.ts:4` hace `dotenv.config()` pelado, así que el backend lee **siempre `.env`** y nada más: `NODE_ENV` cambia el comportamiento del server (cookies, validaciones), no el archivo de configuración que se carga. Para apuntar el backend local a Supabase hay que poner las variables en el entorno antes de arrancar, sourceando el archivo:

```bash
# Postgres local: lo que diga .env
npm run dev

# Supabase dev — lo sourceado gana, porque dotenv NO pisa variables que ya existen
# en el entorno
(set -a; . ./.env.supabase-dev.local; set +a; npm run dev)

# Supabase prod — ⚠️ es la base que sirve la app pública
(set -a; . ./.env.supabase-prod.local; set +a; npm run dev)
```

Los paréntesis importan: dejan las variables dentro de una subshell, así que no quedan exportadas en tu terminal esperando el próximo comando.

⚠️ **`set -a; . archivo` no parsea el archivo: lo ejecuta como script de shell.** Por eso un `.env` que vayas a sourcear no puede tener notas ni credenciales sueltas. Una línea como `CONTRASEÑA=...` no es una asignación válida —los nombres de variable de shell están limitados a `[A-Za-z_][A-Za-z0-9_]*`, y la `Ñ` queda afuera—, así que bash la toma como un **comando** e imprime la línea entera, password incluida, en el `command not found`. Ya pasó una vez. Todo comentario va con `#` adelante, y las credenciales en el gestor de contraseñas. dotenv, en cambio, parsea y no ejecuta.

Los **tests nunca consultan Supabase**. `npm test` siempre usa la DB local definida en `.env`, y `src/tests/setup.ts` hace `TRUNCATE ... CASCADE` de todas las tablas antes de cada test.

---

## Próximos pasos

Una vez que veas la data en TablePlus, entrá por la puerta principal de la documentación:

**[`docs/README.md`](./README.md)** — el índice que te orienta según qué querés hacer (onboarding / construir feature). Te va a ir mandando a los siguientes archivos:

- [`docs/glossary.md`](./glossary.md) — términos del dominio (LeagueMember vs User, snake draft, soft-delete, etc.). Léelo antes de tocar código.
- [`docs/data-model.mmd`](./data-model.mmd) — diagrama ER completo. Abrilo con la extensión Mermaid de VS Code o en [mermaid.live](https://mermaid.live).
- [`docs/domain-entities.md`](./domain-entities.md) — narrativa: qué representa cada entidad, ciclo de vida, por qué existe.
- [`docs/api-endpoints.md`](./api-endpoints.md) — endpoints (con tags `[✅ shipped]` / `[🚧 planned]` / `[🔒 outlier]`).
- [`backend/docs/roadmap.md`](../backend/docs/roadmap.md) y [`frontend/docs/roadmap.md`](../frontend/docs/roadmap.md) — slices ordenados por dependencia; acá encontrás qué falta construir y cuál tomar. El [`docs/roadmap.md`](./roadmap.md) de arriba es el hub: rúbrica, epics y fuera de alcance.
- [`docs/recipes/add-a-module.md`](./recipes/add-a-module.md) — receta paso a paso para agregar un módulo nuevo (la mayoría de los slices del roadmap son módulos nuevos).
- [`docs/adr/`](./adr/) — decisiones cerradas (por qué Prisma y no MikroORM, por qué no Repository pattern, etc.). Leelas cuando una decisión te parezca rara.
- [`CLAUDE.md`](../CLAUDE.md) (raíz) — convenciones de código y request lifecycle. Fuente de verdad de "cómo se programa acá".

## Tu primer PR

1. Tomá un slice del roadmap de tu carril ([backend](../backend/docs/roadmap.md) o [frontend](../frontend/docs/roadmap.md)).
2. Creá una branch con nombre descriptivo: `git checkout -b slice-1-auth-register`.
3. Trabajá. Cuando termines, abrí PR en GitHub — el template ([`.github/pull_request_template.md`](../.github/pull_request_template.md)) te aparece auto-cargado con un checklist.
4. **Convenciones**: commits en español, imperativo, sin emojis. Código + identificadores en inglés. Sin atribución de IA en commits ni en PR (preferencia del profe).

## ¿Te trabaste?

- Error de tipos de Prisma → probá `npm run db:generate`, casi siempre es eso.
- Tests fallan random → casi siempre `setup.ts` que no trunca una tabla nueva.
- Endpoint devuelve 500 sin mensaje → mirá el log del server (`npm run dev`), el `errorHandler` central loguea la stack pero al cliente solo le manda `INTERNAL_ERROR`.
- Cualquier otra cosa → preguntame por Discord/WhatsApp antes de pelearte 2 horas solo.
