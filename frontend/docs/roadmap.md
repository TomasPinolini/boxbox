# Roadmap del frontend

Carril frontend del TP. El panorama completo, la tabla de estado contra la rúbrica de
la cátedra y el reparto de epics viven en el hub: [`../../docs/roadmap.md`](../../docs/roadmap.md).
El carril backend está en [`../../backend/docs/roadmap.md`](../../backend/docs/roadmap.md).

Slices ordenados por dependencia. Cada slice ≈ 1 PR. Ningún slice salta sobre otro si
está marcado en `Blocked by`.

**Cómo se usa este archivo:**

- Cuando arrancás un slice, el plan vive inline (en chat o en `.claude/plans/`); los PRs llevan el detalle. No se abren GitHub Issues por slice.
- Cuando completás un slice, marcá `**Status:** done` y movelo a la sección "Completados" al final del archivo.
- Si un slice se vuelve demasiado grande durante la implementación, partilo en sub-slices (`13a`, `13b`). No expandas el alcance original.

**Convenciones:**

- **Goal**: una línea, qué se entrega al usuario / al sistema.
- **Touches**: módulos / archivos / pantallas afectados.
- **Done when**: criterio de aceptación verificable. En este carril **no alcanza con `lint` + `test` + `build`**: la convención del proyecto pide además clickear el flujo a mano contra un `npm run dev` real, backend incluido.
- **Blocked by**: número de slice o dependencia externa.

**La numeración es global entre los dos carriles.** Un número más alto no implica que
dependa de uno más bajo del otro archivo: Slice 14 y Slice 15 no dependen de 13b, y los
tres se pueden hacer en paralelo. La dependencia real está siempre en `Blocked by`.

Stack (ver [`../../CLAUDE.md`](../../CLAUDE.md) para detalle): Vite + React 19 +
TypeScript + Tailwind v4. Tests = Vitest + Testing Library, e2e con Playwright.

---

## Now — lo que bloquea la entrega del 12/10

_(Slice 13a completo.)_

### Slice 14 (frontend) — listado de pilotos con filtro + detalle

- **Goal**: cubrir el requisito de Regularidad "1 listado con filtro, con detalle al seleccionar". `proposal.md:174` lo comprometió como "listado de pilotos filtrado por escudería → detalle con estadísticas y resultados de carrera". La mitad backend está en [Slice 14 (backend)](../../backend/docs/roadmap.md).
- **Estado hoy**: no existe ninguna ruta `/drivers` en el frontend. El filtro ya existe en la API (`GET /drivers?constructorId=N`), así que el listado se puede construir antes de que el detalle enriquecido esté listo.
- **Touches**: `src/features/drivers/` (nuevo); `src/app/router.tsx`; `src/services/` (wrapper del endpoint).
- **Done when**: `/drivers` muestra nombre, número y equipo; el filtro por escudería recorta sin recargar; `/drivers/:id` muestra estadísticas y resultados por carrera. Un test unitario de componente y el paso agregado al e2e.
- **Blocked by**: el listado no depende de nada. El detalle completo necesita la mitad backend del Slice 14.

### Slice 15 — Protección de rutas por nivel

- **Goal**: cubrir "login implementado con protección por niveles de usuario" (rúbrica, Frontend / Aprobación). El backend ya distingue USER de ADMIN; la UI no.
- **Estado hoy**: `UserRole = 'USER' | 'ADMIN'` está declarado en `frontend/src/models/user.ts:1` y no se usa en ningún archivo. Los únicos guards son `RequireAuth` y `GuestOnly`, que solo miran si hay sesión.
- **Touches**: `features/auth/RequireAdmin.tsx` (nuevo, mismo patrón que `RequireAuth`); `app/router.tsx`; una pantalla real detrás del guard — la candidata natural es **carga de resultados de carrera**, porque `POST /races/:id/results` ya existe desde Slice 7, es admin-only y alimenta el Epic 2.
- **Done when**: un USER que entra por URL a la ruta admin no la ve; un ADMIN sí y puede cargar resultados contra el backend real. Test unitario del guard.
- **Blocked by**: Slice 13a (done).

---

---

## Later

### Slice 13b — Draft en vivo

- **Goal**: conectar la pantalla de draft al namespace `/draft` de Socket.io (Slice 6) — hoy `/leagues/:id` permite arrancar el draft pero no tiene UI para jugarlo en vivo.
- **Touches**: `frontend/src/features/draft/` (nuevo); cliente socket.io-client.
- **Done when**: desde `/leagues/:id`, con el draft LIVE, se puede ver el estado del draft en tiempo real y hacer picks. Ampliar `frontend/e2e/leagues.spec.ts` (o un spec nuevo) con un flujo que cubra login → crear liga → join → draft completo.
- **Blocked by**: Slice 13a (done), Slice 6.

---

---

## Completados

### Slice 13a — Frontend bootstrap (auth + ligas)

- **Status**: done (branches `13a/task-5-auth`, `13a/task-6-leagues`, `13a/task-7-league-detail`, `13a/task-8-e2e-playwright`, `13a/task-9-responsive-docs`, mergeadas en `dev`).
- **Goal**: crear el directorio `frontend/` con Vite + React + TypeScript + Tailwind + cliente HTTP que pega al backend, con las pantallas de auth y ligas funcionando de punta a punta, con e2e y verificación responsive.
- **Shipped**: `frontend/` (Vite + React 19 + TS + Tailwind v4). `services/api-client.ts` (axios singleton, interceptor con refresh de token dedup'do vía `refreshOnce()`), `store/auth.store.ts` (Zustand, token solo en memoria — sin `persist`), React Query para todo el fetching (`features/*/[...].queries.ts`, un hook por operación, invalidación en cada mutación), React Router v7 con layout-routes de guarda (`RequireAuth` / `GuestOnly`), formularios con `react-hook-form` + Zod (mismos schemas que el backend). Componentes UI propios en `components/ui/` (`Alert`, `Badge`, `Button`, `Card`, `Field`, `PageShell`).
  - **Pantallas**: `/login`, `/register` (auth), `/leagues` (lista + alta + join por código), `/leagues/:id` (detalle: miembros, invitar por código, iniciar draft si sos owner, salir/echar miembros — todo respetando `ROSTER_LOCKED` una vez que el draft está LIVE).
- **Touches reales**: todo `frontend/` (nuevo); `backend` sin cambios de lógica — solo `FRONTEND_URL` en CORS (ya soportado desde antes) y `user.name` agregado a `memberSelect` en `leagues.service.ts` para que la UI pueda mostrar nombres.
- **Tests**: Vitest + Testing Library (`RequireAuth.test.tsx`, `LeagueCard.test.tsx`, `auth.store.test.ts`, `api-error.test.ts`) — 13 tests. E2E con Playwright (`frontend/e2e/leagues.spec.ts`, `npm run e2e`): registro → crear liga → verse como owner, y redirect a `/login` sin sesión — 2 tests, evidencia en `docs/test-evidence/`. Cada task se verificó además con un script Playwright manual contra `npm run dev` real (login, crear/joinear liga, iniciar draft, roster lock) antes de mergear. Pase responsive (375/768/1024px) sin overflow horizontal en `/leagues` y `/leagues/:id`.
- **Pendiente (Slice 13b)**: draft en vivo conectado a Socket.io.
