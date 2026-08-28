# Slice 13a — Frontend bootstrap (Angular) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un frontend Angular clickeable: registro, login, mis ligas (crear / unirme), detalle de liga con miembros y "Iniciar draft" para el owner — contra el backend real, sin curl.

**Architecture:** SPA Angular 21 (standalone components, signals, sin SSR) en `frontend/`, hablando con `backend/` por `HttpClient`. `AuthService` guarda el access token en memoria; la sesión persiste por la cookie httpOnly de refresh que el backend ya emite. Un interceptor agrega el `Bearer`, y un guard protege `/leagues/**`. Componentes por feature; `shared/ui` no conoce el dominio.

**Tech Stack:** Angular 21 (CLI), TypeScript strict, Tailwind v4 (`@tailwindcss/postcss`), Vitest (default del CLI), Playwright, angular-eslint, Prettier del root.

**Spec:** [`docs/specs/2026-08-27-slice-13a-frontend-bootstrap.md`](../specs/2026-08-27-slice-13a-frontend-bootstrap.md)

## Global Constraints

- Angular **21**, standalone components, signals, **sin SSR** (`--ssr=false`). Node 24.
- El access token vive **solo en memoria** (signal). Nada en `localStorage` / `sessionStorage`.
- Todo request a `environment.apiUrl` va con `withCredentials: true` (cookie de refresh).
- Angular sirve en **4200**; el backend espera `FRONTEND_URL=http://localhost:4200`.
- Reglas de imports: `core/` no importa de `features/`; `features/` importa de `core/`, `models/`, `shared/`; `shared/ui/` **no importa `models/`**.
- Nombres de archivo con sufijo explícito: `*.page.ts`, `*.component.ts`, `*.service.ts`, `*.guard.ts`, `*.interceptor.ts`. Selectores: `app-*` para features, `ui-*` para `shared/ui`.
- Copy de UI en **español**; código, identificadores y commits en inglés (commits con summary en español, como el resto del repo).
- Shapes de datos copiados de `docs/api-endpoints.md` y de los `select` del backend. No inventar campos.
- Mobile-first: clases base para SM, `md:` y `lg:` agregan.
- Cada task termina con `npm run lint` limpio, `npm test` verde, y un commit. El usuario tipea el scaffold (Task 1) y el primer componente (Task 3 · `button`) a mano.

---

## File Structure

```
backend/.env.example                       (Task 0) FRONTEND_URL → 4200
backend/src/modules/leagues/leagues.service.ts (Task 0) memberSelect + user.name
backend/src/modules/leagues/leagues.test.ts    (Task 0) assert user.name
docs/api-endpoints.md                      (Task 0) members incluye user.name

frontend/                                  (Task 1) ng new + Tailwind + environments + eslint
frontend/src/environments/environment*.ts  (Task 1) apiUrl, socketUrl
frontend/src/app/models/api.ts             (Task 2) ApiEnvelope<T>, ApiErrorBody
frontend/src/app/models/user.ts            (Task 2) User
frontend/src/app/models/league.ts          (Task 2) League, DraftStatus, LeagueStatus
frontend/src/app/models/league-member.ts   (Task 2) LeagueMember, FantasyTeam
frontend/src/app/core/api-error.ts         (Task 2) class ApiError + toApiError()
frontend/src/app/shared/ui/*.component.ts  (Task 3) button, field, card, alert, badge, page-shell
frontend/src/app/core/auth.service.ts      (Task 4) token/user signals, login/register/refresh/logout
frontend/src/app/core/auth.interceptor.ts  (Task 4) Bearer + withCredentials + 1 refresh en 401
frontend/src/app/core/auth.guard.ts        (Task 4) authGuard, guestGuard
frontend/src/app/app.config.ts             (Task 4) router, http+interceptor, app initializer
frontend/src/app/features/auth/*.page.ts   (Task 5) login, register
frontend/src/app/app.routes.ts             (Task 5, 6, 7)
frontend/src/app/features/leagues/leagues.service.ts        (Task 6)
frontend/src/app/features/leagues/league-card.component.ts  (Task 6)
frontend/src/app/features/leagues/leagues.page.ts           (Task 6)
frontend/src/app/features/leagues/members-table.component.ts (Task 7)
frontend/src/app/features/leagues/league-detail.page.ts     (Task 7)
frontend/e2e/leagues.spec.ts + playwright.config.ts          (Task 8)
docs/test-evidence/slice-13a-*.txt          (Task 8)
README.md, docs/roadmap.md, CLAUDE.md, docs/tutorial.md (Task 9)
```

---

### Task 0: Backend — `FRONTEND_URL` a 4200 y `user.name` en los miembros

**Files:**

- Modify: `backend/.env.example` (línea `FRONTEND_URL`)
- Modify: `backend/.env` (tu copia local — no se commitea)
- Modify: `backend/src/modules/leagues/leagues.service.ts` (`memberSelect`, ~línea 42)
- Modify: `backend/src/modules/leagues/leagues.test.ts` (describe `GET /api/v1/leagues/:id/members`)
- Modify: `docs/api-endpoints.md` (fila `GET /leagues/:id/members`)

**Interfaces:**

- Produces: `GET /leagues/:id/members` → `{ data: Array<{ id, userId, isOwner, status, joinedAt, user: { name } }> }`. Task 7 lo consume.

- [ ] **Step 1: Test rojo — cada miembro trae `user.name`**

En `backend/src/modules/leagues/leagues.test.ts`, dentro de `describe('GET /api/v1/leagues/:id/members', ...)`, agregar al final del bloque:

```ts
it('cada miembro incluye user.name (Slice 13a: la tabla del frontend muestra nombres)', async () => {
  const alice = await authedUser('a');
  const season = await seedSeason();
  const created = await request(app)
    .post('/api/v1/leagues')
    .set('Authorization', `Bearer ${alice.token}`)
    .send({ name: 'Con nombres', inviteCode: 'con-nombres', seasonId: season.id });

  const res = await request(app)
    .get(`/api/v1/leagues/${created.body.data.id}/members`)
    .set('Authorization', `Bearer ${alice.token}`);

  expect(res.status).toBe(200);
  expect(res.body.data[0].user).toEqual({ name: 'User a' });
});
```

- [ ] **Step 2: Correr y ver rojo**

Run (desde `backend/`): `npx vitest run src/modules/leagues/leagues.test.ts -t "user.name"`
Expected: FAIL — `expected undefined to deeply equal { name: 'User a' }`.

- [ ] **Step 3: Agregar `user.name` al select**

En `leagues.service.ts`, `memberSelect` pasa de:

```ts
const memberSelect = {
  id: true,
  userId: true,
  isOwner: true,
  status: true,
  joinedAt: true,
} as const;
```

a:

```ts
// user.name: la tabla de miembros del frontend (Slice 13a) muestra nombres, no ids.
const memberSelect = {
  id: true,
  userId: true,
  isOwner: true,
  status: true,
  joinedAt: true,
  user: { select: { name: true } },
} as const;
```

- [ ] **Step 4: Verde + suite del módulo**

Run: `npx vitest run src/modules/leagues/leagues.test.ts` — Expected: todos verdes (49+1).
Run: `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 5: `FRONTEND_URL` a 4200**

En `backend/.env.example` y en tu `backend/.env`: `FRONTEND_URL=http://localhost:4200`. En `docs/api-endpoints.md`, fila de `GET /leagues/:id/members`, agregar en Notas: "Cada miembro incluye `user: { name }` (Slice 13a)".

- [ ] **Step 6: Commit**

```bash
git add backend/.env.example backend/src/modules/leagues/leagues.service.ts backend/src/modules/leagues/leagues.test.ts docs/api-endpoints.md
git commit -m "feat(leagues): user.name en GET /members + FRONTEND_URL 4200 para Angular (Slice 13a)"
```

---

### Task 1: Scaffold Angular 21 + Tailwind + environments + ESLint (lo tipeás vos)

**Files:**

- Create: `frontend/` completo (CLI)
- Create: `frontend/.postcssrc.json`
- Modify: `frontend/src/styles.css`, `frontend/src/app/app.html`, `frontend/src/app/app.spec.ts`
- Create: `frontend/src/environments/environment.ts`, `environment.development.ts` (CLI)

**Interfaces:**

- Produces: `environment.apiUrl = 'http://localhost:3000/api/v1'`, `environment.socketUrl = 'http://localhost:3000'`. Todo lo demás los importa desde `src/environments/environment`.

- [ ] **Step 1: Crear el proyecto** (desde la raíz del repo `C:\Users\tomas\dev\desarrollo`)

```bash
npx @angular/cli@21 new frontend --style=css --ssr=false --skip-git --package-manager=npm
```

Prompts: zoneless → **Yes** (default). "AI tools / config files" → **None**. Tarda ~1 min.
Verify: existe `frontend/angular.json` y `frontend/src/app/app.ts`.

- [ ] **Step 2: Levantar y ver la página default**

```bash
cd frontend && npm start
```

Verify: `http://localhost:4200` muestra la landing de Angular. `Ctrl+C`.

- [ ] **Step 3: Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

Crear `frontend/.postcssrc.json`:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

Reemplazar el contenido de `frontend/src/styles.css` por:

```css
@import 'tailwindcss';
```

- [ ] **Step 4: Probar que Tailwind aplica**

Reemplazar `frontend/src/app/app.html` por:

```html
<main class="min-h-screen bg-slate-50 text-slate-900">
  <h1 class="p-6 text-3xl font-bold text-red-600">BoxBox</h1>
  <router-outlet />
</main>
```

`npm start` → `http://localhost:4200` muestra "BoxBox" en rojo, grande, fondo gris claro. Si se ve en negro y chico, Tailwind no cargó: revisar `.postcssrc.json` y `styles.css`. `Ctrl+C`.

- [ ] **Step 5: Environments**

```bash
npx ng generate environments
```

Reemplazar **ambos** archivos (`src/environments/environment.ts` y `environment.development.ts`) por:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  socketUrl: 'http://localhost:3000',
};
```

(En `environment.ts` — el de producción — `production: true`; las URLs se cambian cuando haya deploy.)

- [ ] **Step 6: ESLint**

```bash
npx ng add angular-eslint --skip-confirmation
npm run lint
```

Expected: "All files pass linting."

- [ ] **Step 7: Arreglar el spec default y correr Vitest**

Reemplazar `frontend/src/app/app.spec.ts` por:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('renderiza el shell con el router-outlet', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
```

Run: `npm test -- --watch=false` → Expected: 1 passed (Vitest).

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): scaffold Angular 21 + Tailwind v4 + environments + eslint (Slice 13a)"
```

(`frontend/node_modules` queda afuera por el `.gitignore` que genera el CLI.)

---

### Task 2: Modelos y `ApiError`

**Files:**

- Create: `frontend/src/app/models/api.ts`
- Create: `frontend/src/app/models/user.ts`
- Create: `frontend/src/app/models/league.ts`
- Create: `frontend/src/app/models/league-member.ts`
- Create: `frontend/src/app/core/api-error.ts`
- Test: `frontend/src/app/core/api-error.spec.ts`

**Interfaces:**

- Produces: `ApiEnvelope<T>`, `User`, `League`, `DraftStatus`, `LeagueStatus`, `LeagueMember`, `FantasyTeam`, `class ApiError(code, status, message)`, `toApiError(err: unknown): ApiError`.

- [ ] **Step 1: Test rojo de `toApiError`**

`frontend/src/app/core/api-error.spec.ts`:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, toApiError } from './api-error';

describe('toApiError', () => {
  it('convierte el envelope { error } del backend en ApiError', () => {
    const http = new HttpErrorResponse({
      status: 409,
      error: { error: { code: 'LEAGUE_FULL', message: 'League is at capacity', status: 409 } },
    });

    const err = toApiError(http);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('LEAGUE_FULL');
    expect(err.status).toBe(409);
    expect(err.message).toBe('League is at capacity');
  });

  it('sin respuesta del server (status 0) es NETWORK_ERROR', () => {
    const err = toApiError(new HttpErrorResponse({ status: 0 }));
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('un ApiError se devuelve tal cual', () => {
    const original = new ApiError('X', 400, 'x');
    expect(toApiError(original)).toBe(original);
  });
});
```

- [ ] **Step 2: Correr y ver rojo**

Run: `npm test -- --watch=false` → Expected: FAIL, "Cannot find module './api-error'".

- [ ] **Step 3: Modelos**

`frontend/src/app/models/api.ts`:

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

`frontend/src/app/models/user.ts`:

```ts
export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}
```

`frontend/src/app/models/league.ts`:

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

`frontend/src/app/models/league-member.ts`:

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

`frontend/src/app/core/api-error.ts`:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody } from '../models/api';

// ApiError: el error tipado que ve el resto de la app. `code` es el SCREAMING_SNAKE del
// backend (docs/error-codes.md); `status` el HTTP. Clase (no interface) para que `instanceof`
// funcione en catch y para cumplir "modelos con clases" de la rubrica.
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

// toApiError: normaliza cualquier cosa que tire HttpClient a un ApiError.
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof HttpErrorResponse) {
    if (isApiErrorBody(err.error)) {
      const { code, message, status } = err.error.error;
      return new ApiError(code, status, message);
    }
    if (err.status === 0) {
      return new ApiError('NETWORK_ERROR', 0, 'No se pudo conectar con el servidor');
    }
    return new ApiError('UNKNOWN_ERROR', err.status, err.message);
  }
  return new ApiError('UNKNOWN_ERROR', 0, String(err));
}
```

- [ ] **Step 5: Verde + lint**

Run: `npm test -- --watch=false` → 4 passed. `npm run lint` → limpio.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/models frontend/src/app/core/api-error.ts frontend/src/app/core/api-error.spec.ts
git commit -m "feat(frontend): modelos (User, League, LeagueMember) + ApiError tipado (Slice 13a)"
```

---

### Task 3: `shared/ui` — 6 componentes sin dominio (`button` lo tipeás vos)

**Files:**

- Create: `frontend/src/app/shared/ui/button.component.ts`
- Create: `frontend/src/app/shared/ui/field.component.ts`
- Create: `frontend/src/app/shared/ui/card.component.ts`
- Create: `frontend/src/app/shared/ui/badge.component.ts`
- Create: `frontend/src/app/shared/ui/alert.component.ts`
- Create: `frontend/src/app/shared/ui/page-shell.component.ts`
- Create: `frontend/src/app/shared/ui/index.ts`
- Test: `frontend/src/app/shared/ui/alert.component.spec.ts`

**Interfaces:**

- Produces: `<ui-button [variant]="'primary'|'secondary'|'danger'" [disabled] type="button|submit">`, `<ui-field label error>` (proyecta el `<input>`), `<ui-card>`, `<ui-badge [tone]="'neutral'|'info'|'success'|'warning'">`, `<ui-alert [code] [message]>`, `<ui-page-shell title>`. `errorMessageFor(code, fallback)` exportada desde `alert.component.ts`.

- [ ] **Step 1: `button` (tipealo vos — es el primer componente Angular del proyecto)**

`frontend/src/app/shared/ui/button.component.ts`:

```ts
import { Component, input } from '@angular/core';

type Variant = 'primary' | 'secondary' | 'danger';

// ui-button: un <button> con las 3 variantes visuales del proyecto. No sabe de dominio.
// `input()` = propiedad de entrada (rubrica: "propiedades input"). El (click) nativo del
// <button> hace de output: el padre escribe <ui-button (click)="...">.
@Component({
  selector: 'ui-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      class="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold
             transition disabled:cursor-not-allowed disabled:opacity-50"
      [class]="variantClasses[variant()]"
    >
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<Variant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);

  protected readonly variantClasses: Record<Variant, string> = {
    primary: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50',
    danger: 'bg-slate-900 text-white hover:bg-black',
  };
}
```

- [ ] **Step 2: `field`, `card`, `badge`, `page-shell`**

`field.component.ts` — envuelve un `<input>` que le pasa el padre (evita implementar `ControlValueAccessor`):

```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-field',
  template: `
    <label class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700">{{ label() }}</span>
      <ng-content />
      @if (error()) {
        <span class="mt-1 block text-sm text-red-600">{{ error() }}</span>
      }
    </label>
  `,
})
export class FieldComponent {
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
}
```

`card.component.ts`:

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'ui-card',
  template: `
    <section class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6">
      <ng-content />
    </section>
  `,
})
export class CardComponent {}
```

`badge.component.ts`:

```ts
import { Component, input } from '@angular/core';

type Tone = 'neutral' | 'info' | 'success' | 'warning';

@Component({
  selector: 'ui-badge',
  template: `
    <span
      class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      [class]="tones[tone()]"
    >
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly tone = input<Tone>('neutral');
  protected readonly tones: Record<Tone, string> = {
    neutral: 'bg-slate-100 text-slate-700',
    info: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
  };
}
```

`page-shell.component.ts` — cabecera + contenedor responsive:

```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-page-shell',
  template: `
    <div class="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:py-10">
      <header class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">{{ title() }}</h1>
        <ng-content select="[actions]" />
      </header>
      <ng-content />
    </div>
  `,
})
export class PageShellComponent {
  readonly title = input.required<string>();
}
```

- [ ] **Step 3: Test rojo del `alert` (mapa código → mensaje)**

`alert.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { AlertComponent, errorMessageFor } from './alert.component';

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

describe('AlertComponent', () => {
  it('renderiza el mensaje traducido', async () => {
    await TestBed.configureTestingModule({ imports: [AlertComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentRef.setInput('code', 'LEAGUE_FULL');
    fixture.componentRef.setInput('message', 'League is at capacity');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('La liga está llena');
  });
});
```

- [ ] **Step 4: Correr y ver rojo**

Run: `npm test -- --watch=false` → FAIL, "Cannot find module './alert.component'".

- [ ] **Step 5: `alert`**

`alert.component.ts`:

```ts
import { Component, computed, input } from '@angular/core';

// Mapa codigo del backend -> mensaje para el usuario. Los codigos son los de
// docs/error-codes.md. Un codigo que no esta aca muestra el `message` del backend.
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

@Component({
  selector: 'ui-alert',
  template: `
    <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
      {{ text() }}
    </p>
  `,
})
export class AlertComponent {
  readonly code = input.required<string>();
  readonly message = input<string>('');
  protected readonly text = computed(() => errorMessageFor(this.code(), this.message()));
}
```

`index.ts` (para importar todo junto):

```ts
export { ButtonComponent } from './button.component';
export { FieldComponent } from './field.component';
export { CardComponent } from './card.component';
export { BadgeComponent } from './badge.component';
export { AlertComponent, errorMessageFor } from './alert.component';
export { PageShellComponent } from './page-shell.component';
```

- [ ] **Step 6: Verde + lint + commit**

Run: `npm test -- --watch=false` → 7 passed. `npm run lint` → limpio.

```bash
git add frontend/src/app/shared
git commit -m "feat(frontend): shared/ui — button, field, card, badge, alert, page-shell (Slice 13a)"
```

---

### Task 4: `AuthService`, interceptor, guards, `app.config`

**Files:**

- Create: `frontend/src/app/core/auth.service.ts`
- Create: `frontend/src/app/core/auth.interceptor.ts`
- Create: `frontend/src/app/core/auth.guard.ts`
- Test: `frontend/src/app/core/auth.guard.spec.ts`
- Modify: `frontend/src/app/app.config.ts`

**Interfaces:**

- Consumes: `ApiEnvelope`, `User`, `toApiError` (Task 2); `environment.apiUrl` (Task 1).
- Produces: `AuthService { accessToken: Signal<string|null>; user: Signal<User|null>; isLoggedIn: Signal<boolean>; sessionReady: Signal<boolean>; login(email, password): Observable<User>; register(email, password, name): Observable<User>; refresh(): Observable<string>; restoreSession(): Promise<void>; logout(): void; clearSession(): void }`, `authInterceptor: HttpInterceptorFn`, `authGuard`, `guestGuard: CanActivateFn`.

- [ ] **Step 1: Test rojo del guard**

`auth.guard.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

const fakeRoute = {} as ActivatedRouteSnapshot;
const fakeState = {} as RouterStateSnapshot;

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  it('sin token redirige a /login', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(fakeRoute, fakeState));
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('con token deja pasar', () => {
    TestBed.inject(AuthService).accessToken.set('token-de-prueba');
    const result = TestBed.runInInjectionContext(() => authGuard(fakeRoute, fakeState));
    expect(result).toBe(true);
  });

  it('guestGuard: logueado redirige a /leagues', () => {
    TestBed.inject(AuthService).accessToken.set('token-de-prueba');
    const result = TestBed.runInInjectionContext(() => guestGuard(fakeRoute, fakeState));
    expect((result as UrlTree).toString()).toBe('/leagues');
  });
});
```

- [ ] **Step 2: Correr y ver rojo**

Run: `npm test -- --watch=false` → FAIL, "Cannot find module './auth.guard'".

- [ ] **Step 3: `AuthService`**

`auth.service.ts`:

```ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ApiEnvelope } from '../models/api';
import type { User } from '../models/user';

interface AuthPayload {
  user: User;
  accessToken: string;
}

// AuthService: el unico lugar que conoce el token. Vive en memoria (signal) — nunca en
// localStorage. La persistencia entre recargas la da la cookie httpOnly de refresh que el
// backend setea en login/register; restoreSession() la usa al arrancar la app.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/auth`;

  readonly accessToken = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.accessToken() !== null);
  // false hasta que restoreSession() termino (con o sin sesion). El shell muestra un spinner.
  readonly sessionReady = signal(false);

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<ApiEnvelope<AuthPayload>>(`${this.base}/login`, { email, password })
      .pipe(map((res) => this.setSession(res.data).user));
  }

  register(email: string, password: string, name: string): Observable<User> {
    return this.http
      .post<ApiEnvelope<AuthPayload>>(`${this.base}/register`, { email, password, name })
      .pipe(map((res) => this.setSession(res.data).user));
  }

  // refresh: pide un access token nuevo con la cookie. Lo usa el interceptor ante un 401 y
  // restoreSession() al arrancar.
  refresh(): Observable<string> {
    return this.http
      .post<ApiEnvelope<AuthPayload>>(`${this.base}/refresh`, {})
      .pipe(map((res) => this.setSession(res.data).accessToken));
  }

  async restoreSession(): Promise<void> {
    try {
      await firstValueFrom(this.refresh());
    } catch {
      // Sin cookie o cookie vencida: arrancamos deslogueados, sin mostrar error.
      this.clearSession();
    } finally {
      this.sessionReady.set(true);
    }
  }

  logout(): void {
    this.http.post(`${this.base}/logout`, {}).subscribe({
      complete: () => this.finishLogout(),
      error: () => this.finishLogout(), // aunque falle el backend, localmente cerramos sesion
    });
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  private setSession(payload: AuthPayload): AuthPayload {
    this.accessToken.set(payload.accessToken);
    this.user.set(payload.user);
    return payload;
  }

  private finishLogout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }
}
```

- [ ] **Step 4: Interceptor**

`auth.interceptor.ts`:

```ts
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { toApiError } from './api-error';
import { AuthService } from './auth.service';

// authInterceptor: para todo request a nuestra API, (1) manda la cookie (withCredentials),
// (2) agrega Authorization: Bearer si hay token, (3) ante un 401 en una ruta que no es de
// auth, intenta UN refresh y reintenta; si el refresh tambien falla, cierra la sesion.
// Cualquier error sale como ApiError (los componentes no ven HttpErrorResponse).
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const auth = inject(AuthService);

  const withAuth = (r: HttpRequest<unknown>): HttpRequest<unknown> => {
    const token = auth.accessToken();
    return r.clone({
      withCredentials: true,
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  const isAuthRoute = req.url.includes('/auth/');

  return next(withAuth(req)).pipe(
    catchError((err: unknown) => {
      const expired =
        err instanceof HttpErrorResponse && err.status === 401 && !isAuthRoute && auth.isLoggedIn();
      if (!expired) {
        return throwError(() => toApiError(err));
      }
      return auth.refresh().pipe(
        switchMap(() => next(withAuth(req))),
        catchError((refreshErr: unknown) => {
          auth.clearSession();
          return throwError(() => toApiError(refreshErr));
        }),
      );
    }),
  );
};
```

- [ ] **Step 5: Guards**

`auth.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// authGuard: sin sesion -> /login. Es la "proteccion de rutas por nivel de acceso" de la
// rubrica. UrlTree (no navigate()) para que el router haga la redireccion limpia.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

// guestGuard: lo inverso, para /login y /register — un usuario logueado va a /leagues.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree(['/leagues']) : true;
};
```

- [ ] **Step 6: `app.config.ts`**

Dejar lo que genero el CLI y asegurarse de que queden estos tres providers (reemplazar el `provideHttpClient`/`provideRouter` que existan):

```ts
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...los providers que ya genero `ng new` (zoneless, error listeners) quedan arriba de estos.
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Antes de renderizar nada: intenta restaurar la sesion con la cookie de refresh.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
```

- [ ] **Step 7: Verde + lint + commit**

Run: `npm test -- --watch=false` → 10 passed. `npm run lint` → limpio.

```bash
git add frontend/src/app/core frontend/src/app/app.config.ts
git commit -m "feat(frontend): AuthService con token en memoria + interceptor + guards (Slice 13a)"
```

---

### Task 5: Páginas de login y registro + rutas

**Files:**

- Create: `frontend/src/app/features/auth/login.page.ts`
- Create: `frontend/src/app/features/auth/register.page.ts`
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/app.html`, `frontend/src/app/app.ts`

**Interfaces:**

- Consumes: `AuthService.login/register`, `guestGuard`, `ui-*`.
- Produces: rutas `/login`, `/register`, `''` → redirect `/leagues`. `/leagues` se agrega en Task 6.

- [ ] **Step 1: `login.page.ts`**

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { AlertComponent, ButtonComponent, CardComponent, FieldComponent } from '../../shared/ui';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AlertComponent,
    ButtonComponent,
    CardComponent,
    FieldComponent,
  ],
  template: `
    <div class="mx-auto mt-10 w-full max-w-sm px-4">
      <ui-card>
        <h1 class="mb-4 text-2xl font-bold">Entrar a BoxBox</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <ui-field label="Email" [error]="errorFor('email')">
            <input
              formControlName="email"
              type="email"
              autocomplete="email"
              class="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </ui-field>
          <ui-field label="Contraseña" [error]="errorFor('password')">
            <input
              formControlName="password"
              type="password"
              autocomplete="current-password"
              class="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </ui-field>
          @if (error(); as e) {
            <ui-alert [code]="e.code" [message]="e.message" />
          }
          <ui-button type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Entrando…' : 'Entrar' }}
          </ui-button>
        </form>
        <p class="mt-4 text-sm text-slate-600">
          ¿No tenés cuenta?
          <a routerLink="/register" class="font-semibold text-red-600">Registrate</a>
        </p>
      </ui-card>
    </div>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Validators espejan el schema Zod del backend (email valido, password >= 8).
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  protected errorFor(field: 'email' | 'password'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) return 'Obligatorio';
    if (control.hasError('email')) return 'No parece un email';
    if (control.hasError('minlength')) return 'Mínimo 8 caracteres';
    return 'Inválido';
  }

  protected submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigate(['/leagues']),
      error: (err: ApiError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }
}
```

- [ ] **Step 2: `register.page.ts`** (misma estructura, un campo mas)

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { AlertComponent, ButtonComponent, CardComponent, FieldComponent } from '../../shared/ui';

@Component({
  selector: 'app-register-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AlertComponent,
    ButtonComponent,
    CardComponent,
    FieldComponent,
  ],
  template: `
    <div class="mx-auto mt-10 w-full max-w-sm px-4">
      <ui-card>
        <h1 class="mb-4 text-2xl font-bold">Crear cuenta</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <ui-field label="Nombre" [error]="errorFor('name')">
            <input
              formControlName="name"
              type="text"
              autocomplete="name"
              class="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </ui-field>
          <ui-field label="Email" [error]="errorFor('email')">
            <input
              formControlName="email"
              type="email"
              autocomplete="email"
              class="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </ui-field>
          <ui-field label="Contraseña" [error]="errorFor('password')">
            <input
              formControlName="password"
              type="password"
              autocomplete="new-password"
              class="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </ui-field>
          @if (error(); as e) {
            <ui-alert [code]="e.code" [message]="e.message" />
          }
          <ui-button type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creando…' : 'Crear cuenta' }}
          </ui-button>
        </form>
        <p class="mt-4 text-sm text-slate-600">
          ¿Ya tenés cuenta? <a routerLink="/login" class="font-semibold text-red-600">Entrá</a>
        </p>
      </ui-card>
    </div>
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  protected errorFor(field: 'name' | 'email' | 'password'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) return 'Obligatorio';
    if (control.hasError('email')) return 'No parece un email';
    if (control.hasError('minlength'))
      return field === 'name' ? 'Mínimo 2 caracteres' : 'Mínimo 8 caracteres';
    return 'Inválido';
  }

  protected submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password, name } = this.form.getRawValue();
    this.auth.register(email, password, name).subscribe({
      next: () => void this.router.navigate(['/leagues']),
      error: (err: ApiError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }
}
```

- [ ] **Step 3: Rutas y shell**

`app.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { LoginPage } from './features/auth/login.page';
import { RegisterPage } from './features/auth/register.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'leagues' },
  { path: 'login', component: LoginPage, canActivate: [guestGuard] },
  { path: 'register', component: RegisterPage, canActivate: [guestGuard] },
  // Placeholder hasta Task 6: cualquier ruta protegida cae en /login si no hay sesion.
  {
    path: 'leagues',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  { path: '**', redirectTo: 'leagues' },
];
```

`app.html`:

```html
<main class="min-h-screen bg-slate-50 text-slate-900">
  @if (auth.sessionReady()) {
  <router-outlet />
  } @else {
  <p class="p-6 text-slate-500">Cargando sesión…</p>
  }
</main>
```

`app.ts` — agregar `protected readonly auth = inject(AuthService);` (import `inject` de `@angular/core` y `AuthService` de `./core/auth.service`), y mantener `RouterOutlet` en `imports`.

- [ ] **Step 4: Probar a mano** (backend corriendo con `npm run dev` y `FRONTEND_URL=http://localhost:4200`)

`npm start` → `http://localhost:4200` → redirige a `/login`. Registrarse con un email nuevo → cae en `/leagues` (por ahora muestra el login placeholder). **F5** → sigue en `/leagues` (la sesión se restauró por cookie). Abrir DevTools → Application → Local Storage: **vacío**. Login con contraseña incorrecta → alerta "Email o contraseña incorrectos".

- [ ] **Step 5: Lint + test + commit**

`npm run lint` limpio, `npm test -- --watch=false` verde.

```bash
git add frontend/src/app
git commit -m "feat(frontend): login y registro con reactive forms + rutas con guards (Slice 13a)"
```

---

### Task 6: `LeaguesService`, tarjeta de liga (TDD) y página "Mis ligas"

**Files:**

- Create: `frontend/src/app/features/leagues/leagues.service.ts`
- Create: `frontend/src/app/features/leagues/league-card.component.ts`
- Test: `frontend/src/app/features/leagues/league-card.component.spec.ts`
- Create: `frontend/src/app/features/leagues/leagues.page.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**

- Consumes: `League`, `LeagueMember`, `ApiEnvelope`, `ui-*`, `AuthService.user`.
- Produces: `LeaguesService { list(): Observable<League[]>; create(input: { name; inviteCode; seasonId }): Observable<League>; join(inviteCode): Observable<LeagueMember>; get(id): Observable<League>; members(id): Observable<LeagueMember[]>; leave(id): Observable<void>; kick(id, userId): Observable<void>; startDraft(id): Observable<{ draftStatus; totalPicks }>; activeSeasonId(): Observable<number> }`; `<app-league-card [league] (open)>`.

- [ ] **Step 1: Test rojo de `league-card`**

`league-card.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { LeagueCardComponent } from './league-card.component';
import type { League } from '../../models/league';

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

describe('LeagueCardComponent', () => {
  it('muestra nombre, codigo y estado del draft', async () => {
    await TestBed.configureTestingModule({ imports: [LeagueCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LeagueCardComponent);
    fixture.componentRef.setInput('league', league);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Liga UTN');
    expect(text).toContain('utn-2026');
    expect(text).toContain('Draft pendiente');
  });

  it('emite open con el id al hacer click', async () => {
    await TestBed.configureTestingModule({ imports: [LeagueCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LeagueCardComponent);
    fixture.componentRef.setInput('league', league);
    await fixture.whenStable();

    const opened: number[] = [];
    fixture.componentInstance.open.subscribe((id) => opened.push(id));
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(opened).toEqual([7]);
  });
});
```

- [ ] **Step 2: Correr y ver rojo** — `npm test -- --watch=false` → "Cannot find module './league-card.component'".

- [ ] **Step 3: `league-card.component.ts`**

```ts
import { Component, computed, input, output } from '@angular/core';
import type { DraftStatus, League } from '../../models/league';
import { BadgeComponent, CardComponent } from '../../shared/ui';

const DRAFT_LABEL: Record<DraftStatus, { text: string; tone: 'neutral' | 'info' | 'success' }> = {
  PENDING: { text: 'Draft pendiente', tone: 'neutral' },
  LIVE: { text: 'Draft en vivo', tone: 'info' },
  COMPLETED: { text: 'Draft completo', tone: 'success' },
};

// app-league-card: una liga en la lista. input: la liga. output: `open` con el id cuando el
// usuario quiere entrar. No llama a ningun servicio — eso es de la pagina.
@Component({
  selector: 'app-league-card',
  imports: [CardComponent, BadgeComponent],
  template: `
    <ui-card>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">{{ league().name }}</h2>
          <p class="text-sm text-slate-500">
            Código: <span class="font-mono">{{ league().inviteCode }}</span>
          </p>
        </div>
        <ui-badge [tone]="draft().tone">{{ draft().text }}</ui-badge>
      </div>
      <button
        type="button"
        class="mt-4 text-sm font-semibold text-red-600 hover:underline"
        (click)="open.emit(league().id)"
      >
        Ver liga →
      </button>
    </ui-card>
  `,
})
export class LeagueCardComponent {
  readonly league = input.required<League>();
  readonly open = output<number>();
  protected readonly draft = computed(() => DRAFT_LABEL[this.league().draftStatus]);
}
```

- [ ] **Step 4: Verde** — `npm test -- --watch=false` → 12 passed.

- [ ] **Step 5: `leagues.service.ts`**

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiEnvelope } from '../../models/api';
import type { DraftStatus, League } from '../../models/league';
import type { LeagueMember } from '../../models/league-member';

export interface CreateLeagueInput {
  name: string;
  inviteCode: string;
  seasonId: number;
}

// LeaguesService: todo lo que habla con /leagues. Los componentes no conocen URLs.
// El interceptor agrega el token y la cookie; aca solo van paths y tipos.
@Injectable({ providedIn: 'root' })
export class LeaguesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/leagues`;

  list(): Observable<League[]> {
    return this.http.get<ApiEnvelope<League[]>>(this.base).pipe(map((r) => r.data));
  }

  create(input: CreateLeagueInput): Observable<League> {
    return this.http.post<ApiEnvelope<League>>(this.base, input).pipe(map((r) => r.data));
  }

  join(inviteCode: string): Observable<LeagueMember> {
    return this.http
      .post<ApiEnvelope<LeagueMember>>(`${this.base}/join`, { inviteCode })
      .pipe(map((r) => r.data));
  }

  get(id: number): Observable<League> {
    return this.http.get<ApiEnvelope<League>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  members(id: number): Observable<LeagueMember[]> {
    return this.http
      .get<ApiEnvelope<LeagueMember[]>>(`${this.base}/${id}/members`)
      .pipe(map((r) => r.data));
  }

  leave(id: number): Observable<void> {
    return this.http.post<unknown>(`${this.base}/${id}/leave`, {}).pipe(map(() => undefined));
  }

  kick(id: number, userId: number): Observable<void> {
    return this.http
      .delete<unknown>(`${this.base}/${id}/members/${userId}`)
      .pipe(map(() => undefined));
  }

  startDraft(id: number): Observable<{ draftStatus: DraftStatus; totalPicks: number }> {
    return this.http
      .post<ApiEnvelope<{ draftStatus: DraftStatus; totalPicks: number }>>(
        `${this.base}/${id}/draft/start`,
        {},
      )
      .pipe(map((r) => r.data));
  }

  // La temporada activa la expone /seasons/active (publico). Vive aca porque el unico que la
  // necesita es el form de crear liga.
  activeSeasonId(): Observable<number> {
    return this.http
      .get<ApiEnvelope<{ id: number }>>(`${environment.apiUrl}/seasons/active`)
      .pipe(map((r) => r.data.id));
  }
}
```

- [ ] **Step 6: `leagues.page.ts`**

```ts
import { Component, WritableSignal, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import type { League } from '../../models/league';
import {
  AlertComponent,
  ButtonComponent,
  CardComponent,
  FieldComponent,
  PageShellComponent,
} from '../../shared/ui';
import { LeagueCardComponent } from './league-card.component';
import { LeaguesService } from './leagues.service';

@Component({
  selector: 'app-leagues-page',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    CardComponent,
    FieldComponent,
    PageShellComponent,
    LeagueCardComponent,
  ],
  template: `
    <ui-page-shell title="Mis ligas">
      <div actions class="flex items-center gap-3 text-sm text-slate-600">
        <span>{{ auth.user()?.name }}</span>
        <ui-button variant="secondary" (click)="auth.logout()">Salir</ui-button>
      </div>

      <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section class="flex flex-col gap-4">
          @if (loadError(); as e) {
            <ui-alert [code]="e.code" [message]="e.message" />
          }
          @if (leagues().length === 0 && !loadError()) {
            <p class="text-slate-500">
              Todavía no estás en ninguna liga. Creá una o unite con un código.
            </p>
          }
          <div class="grid gap-4 md:grid-cols-2">
            @for (league of leagues(); track league.id) {
              <app-league-card [league]="league" (open)="openLeague($event)" />
            }
          </div>
        </section>

        <aside class="flex flex-col gap-6">
          <ui-card>
            <h2 class="mb-3 text-lg font-semibold">Crear liga</h2>
            <form [formGroup]="createForm" (ngSubmit)="create()" class="flex flex-col gap-3">
              <ui-field label="Nombre">
                <input
                  formControlName="name"
                  class="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </ui-field>
              <ui-field label="Código de invitación (4-20, minúsculas)">
                <input
                  formControlName="inviteCode"
                  class="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                />
              </ui-field>
              @if (createError(); as e) {
                <ui-alert [code]="e.code" [message]="e.message" />
              }
              <ui-button type="submit" [disabled]="createForm.invalid || busy()">Crear</ui-button>
            </form>
          </ui-card>

          <ui-card>
            <h2 class="mb-3 text-lg font-semibold">Unirme con código</h2>
            <form [formGroup]="joinForm" (ngSubmit)="join()" class="flex flex-col gap-3">
              <ui-field label="Código">
                <input
                  formControlName="inviteCode"
                  class="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                />
              </ui-field>
              @if (joinError(); as e) {
                <ui-alert [code]="e.code" [message]="e.message" />
              }
              <ui-button type="submit" variant="secondary" [disabled]="joinForm.invalid || busy()"
                >Unirme</ui-button
              >
            </form>
          </ui-card>
        </aside>
      </div>
    </ui-page-shell>
  `,
})
export class LeaguesPage {
  private readonly fb = inject(FormBuilder);
  private readonly leaguesApi = inject(LeaguesService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly leagues = signal<League[]>([]);
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly createError = signal<ApiError | null>(null);
  protected readonly joinError = signal<ApiError | null>(null);
  protected readonly busy = signal(false);

  // Mismas reglas que createLeagueSchema del backend: 4-20 chars, minusculas/numeros/guiones.
  protected readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    inviteCode: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{4,20}$/)]],
  });
  protected readonly joinForm = this.fb.nonNullable.group({
    inviteCode: ['', [Validators.required, Validators.minLength(4)]],
  });

  constructor() {
    this.reload();
  }

  protected openLeague(id: number): void {
    void this.router.navigate(['/leagues', id]);
  }

  protected create(): void {
    if (this.createForm.invalid) return;
    this.busy.set(true);
    this.createError.set(null);
    const { name, inviteCode } = this.createForm.getRawValue();
    this.leaguesApi.activeSeasonId().subscribe({
      next: (seasonId) =>
        this.leaguesApi.create({ name, inviteCode, seasonId }).subscribe({
          next: (league) => {
            this.busy.set(false);
            void this.router.navigate(['/leagues', league.id]);
          },
          error: (err: ApiError) => this.fail(this.createError, err),
        }),
      error: (err: ApiError) => this.fail(this.createError, err),
    });
  }

  protected join(): void {
    if (this.joinForm.invalid) return;
    this.busy.set(true);
    this.joinError.set(null);
    this.leaguesApi.join(this.joinForm.getRawValue().inviteCode).subscribe({
      next: () => {
        this.busy.set(false);
        this.joinForm.reset();
        this.reload();
      },
      error: (err: ApiError) => this.fail(this.joinError, err),
    });
  }

  private reload(): void {
    this.leaguesApi.list().subscribe({
      next: (leagues) => this.leagues.set(leagues),
      error: (err: ApiError) => this.loadError.set(err),
    });
  }

  private fail(target: WritableSignal<ApiError | null>, err: ApiError): void {
    target.set(err);
    this.busy.set(false);
  }
}
```

- [ ] **Step 7: Ruta real de `/leagues`**

En `app.routes.ts`, reemplazar el placeholder:

```ts
  { path: 'leagues', component: LeaguesPage, canActivate: [authGuard] },
```

con `import { LeaguesPage } from './features/leagues/leagues.page';`.

- [ ] **Step 8: Probar a mano**

Backend con seed (`npx prisma db seed` — necesita una temporada activa). Login → "Mis ligas" vacío → crear "Liga UTN" con código `utn-2026` → navega al detalle (404 por ahora, Task 7 — volver con el botón atrás). En otra ventana de incógnito registrar otro usuario → "Unirme" con `utn-2026` → aparece la tarjeta. Código inexistente → "Ese código no existe".

- [ ] **Step 9: Lint + test + commit**

```bash
git add frontend/src/app
git commit -m "feat(frontend): mis ligas — lista, crear, unirme + LeaguesService (Slice 13a)"
```

---

### Task 7: Detalle de liga con miembros y acciones

**Files:**

- Create: `frontend/src/app/features/leagues/members-table.component.ts`
- Create: `frontend/src/app/features/leagues/league-detail.page.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**

- Consumes: `LeaguesService.get/members/leave/kick/startDraft`, `AuthService.user`, `LeagueMember`, `ui-*`.
- Produces: ruta `/leagues/:id`. `<app-members-table [members] [isOwner] [canKick] (kick)>`.

- [ ] **Step 1: `members-table.component.ts`**

```ts
import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { LeagueMember } from '../../models/league-member';
import { BadgeComponent } from '../../shared/ui';

// app-members-table: lista de miembros. En SM se apila (cada miembro es una fila de 2
// lineas); desde md: tabla. `kick` solo se muestra si el que mira es owner y el roster esta
// abierto (canKick) — la regla la decide la pagina, no la tabla.
@Component({
  selector: 'app-members-table',
  imports: [DatePipe, BadgeComponent],
  template: `
    <ul class="divide-y divide-slate-200">
      @for (m of members(); track m.id) {
        <li class="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ m.user.name }}</span>
            @if (m.isOwner) {
              <ui-badge tone="warning">owner</ui-badge>
            }
          </div>
          <div class="flex items-center gap-4 text-sm text-slate-500">
            <span>desde {{ m.joinedAt | date: 'dd/MM/yyyy' }}</span>
            @if (canKick() && !m.isOwner) {
              <button
                type="button"
                class="font-semibold text-red-600 hover:underline"
                (click)="kick.emit(m.userId)"
              >
                Echar
              </button>
            }
          </div>
        </li>
      }
    </ul>
  `,
})
export class MembersTableComponent {
  readonly members = input.required<LeagueMember[]>();
  readonly canKick = input(false);
  readonly kick = output<number>();
}
```

- [ ] **Step 2: `league-detail.page.ts`**

```ts
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import type { League } from '../../models/league';
import type { LeagueMember } from '../../models/league-member';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  PageShellComponent,
} from '../../shared/ui';
import { LeaguesService } from './leagues.service';
import { MembersTableComponent } from './members-table.component';

@Component({
  selector: 'app-league-detail-page',
  imports: [
    RouterLink,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    PageShellComponent,
    MembersTableComponent,
  ],
  template: `
    @if (league(); as l) {
      <ui-page-shell [title]="l.name">
        <div actions>
          <a routerLink="/leagues" class="text-sm font-semibold text-slate-600 hover:underline"
            >← Mis ligas</a
          >
        </div>

        <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <ui-card>
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                Miembros ({{ members().length }}/{{ l.maxMembers }})
              </h2>
              <ui-badge [tone]="draftTone()">{{ draftLabel() }}</ui-badge>
            </div>
            @if (actionError(); as e) {
              <div class="mb-3"><ui-alert [code]="e.code" [message]="e.message" /></div>
            }
            <app-members-table
              [members]="members()"
              [canKick]="isOwner() && rosterOpen()"
              (kick)="kick($event)"
            />
          </ui-card>

          <aside class="flex flex-col gap-4">
            <ui-card>
              <h2 class="mb-2 text-lg font-semibold">Invitar</h2>
              <p class="text-sm text-slate-600">Compartí este código:</p>
              <div class="mt-2 flex items-center gap-2">
                <code class="rounded bg-slate-100 px-2 py-1 font-mono">{{ l.inviteCode }}</code>
                <ui-button variant="secondary" (click)="copyCode(l.inviteCode)">{{
                  copied() ? 'Copiado' : 'Copiar'
                }}</ui-button>
              </div>
            </ui-card>

            <ui-card>
              <h2 class="mb-2 text-lg font-semibold">Draft</h2>
              @if (isOwner()) {
                <p class="mb-3 text-sm text-slate-600">
                  Cuando estén todos, arrancá el draft. Después no entra ni sale nadie.
                </p>
                <ui-button [disabled]="!rosterOpen() || busy()" (click)="startDraft()">
                  {{ rosterOpen() ? 'Iniciar draft' : draftLabel() }}
                </ui-button>
              } @else {
                <p class="mb-3 text-sm text-slate-600">Solo el owner puede arrancar el draft.</p>
                <ui-button variant="danger" [disabled]="!rosterOpen() || busy()" (click)="leave()"
                  >Salir de la liga</ui-button
                >
              }
            </ui-card>
          </aside>
        </div>
      </ui-page-shell>
    } @else if (loadError(); as e) {
      <ui-page-shell title="Liga">
        <ui-alert [code]="e.code" [message]="e.message" />
      </ui-page-shell>
    }
  `,
})
export class LeagueDetailPage implements OnInit {
  // withComponentInputBinding() (app.config) mapea el :id de la ruta a este input. Los inputs
  // recien tienen valor en ngOnInit — por eso la carga inicial va ahi y no en el constructor.
  readonly id = input.required<string>();

  private readonly leaguesApi = inject(LeaguesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly league = signal<League | null>(null);
  protected readonly members = signal<LeagueMember[]>([]);
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly actionError = signal<ApiError | null>(null);
  protected readonly busy = signal(false);
  protected readonly copied = signal(false);

  protected readonly isOwner = computed(() => this.league()?.createdById === this.auth.user()?.id);
  protected readonly rosterOpen = computed(() => this.league()?.draftStatus === 'PENDING');
  protected readonly draftLabel = computed(() => {
    switch (this.league()?.draftStatus) {
      case 'LIVE':
        return 'Draft en vivo';
      case 'COMPLETED':
        return 'Draft completo';
      default:
        return 'Draft pendiente';
    }
  });
  protected readonly draftTone = computed<'neutral' | 'info' | 'success'>(() => {
    switch (this.league()?.draftStatus) {
      case 'LIVE':
        return 'info';
      case 'COMPLETED':
        return 'success';
      default:
        return 'neutral';
    }
  });

  ngOnInit(): void {
    this.reload();
  }

  protected startDraft(): void {
    this.run(this.leaguesApi.startDraft(this.leagueId()));
  }

  protected leave(): void {
    this.busy.set(true);
    this.leaguesApi.leave(this.leagueId()).subscribe({
      next: () => void this.router.navigate(['/leagues']),
      error: (err: ApiError) => this.fail(err),
    });
  }

  protected kick(userId: number): void {
    this.run(this.leaguesApi.kick(this.leagueId(), userId));
  }

  protected async copyCode(code: string): Promise<void> {
    await navigator.clipboard.writeText(code);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  private leagueId(): number {
    return Number(this.id());
  }

  // run: patron comun de las acciones del detalle — bloquear botones, ejecutar, recargar.
  private run(action: Observable<unknown>): void {
    this.busy.set(true);
    this.actionError.set(null);
    action.subscribe({
      next: () => {
        this.busy.set(false);
        this.reload();
      },
      error: (err: ApiError) => this.fail(err),
    });
  }

  private reload(): void {
    const id = this.leagueId();
    this.leaguesApi.get(id).subscribe({
      next: (league) => this.league.set(league),
      error: (err: ApiError) => this.loadError.set(err),
    });
    this.leaguesApi.members(id).subscribe({
      next: (members) => this.members.set(members),
      error: (err: ApiError) => this.actionError.set(err),
    });
  }

  private fail(err: ApiError): void {
    this.actionError.set(err);
    this.busy.set(false);
  }
}
```

Y en `app.config.ts`, `provideRouter(routes)` pasa a `provideRouter(routes, withComponentInputBinding())` (import `withComponentInputBinding` de `@angular/router`) para que `:id` llegue como `input`.

- [ ] **Step 3: Ruta**

En `app.routes.ts`, antes del `'**'`:

```ts
  { path: 'leagues/:id', component: LeagueDetailPage, canActivate: [authGuard] },
```

con `import { LeagueDetailPage } from './features/leagues/league-detail.page';`.

- [ ] **Step 4: Probar a mano — el "done when" del spec, puntos 2 y 3**

Dos ventanas (normal + incógnito), dos usuarios. Owner crea la liga → detalle muestra 1/11 y "Draft pendiente". Segundo usuario se une → F5 en el owner → 2/11. Owner "Iniciar draft" → badge "Draft en vivo", botón deshabilitado. Tercer usuario intenta unirse con el código → "El draft ya empezó: no se puede cambiar el roster". Segundo usuario ve "Salir de la liga" deshabilitado.

- [ ] **Step 5: Lint + test + commit**

```bash
git add frontend/src/app
git commit -m "feat(frontend): detalle de liga — miembros, invitar, iniciar draft, salir/echar (Slice 13a)"
```

---

### Task 8: E2E con Playwright + evidencia

**Files:**

- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/leagues.spec.ts`
- Modify: `frontend/package.json` (script `e2e`)
- Create: `docs/test-evidence/slice-13a-e2e.txt`

**Interfaces:**

- Consumes: la app completa en `http://localhost:4200` + backend en 3000 con seed.

- [ ] **Step 1: Instalar Playwright**

```bash
cd frontend
npm init playwright@latest -- --quiet --browser=chromium --no-examples
```

(Si pregunta: TypeScript, carpeta `e2e`, no GitHub Actions.) Reemplazar `playwright.config.ts` por:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  // Levanta el frontend solo; el backend tiene que estar corriendo (npm run dev en backend/).
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

En `package.json`, scripts: `"e2e": "playwright test --reporter=list"`.

- [ ] **Step 2: El test**

`frontend/e2e/leagues.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

// Flujo completo contra el backend real (seed cargado): registro -> crear liga -> verla en la
// lista -> abrir el detalle -> soy owner. Email unico por corrida para no chocar con la DB.
test('registrarse, crear una liga y verla como owner', async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@boxbox.test`;
  const code = `e2e-${stamp}`.slice(0, 20);

  await page.goto('/register');
  await page.getByLabel('Nombre').fill('E2E Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill('hunter22test');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/leagues$/);
  await expect(page.getByRole('heading', { name: 'Mis ligas' })).toBeVisible();

  await page.getByLabel('Nombre').fill('Liga E2E');
  await page.getByLabel(/Código de invitación/).fill(code);
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

- [ ] **Step 3: Correr** (backend corriendo, DB seedeada)

```bash
npm run e2e
```

Expected: 2 passed. Si el primero falla en "Crear": revisar que `GET /seasons/active` devuelva una temporada (seed).

- [ ] **Step 4: Evidencia + commit**

```bash
npm run e2e > ../docs/test-evidence/slice-13a-e2e.txt 2>&1
npm test -- --watch=false > ../docs/test-evidence/slice-13a-unit.txt 2>&1
cd ..
git add frontend/playwright.config.ts frontend/e2e frontend/package.json frontend/package-lock.json docs/test-evidence
git commit -m "test(frontend): e2e con Playwright (registro -> liga -> detalle) + evidencia (Slice 13a)"
```

(`frontend/.gitignore` del CLI ya ignora `test-results/` y `playwright-report/`; si no, agregarlos.)

---

### Task 9: Responsive, docs y PR

**Files:**

- Modify: `README.md`, `docs/roadmap.md`, `CLAUDE.md`, `docs/tutorial.md`

- [ ] **Step 1: Pasada responsive**

`npm start`, DevTools → device toolbar, 375 / 768 / 1024 px, en `/leagues` y `/leagues/:id`. Checklist: nada se sale del ancho; la lista es 1 col en 375, 2 en 768; el detalle apila la tabla en 375. Ajustar clases `md:`/`lg:` si algo se rompe.

- [ ] **Step 2: Docs**

- `README.md`: fila Frontend → `Angular + TypeScript + Tailwind CSS`; sección "Setup" → subsección `frontend/`: `cd frontend && npm install && npm start` (4200), backend con `FRONTEND_URL=http://localhost:4200`.
- `docs/roadmap.md`: reemplazar el bloque de Slice 13 por "13a — bootstrap (Angular): ✅ este PR — ver `docs/specs/2026-08-27-slice-13a-frontend-bootstrap.md`" y "13b — draft en vivo (Socket.io): pendiente"; mover 13a a Completados con Status done y un párrafo de Shipped.
- `CLAUDE.md`: layout `frontend/ Angular 21 SPA`; "Development Commands" → bloque frontend (`npm start`, `npm test -- --watch=false`, `npm run e2e`, `npm run lint`); nueva sección **Frontend conventions** (5 líneas: estructura de carpetas, reglas de import, sufijos de archivo, token en memoria, cómo agregar una pantalla).
- `docs/tutorial.md`: "7. Levantar el frontend" (3 líneas + credenciales del seed).

- [ ] **Step 3: Verificación final del "done when"**

Recorrer los 7 puntos de la sección 11 del spec. `cd frontend && npm run lint && npm test -- --watch=false && npx ng build` — todo verde.

- [ ] **Step 4: Commit + PR**

```bash
git add README.md docs/roadmap.md CLAUDE.md docs/tutorial.md
git commit -m "docs: frontend Angular en README, roadmap (13a/13b), CLAUDE.md y tutorial (Slice 13a)"
git push -u origin slice-13a-frontend-bootstrap
```

PR con la plantilla del repo, base `dev`, título "Slice 13a — Frontend bootstrap en Angular: login, mis ligas, detalle de liga". Smoke test del PR = los 7 puntos del "done when" + `npm run e2e`.
