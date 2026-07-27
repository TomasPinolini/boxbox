// SMOKE — Slice 4: FantasyTeam shell
// Pre-requisito: `npm run dev` corriendo en otra terminal (backend en :3000)
// Uso: npm run smoke:slice-4
//
// Que hace paso a paso, con logs:
//   1. Health check del backend
//   2. Fixture: Season (year=2029) find-or-create
//   3. Register owner + POST /leagues → verificar FantasyTeam auto-creado (todos los slots null)
//   4. Register segundo user + POST /leagues/join → verificar FantasyTeam tambien se crea al joinear
//   5. GET /leagues/:id/teams/me (owner) → 200 con slots null
//   6. GET /leagues/:id/teams/me (member) → 200 con slots null
//   7. Leave + rejoin del member → verificar que sigue habiendo un solo FantasyTeam (no duplica)
//   8. GET /leagues/:id/teams/me con un user no-member → 404 LEAGUE_NOT_FOUND
//   9. GET /leagues/:id/teams/me sin token → 401 TOKEN_MISSING
//
// El script fail-fast: si algo no matchea lo esperado, printea el diff y exit(1).
// No hace cleanup — deja fixtures en dev DB. Reset con `npm run db:migrate reset` si molesta.

import { prisma } from '../shared/prisma';

const API = 'http://localhost:3000/api/v1';
const runId = Date.now();

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

async function registerUser(suffix: string) {
  const email = `smoke-${suffix}-${runId}@boxbox.test`;
  const reg = await api<{ data: { user: { id: number }; accessToken: string } }>(
    'POST',
    '/auth/register',
    { body: { email, password: 'hunter22test', name: `Smoke ${suffix}` } },
  );
  if (reg.status !== 201) fail(`Register ${suffix} failed`, reg.body);
  const data = (reg.body as { data: { user: { id: number }; accessToken: string } }).data;
  return { userId: data.user.id, token: data.accessToken, email };
}

function expectEmptySlots(team: Record<string, unknown>, label: string) {
  const empty =
    team.driver1Id === null &&
    team.driver2Id === null &&
    team.reserveDriverId === null &&
    team.constructorId === null;
  if (!empty) fail(`${label}: esperaba todos los slots null`, team);
  ok(`${label}: driver1Id/driver2Id/reserveDriverId/constructorId = null`);
}

async function main() {
  console.log(cyan(`▶ Slice 4 smoke starting... (runId=${runId})`));

  // ── 1. Backend health ──────────────────────────────────────
  step('Backend health check');
  const health = await api('GET', '/health');
  if (health.status !== 200)
    fail(`Backend not responding on ${API}. ¿Corriste 'npm run dev'?`, health);
  ok('Backend up on :3000');

  // ── 2. Fixture: Season find-or-create ────────────────────────
  step('Fixture: find-or-create Season 2029');
  let season = await prisma.season.findFirst({ where: { year: 2029 } });
  if (!season) {
    const s = await api<{ data: { id: number } }>('POST', '/seasons', {
      body: { year: 2029 },
    });
    // Sin owner admin todavia en este script — si /seasons exige admin, fallback a Prisma directo.
    if (s.status === 201) {
      season = { id: (s.body as { data: { id: number } }).data.id } as never;
    } else {
      season = await prisma.season.create({ data: { year: 2029, isActive: false } });
    }
  }
  ok(`Season id=${season!.id} (year=2029)`);

  // ── 3. Owner crea la liga → FantasyTeam auto-creado ──────────
  step('Owner: register + POST /leagues (esperar 201)');
  const owner = await registerUser('owner');
  const inviteCode = `s4-${runId}`.slice(0, 20);
  const league = await api<{ data: { id: number } }>('POST', '/leagues', {
    token: owner.token,
    body: { name: `Smoke Liga ${runId}`, inviteCode, seasonId: season!.id },
  });
  if (league.status !== 201) fail('League create failed', league.body);
  const leagueId = (league.body as { data: { id: number } }).data.id;
  ok(`League id=${leagueId} creada (owner=${owner.userId})`);

  // ── 4. Member joinea → FantasyTeam tambien se crea ───────────
  step('Member: register + POST /leagues/join (esperar 201)');
  const member = await registerUser('member');
  const join = await api('POST', '/leagues/join', {
    token: member.token,
    body: { inviteCode },
  });
  if (join.status !== 201) fail('Join failed', join.body);
  ok(`Member ${member.userId} joineo la liga`);

  // ── 5. GET /teams/me (owner) ─────────────────────────────────
  step('GET /leagues/:id/teams/me (owner) → 200 con slots null');
  const ownerTeam = await api<{ data: Record<string, unknown> }>(
    'GET',
    `/leagues/${leagueId}/teams/me`,
    { token: owner.token },
  );
  if (ownerTeam.status !== 200) fail(`Esperado 200, obtuve ${ownerTeam.status}`, ownerTeam.body);
  expectEmptySlots((ownerTeam.body as { data: Record<string, unknown> }).data, 'Owner team');

  // ── 6. GET /teams/me (member) ────────────────────────────────
  step('GET /leagues/:id/teams/me (member) → 200 con slots null');
  const memberTeam = await api<{ data: Record<string, unknown> }>(
    'GET',
    `/leagues/${leagueId}/teams/me`,
    { token: member.token },
  );
  if (memberTeam.status !== 200)
    fail(`Esperado 200, obtuve ${memberTeam.status}`, memberTeam.body);
  expectEmptySlots((memberTeam.body as { data: Record<string, unknown> }).data, 'Member team');

  // ── 7. Leave + rejoin → sigue habiendo un solo FantasyTeam ──
  step('Member: leave + rejoin → no debe duplicar el FantasyTeam (@@unique)');
  const leave = await api('POST', `/leagues/${leagueId}/leave`, { token: member.token });
  if (leave.status !== 200) fail('Leave failed', leave.body);
  const rejoin = await api('POST', '/leagues/join', { token: member.token, body: { inviteCode } });
  if (rejoin.status !== 201) fail('Rejoin failed', rejoin.body);
  const teamCount = await prisma.fantasyTeam.count({
    where: { leagueMember: { leagueId, userId: member.userId } },
  });
  if (teamCount !== 1) fail(`Esperaba 1 FantasyTeam tras rejoin, hay ${teamCount}`);
  ok('Rejoin no duplico el FantasyTeam (count=1)');

  // ── 8. No-member → 404 LEAGUE_NOT_FOUND ──────────────────────
  step('GET /leagues/:id/teams/me con user no-member → 404 LEAGUE_NOT_FOUND');
  const outsider = await registerUser('outsider');
  const outsiderRes = await api<{ error: { code: string } }>(
    'GET',
    `/leagues/${leagueId}/teams/me`,
    { token: outsider.token },
  );
  const code8 = (outsiderRes.body as { error?: { code?: string } }).error?.code;
  if (outsiderRes.status !== 404 || code8 !== 'LEAGUE_NOT_FOUND') {
    fail(`Esperado 404 LEAGUE_NOT_FOUND, obtuve ${outsiderRes.status} ${code8}`, outsiderRes.body);
  }
  ok('404 LEAGUE_NOT_FOUND (P2-1 unification ok)');

  // ── 9. Sin token → 401 TOKEN_MISSING ─────────────────────────
  step('GET /leagues/:id/teams/me sin token → 401 TOKEN_MISSING');
  const noAuth = await api<{ error: { code: string } }>('GET', `/leagues/${leagueId}/teams/me`);
  const code9 = (noAuth.body as { error?: { code?: string } }).error?.code;
  if (noAuth.status !== 401 || code9 !== 'TOKEN_MISSING') {
    fail(`Esperado 401 TOKEN_MISSING, obtuve ${noAuth.status} ${code9}`, noAuth.body);
  }
  ok('401 TOKEN_MISSING (auth guard ok)');

  console.log(`\n${green(`✓ SMOKE PASSED`)} — ${stepNum} steps, runId=${runId}`);
}

main()
  .catch((err) => {
    console.error(red('\n✗ SMOKE CRASHED:'));
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
