# Deployment

Runbook del deploy de BoxBox y datos de acceso para la defensa.

**Arquitectura:** backend en [Render](https://render.com), frontend en [Vercel](https://vercel.com),
base Postgres en Supabase (`boxbox-dev`).

> **Estado: backend desplegado y verificado (2026-10-04). Frontend pendiente.**

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
curl https://TODO-render-url/api/v1/health
# esperado: {"status":"ok","timestamp":"..."}

curl https://TODO-render-url/api/v1/drivers | head -c 200
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
| `VITE_API_URL` | `https://TODO-render-url/api/v1` |
| `VITE_SOCKET_URL` | `https://TODO-render-url` |

Vite **incrusta** las variables en tiempo de build, no las lee en runtime. Y
`frontend/src/config/env.ts` tira excepción en el import si falta alguna. Si las cargás
después de buildear, el build sale verde y la app explota al abrirse.

El rewrite SPA ya está en `frontend/vercel.json` — sin él, un refresh en `/drivers/5`
devolvería 404 porque Vercel buscaría un archivo y React Router maneja esa ruta del lado
del cliente.

---

## 4. Cerrar el círculo

En Render → Environment → `FRONTEND_URL` = la URL de Vercel. Guardar dispara redeploy.

Esa única variable arregla las dos puertas de CORS: la de Express (`app.ts:23`) y la del
gateway de Socket.io (`draft.gateway.ts:244`), que necesita la suya propia porque atiende
`/socket.io/*` antes que Express.

---

## 5. Verificación

Todo contra la URL pública, no contra localhost:

- [ ] `/api/v1/health` devuelve `{"status":"ok"}`
- [ ] La URL de Vercel carga el login sin errores en la consola
- [ ] Login con el admin → entra a `/leagues`
- [ ] **Refresh de sesión**: borrar el access token del store en devtools y navegar → tiene que refrescar solo, sin echarte. Valida el fix de `sameSite`
- [ ] Hard-refresh en `/drivers/5` → renderiza, no 404. Valida el rewrite
- [ ] `/drivers` muestra los 22 pilotos → confirma la conexión a `boxbox-dev`
- [ ] `/standings` muestra el campeonato con datos de las 14 fechas importadas
- [ ] Crear liga → iniciar draft → el socket conecta y llega `draft:state`. Valida el CORS del gateway, que es distinto del de Express

Los últimos dos son los que **no se pueden probar en local**. Son la razón de deployar
con anticipación.

---

## Accesos

| Qué | Valor |
| :-- | :---- |
| API | **https://boxbox-api.onrender.com** |
| Health check | https://boxbox-api.onrender.com/api/v1/health |
| Frontend | `TODO` — pendiente de deployar en Vercel |
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
