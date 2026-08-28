# Slice 13a — Frontend bootstrap (React + Vite) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un frontend React clickeable: registro, login, mis ligas (crear / unirme), detalle de liga con miembros y "Iniciar draft" para el owner — contra el backend real, sin curl.

**Architecture:** SPA Vite + React 19 + TypeScript en `frontend/`, hablando con `backend/` a través de una clase `ApiClient` (axios + interceptores) y hooks de react-query. El access token vive en memoria en un store de zustand; la sesión persiste por la cookie httpOnly de refresh que el backend ya emite. Guards como layout routes de react-router. Componentes por feature; `components/ui` no conoce el dominio.

**Tech Stack:** Vite 7, React 19, TypeScript strict, react-router-dom 7, @tanstack/react-query 5, axios, zustand 5, react-hook-form 7 + zod, Tailwind v4 (`@tailwindcss/vite`), Vitest + Testing Library, Playwright. Mismo stack que `utnfrrodsw/react` salvo TS, Vitest y Tailwind (ver spec §3).

**Spec:** [`docs/specs/2026-08-27-slice-13a-frontend-bootstrap.md`](../specs/2026-08-27-slice-13a-frontend-bootstrap.md)

## Global Constraints

- Node 24. Vite sirve en **5173**; el backend espera `FRONTEND_URL=http://localhost:5173` (ya es el default).
- El access token vive **solo en memoria** (store de zustand, sin `persist`). Nada en `localStorage` / `sessionStorage`.
- Todo request a la API sale por `ApiClient` con `withCredentials: true`. Los componentes nunca importan axios.
- Reglas de imports: `components/ui` no importa `models/` ni `services/`; `services/` no importa React; `store/` no importa `services/`; `features/` importa de todos.
- Nombres: componentes y páginas en `PascalCase.tsx`; el resto en `kebab-case.ts`. Hooks `useX`.
- Copy de UI en **español**; código, identificadores y commits en inglés (summary de commit en español, como el resto del repo).
- Shapes de datos copiados de `docs/api-endpoints.md` y de los `select` del backend. No inventar campos.
- Mobile-first: clases base para SM, `md:` y `lg:` agregan.
- Cada task termina con `npm run lint` limpio, `npm test` verde y un commit. El usuario tipea el scaffold (Task 1) y el componente `Button` (Task 4) a mano. **Ningún commit sin confirmación explícita.**

---

## File Structure

```
backend/src/modules/leagues/leagues.service.ts   (Task 0, hecho) memberSelect + user.name
backend/src/modules/leagues/leagues.test.ts      (Task 0, hecho)
docs/api-endpoints.md                            (Task 0, hecho)

frontend/                                        (Task 1) create-vite react-ts + Tailwind + deps + Vitest
frontend/.env.example, .env                      (Task 1) VITE_API_URL, VITE_SOCKET_URL
frontend/src/config/env.ts                       (Task 1)
frontend/src/test/setup.ts                       (Task 1) jest-dom
frontend/src/models/{api,user,league,league-member}.ts   (Task 2)
frontend/src/services/api-error.ts (+ .test.ts)  (Task 2)
frontend/src/store/auth.store.ts (+ .test.ts)    (Task 3)
frontend/src/services/api-client.ts              (Task 3) class ApiClient
frontend/src/services/auth.service.ts            (Task 3)
frontend/src/components/ui/{Button,Field,Card,Badge,Alert,PageShell}.tsx + index.ts + Alert.test.tsx  (Task 4)
frontend/src/features/auth/{RequireAuth,GuestOnly}.tsx (+ RequireAuth.test.tsx)   (Task 5)
frontend/src/features/auth/{LoginPage,RegisterPage}.tsx                           (Task 5)
frontend/src/app/{providers,SessionGate,router,App}.tsx                           (Task 5)
frontend/src/services/leagues.service.ts         (Task 6)
frontend/src/features/leagues/leagues.queries.ts (Task 6)
frontend/src/features/leagues/LeagueCard.tsx (+ .test.tsx), LeaguesPage.tsx       (Task 6)
frontend/src/features/leagues/MembersTable.tsx, LeagueDetailPage.tsx              (Task 7)
frontend/e2e/leagues.spec.ts, playwright.config.ts                                (Task 8)
docs/test-evidence/slice-13a-*.txt               (Task 8)
README.md, docs/roadmap.md, CLAUDE.md, docs/tutorial.md                          (Task 9)
```

---

### Task 0: Backend — `user.name` en los miembros (HECHO, pendiente de commit)

**Files:** `backend/src/modules/leagues/leagues.service.ts` (`memberSelect` con `user: { select: { name: true } }`), `leagues.test.ts` (test "cada miembro incluye user.name"), `docs/api-endpoints.md`.

**Interfaces:** Produces `GET /leagues/:id/members` → `{ data: Array<{ id, userId, isOwner, status, joinedAt, user: { name } }> }`.

- [x] Test rojo → verde (50/50), `tsc` limpio, eslint limpio.
- [ ] **Commit** (al confirmar):

```bash
git add backend/src/modules/leagues/leagues.service.ts backend/src/modules/leagues/leagues.test.ts docs/api-endpoints.md
git commit -m "feat(leagues): user.name en GET /members para la tabla del frontend (Slice 13a)"
```

(`backend/.env.example` no cambia: `FRONTEND_URL` ya era `http://localhost:5173`.)

---

### Task 1: Scaffold Vite + React + TS, Tailwind, env, deps, Vitest (lo tipeás vos)

**Files:**

- Create: `frontend/` (create-vite)
- Modify: `frontend/vite.config.ts`, `frontend/src/index.css`, `frontend/src/App.tsx`, `frontend/tsconfig.app.json`, `frontend/package.json`
- Create: `frontend/.env.example`, `frontend/.env`, `frontend/src/config/env.ts`, `frontend/src/test/setup.ts`, `frontend/src/App.test.tsx`

**Interfaces:**

- Produces: `env.apiUrl`, `env.socketUrl` desde `src/config/env.ts`. `npm test` corre Vitest con jsdom + jest-dom.

- [ ] **Step 1: Crear el proyecto** (desde la raíz del repo)

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

Verify: existen `frontend/vite.config.ts`, `frontend/src/App.tsx`, `frontend/eslint.config.js`.

- [ ] **Step 2: Levantar y ver la página default**

```bash
npm run dev
```

`http://localhost:5173` muestra el contador de Vite + React. `Ctrl+C`.

- [ ] **Step 3: Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

`vite.config.ts` (reemplazar entero — incluye ya la config de Vitest del Step 7):

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    css: false,
  },
});
```

`src/index.css` (reemplazar entero):

```css
@import 'tailwindcss';
```

Borrar `src/App.css` y `src/assets/react.svg` (no se usan más).

- [ ] **Step 4: Probar que Tailwind aplica**

`src/App.tsx` (reemplazar entero):

```tsx
export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <h1 className="p-6 text-3xl font-bold text-red-600">BoxBox</h1>
    </main>
  );
}
```

`npm run dev` → "BoxBox" en rojo, grande, fondo gris claro. Si se ve negro y chico, revisar el plugin en `vite.config.ts` y el `@import` en `index.css`. `Ctrl+C`.

- [ ] **Step 5: Ambientes**

`frontend/.env.example` y `frontend/.env` (mismo contenido; `.env` ya está en el `.gitignore` de Vite):

```
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

`src/config/env.ts`:

```ts
// Unico lugar que lee import.meta.env. Vite solo expone variables con prefijo VITE_.
// Falla al arrancar si falta alguna: mejor un error claro que un fetch a "undefined/leagues".
function required(name: 'VITE_API_URL' | 'VITE_SOCKET_URL'): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name} (ver frontend/.env.example)`);
  return value;
}

export const env = {
  apiUrl: required('VITE_API_URL'),
  socketUrl: required('VITE_SOCKET_URL'),
} as const;
```

- [ ] **Step 6: Dependencias del proyecto**

```bash
npm install react-router-dom @tanstack/react-query axios zustand react-hook-form zod @hookform/resolvers
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 7: Vitest — setup, tipos, scripts, primer test**

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

En `tsconfig.app.json`, dentro de `compilerOptions`, agregar:

```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

En `package.json`, scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renderiza el titulo', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'BoxBox' })).toBeInTheDocument();
  });
});
```

Run: `npm test` → 1 passed. `npm run lint` → limpio. `npm run build` → sin errores.

- [ ] **Step 8: Commit** (al confirmar)

```bash
cd ..
git add frontend
git commit -m "feat(frontend): scaffold Vite + React 19 + TS, Tailwind v4, env, react-query/zustand/RHF, Vitest (Slice 13a)"
```

---

### Task 2: Modelos y `ApiError`

**Files:**

- Create: `frontend/src/models/api.ts`, `user.ts`, `league.ts`, `league-member.ts`
- Create: `frontend/src/services/api-error.ts`
- Test: `frontend/src/services/api-error.test.ts`

**Interfaces:**

- Produces: `ApiEnvelope<T>`, `ApiErrorBody`, `User`, `League`, `DraftStatus`, `LeagueStatus`, `LeagueMember`, `FantasyTeam`, `class ApiError(code, status, message)`, `toApiError(err: unknown): ApiError`.

- [ ] **Step 1: Test rojo**

`src/services/api-error.test.ts`:

```ts
import { AxiosError, AxiosHeaders } from 'axios';
import { ApiError, toApiError } from './api-error';

function axiosErrorWith(status: number, data?: unknown): AxiosError {
  const err = new AxiosError('Request failed', 'ERR_BAD_REQUEST');
  err.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return err;
}

describe('toApiError', () => {
  it('convierte el envelope { error } del backend en ApiError', () => {
    const err = toApiError(
      axiosErrorWith(409, {
        error: { code: 'LEAGUE_FULL', message: 'League is at capacity', status: 409 },
      }),
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('LEAGUE_FULL');
    expect(err.status).toBe(409);
    expect(err.message).toBe('League is at capacity');
  });

  it('sin respuesta del server es NETWORK_ERROR', () => {
    const err = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.status).toBe(0);
  });

  it('un ApiError se devuelve tal cual', () => {
    const original = new ApiError('X', 400, 'x');
    expect(toApiError(original)).toBe(original);
  });
});
```

- [ ] **Step 2: Rojo** — `npm test` → "Failed to resolve import './api-error'".

- [ ] **Step 3: Modelos**

`src/models/api.ts`:

```ts
// Envelope de la API: exito { data }, error { error: { code, message, status } }.
export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  };
}
```

`src/models/user.ts`:

```ts
export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}
```

`src/models/league.ts`:

```ts
export type DraftStatus = 'PENDING' | 'LIVE' | 'COMPLETED';
export type LeagueStatus = 'ACTIVE' | 'ARCHIVED' | 'CANCELLED';

export interface League {
  id: number;
  name: string;
  inviteCode: string;
  maxMembers: number;
  seasonId: number;
  createdById: number;
  draftStatus: DraftStatus;
  status: LeagueStatus;
  createdAt: string;
  updatedAt: string;
}
```

`src/models/league-member.ts`:

```ts
export type MemberStatus = 'ACTIVE' | 'LEFT' | 'KICKED';

export interface LeagueMember {
  id: number;
  userId: number;
  isOwner: boolean;
  status: MemberStatus;
  joinedAt: string;
  user: { name: string }; // Task 0 lo agrego al backend
}

export interface FantasyTeam {
  id: number;
  leagueMemberId: number;
  driver1Id: number | null;
  driver2Id: number | null;
  constructorId: number | null;
}
```

- [ ] **Step 4: `ApiError`**

`src/services/api-error.ts`:

```ts
import axios from 'axios';
import type { ApiErrorBody } from '../models/api';

// ApiError: el error tipado que ve el resto de la app. `code` es el SCREAMING_SNAKE del backend
// (docs/error-codes.md); `status` el HTTP. Clase (no interface) para que `instanceof` funcione
// en catch y para cumplir "modelos con clases" de la rubrica.
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'error' in body;
}

// toApiError: normaliza cualquier cosa que tire axios a un ApiError.
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const body: unknown = err.response?.data;
    if (isApiErrorBody(body)) {
      const { code, message, status } = body.error;
      return new ApiError(code, status, message);
    }
    if (!err.response) {
      return new ApiError('NETWORK_ERROR', 0, 'No se pudo conectar con el servidor');
    }
    return new ApiError('UNKNOWN_ERROR', err.response.status, err.message);
  }
  return new ApiError('UNKNOWN_ERROR', 0, String(err));
}
```

- [ ] **Step 5: Verde + lint** — `npm test` → 4 passed. `npm run lint` → limpio.

- [ ] **Step 6: Commit** (al confirmar)

```bash
git add frontend/src/models frontend/src/services/api-error.ts frontend/src/services/api-error.test.ts
git commit -m "feat(frontend): modelos (User, League, LeagueMember) + ApiError tipado (Slice 13a)"
```

---

### Task 3: Store de auth (zustand), `ApiClient` (axios) y `auth.service`

**Files:**

- Create: `frontend/src/store/auth.store.ts`
- Test: `frontend/src/store/auth.store.test.ts`
- Create: `frontend/src/services/api-client.ts`
- Create: `frontend/src/services/auth.service.ts`

**Interfaces:**

- Consumes: `env.apiUrl` (Task 1), `ApiEnvelope`, `User`, `toApiError` (Task 2).
- Produces: `useAuthStore` (`accessToken`, `user`, `sessionReady`, `isLoggedIn()`, `setSession(user, token)`, `clear()`, `markReady()`); `apiClient.get<T>(url)`, `.post<T>(url, body?)`, `.delete<T>(url)`, `.refreshOnce()` — devuelven `T` ya desenvuelto de `{ data }`; `authService.login(email, password): Promise<User>`, `.register(email, password, name)`, `.restoreSession(): Promise<void>`, `.logout(): Promise<void>`.

- [ ] **Step 1: Test rojo del store**

`src/store/auth.store.test.ts`:

```ts
import { useAuthStore } from './auth.store';

const user = { id: 1, email: 'a@b.c', name: 'Ana', role: 'USER' as const };

describe('useAuthStore', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('arranca sin sesion', () => {
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isLoggedIn()).toBe(false);
  });

  it('setSession guarda token y user; clear los borra', () => {
    useAuthStore.getState().setSession(user, 'tok');
    expect(useAuthStore.getState().isLoggedIn()).toBe(true);
    expect(useAuthStore.getState().user?.name).toBe('Ana');

    useAuthStore.getState().clear();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('nunca toca localStorage', () => {
    useAuthStore.getState().setSession(user, 'tok');
    expect(localStorage.length).toBe(0);
  });
});
```

- [ ] **Step 2: Rojo** — `npm test` → "Failed to resolve import './auth.store'".

- [ ] **Step 3: Store**

`src/store/auth.store.ts`:

```ts
import { create } from 'zustand';
import type { User } from '../models/user';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  // false hasta que el refresh inicial termino (con o sin sesion). SessionGate lo espera.
  sessionReady: boolean;
  isLoggedIn: () => boolean;
  setSession: (user: User, accessToken: string) => void;
  clear: () => void;
  markReady: () => void;
}

// El token vive ACA, en memoria. Sin middleware `persist` a proposito: la persistencia entre
// recargas la da la cookie httpOnly de refresh, no localStorage (spec §3, D3).
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  sessionReady: false,
  isLoggedIn: () => get().accessToken !== null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  clear: () => set({ user: null, accessToken: null }),
  markReady: () => set({ sessionReady: true }),
}));
```

- [ ] **Step 4: Verde** — `npm test` → 7 passed.

- [ ] **Step 5: `ApiClient`**

`src/services/api-client.ts`:

```ts
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import type { ApiEnvelope } from '../models/api';
import type { User } from '../models/user';
import { useAuthStore } from '../store/auth.store';
import { toApiError } from './api-error';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

interface AuthPayload {
  user: User;
  accessToken: string;
}

// ApiClient: la unica puerta hacia el backend (patron fachada). Una clase, una instancia.
//   - request: Authorization: Bearer <token del store>; withCredentials para la cookie.
//   - response 401 fuera de /auth/*: UN refresh (deduplicado si hay varios 401 a la vez),
//     reintenta el request original; si el refresh falla, cierra la sesion.
//   - cualquier error sale como ApiError. Los componentes nunca ven un AxiosError.
export class ApiClient {
  private readonly http: AxiosInstance;
  private refreshing: Promise<string> | null = null;

  constructor(baseURL: string) {
    this.http = axios.create({ baseURL, withCredentials: true });

    this.http.interceptors.request.use((config) => {
      const token = useAuthStore.getState().accessToken;
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.http.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RetriableConfig | undefined;
        const isAuthRoute = config?.url?.includes('/auth/') ?? false;
        const canRetry =
          error.response?.status === 401 &&
          config !== undefined &&
          !config._retried &&
          !isAuthRoute &&
          useAuthStore.getState().isLoggedIn();

        if (!canRetry) throw toApiError(error);

        try {
          await this.refreshOnce();
        } catch (refreshErr) {
          useAuthStore.getState().clear();
          throw toApiError(refreshErr);
        }
        config._retried = true;
        return this.http.request(config);
      },
    );
  }

  // refreshOnce: si ya hay un refresh en vuelo, todos esperan el mismo (evita N refresh
  // cuando N requests fallan juntos con 401). El backend devuelve { user, accessToken }.
  refreshOnce(): Promise<string> {
    if (!this.refreshing) {
      this.refreshing = this.post<AuthPayload>('/auth/refresh')
        .then((payload) => {
          useAuthStore.getState().setSession(payload.user, payload.accessToken);
          return payload.accessToken;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  async get<T>(url: string): Promise<T> {
    const res = await this.http.get<ApiEnvelope<T>>(url);
    return res.data.data;
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    const res = await this.http.post<ApiEnvelope<T>>(url, body ?? {});
    return res.data.data;
  }

  async delete<T = void>(url: string): Promise<T> {
    const res = await this.http.delete<ApiEnvelope<T>>(url);
    return res.data?.data;
  }
}

export const apiClient = new ApiClient(env.apiUrl);
```

- [ ] **Step 6: `auth.service`**

`src/services/auth.service.ts`:

```ts
import type { User } from '../models/user';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from './api-client';

interface AuthPayload {
  user: User;
  accessToken: string;
}

// El "servicio" de auth (rubrica): funciones sobre apiClient + el store. Sin React.
export const authService = {
  async login(email: string, password: string): Promise<User> {
    const { user, accessToken } = await apiClient.post<AuthPayload>('/auth/login', {
      email,
      password,
    });
    useAuthStore.getState().setSession(user, accessToken);
    return user;
  },

  async register(email: string, password: string, name: string): Promise<User> {
    const { user, accessToken } = await apiClient.post<AuthPayload>('/auth/register', {
      email,
      password,
      name,
    });
    useAuthStore.getState().setSession(user, accessToken);
    return user;
  },

  // Al arrancar la app: intenta restaurar la sesion con la cookie. Nunca tira: sin cookie o
  // vencida, simplemente quedamos deslogueados.
  async restoreSession(): Promise<void> {
    try {
      await apiClient.refreshOnce();
    } catch {
      useAuthStore.getState().clear();
    } finally {
      useAuthStore.getState().markReady();
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      useAuthStore.getState().clear();
    }
  },
};
```

- [ ] **Step 7: Lint + test + commit** (al confirmar)

`npm run lint` limpio, `npm test` → 7 passed, `npm run build` sin errores.

```bash
git add frontend/src/store frontend/src/services/api-client.ts frontend/src/services/auth.service.ts
git commit -m "feat(frontend): auth store en memoria + ApiClient con refresh en 401 + auth.service (Slice 13a)"
```

---

### Task 4: `components/ui` — 6 componentes sin dominio (`Button` lo tipeás vos)

**Files:**

- Create: `frontend/src/components/ui/Button.tsx`, `Field.tsx`, `Card.tsx`, `Badge.tsx`, `Alert.tsx`, `PageShell.tsx`, `index.ts`
- Test: `frontend/src/components/ui/Alert.test.tsx`

**Interfaces:**

- Produces: `<Button variant="primary|secondary|danger" type disabled onClick>`, `<Field label error>{input}</Field>` + `inputClass`, `<Card>`, `<Badge tone="neutral|info|success|warning">`, `<Alert code message>`, `<PageShell title actions>`, `errorMessageFor(code, fallback)`.

- [ ] **Step 1: `Button` (tipealo vos — primer componente React del proyecto)**

`src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

// Button: un <button> con las 3 variantes visuales del proyecto. No sabe de dominio.
// Las props son las "propiedades de entrada" (rubrica); onClick es la "salida".
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-red-600 text-white hover:bg-red-700',
  secondary: 'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50',
  danger: 'bg-slate-900 text-white hover:bg-black',
};

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    />
  );
}
```

- [ ] **Step 2: `Field`, `Card`, `Badge`, `PageShell`**

`Field.tsx` — envuelve el `<input>` que le pasa el padre (asi funciona con `register()` de react-hook-form sin acoplarse):

```tsx
import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string | null;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
}

// Clases compartidas para los <input> nativos, asi las paginas no las repiten.
export const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2';
```

`Card.tsx`:

```tsx
import type { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6">
      {children}
    </section>
  );
}
```

`Badge.tsx`:

```tsx
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
```

`PageShell.tsx`:

```tsx
import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, actions, children }: PageShellProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
        {actions}
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Test rojo del `Alert`**

`Alert.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Alert, errorMessageFor } from './Alert';

describe('errorMessageFor', () => {
  it('traduce codigos conocidos a espanol', () => {
    expect(errorMessageFor('INVITE_CODE_NOT_FOUND', 'x')).toBe('Ese código no existe');
    expect(errorMessageFor('ROSTER_LOCKED', 'x')).toBe(
      'El draft ya empezó: no se puede cambiar el roster',
    );
  });

  it('para un codigo desconocido usa el mensaje del backend', () => {
    expect(errorMessageFor('SOMETHING_NEW', 'Backend says hi')).toBe('Backend says hi');
  });
});

describe('Alert', () => {
  it('renderiza el mensaje traducido con role=alert', () => {
    render(<Alert code="LEAGUE_FULL" message="League is at capacity" />);
    expect(screen.getByRole('alert')).toHaveTextContent('La liga está llena');
  });
});
```

- [ ] **Step 4: Rojo** — `npm test` → "Failed to resolve import './Alert'".

- [ ] **Step 5: `Alert` + `index.ts`**

`Alert.tsx`:

```tsx
// Mapa codigo del backend -> mensaje para el usuario (docs/error-codes.md). Un codigo que no
// esta aca muestra el `message` del backend.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos',
  EMAIL_ALREADY_EXISTS: 'Ya hay una cuenta con ese email',
  TOKEN_INVALID: 'Tu sesión venció, volvé a entrar',
  TOKEN_MISSING: 'Tenés que iniciar sesión',
  VALIDATION_ERROR: 'Revisá los datos del formulario',
  INVITE_CODE_NOT_FOUND: 'Ese código no existe',
  INVITE_CODE_TAKEN: 'Ese código ya está en uso, probá otro',
  LEAGUE_FULL: 'La liga está llena',
  ALREADY_MEMBER: 'Ya sos miembro de esta liga',
  ROSTER_LOCKED: 'El draft ya empezó: no se puede cambiar el roster',
  MAX_MEMBERS_EXCEEDS_SEASON: 'Esa cantidad de miembros supera lo que permite la temporada',
  OWNER_CANNOT_LEAVE: 'El owner no puede salir de su liga',
  DRAFT_ALREADY_STARTED: 'El draft ya había arrancado',
  TOO_MANY_MEMBERS_FOR_DRAFT: 'Hay más miembros que pilotos disponibles para el draft',
  NETWORK_ERROR: 'No se pudo conectar con el servidor',
  INTERNAL_ERROR: 'Algo salió mal, probá de nuevo',
};

export function errorMessageFor(code: string, fallback: string): string {
  return MESSAGES[code] ?? fallback;
}

export function Alert({ code, message = '' }: { code: string; message?: string }) {
  return (
    <p
      role="alert"
      className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200"
    >
      {errorMessageFor(code, message)}
    </p>
  );
}
```

`index.ts`:

```ts
export { Button } from './Button';
export { Field, inputClass } from './Field';
export { Card } from './Card';
export { Badge, type BadgeTone } from './Badge';
export { Alert, errorMessageFor } from './Alert';
export { PageShell } from './PageShell';
```

- [ ] **Step 6: Verde + lint + commit** (al confirmar)

`npm test` → 10 passed. `npm run lint` → limpio.

```bash
git add frontend/src/components
git commit -m "feat(frontend): components/ui — Button, Field, Card, Badge, Alert, PageShell (Slice 13a)"
```

---

### Task 5: Guards, `SessionGate`, router, páginas de login y registro

**Files:**

- Create: `frontend/src/features/auth/RequireAuth.tsx`, `GuestOnly.tsx`
- Test: `frontend/src/features/auth/RequireAuth.test.tsx`
- Create: `frontend/src/features/auth/LoginPage.tsx`, `RegisterPage.tsx`
- Create: `frontend/src/app/providers.tsx`, `SessionGate.tsx`, `router.tsx`, `App.tsx`
- Modify: `frontend/src/main.tsx`; borrar `src/App.tsx` y `src/App.test.tsx`

**Interfaces:**

- Consumes: `useAuthStore`, `authService`, `ui`.
- Produces: rutas `/login`, `/register`, `/leagues` (placeholder), `''` → `/leagues`. `<RequireAuth />` y `<GuestOnly />` como layout routes con `<Outlet />`.

- [ ] **Step 1: Test rojo del guard**

`RequireAuth.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { RequireAuth } from './RequireAuth';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>pagina de login</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/leagues" element={<p>mis ligas</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('sin token redirige a /login', () => {
    renderAt('/leagues');
    expect(screen.getByText('pagina de login')).toBeInTheDocument();
  });

  it('con token renderiza la ruta protegida', () => {
    useAuthStore.getState().setSession({ id: 1, email: 'a@b.c', name: 'Ana', role: 'USER' }, 'tok');
    renderAt('/leagues');
    expect(screen.getByText('mis ligas')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rojo** — `npm test` → "Failed to resolve import './RequireAuth'".

- [ ] **Step 3: Guards**

`RequireAuth.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

// RequireAuth: layout route. Sin sesion -> /login. Es la "proteccion de rutas por nivel de
// acceso" de la rubrica. `replace` para que el back del browser no vuelva a la ruta prohibida.
export function RequireAuth() {
  const loggedIn = useAuthStore((s) => s.accessToken !== null);
  return loggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
```

`GuestOnly.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

// GuestOnly: lo inverso, para /login y /register — un usuario logueado va a /leagues.
export function GuestOnly() {
  const loggedIn = useAuthStore((s) => s.accessToken !== null);
  return loggedIn ? <Navigate to="/leagues" replace /> : <Outlet />;
}
```

- [ ] **Step 4: Verde** — `npm test` → 12 passed.

- [ ] **Step 5: `LoginPage`**

`LoginPage.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button, Card, Field, inputClass } from '../../components/ui';
import { ApiError, toApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';

// Mismas reglas que loginSchema del backend: email valido, password >= 8.
const schema = z.object({
  email: z.string().email('No parece un email'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<ApiError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      await authService.login(values.email, values.password);
      navigate('/leagues');
    } catch (err) {
      setError(toApiError(err));
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-sm px-4">
      <Card>
        <h1 className="mb-4 text-2xl font-bold">Entrar a BoxBox</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register('email')}
            />
          </Field>
          <Field label="Contraseña" error={errors.password?.message}>
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              {...register('password')}
            />
          </Field>
          {error && <Alert code={error.code} message={error.message} />}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="font-semibold text-red-600">
            Registrate
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: `RegisterPage`**

`RegisterPage.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button, Card, Field, inputClass } from '../../components/ui';
import { ApiError, toApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('No parece un email'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type RegisterForm = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<ApiError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: RegisterForm) {
    setError(null);
    try {
      await authService.register(values.email, values.password, values.name);
      navigate('/leagues');
    } catch (err) {
      setError(toApiError(err));
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-sm px-4">
      <Card>
        <h1 className="mb-4 text-2xl font-bold">Crear cuenta</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nombre" error={errors.name?.message}>
            <input type="text" autoComplete="name" className={inputClass} {...register('name')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register('email')}
            />
          </Field>
          <Field label="Contraseña" error={errors.password?.message}>
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              {...register('password')}
            />
          </Field>
          {error && <Alert code={error.code} message={error.message} />}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-semibold text-red-600">
            Entrá
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: `app/` — providers, SessionGate, router, App, main**

`app/providers.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Un QueryClient para toda la app. retry: 1 — un 4xx no se arregla reintentando 3 veces.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

`app/SessionGate.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';

// SessionGate: antes de renderizar el router, intenta restaurar la sesion con la cookie de
// refresh (una sola vez). Asi un F5 no desloguea y los guards ven el estado real.
export function SessionGate({ children }: { children: ReactNode }) {
  const ready = useAuthStore((s) => s.sessionReady);

  useEffect(() => {
    if (!ready) void authService.restoreSession();
  }, [ready]);

  if (!ready) return <p className="p-6 text-slate-500">Cargando sesión…</p>;
  return <>{children}</>;
}
```

`app/router.tsx`:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { GuestOnly } from '../features/auth/GuestOnly';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/leagues" replace /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      // Placeholder hasta Task 6.
      { path: '/leagues', element: <p className="p-6">Mis ligas (Task 6)</p> },
    ],
  },
  { path: '*', element: <Navigate to="/leagues" replace /> },
]);
```

`app/App.tsx`:

```tsx
import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { SessionGate } from './SessionGate';

export function App() {
  return (
    <Providers>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <SessionGate>
          <RouterProvider router={router} />
        </SessionGate>
      </main>
    </Providers>
  );
}
```

`src/main.tsx` (reemplazar entero):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Borrar `src/App.tsx` y `src/App.test.tsx` (el shell ahora es `app/App.tsx`; el smoke test lo reemplazan los de Task 2–5).

- [ ] **Step 8: Probar a mano** (backend con `npm run dev`, `FRONTEND_URL=http://localhost:5173`)

`npm run dev` → `http://localhost:5173` → redirige a `/login`. Registrarse con un email nuevo → cae en `/leagues` (placeholder). **F5** → sigue en `/leagues` (sesión restaurada por cookie). DevTools → Application → Local Storage: **vacío**. Login con contraseña incorrecta → "Email o contraseña incorrectos".

- [ ] **Step 9: Lint + test + commit** (al confirmar)

`npm run lint` limpio, `npm test` → 12 passed, `npm run build` sin errores.

```bash
git add frontend/src
git commit -m "feat(frontend): login y registro (RHF + zod), guards, SessionGate, router (Slice 13a)"
```

---

### Task 6: `leagues.service`, hooks de react-query, `LeagueCard` (TDD) y página "Mis ligas"

**Files:**

- Create: `frontend/src/services/leagues.service.ts`
- Create: `frontend/src/features/leagues/leagues.queries.ts`
- Create: `frontend/src/features/leagues/LeagueCard.tsx`
- Test: `frontend/src/features/leagues/LeagueCard.test.tsx`
- Create: `frontend/src/features/leagues/LeaguesPage.tsx`
- Modify: `frontend/src/app/router.tsx`

**Interfaces:**

- Produces: `leaguesService.{list, create, join, get, members, leave, kick, startDraft, activeSeasonId}`; hooks `useLeagues()`, `useLeague(id)`, `useMembers(id)`, `useCreateLeague()`, `useJoinLeague()`, `useStartDraft(id)`, `useLeave(id)`, `useKick(id)`; `<LeagueCard league onOpen>`; `DRAFT_LABEL`.

- [ ] **Step 1: Test rojo de `LeagueCard`**

`LeagueCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { League } from '../../models/league';
import { LeagueCard } from './LeagueCard';

const league: League = {
  id: 7,
  name: 'Liga UTN',
  inviteCode: 'utn-2026',
  maxMembers: 11,
  seasonId: 1,
  createdById: 1,
  draftStatus: 'PENDING',
  status: 'ACTIVE',
  createdAt: '2026-08-27T00:00:00Z',
  updatedAt: '2026-08-27T00:00:00Z',
};

describe('LeagueCard', () => {
  it('muestra nombre, codigo y estado del draft', () => {
    render(<LeagueCard league={league} onOpen={() => {}} />);
    expect(screen.getByText('Liga UTN')).toBeInTheDocument();
    expect(screen.getByText('utn-2026')).toBeInTheDocument();
    expect(screen.getByText('Draft pendiente')).toBeInTheDocument();
  });

  it('llama onOpen con el id al hacer click', async () => {
    const onOpen = vi.fn();
    render(<LeagueCard league={league} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /ver liga/i }));
    expect(onOpen).toHaveBeenCalledWith(7);
  });
});
```

- [ ] **Step 2: Rojo** — `npm test` → "Failed to resolve import './LeagueCard'".

- [ ] **Step 3: `LeagueCard`**

`LeagueCard.tsx`:

```tsx
import { Badge, Card, type BadgeTone } from '../../components/ui';
import type { DraftStatus, League } from '../../models/league';

export const DRAFT_LABEL: Record<DraftStatus, { text: string; tone: BadgeTone }> = {
  PENDING: { text: 'Draft pendiente', tone: 'neutral' },
  LIVE: { text: 'Draft en vivo', tone: 'info' },
  COMPLETED: { text: 'Draft completo', tone: 'success' },
};

// LeagueCard: una liga en la lista. Entrada: la liga. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina.
export function LeagueCard({ league, onOpen }: { league: League; onOpen: (id: number) => void }) {
  const draft = DRAFT_LABEL[league.draftStatus];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{league.name}</h2>
          <p className="text-sm text-slate-500">
            Código: <span className="font-mono">{league.inviteCode}</span>
          </p>
        </div>
        <Badge tone={draft.tone}>{draft.text}</Badge>
      </div>
      <button
        type="button"
        className="mt-4 text-sm font-semibold text-red-600 hover:underline"
        onClick={() => onOpen(league.id)}
      >
        Ver liga →
      </button>
    </Card>
  );
}
```

- [ ] **Step 4: Verde** — `npm test` → 14 passed.

- [ ] **Step 5: `leagues.service`**

`src/services/leagues.service.ts`:

```ts
import type { DraftStatus, League } from '../models/league';
import type { LeagueMember } from '../models/league-member';
import { apiClient } from './api-client';

export interface CreateLeagueInput {
  name: string;
  inviteCode: string;
  seasonId: number;
}

// El "servicio" de ligas (rubrica): todo lo que habla con /leagues. Sin React, sin URLs en
// los componentes.
export const leaguesService = {
  list: () => apiClient.get<League[]>('/leagues'),
  create: (input: CreateLeagueInput) => apiClient.post<League>('/leagues', input),
  join: (inviteCode: string) => apiClient.post<LeagueMember>('/leagues/join', { inviteCode }),
  get: (id: number) => apiClient.get<League>(`/leagues/${id}`),
  members: (id: number) => apiClient.get<LeagueMember[]>(`/leagues/${id}/members`),
  leave: (id: number) => apiClient.post<LeagueMember>(`/leagues/${id}/leave`),
  kick: (id: number, userId: number) => apiClient.delete(`/leagues/${id}/members/${userId}`),
  startDraft: (id: number) =>
    apiClient.post<{ draftStatus: DraftStatus; totalPicks: number }>(`/leagues/${id}/draft/start`),
  // /seasons/active es publico; vive aca porque el unico que lo usa es "crear liga".
  activeSeasonId: () => apiClient.get<{ id: number }>('/seasons/active').then((s) => s.id),
};
```

- [ ] **Step 6: Hooks de react-query**

`features/leagues/leagues.queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { League } from '../../models/league';
import type { LeagueMember } from '../../models/league-member';
import { ApiError } from '../../services/api-error';
import { leaguesService, type CreateLeagueInput } from '../../services/leagues.service';

// Un hook por lectura, un hook por escritura. Las escrituras invalidan lo que cambian, y
// react-query vuelve a pedirlo — sin useEffect/useState a mano para datos del server.
const keys = {
  all: ['leagues'] as const,
  one: (id: number) => ['leagues', id] as const,
  members: (id: number) => ['leagues', id, 'members'] as const,
};

export function useLeagues() {
  return useQuery<League[], ApiError>({ queryKey: keys.all, queryFn: leaguesService.list });
}

export function useLeague(id: number) {
  return useQuery<League, ApiError>({
    queryKey: keys.one(id),
    queryFn: () => leaguesService.get(id),
  });
}

export function useMembers(id: number) {
  return useQuery<LeagueMember[], ApiError>({
    queryKey: keys.members(id),
    queryFn: () => leaguesService.members(id),
  });
}

export function useCreateLeague() {
  const qc = useQueryClient();
  return useMutation<League, ApiError, Omit<CreateLeagueInput, 'seasonId'>>({
    mutationFn: async (input) => {
      const seasonId = await leaguesService.activeSeasonId();
      return leaguesService.create({ ...input, seasonId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useJoinLeague() {
  const qc = useQueryClient();
  return useMutation<LeagueMember, ApiError, string>({
    mutationFn: (inviteCode) => leaguesService.join(inviteCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

function useLeagueAction<TVars = void>(id: number, fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.one(id) });
      void qc.invalidateQueries({ queryKey: keys.members(id) });
      void qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export const useStartDraft = (id: number) =>
  useLeagueAction(id, () => leaguesService.startDraft(id));
export const useLeave = (id: number) => useLeagueAction(id, () => leaguesService.leave(id));
export const useKick = (id: number) =>
  useLeagueAction<number>(id, (userId) => leaguesService.kick(id, userId));
```

- [ ] **Step 7: `LeaguesPage`**

`LeaguesPage.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button, Card, Field, PageShell, inputClass } from '../../components/ui';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { LeagueCard } from './LeagueCard';
import { useCreateLeague, useJoinLeague, useLeagues } from './leagues.queries';

// Mismas reglas que createLeagueSchema del backend: 4-20 chars, minusculas/numeros/guiones.
const createSchema = z.object({
  name: z.string().min(1, 'Obligatorio'),
  inviteCode: z
    .string()
    .regex(/^[a-z0-9-]{4,20}$/, '4 a 20 caracteres: minúsculas, números o guiones'),
});
const joinSchema = z.object({ inviteCode: z.string().min(4, 'Mínimo 4 caracteres') });

export function LeaguesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const leagues = useLeagues();
  const createLeague = useCreateLeague();
  const joinLeague = useJoinLeague();

  const createForm = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<z.infer<typeof joinSchema>>({ resolver: zodResolver(joinSchema) });

  async function logout() {
    await authService.logout();
    navigate('/login');
  }

  return (
    <PageShell
      title="Mis ligas"
      actions={
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{user?.name}</span>
          <Button variant="secondary" onClick={logout}>
            Salir
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-4">
          {leagues.error && <Alert code={leagues.error.code} message={leagues.error.message} />}
          {leagues.data?.length === 0 && (
            <p className="text-slate-500">
              Todavía no estás en ninguna liga. Creá una o unite con un código.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {leagues.data?.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                onOpen={(id) => navigate(`/leagues/${id}`)}
              />
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Crear liga</h2>
            <form
              onSubmit={createForm.handleSubmit((values) =>
                createLeague.mutate(values, {
                  onSuccess: (league) => navigate(`/leagues/${league.id}`),
                }),
              )}
              className="flex flex-col gap-3"
            >
              <Field label="Nombre" error={createForm.formState.errors.name?.message}>
                <input className={inputClass} {...createForm.register('name')} />
              </Field>
              <Field
                label="Código de invitación"
                error={createForm.formState.errors.inviteCode?.message}
              >
                <input
                  className={`${inputClass} font-mono`}
                  {...createForm.register('inviteCode')}
                />
              </Field>
              {createLeague.error && (
                <Alert code={createLeague.error.code} message={createLeague.error.message} />
              )}
              <Button type="submit" disabled={createLeague.isPending}>
                Crear
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Unirme con código</h2>
            <form
              onSubmit={joinForm.handleSubmit((values) =>
                joinLeague.mutate(values.inviteCode, { onSuccess: () => joinForm.reset() }),
              )}
              className="flex flex-col gap-3"
            >
              <Field label="Código" error={joinForm.formState.errors.inviteCode?.message}>
                <input className={`${inputClass} font-mono`} {...joinForm.register('inviteCode')} />
              </Field>
              {joinLeague.error && (
                <Alert code={joinLeague.error.code} message={joinLeague.error.message} />
              )}
              <Button type="submit" variant="secondary" disabled={joinLeague.isPending}>
                Unirme
              </Button>
            </form>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 8: Ruta real de `/leagues`**

En `app/router.tsx`, reemplazar el placeholder por `{ path: '/leagues', element: <LeaguesPage /> }` con `import { LeaguesPage } from '../features/leagues/LeaguesPage';`.

- [ ] **Step 9: Probar a mano**

Backend con seed (`npx prisma db seed` — hace falta una temporada activa). Login → "Mis ligas" vacío → crear "Liga UTN" con código `utn-2026` → navega al detalle (404 del router hasta Task 7: volver con el botón atrás). En una ventana de incógnito, registrar otro usuario → "Unirme" con `utn-2026` → aparece la tarjeta. Código inexistente → "Ese código no existe".

- [ ] **Step 10: Lint + test + commit** (al confirmar)

```bash
git add frontend/src
git commit -m "feat(frontend): mis ligas — lista, crear, unirme; leagues.service + hooks de react-query (Slice 13a)"
```

---

### Task 7: Detalle de liga con miembros y acciones

**Files:**

- Create: `frontend/src/features/leagues/MembersTable.tsx`, `LeagueDetailPage.tsx`
- Modify: `frontend/src/app/router.tsx`

**Interfaces:**

- Consumes: `useLeague`, `useMembers`, `useStartDraft`, `useLeave`, `useKick`, `useAuthStore`, `DRAFT_LABEL`, `ui`.
- Produces: ruta `/leagues/:id`. `<MembersTable members canKick onKick>`.

- [ ] **Step 1: `MembersTable`**

```tsx
import { Badge } from '../../components/ui';
import type { LeagueMember } from '../../models/league-member';

// MembersTable: lista de miembros. En SM se apila (cada miembro = 2 lineas); desde md: fila.
// `canKick` lo decide la pagina (owner + roster abierto); la tabla solo muestra el boton.
export function MembersTable({
  members,
  canKick,
  onKick,
}: {
  members: LeagueMember[];
  canKick: boolean;
  onKick: (userId: number) => void;
}) {
  return (
    <ul className="divide-y divide-slate-200">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{m.user.name}</span>
            {m.isOwner && <Badge tone="warning">owner</Badge>}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>desde {new Date(m.joinedAt).toLocaleDateString('es-AR')}</span>
            {canKick && !m.isOwner && (
              <button
                type="button"
                className="font-semibold text-red-600 hover:underline"
                onClick={() => onKick(m.userId)}
              >
                Echar
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: `LeagueDetailPage`**

```tsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, PageShell } from '../../components/ui';
import { useAuthStore } from '../../store/auth.store';
import { DRAFT_LABEL } from './LeagueCard';
import { MembersTable } from './MembersTable';
import { useKick, useLeague, useLeave, useMembers, useStartDraft } from './leagues.queries';

export function LeagueDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const league = useLeague(id);
  const members = useMembers(id);
  const startDraft = useStartDraft(id);
  const leave = useLeave(id);
  const kick = useKick(id);
  const [copied, setCopied] = useState(false);

  if (league.error) {
    return (
      <PageShell title="Liga">
        <Alert code={league.error.code} message={league.error.message} />
      </PageShell>
    );
  }
  if (!league.data) return <p className="p-6 text-slate-500">Cargando…</p>;

  const l = league.data;
  const isOwner = l.createdById === me?.id;
  const rosterOpen = l.draftStatus === 'PENDING';
  const draft = DRAFT_LABEL[l.draftStatus];
  const busy = startDraft.isPending || leave.isPending || kick.isPending;
  const actionError = startDraft.error ?? leave.error ?? kick.error ?? members.error;

  async function copyCode() {
    await navigator.clipboard.writeText(l.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <PageShell
      title={l.name}
      actions={
        <Link to="/leagues" className="text-sm font-semibold text-slate-600 hover:underline">
          ← Mis ligas
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Miembros ({members.data?.length ?? 0}/{l.maxMembers})
            </h2>
            <Badge tone={draft.tone}>{draft.text}</Badge>
          </div>
          {actionError && (
            <div className="mb-3">
              <Alert code={actionError.code} message={actionError.message} />
            </div>
          )}
          <MembersTable
            members={members.data ?? []}
            canKick={isOwner && rosterOpen}
            onKick={(userId) => kick.mutate(userId)}
          />
        </Card>

        <aside className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Invitar</h2>
            <p className="text-sm text-slate-600">Compartí este código:</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-1 font-mono">{l.inviteCode}</code>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-semibold">Draft</h2>
            {isOwner ? (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  Cuando estén todos, arrancá el draft. Después no entra ni sale nadie.
                </p>
                <Button disabled={!rosterOpen || busy} onClick={() => startDraft.mutate()}>
                  {rosterOpen ? 'Iniciar draft' : draft.text}
                </Button>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  Solo el owner puede arrancar el draft.
                </p>
                <Button
                  variant="danger"
                  disabled={!rosterOpen || busy}
                  onClick={() => leave.mutate(undefined, { onSuccess: () => navigate('/leagues') })}
                >
                  Salir de la liga
                </Button>
              </>
            )}
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 3: Ruta**

En `app/router.tsx`, dentro de los `children` de `<RequireAuth />`: `{ path: '/leagues/:id', element: <LeagueDetailPage /> }` con su import.

- [ ] **Step 4: Probar a mano — "done when" del spec, puntos 2 y 3**

Dos ventanas (normal + incógnito), dos usuarios. Owner crea la liga → detalle muestra 1/11 y "Draft pendiente". Segundo usuario se une → el owner vuelve a `/leagues/:id` → 2/11. Owner "Iniciar draft" → badge "Draft en vivo", botón deshabilitado. Tercer usuario intenta unirse → "El draft ya empezó: no se puede cambiar el roster". Segundo usuario ve "Salir de la liga" deshabilitado.

- [ ] **Step 5: Lint + test + commit** (al confirmar)

```bash
git add frontend/src
git commit -m "feat(frontend): detalle de liga — miembros, invitar, iniciar draft, salir/echar (Slice 13a)"
```

---

### Task 8: E2E con Playwright + evidencia

**Files:**

- Create: `frontend/playwright.config.ts`, `frontend/e2e/leagues.spec.ts`
- Modify: `frontend/package.json` (script `e2e`), `frontend/.gitignore`, `frontend/tsconfig.app.json` (excluir `e2e`)
- Create: `docs/test-evidence/slice-13a-e2e.txt`, `slice-13a-unit.txt`

- [ ] **Step 1: Instalar Playwright**

```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  // Levanta el frontend solo; el backend tiene que estar corriendo (npm run dev en backend/).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

`package.json` scripts: `"e2e": "playwright test --reporter=list"`. En `.gitignore` agregar `test-results/` y `playwright-report/`. En `tsconfig.app.json`, `"exclude": ["e2e", "playwright.config.ts"]` (para que el `tsc -b` del build no compile los tests e2e). Vitest ya los excluye (`test.exclude` en `vite.config.ts`, Task 1).

- [ ] **Step 2: El test**

`e2e/leagues.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

// Flujo completo contra el backend real (seed cargado): registro -> crear liga -> verla ->
// abrir el detalle -> soy owner. Email unico por corrida para no chocar con la DB.
test('registrarse, crear una liga y verla como owner', async ({ page }) => {
  const stamp = Date.now();
  const code = `e2e-${stamp}`.slice(0, 20);

  await page.goto('/register');
  await page.getByLabel('Nombre').fill('E2E Tester');
  await page.getByLabel('Email').fill(`e2e-${stamp}@boxbox.test`);
  await page.getByLabel('Contraseña').fill('hunter22test');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/leagues$/);
  await expect(page.getByRole('heading', { name: 'Mis ligas' })).toBeVisible();

  await page.getByLabel('Nombre').fill('Liga E2E');
  await page.getByLabel('Código de invitación').fill(code);
  await page.getByRole('button', { name: 'Crear', exact: true }).click();

  await expect(page).toHaveURL(/\/leagues\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Liga E2E' })).toBeVisible();
  await expect(page.getByText('E2E Tester')).toBeVisible();
  await expect(page.getByText('owner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar draft' })).toBeEnabled();
});

test('sin sesion, /leagues redirige a /login', async ({ page }) => {
  await page.goto('/leagues');
  await expect(page).toHaveURL(/\/login$/);
});
```

- [ ] **Step 3: Correr** (backend corriendo, DB seedeada) — `npm run e2e` → 2 passed.

- [ ] **Step 4: Evidencia + commit** (al confirmar)

```bash
mkdir -p ../docs/test-evidence
npm run e2e > ../docs/test-evidence/slice-13a-e2e.txt 2>&1
npm test > ../docs/test-evidence/slice-13a-unit.txt 2>&1
cd ..
git add frontend/playwright.config.ts frontend/e2e frontend/package.json frontend/package-lock.json frontend/.gitignore frontend/tsconfig.app.json docs/test-evidence
git commit -m "test(frontend): e2e con Playwright (registro -> liga -> detalle) + evidencia (Slice 13a)"
```

---

### Task 9: Responsive, docs y PR

**Files:** `README.md`, `docs/roadmap.md`, `CLAUDE.md`, `docs/tutorial.md`

- [ ] **Step 1: Pasada responsive** — `npm run dev`, DevTools → device toolbar, 375 / 768 / 1024 px, en `/leagues` y `/leagues/:id`. Nada se sale del ancho; lista 1 col en 375, 2 en 768; detalle apila la tabla en 375.

- [ ] **Step 2: Docs**

- `README.md`: fila Frontend confirmada (React + TypeScript + Tailwind); sección setup → `cd frontend && npm install && cp .env.example .env && npm run dev` (5173).
- `docs/roadmap.md`: Slice 13 → "13a — bootstrap (React + Vite): ✅ este PR — ver `docs/specs/2026-08-27-slice-13a-frontend-bootstrap.md`" y "13b — draft en vivo (BOX-26): pendiente"; mover 13a a Completados con Status done y un párrafo de Shipped (incluir la historia Angular → React, spec §2).
- `CLAUDE.md`: layout `frontend/ Vite + React 19 + TS SPA`; "Development Commands" → bloque frontend (`npm run dev`, `npm test`, `npm run e2e`, `npm run lint`, `npm run build`); nueva sección **Frontend conventions** (estructura, reglas de import, `ApiClient` única puerta, token en memoria, un hook de react-query por lectura/escritura, cómo agregar una pantalla).
- `docs/tutorial.md`: "7. Levantar el frontend" (3 líneas + credenciales del seed).

- [ ] **Step 3: Verificación final del "done when"** — los 7 puntos de la sección 12 del spec. `cd frontend && npm run lint && npm test && npm run build` — todo verde.

- [ ] **Step 4: Commit + PR** (al confirmar)

```bash
git add README.md docs/roadmap.md CLAUDE.md docs/tutorial.md
git commit -m "docs: frontend React en README, roadmap (13a/13b), CLAUDE.md y tutorial (Slice 13a)"
git push -u origin slice-13a-frontend-bootstrap
```

PR con la plantilla del repo, base `dev`, título "Slice 13a — Frontend bootstrap en React: login, mis ligas, detalle de liga". Smoke test del PR = los 7 puntos del "done when" + `npm run e2e`.
