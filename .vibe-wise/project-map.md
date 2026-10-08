# Project Map

Todo lo de acá está verificado contra el repositorio o contra las URLs públicas durante la
sesión del 2026-10-04/05. Lo no verificado está marcado como desconocido.

## Purpose

Fantasy League de Fórmula 1. Un usuario crea o se une a una `League` privada por código de
invitación. Cada integrante es un `LeagueMember` y arma un `FantasyTeam` de 2 Drivers y 1
Constructor mediante un draft snake en vivo; cada elección es un `DraftPick`. Después de cada
`Race` el sistema lee los `RaceResult` y calcula un `LeagueStanding` por miembro.

Vocabulario ubicuo completo en `docs/glossary.md` — esos términos son los que se usan en
código, docs y conversación.

## Requirements

Trabajo práctico de Desarrollo de Software, UTN FRRO. La consigna está en
[utnfrrodsw/tp](https://github.com/utnfrrodsw/tp), repartida en cuatro archivos
(`README.md`, `FAQ.md`, `docs.md`, `proposal.md`) más las ponderaciones, que viven en otro
repo: `utnfrrodsw/desarrollo-de-software`.

- La fórmula publicada pondera un Parcial (peso 40 en Regularidad, 30 en Aprobación Directa),
  pero **este año no hubo parcial**: esos componentes no aplicaron a esta cohorte
  (corregido por el learner el 2026-10-07).
- El PoC fue la vía para colaborar con la regularización. Lo entregaron entre los dos y
  obtuvieron un **7** (corregido por el learner el 2026-10-07).
- Entrega del 12 al 16/10/2026, con defensa oral grupal ante los profesores.
- Primer globalizador del 26 al 30/10/2026; segundo del 9 al 13/11/2026.

## Components

```
backend/   Express 5 + Socket.io + TypeScript + Prisma 7 + PostgreSQL
frontend/  Vite + React 19 + TypeScript + Tailwind v4 (SPA)
docs/      Documentación de cátedra y de dominio
```

Backend, un módulo por dominio en `src/modules/<name>/`, siempre con los mismos archivos:
`routes` → `controller` → `service` → `schema` → `test`. Los recursos hijos viven en el
módulo del padre (`FantasyTeam` y `LeagueMember` en `leagues/`, `RaceResult` en `races/`).
`draft/` es el único con módulo propio y se monta como sub-router desde `leagues.routes.ts`;
tiene además `draft.gateway.ts` para Socket.io.

Frontend, una carpeta por feature en `src/features/<x>/` con sus páginas y su
`<x>.queries.ts` (hooks de React Query). `services/api-client.ts` es la única puerta HTTP;
`features/draft/draft-socket.ts` es la única puerta de websocket.

## Main Flow

```
Browser (SPA en Vercel)
   │  HTTP  →  services/api-client.ts  (axios, refresh dedup'd)
   │  WS    →  features/draft/draft-socket.ts
   ▼
API (Express en Render, un solo proceso)
   helmet → cors → json → cookieParser → routers → errorHandler
   │
   ├─ requireAuth                                   (JWT, 15 min)
   ├─ validateParams / validate / validateQuery     (Zod)
   ├─ requireLeagueMember → requireLeagueOwner      (autorización por recurso)
   ├─ requireAdmin                                  (rol desde el JWT, sin ir a la DB)
   ▼
service  →  Prisma 7 (@prisma/adapter-pg)  →  PostgreSQL (Supabase boxbox-dev)
   ▲
   └─ shared/socket.ts  getIo()  ← los controllers REST difunden eventos del draft por acá

Jolpica (API externa de F1)  →  modules/sync/  →  RaceResult → ConstructorResult → LeagueStanding
```

## Data and Trust Boundaries

- **Base**: PostgreSQL en Supabase. Dos proyectos, que se distinguen por región:
  `boxbox-dev` en us-west-2 (`inmbedbcedksbjypsjlm`, con seed y 14 fechas importadas) y
  `boxbox-prod` en us-east-1 (`qtwsblwfoceamuvothww`, migrada y vacía a propósito).
  Decisión en `docs/adr/ADR-0007`. Los tests nunca apuntan a Supabase.
- **Sesión**: access token JWT de 15 min en memoria (nunca en localStorage); refresh token
  de 7 días en cookie `httpOnly; Secure; SameSite=None`, con path restringido a
  `/api/v1/auth`.
- **Autorización por recurso**: `requireLeagueMember` consulta `leagueMember` por unique
  compuesta `(leagueId, userId)`. Si no hay fila `ACTIVE` devuelve 404, no 403, para no
  filtrar qué IDs existen. `requireLeagueOwner` sí devuelve 403, porque a esa altura el
  usuario ya sabe que la liga existe. Ver `backend/src/middleware/leagueMembership.ts`.
- **Externos**: Jolpica (calendario y resultados de F1, sin credenciales), OpenF1 (fotos de
  pilotos, URLs remotas que pueden morir — hay fallback a iniciales en `DriverAvatar`).

## Build and Deployment

```bash
# backend
npm install --include=dev && npm run build   # build = prisma generate && tsc
npm start                                     # node dist/server.js
npm test -- --run                             # 260 tests contra Postgres local, trunca la DB

# frontend
npm run build                                 # tsc -b && vite build
npm test                                      # 65 tests
npm run e2e                                   # 4 tests Playwright, necesita backend arriba
```

- Backend: Render, rama `main`, root `backend`. https://boxbox-api.onrender.com
- Frontend: Vercel, rama `main`, root `frontend`.
  https://boxbox-tomas-pinolinis-projects.vercel.app
- **Los dos buildean desde `main`.** Nada llega a producción hasta mergear `dev` → `main`.
- Runbook completo, credenciales y trampas: `docs/entrega/deployment.md`.
- Decisión de hosting y por qué no todo en Vercel: `docs/adr/ADR-0008`.

## Unknowns

- **El repo no está en la red de forks de `utnfrrodsw/tp`** (`isFork: false`). La FAQ exige
  fork + PR para entregar, y GitHub sólo permite PR entre repos de la misma red. Hoy la
  entrega no se puede abrir. Consultado al profesor el 2026-10-05; sin respuesta aún. Si no
  contesta antes del jueves 9, el plan declarado es forkear y migrar la historia. No está
  verificado si GitHub abre un PR entre historias no relacionadas.
- **La aprobación del stack alternativo está pendiente del profesor.** Declarada en
  `docs/proposal.md` → "Stack tecnológico", como exige la FAQ. Un mail previo del 2026-09-11
  sobre otro desvío quedó sin respuesta durante casi un mes.
- **El video de demostración no existe.** Es requisito de Aprobación.
- **Nadie recorrió la UI en producción a mano.** Verificada por script (15/15) y por API,
  pero sin clic humano.
