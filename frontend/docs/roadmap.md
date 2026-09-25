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

_(Slices 13a, 13b, 14 y 15 completos, este carril. Ver el hub para el estado de la entrega
en conjunto.)_

---

## Completados

### Slice 13b — Draft en vivo

Partida en dos tramos (Pino, 2026-09-21) para no apostar toda la entrega del 12/10 a tener
el ciclo de vida completo del socket andando de una — el tramo 1 fue chico y verificable,
el tramo 2 se apoyó en esa base sin rehacer nada.

- **Status**: done (branches `13b/draft-realtime` → PR #35, `13b/draft-picks`).
- **Goal**: cubrir el CUU/epic de Regularidad del draft — desde `/leagues/:id/draft`, ver el estado en vivo y, cuando te toca, elegir piloto o escudería y mandarlo, con timer.
- **Tramo 1 — conectar y mostrar `draft:state`, sin picks ni timer**. `features/draft/draft-socket.ts` (única puerta al namespace `/draft`, mismo criterio que `ApiClient` para HTTP — un `connectDraftSocket(leagueId, token)`, nunca un `io(...)` suelto en un componente), `features/draft/useDraftState.ts` (hook: conecta al montar, guarda el `draft:state` inicial, y sigue al día con `draft:update`/`draft:complete` mientras la pantalla esté abierta), `features/draft/DraftPage.tsx` (ruta `/leagues/:id/draft`: badge de estado, ronda + de quién es el turno, lista de picks con nombres resueltos vía `useMembers`/`useDrivers`/`useConstructors`). `LeagueDetailPage` linkea a la pantalla cuando `draftStatus !== 'PENDING'`.
- **Tramo 2 — picks desde la UI + timer countdown**. `useDraftState` suma `submitPick(input)` (`emit('draft:pick', ...)` sobre el mismo socket) y maneja `draft:timer`/`draft:error`/`draft:complete`; `DraftPage` suma el `<select>` + botón "Confirmar pick" cuando `isMyTurn`, deshabilitado mientras `pickPending`, con el error del pick (`NOT_YOUR_TURN`, etc.) en un `Alert` aparte del de conexión.
  - **El countdown es local, no un poll al backend**: el server manda `draft:timer` **una vez** por ronda (`{ secondsRemaining }`), igual que hace con los clientes Socket.io directos (Slice 6) — el `setInterval` que lo decrementa vive en el frontend. Separar `timerTick` (sube solo cuando llega un evento de timer nuevo) de `secondsRemaining` (lo que se muestra, decrementado por el intervalo) evita dos problemas de las reglas de pureza de `eslint-plugin-react-hooks` v7: recrear el `setInterval` en cada segundo (si dependiera de `secondsRemaining`) y leer `Date.now()` durante el render (si se derivara el valor mostrado a cada render en vez de mantenerlo como estado).
  - **Reset de la selección sin `useEffect`**: cuando cambia el turno o la ronda, `DraftPage` limpia el `<select>` ajustando el estado durante el render (comparando una `turnKey` contra la última vista), no con un efecto — mismo patrón que React recomienda para "adjusting state when a prop changes"; un efecto ahí también viola la regla de pureza (`no llamar a setState sincrónicamente dentro de un efecto`).
- **Tests**: 10 unitarios en `useDraftState.test.ts` (los 5 de tramo 1 + `submitPick` emite `draft:pick` y marca `pending`, `draft:error` baja `pending` y guarda el error, un `draft:update` propio limpia el error anterior, el timer cuenta 1 por segundo con `vi.useFakeTimers`, `draft:complete` limpia el timer) — mockeando `socket.io-client` con un fake socket cuyo `emit` es a la vez dispatcher de eventos entrantes (simula al servidor) y spy (afirma lo que mandó `submitPick`). Verificado a mano contra `npm run dev` real: **un draft completo de punta a punta desde la UI** — 2 miembros, 3 rondas, 6 picks alternando quién le toca según el turno, ambas pantallas terminan en "El draft ya terminó." sin reload. Pase responsive a 375px con el picker visible, sin overflow. Evidencia en `docs/test-evidence/slice-13b-unit.txt` y `slice-13b-tramo2-unit.txt`.

### Slice 15 — Protección de rutas por nivel

- **Status**: done (branch `15/admin-route-guard`, PR #33 mergeado en `dev`, 2026-09-21).
- **Goal**: cubrir "login implementado con protección por niveles de usuario" (rúbrica, Frontend / Aprobación).
- **Shipped**: `features/auth/RequireAdmin.tsx` (mismo patrón que `RequireAuth`, anidado dentro — primero "hay sesión", después "es ADMIN"), montado en `/admin/results` sobre `RaceResultsPage` (Slice 7 backend, `POST /races/:id/results`). De paso sumó `StandingsTable` al detalle de liga.
- **Tests**: `RequireAdmin.test.tsx` (un USER que entra por URL vuelve a `/leagues`; un ADMIN ve la ruta).

### Slice 16 (frontend) — pantalla de campeonato

- **Status**: implementado en branch `16/championship-standings`, **sin commitear ni mergear**. Mitad frontend; los endpoints están en [el carril backend](../../backend/docs/roadmap.md).
- **Fuera de la rúbrica de la cátedra**: es un requisito propio del usuario, no suma ni bloquea nada de la entrega del 12/10.
- **Shipped**: `features/standings/` con `/standings`, **pública** (entrada suelta en el router, igual que `/drivers`). Dos `Card` — Pilotos y Escuderías — lado a lado desde `lg:`, apiladas en mobile. Links "Campeonato" en `LeaguesPage` y `DriversPage`.
- **Decisiones clave**:
  - **Reusa `TeamBadge` y `DriverAvatar`** de `features/drivers/`; no se reimplementa la lógica de color. `DriverAvatar` pasó a pedir un `Pick<Driver, ...>` porque la fila del campeonato no trae `number`.
  - Los tipos viven en `models/championship.ts`, **no** `standing.ts`: ese nombre queda para `LeagueStanding` (la tabla de una liga fantasy), que es otra cosa.
  - Los dos métodos nuevos viven en `drivers.service.ts`, mismo criterio que `constructors()`: un solo consumidor.
  - Cada tabla maneja su propia carga/error: si falla una, la otra se muestra igual.
- **Mobile**: tablas en `overflow-x-auto`; Escudería y Victorias se esconden debajo de `sm:`.
- **Tests**: 39 (+2) unitarios. **Sin e2e nuevo y sin pase manual en browser todavía** — ver el reporte del slice.

### Slice 14 (frontend) — listado de pilotos con filtro + detalle

- **Status**: done (branch `14/drivers-list-detail`, PR #30 mergeado en `dev`). Mitad frontend; la del backend está en [su carril](../../backend/docs/roadmap.md).
- **Goal cumplido**: el requisito de Regularidad "1 listado con filtro, con detalle al seleccionar", comprometido en `proposal.md:174`.
- **Shipped**: `features/drivers/` con `/drivers` y `/drivers/:id`, **públicas** — los `GET` del catálogo no piden auth en el backend y la UI lo espeja, así que se pueden abrir sin cuenta. `DriverCard`, `ConstructorFilter`, `DriverResultsTable`, `TeamBadge`, `DriverAvatar`. Links de navegación en el prop `actions` de `PageShell` y uno en el login, sin construir un navbar.
- **Decisiones clave**:
  - **Filtro server-side**, contra el `?constructorId=` que ya existía en la API y no tenía consumidor ni test. El valor vive en la **URL** vía `useSearchParams`, no en `useState`: sobrevive al "atrás" del browser desde el detalle y el link filtrado se puede compartir.
  - El `<select>` se puebla con `GET /constructors` aparte. Si las opciones salieran del listado ya filtrado, elegir Ferrari dejaría Ferrari como única opción sin vuelta atrás.
  - **Multimedia**: `Driver.headshotUrl` (21/22) guarda la **URL** contra el CDN de F1, no el archivo — son imágenes de prensa y el repo es público. `Constructor.logoUrl` (8/11) sí son estáticos, de Wikimedia Commons, con licencias en `frontend/public/logos/CREDITS.md`.
- **Gotcha que solo apareció midiendo**: el badge se pinta con el color oficial del equipo. Elegir el color del texto comparando la luminancia contra un umbral fijo dejaba **4 de 11 equipos por debajo del mínimo de contraste de WCAG** (Haas 1.95:1, Williams 2.19, McLaren 2.52, Racing Bulls 2.95). Hay que elegir el color que **maximiza** el contraste, y el texto oscuro tiene que ser **negro puro**: con el `#111827` del sistema de diseño, el rojo de Audi topaba en 4.07 y ninguna de las dos opciones llegaba. `team-color.test.ts` afirma que cada uno de los 11 llega a 4.5:1.
- **Primeros del repo**: el primer `<select>`, y `src/test/render-with-query.tsx`, el primer wrapper de React Query para tests (ningún test renderizaba un componente con `useQuery`).
- **Tests**: 37 (+24) unitarios, 4 e2e (+2 — uno verifica que `/drivers` **no** redirige a `/login`, el par simétrico del de `/leagues`). Pase responsive 375/768/1024 sin overflow. Evidencia en `docs/test-evidence/slice-14-*.txt`.
- **Pendiente, post-entrega**: el logo dentro del badge de cada card. Necesita conseguir Ferrari, Audi y Racing Bulls (no están en Commons) y recortar los wordmarks a un ícono cuadrado.

### Slice 13a — Frontend bootstrap (auth + ligas)

- **Status**: done (branches `13a/task-5-auth`, `13a/task-6-leagues`, `13a/task-7-league-detail`, `13a/task-8-e2e-playwright`, `13a/task-9-responsive-docs`, mergeadas en `dev`).
- **Goal**: crear el directorio `frontend/` con Vite + React + TypeScript + Tailwind + cliente HTTP que pega al backend, con las pantallas de auth y ligas funcionando de punta a punta, con e2e y verificación responsive.
- **Shipped**: `frontend/` (Vite + React 19 + TS + Tailwind v4). `services/api-client.ts` (axios singleton, interceptor con refresh de token dedup'do vía `refreshOnce()`), `store/auth.store.ts` (Zustand, token solo en memoria — sin `persist`), React Query para todo el fetching (`features/*/[...].queries.ts`, un hook por operación, invalidación en cada mutación), React Router v7 con layout-routes de guarda (`RequireAuth` / `GuestOnly`), formularios con `react-hook-form` + Zod (mismos schemas que el backend). Componentes UI propios en `components/ui/` (`Alert`, `Badge`, `Button`, `Card`, `Field`, `PageShell`).
  - **Pantallas**: `/login`, `/register` (auth), `/leagues` (lista + alta + join por código), `/leagues/:id` (detalle: miembros, invitar por código, iniciar draft si sos owner, salir/echar miembros — todo respetando `ROSTER_LOCKED` una vez que el draft está LIVE).
- **Touches reales**: todo `frontend/` (nuevo); `backend` sin cambios de lógica — solo `FRONTEND_URL` en CORS (ya soportado desde antes) y `user.name` agregado a `memberSelect` en `leagues.service.ts` para que la UI pueda mostrar nombres.
- **Tests**: Vitest + Testing Library (`RequireAuth.test.tsx`, `LeagueCard.test.tsx`, `auth.store.test.ts`, `api-error.test.ts`) — 13 tests. E2E con Playwright (`frontend/e2e/leagues.spec.ts`, `npm run e2e`): registro → crear liga → verse como owner, y redirect a `/login` sin sesión — 2 tests, evidencia en `docs/test-evidence/`. Cada task se verificó además con un script Playwright manual contra `npm run dev` real (login, crear/joinear liga, iniciar draft, roster lock) antes de mergear. Pase responsive (375/768/1024px) sin overflow horizontal en `/leagues` y `/leagues/:id`.
- **Pendiente (Slice 13b)**: draft en vivo conectado a Socket.io.
