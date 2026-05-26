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

El seed es **idempotente** — podés correrlo cuantas veces quieras, no duplica nada.

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
npx prisma db seed          # carga data de F1 2026 (idempotente)
npm test                    # tests con vitest (cuidado: trunca la DB)
npm test -- --run           # tests sin watch mode, un solo run
npm run lint                # eslint
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

---

## Próximos pasos

Una vez que veas la data en TablePlus, leé:

- `CLAUDE.md` (raíz) — convenciones del proyecto, arquitectura del backend, request lifecycle.
- `docs/api-endpoints.md` — endpoints planeados.
- `docs/data-model.mmd` — diagrama ER del dominio.

Después de eso ya podés tomar un ticket.
