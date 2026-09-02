# Slice 13a — Frontend bootstrap (React + Vite)

**Fecha:** 2026-08-27 (diseño) · 2026-08-28 (stack final)
**Estado:** Aprobado. Implementación en rama `slice-13a-frontend-bootstrap`.
**Autores:** Tomás Pinolini (decisión), Tomás Rivero (informado; confirmó el stack de la cátedra)
**Reemplaza:** la descripción de Slice 13 en `roadmap.md`.

---

## 1. Objetivo

Primer frontend clickeable de BoxBox: registrarse, loguearse, ver mis ligas, crear una, unirse con código, ver el detalle de una liga (miembros, código de invitación, estado del draft) y, siendo owner, arrancar el draft. Sirve para **probar el backend a mano sin curl** y cubre la mitad de los requisitos de frontend de la cátedra desde el primer PR.

Fuera de alcance (Slice 13b, BOX-26): la pantalla del draft en vivo (Socket.io, timer, picks).

---

## 2. Historia de la decisión de stack

- **2026-08-27** — Se eligió **Angular** porque el FAQ de la cátedra nombra "NodeJS, Express y Angular" como tecnologías con soporte, y React solo aparecía en nuestro README (no en la propuesta aprobada). Se llegó a scaffoldear (no se commiteó).
- **2026-08-28** — Rivero confirmó desde la cursada que **la cátedra está dictando React** este cuatrimestre, con repo propio: [`utnfrrodsw/react`](https://github.com/utnfrrodsw/react). Su stack: Vite + React 19, `react-router-dom` 7, `react-hook-form`, `zustand`, `@tanstack/react-query` + `axios`, Jest + Testing Library, guías de deploy a Vercel/Cloudflare. Con eso, React pasa a ser "tecnología dada durante el cursado": sin riesgo de aprobación, y el conocimiento que Rivero trae de clase entra directo al repo.
- **Regla que queda para el informe**: la elección se justifica con el material de la cursada, no con preferencias personales. Cuando nos apartamos de ese material, lo decimos y damos el motivo (§3, D1).

---

## 3. Decisiones (y por qué)

| #   | Decisión                                                                             | Alternativas descartadas             | Motivo                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Vite + React 19 + TypeScript**                                                     | Angular (ver §2); Next.js; JS pelado | Es el stack de la cátedra. Único desvío: **TypeScript** en vez de JS — la rúbrica pide "modelos con clases, interfaces y tipos custom", que es exactamente lo que TS aporta; el backend ya es TS; el README lo decía.                        |
| D2  | **Tailwind v4 solo**, con ~6 componentes propios                                     | Material UI; shadcn; daisyUI         | Tailwind está en la lista de frameworks CSS aceptados. La "biblioteca de componentes" es sugerida, no exigida; los componentes propios son código que podemos explicar en el oral. Una cosa nueva por vez.                                   |
| D3  | **Access token en memoria (store de zustand) + refresh cookie httpOnly**             | `localStorage`                       | El backend ya implementa el flujo (cookie 7d, `POST /auth/refresh`, CORS con credentials). Un token en `localStorage` es legible por cualquier script; en el oral no tiene defensa. zustand es de la cursada; sin middleware `persist`.      |
| D4  | **Cuatro pantallas** en el primer PR                                                 | Solo login + lista; incluir el draft | Lo mínimo que permite dejar de usar curl. El draft (sockets) merece su propio PR.                                                                                                                                                            |
| D5  | **`@tanstack/react-query` + `axios`** para hablar con la API                         | `fetch` + `useState` a mano          | Es lo que muestra la cátedra (`react-router/package.json`). react-query da loading/error/refetch/invalidación sin código propio; los interceptores de axios son el lugar natural del `Bearer` y del refresh ante 401.                        |
| D6  | **`react-hook-form` + `zod`** para formularios                                       | Estado manual                        | react-hook-form es de la cursada. Zod espeja los schemas del backend (mismas reglas: inviteCode 4–20 lowercase, password ≥ 8) — misma librería en los dos lados.                                                                             |
| D7  | **Vitest + Testing Library** (unit), **Playwright** (e2e)                            | Jest (cátedra); Cypress              | Desvío #2: Vitest es nativo de Vite y el mismo runner del backend; la API es compatible con Jest (el profesor lo lee igual) y Testing Library es la misma. Playwright cubre el "test end-to-end" que la rúbrica exige y la cátedra no cubre. |
| D8  | Vite sirve en **5173** (default); `FRONTEND_URL=http://localhost:5173` en el backend | Cambiar el puerto                    | Ya era el valor del `.env.example`.                                                                                                                                                                                                          |

---

## 4. Stack y scaffold

- `frontend/` al lado de `backend/`.
- `npm create vite@latest frontend -- --template react-ts` (React 19, TS, ESLint flat config incluido).
- Deps: `react-router-dom`, `@tanstack/react-query`, `axios`, `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `tailwindcss`, `@tailwindcss/vite`.
- Dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`.
- Prettier del root del repo (`.prettierrc`); ESLint el del template + `eslint-plugin-react-hooks` (ya viene).
- Ambientes: `.env` / `.env.example` con `VITE_API_URL=http://localhost:3000/api/v1` y `VITE_SOCKET_URL=http://localhost:3000`; un único módulo `src/config/env.ts` lee `import.meta.env` y valida que existan. Es el "`.env`" que la rúbrica acepta como definición de ambientes.

---

## 5. Estructura de carpetas

```
frontend/src/
  main.tsx                     monta <App />
  app/
    App.tsx                    Providers + RouterProvider + SessionGate
    router.tsx                 createBrowserRouter: rutas + guards
    providers.tsx              QueryClientProvider
    SessionGate.tsx            "Cargando sesión…" hasta que el refresh inicial termina
  config/env.ts                VITE_API_URL, VITE_SOCKET_URL validados
  models/
    api.ts                     ApiEnvelope<T>, ApiErrorBody
    user.ts                    User, UserRole
    league.ts                  League, DraftStatus, LeagueStatus
    league-member.ts           LeagueMember, FantasyTeam
  services/
    api-error.ts               class ApiError + toApiError()
    api-client.ts              class ApiClient (axios + interceptores: Bearer, withCredentials, refresh-en-401)
    auth.service.ts            login / register / refresh / logout  (funciones sobre apiClient)
    leagues.service.ts         list / create / join / get / members / leave / kick / startDraft / activeSeasonId
  store/auth.store.ts          zustand: accessToken, user, sessionReady, setSession, clear
  components/ui/               Button, Field, Card, Badge, Alert, PageShell  (no importan models/)
  features/auth/
    LoginPage.tsx · RegisterPage.tsx
    RequireAuth.tsx            guard: sin token -> <Navigate to="/login" />
    GuestOnly.tsx              inverso: logueado -> /leagues
  features/leagues/
    LeaguesPage.tsx · LeagueDetailPage.tsx
    LeagueCard.tsx · MembersTable.tsx
    leagues.queries.ts         hooks de react-query: useLeagues, useLeague, useMembers, useCreateLeague, useJoinLeague, useStartDraft, useLeave, useKick
```

Reglas: `components/ui` no importa `models/` ni `services/`. `services/` no importa React. `features/` importa de todos. `store/` solo lo usan `services/api-client.ts`, `SessionGate`, los guards y las páginas.

---

## 6. Flujo de auth

1. **Login**: `POST /auth/login` (`withCredentials`). El backend responde `{ data: { user, accessToken } }` y setea la cookie `refreshToken` (httpOnly, `SameSite=Lax`, 7d). `useAuthStore.setSession(user, token)`. Nada va a `localStorage`.
2. **Boot**: `SessionGate` llama `authService.refresh()` una vez al montar (`POST /auth/refresh` con la cookie). 200 → `setSession` (el refresh devuelve `{ user, accessToken }`, no hace falta `/me`). 401 → `clear()`, sin mostrar error. Recién entonces renderiza el router. Así un F5 no desloguea.
3. **Requests**: el interceptor de request del `ApiClient` agrega `Authorization: Bearer <token>` (lee el store) y `withCredentials: true`.
4. **Token vencido** (15 min): el interceptor de response, ante un 401 en una ruta que no es `/auth/*` y con sesión activa, hace **un** `POST /auth/refresh`, actualiza el store y reintenta el request original; si el refresh falla, `clear()`. Cualquier error sale como `ApiError` (los componentes nunca ven un `AxiosError`).
5. **Guards**: `<RequireAuth>` envuelve las rutas privadas: sin token → `<Navigate to="/login" replace />`. `<GuestOnly>` envuelve `/login` y `/register`: logueado → `/leagues`. Es la "protección de rutas por nivel de acceso" de la rúbrica.
6. **Logout**: `POST /auth/logout` (limpia la cookie) + `clear()` + navegar a `/login`.

Backend, dos toques chicos: (1) `FRONTEND_URL=http://localhost:5173` (ya era el default); (2) `GET /leagues/:id/members` incluye `user: { name }` en cada miembro (`memberSelect`; hecho en Task 0). Cookies entre `localhost:5173` y `localhost:3000` son same-site (el puerto no cuenta para `SameSite`), así que `Lax` funciona.

---

## 7. Pantallas y rutas

| Ruta           | Guard         | Contenido                                                                                                                                                                                                                                 | Endpoints                                                                                                                                         |
| -------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`       | `GuestOnly`   | email + password; error visible si `INVALID_CREDENTIALS`                                                                                                                                                                                  | `POST /auth/login`                                                                                                                                |
| `/register`    | `GuestOnly`   | email, password (≥ 8), name; error si `EMAIL_ALREADY_EXISTS`                                                                                                                                                                              | `POST /auth/register`                                                                                                                             |
| `/leagues`     | `RequireAuth` | mis ligas como `LeagueCard` (nombre, código, badge de `draftStatus`); form "Crear liga" (name, inviteCode 4–20 lowercase; season = la activa); form "Unirme con código"                                                                   | `GET /leagues`, `POST /leagues`, `POST /leagues/join`, `GET /seasons/active`                                                                      |
| `/leagues/:id` | `RequireAuth` | nombre, código de invitación con botón copiar, badge `draftStatus`, tabla de miembros (nombre, owner, fecha); **owner**: "Iniciar draft" (deshabilitado si `draftStatus != PENDING`) y "Echar" por fila; **no owner**: "Salir de la liga" | `GET /leagues/:id`, `GET /leagues/:id/members`, `POST /leagues/:id/draft/start`, `DELETE /leagues/:id/members/:userId`, `POST /leagues/:id/leave` |

Validaciones: schemas Zod en el frontend que espejan los del backend (mismos límites), con `@hookform/resolvers/zod`, para que el error aparezca antes del request. El backend sigue siendo la fuente de verdad.

Mobile-first: clases base para SM; `md:` y `lg:` agregan columnas (lista de ligas: 1 → 2 → 3 columnas; detalle: tabla apilada en SM).

Lectura y escritura con react-query: las páginas usan `useLeagues()` / `useLeague(id)` / `useMembers(id)`; las mutaciones (`useCreateLeague`, `useJoinLeague`, `useStartDraft`, `useLeave`, `useKick`) invalidan las queries que corresponden al terminar. Sin `useEffect` + `useState` a mano para datos del server.

---

## 8. Manejo de errores

- El `ApiClient` convierte cualquier respuesta con `{ error: { code, message, status } }` en una instancia de **`ApiError`** (clase — cumple "modelos con clases"). Sin red → `NETWORK_ERROR`.
- Un mapa `code → mensaje en español` en `components/ui/Alert.tsx`: `INVITE_CODE_NOT_FOUND` → "Ese código no existe", `LEAGUE_FULL` → "La liga está llena", `ROSTER_LOCKED` → "El draft ya empezó: no se puede cambiar el roster", `ALREADY_MEMBER`, `TOKEN_INVALID`, `VALIDATION_ERROR`, `INTERNAL_ERROR` → "Algo salió mal, probá de nuevo". Código desconocido → el `message` del backend.
- `<Alert error={apiError} />` debajo del botón en formularios; arriba de la tabla en el detalle. Un `ErrorBoundary` en la raíz atrapa lo que se escape de un render. Ningún error va a `console.log` como única salida.

---

## 9. Modelos (rúbrica: clases, interfaces, tipos custom)

```ts
export type DraftStatus = 'PENDING' | 'LIVE' | 'COMPLETED';
export type LeagueStatus = 'ACTIVE' | 'ARCHIVED' | 'CANCELLED';
export interface User { id: number; email: string; name: string; role: 'USER' | 'ADMIN' }
export interface League { id: number; name: string; inviteCode: string; maxMembers: number;
  seasonId: number; createdById: number; draftStatus: DraftStatus; status: LeagueStatus;
  createdAt: string; updatedAt: string }
export interface LeagueMember { id: number; userId: number; isOwner: boolean;
  status: 'ACTIVE' | 'LEFT' | 'KICKED'; joinedAt: string; user: { name: string } }
export interface FantasyTeam { id: number; leagueMemberId: number;
  driver1Id: number | null; driver2Id: number | null; constructorId: number | null }
export class ApiError extends Error { constructor(public code: string, public status: number, message: string) }
export class ApiClient { /* instancia de axios + interceptores; un unico objeto exportado */ }
```

Los shapes se copian de `docs/api-endpoints.md` y de los `select` de los services del backend — no se inventan campos.

Patrón OO para el informe: **`ApiClient` como fachada única sobre HTTP** (una clase, una instancia, todos los services pasan por ella) + `ApiError` como jerarquía de errores tipada. Los services (`auth.service.ts`, `leagues.service.ts`) son el "servicio" que pide la rúbrica.

---

## 10. Tests

| Tipo                | Archivo                                | Qué prueba                                                                                                                                                         |
| ------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit (Vitest + RTL) | `services/api-error.test.ts`           | `toApiError` convierte el envelope; status 0 → `NETWORK_ERROR`                                                                                                     |
| Unit (Vitest + RTL) | `components/ui/Alert.test.tsx`         | traduce códigos conocidos; desconocido usa el mensaje del backend                                                                                                  |
| Unit (Vitest + RTL) | `features/auth/RequireAuth.test.tsx`   | sin token renderiza `/login`; con token renderiza el hijo                                                                                                          |
| Unit (Vitest + RTL) | `features/leagues/LeagueCard.test.tsx` | renderiza nombre y badge; click llama `onOpen(id)`                                                                                                                 |
| E2e (Playwright)    | `e2e/leagues.spec.ts`                  | contra backend real + DB seedeada: registra un user nuevo (email con timestamp), crea una liga, la ve, abre el detalle, es owner; `/leagues` sin sesión → `/login` |

Comandos: `npm test` (unit), `npm run e2e` (requiere `npm run dev` del backend). Salida guardada en `docs/test-evidence/` (requisito de aprobación "evidencia de ejecución de tests").

---

## 11. Docs a tocar en el PR

- `README.md`: fila Frontend confirmada (React + TypeScript + Tailwind); setup del frontend.
- `docs/roadmap.md`: Slice 13 → "13a bootstrap (este spec)" + "13b draft en vivo (BOX-26)".
- `CLAUDE.md`: layout (`frontend/`), comandos, y una sección corta _Frontend conventions_ (estructura, reglas de import, dónde va cada cosa, cómo se agrega una pantalla).
- `docs/tutorial.md`: "7. Levantar el frontend".
- `backend/src/modules/leagues/leagues.service.ts`: `memberSelect` con `user.name` (Task 0, hecho) + `docs/api-endpoints.md`.

---

## 12. Done when

1. `npm run dev` en `frontend/` levanta en `http://localhost:5173`.
2. Registrarse, loguearse, crear una liga, unirse desde un segundo usuario (otra ventana), ver ambos en el detalle.
3. El owner aprieta "Iniciar draft" y el badge pasa a `LIVE`; un tercero que intenta unirse ve "El draft ya empezó".
4. F5 mantiene la sesión; logout + `/leagues` → `/login`. `localStorage` vacío.
5. `npm test` y `npm run e2e` verdes; salida guardada.
6. Se ve bien en SM / MD / LG (DevTools, 375 / 768 / 1024 px).
7. `npm run build` y `npm run lint` sin errores.

---

## 13. Riesgos y mitigaciones

- **react-query y zustand son nuevos para Pinolini** (no para Rivero, que los ve en clase). Mitigación: un hook por query, nombres literales (`useLeagues`), y la doc oficial como única fuente; el material de la cátedra (`utnfrrodsw/react`) como referencia de estilo.
- **Refresh en el boot agrega un estado "cargando sesión"**. Mitigación: `SessionGate` con un único `useEffect` y `sessionReady` en el store.
- **Playwright contra DB real** puede chocar con el `TRUNCATE` de la suite del backend si corren a la vez. Mitigación: emails únicos por corrida; no correr en paralelo con `npm test` del backend.
- **Dos desvíos del stack de la cátedra (TS, Vitest)**: cada uno con su motivo en D1 y D7, listos para el oral.
