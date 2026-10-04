# Deployment

Runbook del deploy de BoxBox y datos de acceso para la defensa.

**Arquitectura:** backend en [Render](https://render.com), frontend en [Vercel](https://vercel.com),
base Postgres en Supabase (`boxbox-dev`).

> **Estado: pendiente de ejecución.** Los campos marcados `TODO` se completan al deployar.
> La configuración ya está fijada y verificada contra el código.

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
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

**Variables de entorno:**

| Variable | Valor |
| :------- | :---- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | el de `backend/.env.supabase-dev.local` — puerto **5432**, con `?schema=public` |
| `JWT_SECRET` | nuevo, `openssl rand -hex 32` |
| `REFRESH_TOKEN_SECRET` | nuevo y distinto del anterior |
| `FRONTEND_URL` | `http://localhost:5173` ← placeholder, se corrige en el paso 4 |

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
| Frontend | `TODO` |
| API | `TODO` |
| Health check | `TODO/api/v1/health` |
| Usuario admin | `admin@boxbox.test` / `admin1234` |
| Base de datos | Supabase `boxbox-dev` (us-west-2) |

El admin sale del seed (`backend/prisma/seed.ts`) y es deliberadamente público: es una
credencial de demostración sobre la base de desarrollo. `boxbox-prod` **nunca se seedea**
— ver [`ADR-0007`](../adr/ADR-0007-supabase-postgres-hosting.md).

---

## Limitaciones conocidas

- **El plan free de Render suspende el servicio tras 15 minutos sin tráfico**, y el
  arranque en frío tarda ~50s. Antes de la defensa, abrir la URL una vez para despertarlo.
- **El draft no reconecta.** Si el socket se corta, hay que recargar la página. Está
  declarado fuera de alcance en [`roadmap.md`](../roadmap.md).
- **Una sola base para la demo.** El deploy apunta a `boxbox-dev`, que tiene el seed y las
  14 fechas importadas de Jolpica. `boxbox-prod` queda migrada y vacía.
