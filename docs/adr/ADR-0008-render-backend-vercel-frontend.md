# ADR-0008: Backend en Render y frontend en Vercel, en dominios separados

**Date:** 2026-10-04
**Status:** Accepted
**Author:** Tomás Pinolini

---

## Context

BoxBox necesitaba estar online para la entrega del 12/10: la cátedra pide links de
deployment y credenciales. La base ya estaba resuelta en Supabase ([ADR-0007](./ADR-0007-supabase-postgres-hosting.md)),
pero ni la API ni la SPA tenían dónde correr.

La restricción que define todo es el **draft en vivo**. El gateway
(`backend/src/modules/draft/draft.gateway.ts`) hace dos cosas que asumen **un único proceso
con estado en memoria**:

1. El auto-pick de 60s es un `setTimeout` plano, guardado en un `Map` del módulo.
2. `shared/socket.ts` es un singleton `getIo()`, y los controllers REST difunden los eventos
   del draft a través de él.

Había además una cuenta de Vercel Pro disponible, lo que hacía tentador poner todo ahí.

---

## Decision

**Backend en Render (free tier, región Oregon), frontend en Vercel, en dominios separados.**

---

## Alternatives considered

| Opción | Pros | Cons | Por qué rechazada |
| :--- | :--- | :--- | :--- |
| **Render (backend) + Vercel (frontend)** | Un proceso vivo mantiene válidas las dos suposiciones del gateway sin tocar una línea. La SPA se lleva el CDN y los preview deploys por PR. Las dos capas gratis | Dos dominios ⇒ CORS cross-origin y cookie `SameSite=None`. El free tier de Render duerme a los 15 min | **Seleccionada** |
| Todo en Vercel | Un dominio, un proyecto, aprovecha el plan Pro. Sin CORS ni problema de cookie cross-site | Necesita el adapter de Redis de Socket.io, cambiar `path` y `transports` del cliente, y verificar `maxDuration` contra un draft largo | El modelo de ejecución no coincide con el del gateway — ver abajo |
| Todo en Render (Express sirviendo el build de Vite) | Un dominio, elimina CORS y el problema de la cookie de un golpe | Se pierde el CDN del frontend; el front queda atado al cold start del backend; menos parecido a un deploy real | Costo mayor que el del CORS, que se resuelve con una variable de entorno |
| Fly.io (backend) + Vercel | Siempre encendido, sin cold start | Necesita Dockerfile y más configuración | No justificaba el tiempo extra a 8 días de la entrega |

### Por qué no todo en Vercel

**Vercel sí soporta WebSockets sobre Functions** — tiene receta documentada para Socket.IO
en [vercel.com/docs/functions/websockets](https://vercel.com/docs/functions/websockets). El
bloqueante no es la plataforma, es nuestra arquitectura.

Con N instancias serverless, un pick que entra por `POST /leagues/:id/draft/pick` cae en la
instancia A y difunde sobre un `io` que **no tiene los sockets** que viven en la instancia B.
Dos personas drafteando a la vez dejan de verse — que es exactamente el escenario de la
defensa. Y el `setTimeout` del auto-pick muere con la instancia que lo agendó.

La solución correcta sería el adapter de Redis de Socket.io: dependencia nueva, infra nueva,
y cirugía sobre el epic que se defiende, a 8 días de la entrega.
[`roadmap.md`](../roadmap.md) ya pone "WebSocket reconnection con state recovery" fuera de
alcance, así que tampoco hay red de contención abajo.

Sumado: el cliente necesitaría `path: '/api/socket-io/socket.io'` y
`transports: ['websocket']` (Socket.IO arranca en long-polling por default), mientras que
`frontend/src/features/draft/draft-socket.ts` conecta al namespace `/draft` con los defaults.

**El plan Pro no se desperdicia**: la SPA se lleva el CDN, los preview deploys por PR —que
además sirven como evidencia para el criterio "uso de Git"— y el dominio custom si hiciera
falta.

---

## Consequences

### Positive

- **Cero cambios en el gateway del draft.** El código que se defiende en el oral corre en
  producción igual que en local.
- **Separación de responsabilidades real**, que es más fácil de explicar en la defensa que un
  monolito: la SPA es estática y se sirve por CDN, la API es un proceso con estado.
- **Verificado de punta a punta** contra las URLs públicas, incluido lo que no se puede probar
  en local (ver `../entrega/deployment.md`).

### Negative / tradeoffs

- **CORS cross-origin en dos puertas.** Express (`app.ts:23`) y el gateway de Socket.io
  (`draft.gateway.ts:244`) necesitan cada uno su configuración, porque el gateway atiende
  `/socket.io/*` antes que Express. Las dos leen `env.FRONTEND_URL`, así que se resuelven con
  una sola variable.
- **La cookie del refresh token necesita `SameSite=None`.** `POST /auth/refresh` es cross-site
  entre los dos dominios, y con `'lax'` el browser no la manda. Es el tradeoff más sutil de
  esta decisión: el síntoma es que **el login parece funcionar y echa al usuario 15 minutos
  después**, al expirar el access token. Mitigado con
  `sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax'`, que exige `secure: true` —
  cumplido porque las dos puntas son HTTPS.
- **Cold start de ~50s.** El free tier de Render suspende el servicio tras 15 minutos sin
  tráfico. Mitigación operativa: despertar la URL antes de la defensa.

### Risks

- **Que el servicio esté dormido en el momento de la demo.** Riesgo real pero barato de
  mitigar: un request previo. Documentado en el runbook.
- **Que Supabase pause el proyecto.** Ya pasó una vez, tras 9 días de inactividad, y el
  síntoma engaña: `/health` sigue devolviendo `200` y sólo fallan los endpoints que tocan la
  base. Es el riesgo operativo más alto de la entrega y tiene su propio recordatorio en el
  runbook.

---

## Evidence in codebase

- `frontend/vercel.json` — rewrite SPA para que las rutas de React Router no devuelvan 404.
- `backend/package.json` — `build: "prisma generate && tsc"` (el cliente de Prisma está
  gitignoreado y Render clona limpio) y `engines: node >=22`.
- `backend/src/modules/auth/auth.controller.ts:14` — el `sameSite` condicional, con el
  comentario que explica por qué.
- `backend/src/app.ts:23` y `backend/src/modules/draft/draft.gateway.ts:244` — las dos
  puertas de CORS, ambas sobre `env.FRONTEND_URL`.
- [`docs/entrega/deployment.md`](../entrega/deployment.md) — runbook, credenciales,
  verificación y las cuatro trampas que costó encontrar.

---

## References

- [Vercel — WebSockets en Functions](https://vercel.com/docs/functions/websockets) — la receta
  que existe, y por qué igual no aplica acá.
- [Socket.IO — adapters para múltiples instancias](https://socket.io/docs/v4/adapter/) — lo que
  haría falta para ir a serverless.
- [MDN — `SameSite` cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite) —
  por qué `None` exige `Secure`.
- [Render — Free instance spin down](https://render.com/docs/free#spinning-down-on-idle).
