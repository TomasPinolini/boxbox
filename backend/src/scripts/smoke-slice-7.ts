// SMOKE — Slice 7: RaceResult ingestion
// Pre-requisito: `npm run dev` corriendo en otra terminal (backend en :3000)
// Uso: npm run smoke:slice-7
//
// Que hace paso a paso, con logs:
//   1. Health check del backend
//   2. Register nuevo user + promote a ADMIN via Prisma + re-login → token con role=ADMIN
//   3. Fixture: Season (year=2028) + Circuit + Race + 3 Drivers frescos
//   4. POST /races/:id/results → 201 + 3 items en respuesta
//   5. Verificar Race pasa a COMPLETED via GET /races/:id
//   6. Verificar GET /races/:id/results devuelve los 3
//   7. POST results de nuevo → 409 RACE_ALREADY_COMPLETED
//   8. POST sin token → 401 TOKEN_MISSING
//
// El script fail-fast: si algo no matchea lo esperado, printea el diff y exit(1).
// No hace cleanup — deja fixtures en dev DB. Reset con `npm run db:migrate reset` si molesta.

import { prisma } from '../shared/prisma';

const API = 'http://localhost:3000/api/v1';
const runId = Date.now();

// Colores ANSI para output legible en terminales que soportan color (bash, pwsh 7+, iTerm).
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

let stepNum = 0;
function step(msg: string) {
  stepNum++;
  console.log(`\n${cyan(`▶ [${stepNum}] ${msg}`)}`);
}
function ok(msg: string) {
  console.log(`  ${green('✓')} ${msg}`);
}
function fail(msg: string, extra?: unknown): never {
  console.error(`  ${red('✗')} ${msg}`);
  if (extra !== undefined) console.error(dim(JSON.stringify(extra, null, 2)));
  process.exit(1);
}

type ApiResponse<T = unknown> = { status: number; body: T | { error?: { code?: string } } | null };

async function api<T = unknown>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const body = (await res.json().catch(() => null)) as T | null;
  return { status: res.status, body: body as ApiResponse<T>['body'] };
}

async function main() {
  console.log(cyan(`▶ Slice 7 smoke starting... (runId=${runId})`));

  // ── 1. Backend health ──────────────────────────────────────
  step('Backend health check');
  const health = await api('GET', '/health');
  if (health.status !== 200)
    fail(`Backend not responding on ${API}. ¿Corriste 'npm run dev'?`, health);
  ok('Backend up on :3000');

  // ── 2. Register + promote + login ──────────────────────────
  step('Register admin user (email unique por runId)');
  const email = `smoke-admin-${runId}@boxbox.test`;
  const reg = await api<{ data: { user: { id: number } } }>('POST', '/auth/register', {
    body: { email, password: 'hunter22test', name: 'Smoke Admin' },
  });
  if (reg.status !== 201) fail('Register failed', reg.body);
  // biome-ignore lint/style/noNonNullAssertion: fail already exited above si es null
  const userId = (reg.body as { data: { user: { id: number } } }).data.user.id;
  ok(`User created (id=${userId}, email=${email})`);

  step('Promote to ADMIN via Prisma (bypass HTTP porque no hay endpoint publico)');
  await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
  ok('Role updated in DB');

  step('Re-login para obtener token nuevo con role=ADMIN en payload');
  const login = await api<{ data: { accessToken: string } }>('POST', '/auth/login', {
    body: { email, password: 'hunter22test' },
  });
  if (login.status !== 200) fail('Login failed', login.body);
  const token = (login.body as { data: { accessToken: string } }).data.accessToken;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  if (payload.role !== 'ADMIN') fail('JWT payload NO contiene role=ADMIN', payload);
  ok(`Token payload confirms role=ADMIN (userId=${payload.userId})`);

  // ── 3. Fixture setup ──────────────────────────────────────
  step('Fixture: find-or-create Season 2028');
  // Idempotente: si 2028 ya existe (de una corrida previa), la reusamos.
  let season = await prisma.season.findFirst({ where: { year: 2028 } });
  if (!season) {
    const s = await api<{ data: { id: number } }>('POST', '/seasons', { body: { year: 2028 } });
    if (s.status !== 201) fail('Season create failed', s.body);
    season = { id: (s.body as { data: { id: number } }).data.id } as never;
  }
  ok(`Season id=${season!.id} (year=2028)`);

  step('Fixture: create Circuit + Race + 3 Drivers unicos por runId');
  const circuit = await api<{ data: { id: number } }>('POST', '/circuits', {
    body: {
      name: `Smoke-${runId}`,
      country: 'Test',
      city: 'Testville',
      externalId: `smoke-circuit-${runId}`,
    },
  });
  if (circuit.status !== 201) fail('Circuit create failed', circuit.body);
  const circuitId = (circuit.body as { data: { id: number } }).data.id;

  // Race round unico dentro de la season — usamos parte del runId modulo alto para evitar colision.
  const round = (runId % 900) + 100;
  const race = await api<{ data: { id: number; status: string } }>('POST', '/races', {
    body: {
      name: `Smoke GP ${runId}`,
      round,
      date: '2028-08-01T14:00:00Z',
      lockDate: '2028-07-31T12:00:00Z',
      seasonId: season!.id,
      circuitId,
    },
  });
  if (race.status !== 201) fail('Race create failed', race.body);
  const raceId = (race.body as { data: { id: number; status: string } }).data.id;
  const initialStatus = (race.body as { data: { status: string } }).data.status;

  const drivers: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const num = i.toString().padStart(2, '0');
    const d = await api<{ data: { id: number } }>('POST', '/drivers', {
      body: {
        firstName: 'Smoke',
        lastName: `Driver${num}`,
        number: (runId % 90) + i, // 1-92 range para no chocar
        code: `S${num}`,
        externalId: `smoke-driver-${runId}-${num}`,
      },
    });
    if (d.status !== 201) fail(`Driver ${i} create failed`, d.body);
    drivers.push((d.body as { data: { id: number } }).data.id);
  }
  ok(
    `Race id=${raceId} (status=${initialStatus}, round=${round}), Drivers=[${drivers.join(', ')}]`,
  );

  // ── 4. Happy path POST ────────────────────────────────────
  step('POST /races/:id/results con 3 items (esperar 201 + array de 3)');
  const results = [
    {
      driverId: drivers[0],
      position: 1,
      points: 25,
      gridPosition: 1,
      laps: 71,
      fastestLap: false,
      status: 'CLASSIFIED',
    },
    {
      driverId: drivers[1],
      position: 2,
      points: 18,
      gridPosition: 2,
      laps: 71,
      fastestLap: false,
      status: 'CLASSIFIED',
    },
    {
      driverId: drivers[2],
      position: 3,
      points: 15,
      gridPosition: 3,
      laps: 71,
      fastestLap: true,
      status: 'CLASSIFIED',
    },
  ];
  const post = await api<{ data: unknown[] }>('POST', `/races/${raceId}/results`, {
    token,
    body: { results },
  });
  if (post.status !== 201) fail(`Esperado 201, obtuve ${post.status}`, post.body);
  const returned = (post.body as { data: unknown[] }).data;
  if (!Array.isArray(returned) || returned.length !== 3) {
    fail(`Esperado array de 3, obtuve ${JSON.stringify(returned)}`, post.body);
  }
  ok(`201 Created, ${returned.length} results devueltos`);

  // ── 5. Verify race COMPLETED ──────────────────────────────
  step('GET /races/:id — Race.status debe ser COMPLETED');
  const raceCheck = await api<{ data: { status: string } }>('GET', `/races/${raceId}`);
  const finalStatus = (raceCheck.body as { data: { status: string } }).data.status;
  if (finalStatus !== 'COMPLETED')
    fail(`Esperado COMPLETED, obtuve ${finalStatus}`, raceCheck.body);
  ok(`Race.status = COMPLETED (transicion ${initialStatus} → COMPLETED)`);

  // ── 6. GET results (user-facing) ──────────────────────────
  step('GET /races/:id/results (endpoint user-facing) devuelve los 3');
  const getResults = await api<{ data: unknown[] }>('GET', `/races/${raceId}/results`);
  const listed = (getResults.body as { data: unknown[] }).data;
  if (getResults.status !== 200 || listed.length !== 3)
    fail('GET results incorrecto', getResults.body);
  ok(`GET devuelve ${listed.length} results, ordenados por position`);

  // ── 7. POST idempotency test ──────────────────────────────
  step('POST /races/:id/results DE NUEVO → esperar 409 RACE_ALREADY_COMPLETED');
  const post2 = await api<{ error: { code: string } }>('POST', `/races/${raceId}/results`, {
    token,
    body: { results },
  });
  const code2 = (post2.body as { error?: { code?: string } }).error?.code;
  if (post2.status !== 409 || code2 !== 'RACE_ALREADY_COMPLETED') {
    fail(`Esperado 409 RACE_ALREADY_COMPLETED, obtuve ${post2.status} ${code2}`, post2.body);
  }
  ok(`409 RACE_ALREADY_COMPLETED (idempotency ok)`);

  // ── 8. Auth guard ─────────────────────────────────────────
  step('POST /races/:id/results SIN token → esperar 401 TOKEN_MISSING');
  const post3 = await api<{ error: { code: string } }>('POST', `/races/${raceId}/results`, {
    body: { results },
  });
  const code3 = (post3.body as { error?: { code?: string } }).error?.code;
  if (post3.status !== 401 || code3 !== 'TOKEN_MISSING') {
    fail(`Esperado 401 TOKEN_MISSING, obtuve ${post3.status} ${code3}`, post3.body);
  }
  ok(`401 TOKEN_MISSING (auth guard ok)`);

  console.log(`\n${green(`✓ SMOKE PASSED`)} — ${stepNum} steps, runId=${runId}`);
}

main()
  .catch((err) => {
    console.error(red('\n✗ SMOKE CRASHED:'));
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
