# Slice 13a — Frontend bootstrap (Angular)

**Fecha:** 2026-08-27
**Estado:** Aprobado (diseño). Implementación en rama `slice-13a-frontend-bootstrap`.
**Autores:** Tomás Pinolini (decisión), Tomás Rivero (informado)
**Reemplaza:** la descripción de Slice 13 en `roadmap.md` (que decía Vite + React).

---

## 1. Objetivo

Primer frontend clickeable de BoxBox: registrarse, loguearse, ver mis ligas, crear una, unirse con código, ver el detalle de una liga (miembros, código de invitación, estado del draft) y, siendo owner, arrancar el draft. Sirve para **probar el backend a mano sin curl** y cubre la mitad de los requisitos de frontend de la cátedra desde el primer PR.

Fuera de alcance (Slice 13b): la pantalla del draft en vivo (Socket.io, timer, picks).

---

## 2. Decisiones (y por qué)

| #   | Decisión                                                                             | Alternativas descartadas                   | Motivo                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **Angular** (v21, standalone components, signals)                                    | React + Vite (README anterior); Next.js    | El FAQ de la cátedra da soporte a Angular; otra tecnología requiere aprobación que no tenemos. La rúbrica está escrita en vocabulario Angular ("servicio", "input/output", "environment"). La inyección de dependencias cubre "patrón de diseño OO" sin esfuerzo. Ver mensaje a Rivero del 2026-08-27. |
| D2  | **Tailwind v4 solo**, con ~6 componentes propios                                     | Angular Material; daisyUI                  | Una cosa nueva por vez (Angular). Tailwind está en la lista de frameworks CSS aceptados. La "biblioteca de componentes" es sugerida, no exigida; los componentes propios son código que podemos explicar en el oral.                                                                                   |
| D3  | **Access token en memoria + refresh cookie httpOnly**                                | `localStorage` (roadmap anterior)          | El backend ya implementa el flujo (cookie 7d, `POST /auth/refresh`, CORS con credentials). Un token en `localStorage` es legible por cualquier script; en el oral no tiene defensa.                                                                                                                    |
| D4  | **Cuatro pantallas** en el primer PR                                                 | Solo login + lista; todo incluido el draft | Lo mínimo que permite dejar de usar curl. El draft (sockets) merece su propio PR.                                                                                                                                                                                                                      |
| D5  | **Vitest** (unit) + **Playwright** (e2e)                                             | Karma/Jasmine; Cypress                     | Vitest es el default del CLI de Angular 21 y el mismo runner del backend. Playwright ya está en la máquina y cubre el "test end-to-end" de la rúbrica.                                                                                                                                                 |
| D6  | Angular sirve en **4200**; `FRONTEND_URL` del backend pasa a `http://localhost:4200` | Forzar 5173 en Angular                     | Un cambio de una línea en el backend vs pelear con el default del CLI.                                                                                                                                                                                                                                 |

---

## 3. Stack y scaffold

- `frontend/` al lado de `backend/` (monorepo simple, como dice el README).
- `npx @angular/cli@latest new frontend --style=css --ssr=false` (standalone es el default). Sin SSR: la app entera está detrás de login y mantiene sockets abiertos; SSR no aporta nada y complica el token en memoria.
- Tailwind v4 vía `@tailwindcss/postcss` (guía oficial de Tailwind para Angular).
- `angular-eslint` + Prettier del root del repo (`.prettierrc`). Guía de estilo: Airbnb (sugerida por la cátedra), aplicada vía ESLint.
- Ambientes: `src/environments/environment.ts` (producción) y `environment.development.ts`, con `apiUrl` (`http://localhost:3000/api/v1`) y `socketUrl` (`http://localhost:3000`). Es el "environment del framework" que pide la rúbrica.

---

## 4. Estructura de carpetas

```
frontend/src/app/
  core/
    auth.service.ts        token + user como signals; login/register/refresh/logout
    auth.guard.ts          CanActivateFn: sin token -> /login
    auth.interceptor.ts    agrega Authorization: Bearer; ante 401 intenta 1 refresh y reintenta
    api-error.ts           class ApiError extends Error { code, status }
  models/
    user.ts                interface User
    league.ts              interface League; type DraftStatus; type LeagueStatus
    league-member.ts       interface LeagueMember; interface FantasyTeam
    api.ts                 interface ApiEnvelope<T> { data: T }; interface ApiErrorBody
  shared/ui/
    button, input, card, alert, badge, page-shell   (6 standalone components)
  features/auth/
    login.page.ts          formulario reactivo
    register.page.ts
  features/leagues/
    leagues.service.ts     HttpClient: list/create/join/detail/members/leave/kick/startDraft
    leagues.page.ts        mis ligas + crear + unirme
    league-detail.page.ts  detalle + miembros + acciones
    league-card.component.ts    @Input league, @Output open
    members-table.component.ts  @Input members, @Input isOwner, @Output kick
  app.routes.ts
  app.config.ts            provideRouter, provideHttpClient(withInterceptors), provideAppInitializer
```

Regla: `core/` no importa de `features/`; `features/` importa de `core/`, `models/` y `shared/`. `shared/ui/` no conoce el dominio (no importa `models/`).

---

## 5. Flujo de auth

1. **Login**: `POST /auth/login` con `withCredentials: true`. El backend responde `{ data: { user, accessToken } }` y setea la cookie `refreshToken` (httpOnly, 7d). `AuthService` guarda `accessToken` y `user` en signals. Nada va a `localStorage`.
2. **Boot**: `provideAppInitializer` llama `POST /auth/refresh` con la cookie. 200 → sesión restaurada (token + `GET /auth/me`). 401 → estado deslogueado, sin mostrar error. Así un F5 no desloguea.
3. **Requests**: el interceptor agrega `Authorization: Bearer <token>` a todo lo que vaya a `environment.apiUrl`.
4. **Token vencido** (15 min): ante un 401 `TOKEN_INVALID`, el interceptor hace **un** `POST /auth/refresh`, reintenta el request original con el token nuevo; si el refresh también falla, `AuthService.logout()` y redirección a `/login`.
5. **Guard**: `authGuard` devuelve `true` si hay token, o `router.createUrlTree(['/login'])`. Las rutas públicas (`/login`, `/register`) hacen lo inverso: logueado → `/leagues`.
6. **Logout**: `POST /auth/logout` (limpia la cookie) + limpiar signals + `/login`.

Backend, dos toques chicos: (1) `FRONTEND_URL=http://localhost:4200`; (2) `GET /leagues/:id/members` pasa a incluir `user: { name }` en cada miembro (`memberSelect` en `leagues.service.ts` — hoy devuelve solo ids, y una tabla de miembros con números no sirve). Aditivo, un test más. Cookies entre `localhost:4200` y `localhost:3000` son same-site (el puerto no cuenta para `SameSite`), así que `Lax` funciona.

---

## 6. Pantallas y rutas

| Ruta           | Guard                           | Contenido                                                                                                                                                                                                                                 | Endpoints                                                                                                                                         |
| -------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`       | pública (logueado → `/leagues`) | email + password; error visible si 401                                                                                                                                                                                                    | `POST /auth/login`                                                                                                                                |
| `/register`    | pública                         | email, password (≥ 8), name; error si `EMAIL_ALREADY_EXISTS`                                                                                                                                                                              | `POST /auth/register`                                                                                                                             |
| `/leagues`     | `authGuard`                     | mis ligas como `league-card` (nombre, código, badge de `draftStatus`, cantidad de miembros); form "Crear liga" (name, inviteCode 4–20 lowercase, season = la activa); form "Unirme con código"                                            | `GET /leagues`, `POST /leagues`, `POST /leagues/join`, `GET /seasons/active`                                                                      |
| `/leagues/:id` | `authGuard`                     | nombre, código de invitación con botón copiar, badge `draftStatus`, tabla de miembros (nombre, owner, fecha); **owner**: "Iniciar draft" (deshabilitado si `draftStatus != PENDING`) y "Echar" por fila; **no owner**: "Salir de la liga" | `GET /leagues/:id`, `GET /leagues/:id/members`, `POST /leagues/:id/draft/start`, `DELETE /leagues/:id/members/:userId`, `POST /leagues/:id/leave` |

Validaciones de formulario: Reactive Forms con `Validators` que espejan los schemas Zod del backend (mismos límites), para que el error aparezca antes del request. El backend sigue siendo la fuente de verdad.

Mobile-first: las clases base son para SM; `md:` y `lg:` agregan columnas (lista de ligas: 1 → 2 → 3 columnas; detalle: tabla apilada en SM).

---

## 7. Manejo de errores

- El interceptor convierte cualquier respuesta con `{ error: { code, message, status } }` en una instancia de **`ApiError`** (clase — cumple "modelos con clases").
- Un mapa `code → mensaje en español` en `shared/ui/alert`: `INVITE_CODE_NOT_FOUND` → "Ese código no existe", `LEAGUE_FULL` → "La liga está llena", `ROSTER_LOCKED` → "El draft ya empezó: no se puede cambiar el roster", `ALREADY_MEMBER`, `TOKEN_INVALID`, `VALIDATION_ERROR` (muestra `details`), `INTERNAL_ERROR` → "Algo salió mal, probá de nuevo". Código desconocido → el `message` del backend.
- Los formularios muestran el `alert` debajo del botón; las acciones del detalle, arriba de la tabla. Ningún error va a `console.log` como única salida.

---

## 8. Modelos (rúbrica: clases, interfaces, tipos custom)

```ts
export type DraftStatus = 'PENDING' | 'LIVE' | 'COMPLETED';
export type LeagueStatus = 'ACTIVE' | 'ARCHIVED' | 'CANCELLED';
export interface User { id: number; email: string; name: string; role: 'USER' | 'ADMIN' }
export interface League { id: number; name: string; inviteCode: string; maxMembers: number;
  seasonId: number; createdById: number; draftStatus: DraftStatus; status: LeagueStatus }
export interface LeagueMember { id: number; userId: number; isOwner: boolean;
  status: 'ACTIVE' | 'LEFT' | 'KICKED'; joinedAt: string; user: Pick<User, 'name'> }  // user.name: se agrega al backend en este slice
export interface FantasyTeam { id: number; leagueMemberId: number;
  driver1Id: number | null; driver2Id: number | null; constructorId: number | null }
export class ApiError extends Error { constructor(public code: string, public status: number, message: string) }
```

Los shapes se copian de `docs/api-endpoints.md` y de los `select` de los services del backend — no se inventan campos.

Patrón OO: **inyección de dependencias** (todo servicio es `@Injectable({ providedIn: 'root' })`, los componentes lo reciben por `inject()`); es lo que se declara en el informe.

---

## 9. Tests

| Tipo             | Archivo                         | Qué prueba                                                                                                                                                  |
| ---------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)    | `league-card.component.spec.ts` | renderiza el nombre y el badge; click emite `open` con el id                                                                                                |
| Unit (Vitest)    | `auth.guard.spec.ts`            | sin token → `UrlTree` a `/login`; con token → `true`                                                                                                        |
| E2e (Playwright) | `e2e/leagues.spec.ts`           | contra backend real + DB seedeada: registra un user nuevo (email con timestamp), crea una liga, la ve en la lista, abre el detalle, ve su nombre como owner |

Comandos: `npm test` (unit), `npm run e2e` (requiere `npm run dev` del backend). La salida del e2e se guarda como evidencia para `docs/` (requisito de aprobación "evidencia de ejecución de tests").

---

## 10. Docs a tocar en el PR

- `README.md`: fila Frontend → "Angular + TypeScript + Tailwind CSS"; sección de setup del frontend.
- `docs/roadmap.md`: Slice 13 → "13a bootstrap (este spec)" + "13b draft en vivo"; stack Angular.
- `CLAUDE.md`: layout (`frontend/`), comandos, y una sección corta _Frontend conventions_ (estructura, dónde va cada cosa, cómo se agrega una pantalla).
- `docs/tutorial.md`: "7. Levantar el frontend".
- `backend/.env.example`: `FRONTEND_URL=http://localhost:4200`.
- `backend/src/modules/leagues/leagues.service.ts`: `memberSelect` incluye `user: { select: { name: true } }` (+ assert en `leagues.test.ts`, + `docs/api-endpoints.md`).

---

## 11. Done when

1. `npm start` en `frontend/` levanta en `http://localhost:4200`.
2. Registrarse, loguearse, crear una liga, unirse desde un segundo usuario (otra ventana), ver ambos en el detalle.
3. El owner aprieta "Iniciar draft" y el badge pasa a `LIVE`; un tercero que intenta unirse ve "El draft ya empezó".
4. F5 mantiene la sesión; logout + `/leagues` → `/login`.
5. `npm test` y `npm run e2e` verdes; salida guardada.
6. Se ve bien en SM / MD / LG (DevTools, 375 / 768 / 1024 px).
7. `npx tsc`/`ng build` sin errores; ESLint limpio.

---

## 12. Riesgos y mitigaciones

- **Angular es nuevo para los dos.** Mitigación: briefing de 3 conceptos (componente, servicio/DI, router/guard) ya hecho; el que implementa tipea el scaffold y el primer componente a mano; angular.dev como única fuente.
- **Refresh en el boot agrega un estado "cargando sesión".** Mitigación: `page-shell` muestra un spinner hasta que el initializer termina; es un `signal<boolean>`.
- **Playwright contra DB real** puede chocar con el `TRUNCATE` de la suite del backend si corren a la vez. Mitigación: el e2e usa emails únicos y no asume data previa salvo el seed; no se corre en paralelo con `npm test` del backend.
- **Versión de Angular** (21) más nueva que la vista en clase. Mitigación: standalone + signals son el default documentado en angular.dev; nada de `NgModule`.
