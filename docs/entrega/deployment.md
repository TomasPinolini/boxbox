# Deployment

Runbook del deploy de BoxBox y datos de acceso para la defensa.

**Arquitectura:** backend en [Render](https://render.com), frontend en [Vercel](https://vercel.com),
base Postgres en Supabase (`boxbox-dev`).

> **Estado: desplegado y verificado de punta a punta (2026-10-04).**

---

## Por qué esta arquitectura

El backend necesita **un proceso vivo**, no funciones serverless: el gateway del draft
(`backend/src/modules/draft/draft.gateway.ts`) mantiene el timer del auto-pick como un
`setTimeout` en memoria, y los controllers REST difunden por el singleton `getIo()` de
`shared/socket.ts`. Con N instancias serverless, un pick que entra por HTTP cae en una
instancia y difunde sobre un `io` que no tiene los sockets de las otras: dos personas
drafteando a la vez dejan de verse.

Render corre un proceso único y mantiene válidas las dos suposiciones sin tocar el gateway.
El frontend es una SPA estática, así que va a Vercel por el CDN y los preview deploys por PR.

Detalle de la decisión y alternativas descartadas: `../adr/ADR-0008-render-backend-vercel-frontend.md`.

---

## Los dos servicios buildean desde `main`

Render y Vercel están configurados sobre la rama **`main`**, con auto-deploy en cada push.
El trabajo diario va en `dev`, así que **nada llega a producción hasta mergear `dev` → `main`**.

Ya costó dos veces: el primer deploy de Render falló porque `main` no tenía todavía el fix
de `prisma generate`, y un cambio al `<title>` no apareció en la app hasta mergearlo. Si
tocaste algo y la URL pública sigue igual, lo primero a revisar es:

```bash
git log origin/main..origin/dev --oneline   # si imprime algo, producción está atrasada
```

---

## Orden de ejecución

Backend y frontend se necesitan mutuamente la URL, así que hay un huevo-y-gallina. Se
resuelve deployando el backend con un `FRONTEND_URL` placeholder y corrigiéndolo al final.

```
1. Render (backend)  →  con FRONTEND_URL placeholder
2. Verificar backend →  /api/v1/health
3. Vercel (frontend) →  con la URL real de Render
4. Volver a Render   →  FRONTEND_URL real → redeploy automático
5. Verificar todo
```

---

## 1. Backend en Render

**New → Web Service → conectar el repo `TomasPinolini/boxbox`.**

| Campo | Valor |
| :---- | :---- |
| Name | `boxbox-api` |
| Branch | **`main`** |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

El `--include=dev` **no es opcional**. `NODE_ENV=production` hace que npm omita las
`devDependencies`, y ahí viven `typescript`, todos los `@types/*`, `vitest` y `supertest`.
Sin la bandera, `npm install` trae 230 paquetes en vez de 341 y `tsc` falla con decenas de
`TS7016: Could not find a declaration file for module 'express'`. Es la variable que el
runtime necesita rompiendo el build.

**Variables de entorno:**

| Variable | Valor |
| :------- | :---- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | el de `backend/.env.supabase-dev.local` — ref `inmbedbcedksbjypsjlm`, región **us-west-2**, puerto **5432** |
| `JWT_SECRET` | nuevo, `openssl rand -hex 32` |
| `REFRESH_TOKEN_SECRET` | nuevo y distinto del anterior |
| `FRONTEND_URL` | la URL de Vercel (ver paso 4) |

**Ojo con cuál base.** Hay dos proyectos en Supabase y se distinguen por región:
`boxbox-dev` es **us-west-2** (`inmbedbcedksbjypsjlm`, con seed y resultados) y
`boxbox-prod` es **us-east-1** (`qtwsblwfoceamuvothww`, vacía a propósito). Apuntar a prod
da `(ENOTFOUND) tenant/user postgres.<ref> not found` o una app sin datos.

**No crees `FRONTEND_URL` vacía.** `env.ts` la valida con `z.string().url()`, y el
`.default()` de Zod **sólo aplica cuando la clave es `undefined`** — con string vacío el
default se saltea, `.url()` falla sobre `""`, el proceso hace `process.exit(1)` y Render
reinicia en bucle. Una variable vacía es peor que no tenerla.

`NODE_ENV=production` no es decorativo: es lo que activa `secure: true` y
`sameSite: 'none'` en la cookie del refresh token. Sin eso el login parece funcionar y
echa al usuario a los 15 minutos, cuando expira el access token.

Los secretos van **nuevos**, no los de desarrollo: si alguna vez se filtra un `.env`
local, no debería dar acceso a la base de la demo. Tienen que ser de 32 caracteres o más
o el server no arranca — lo valida `src/config/env.ts` con Zod al bootear.

---

## 2. Verificar el backend

```bash
curl https://boxbox-api.onrender.com/api/v1/health
# esperado: {"status":"ok","timestamp":"..."}

curl https://boxbox-api.onrender.com/api/v1/drivers | head -c 200
# esperado: los 22 pilotos de 2026 — confirma que pega contra boxbox-dev
```

---

## 3. Frontend en Vercel

**Add New → Project → importar `TomasPinolini/boxbox`.**

| Campo | Valor |
| :---- | :---- |
| Framework Preset | Vite (se autodetecta) |
| Root Directory | `frontend` |
| Branch | `main` |

**Variables de entorno — van ANTES del primer build:**

| Variable | Valor |
| :------- | :---- |
| `VITE_API_URL` | `https://boxbox-api.onrender.com/api/v1` |
| `VITE_SOCKET_URL` | `https://boxbox-api.onrender.com` |

Vite **incrusta** las variables en tiempo de build, no las lee en runtime. Y
`frontend/src/config/env.ts` tira excepción en el import si falta alguna. Si las cargás
después de buildear, el build sale verde y la app explota al abrirse.

El rewrite SPA ya está en `frontend/vercel.json` — sin él, un refresh en `/drivers/5`
devolvería 404 porque Vercel buscaría un archivo y React Router maneja esa ruta del lado
del cliente.

**Desactivar Deployment Protection.** Los proyectos nuevos en cuentas con team nacen con
*Vercel Authentication* encendida: la URL responde `302` hacia `vercel.com/sso-api` y exige
una cuenta de Vercel para ver la app. **El profesor se come esa pantalla y no ve nada.**
Se apaga en Settings → Deployment Protection → Vercel Authentication → `Disabled` (o
`Only Preview Deployments`, si querés conservarla en los previews). Verificación:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://boxbox-tomas-pinolinis-projects.vercel.app/
# 200 = público. 302 = sigue protegido.
```

---

## 4. Cerrar el círculo

En Render → Environment → `FRONTEND_URL` = la URL de Vercel. Guardar dispara redeploy.

Esa única variable arregla las dos puertas de CORS: la de Express (`app.ts:23`) y la del
gateway de Socket.io (`draft.gateway.ts:244`), que necesita la suya propia porque atiende
`/socket.io/*` antes que Express.

---

## 5. Verificación

Todo contra la URL pública, no contra localhost.

### Verificado por API el 2026-10-04

- [x] `/api/v1/health` → `{"status":"ok"}`
- [x] `/drivers` → 22 pilotos, todos con escudería. Confirma la conexión a `boxbox-dev`
- [x] `/drivers/standings` y `/constructors/standings` → suman **1413** por caminos
      independientes, y cada escudería equivale a la suma de sus pilotos (Mercedes 123 =
      Antonelli 68 + Russell 55)
- [x] `/leagues/1/standings` → los `driverPoints` guardados coinciden con la suma de los
      `race_results` de los pilotos realmente drafteados
- [x] **CORS**: con el origen de Vercel devuelve ese origen y `allow-credentials: true`
- [x] **Cookie del refresh**: `HttpOnly; Secure; SameSite=None; Path=/api/v1/auth`
- [x] **Refresh cross-site**: login → `POST /auth/refresh` sólo con la cookie → token nuevo
      → `/auth/me` responde. Es el fix que evita el logout a los 15 minutos
- [x] **Socket del draft**: handshake al namespace `/draft` por WebSocket y `draft:state`
      recibido, con 6 picks y 18/9 disponibles. Valida el CORS del gateway, que es distinto
      del de Express
- [x] La URL de Vercel responde `200` y sirve el bundle de Vite

Los dos últimos del bloque de arriba **no se pueden probar en local**. Son la razón de
deployar con anticipación.

### Pendiente de clic en el browser

- [ ] La pantalla de login carga sin errores en la consola
- [ ] Login con `demo1@boxbox.test` → ver la Liga Demo y su tabla de posiciones
- [ ] Hard-refresh en `/drivers/5` → renderiza, no 404. Valida el rewrite SPA
- [ ] `/standings` muestra el campeonato con las 14 fechas
- [ ] Responsive a 375 / 768 / 1024 px sobre la URL pública

---

## Accesos

| Qué | Valor |
| :-- | :---- |
| API | **https://boxbox-api.onrender.com** |
| Health check | https://boxbox-api.onrender.com/api/v1/health |
| Frontend | **https://boxbox-tomas-pinolinis-projects.vercel.app** |
| Usuario admin | `admin@boxbox.test` / `admin1234` |
| Miembro de liga 1 | `demo1@boxbox.test` / `demo1234` |
| Miembro de liga 2 | `demo2@boxbox.test` / `demo1234` |
| Base de datos | Supabase `boxbox-dev` (us-west-2, `inmbedbcedksbjypsjlm`) |

El admin sale del seed (`backend/prisma/seed.ts`) y es deliberadamente público: es una
credencial de demostración sobre la base de desarrollo. `boxbox-prod` **nunca se seedea**
— ver [`ADR-0007`](../adr/ADR-0007-supabase-postgres-hosting.md).

Los dos usuarios `demo*` son miembros de **"Liga Demo BoxBox"** (código de invitación
`liga-demo-2026`), con el draft `COMPLETED`. Hacen falta para mostrar la vista de un
miembro: el admin **no** es miembro de ninguna liga, y `requireLeagueMember` devuelve 404
por diseño anti-enumeración, así que con el admin no se ve la tabla de posiciones.

## Datos cargados para la demo

Estado de `boxbox-dev` al 2026-10-04, importado con el sync de Jolpica:

| | |
| :-- | :-- |
| Carreras del calendario 2026 | 23 |
| Carreras `COMPLETED` con resultados | **14** |
| `race_results` | 305 |
| `constructor_results` | 154 |
| `league_standings` | 28 (14 fechas × 2 miembros) |

Los 305 son `14 × 22 − 3`: en las fechas 12, 13 y 14 el sync saltea a `tsunoda`, que corrió
por el enroque de mitad de temporada en Red Bull/RB y no está en el seed. Es la limitación
ya documentada en BOX-9, y el sync la reporta como `skipped` en vez de fallar.

---

## Limitaciones conocidas

> ### ⚠️ Antes de la defensa: despertar la base
>
> **Supabase pausa los proyectos del plan free tras ~7 días sin actividad.** Ya pasó: entre
> el 2026-09-25 y el 2026-10-04 el proyecto se pausó solo, y el síntoma no es obvio — el
> backend arranca bien, `/health` responde `200`, y recién los endpoints que tocan la base
> devuelven `500`. En los logs aparece
> `(ENOTFOUND) tenant/user postgres.<ref> not found`, que parece un error de credenciales
> y no lo es.
>
> **El día anterior a la defensa**: entrar al dashboard de Supabase, reactivar `boxbox-dev`
> si está pausada, y confirmar con
> `curl https://boxbox-api.onrender.com/api/v1/drivers` → tiene que traer 22 pilotos.
> Si devuelve `500`, la base está dormida.

- **El plan free de Render suspende el servicio tras 15 minutos sin tráfico**, y el
  arranque en frío tarda ~50s. Antes de la defensa, abrir la URL una vez para despertarlo.
- **El draft no reconecta.** Si el socket se corta, hay que recargar la página. Está
  declarado fuera de alcance en [`roadmap.md`](../roadmap.md).
- **Una sola base para la demo.** El deploy apunta a `boxbox-dev`, que tiene el seed y las
  14 fechas importadas de Jolpica. `boxbox-prod` queda migrada y vacía.
