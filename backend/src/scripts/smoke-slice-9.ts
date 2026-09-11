// SMOKE — Slice 9: LeagueStanding por carrera
// Pre-requisito: `npm run dev` corriendo en otra terminal (backend en :3000) + `npx prisma db seed`
// Uso: SMOKE=1 npm run smoke:slice-9
//
// Que hace paso a paso, con logs:
//   1. Health check del backend
//   2. Login del admin del seed (necesario para cargar resultados y recalcular)
//   3. Fixtures aislados: Season propia + circuito + 2 escuderias + 4 pilotos
//   4. Dos usuarios nuevos: uno crea la liga, el otro se une por codigo
//   5. Draft completo por REST: 3 rondas x 2 miembros = 6 picks, siguiendo los turnos
//   6. Carrera 1: cargar resultados -> POST /races/:id/recalculate
//   7. GET /leagues/:id/standings -> verificar la ARITMETICA, no solo que responda 200
//   8. Carrera 2 con el orden dado vuelta -> verificar que los puntos ACUMULAN
//   9. Verificar positionChange en las dos direcciones
//  10. Recalcular dos veces la misma carrera -> idempotente
//  11. Guardas: 409 en carrera no corrida, 403 sin admin, 404 a un no-miembro
//
// Aislamiento: cada corrida usa su propia Season (year derivado del runId) y sus propios
// pilotos, asi que NO toca los datos del seed 2026 ni la demo. Se puede correr N veces.
// Fail-fast: si algo no matchea, printea el diff y exit(1).
// Borra sus fixtures al terminar. Con SMOKE_KEEP=1 los deja, para inspeccionarlos.

/* eslint-disable @typescript-eslint/no-explicit-any --
 * Este script consume la API como la consume un cliente real, y las respuestas no estan
 * tipadas de este lado. Castear cada acceso a `unknown` y volver a bajarlo seria mas ruido
 * que valor: lo que verifica que el shape es correcto son los asserts en runtime, que es
 * justamente el punto de un smoke test. En src/ (el codigo de produccion) la regla sigue
 * activa como siempre.
 */

import { prisma } from '../shared/prisma';
import { Prisma } from '../generated/prisma/client';

const API = 'http://localhost:3000/api/v1';
const runId = Date.now();
// Año propio por corrida, fuera del rango real de F1 para que nunca choque con el seed.
const YEAR = 3000 + (runId % 900);

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
function expect(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}: esperaba ${JSON.stringify(expected)}, recibi ${JSON.stringify(actual)}`);
  }
  ok(`${label} = ${JSON.stringify(expected)}`);
}

type Res<T = any> = { status: number; body: T };

async function api<T = any>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<Res<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as T };
}

async function registerUser(suffix: string) {
  const email = `smoke9-${runId}-${suffix}@boxbox.test`;
  await api('POST', '/auth/register', {
    body: { email, password: 'smoke12345', name: `Smoke ${suffix}` },
  });
  const login = await api('POST', '/auth/login', {
    body: { email, password: 'smoke12345' },
  });
  if (login.status !== 200) fail(`No pude loguear a ${suffix}`, login.body);
  return { token: login.body.data.accessToken as string, userId: login.body.data.user.id as number };
}

async function main() {
  console.log(dim(`runId=${runId} · season year=${YEAR}`));

  step('Health check del backend');
  const health = await api('GET', '/health');
  if (health.status !== 200) fail('El backend no responde en :3000. ¿Corriste npm run dev?');
  ok('Backend arriba');

  step('Login del admin del seed');
  const adminLogin = await api('POST', '/auth/login', {
    body: { email: 'admin@boxbox.test', password: 'admin1234' },
  });
  if (adminLogin.status !== 200) fail('No hay admin. ¿Corriste npx prisma db seed?', adminLogin.body);
  const adminToken = adminLogin.body.data.accessToken as string;
  ok('Admin logueado');

  step('Fixtures aislados: temporada propia, 2 escuderias, 4 pilotos');
  // driverCount=4 => maxMembersForSeason = floor(4/2) = 2, justo para los 2 miembros.
  const season = await prisma.season.create({
    data: { year: YEAR, isActive: false, driverCount: 4 },
  });
  const circuit = await prisma.circuit.create({
    data: { name: `Circuito ${runId}`, city: 'Rosario', country: 'AR', externalId: `sm9-c-${runId}` },
  });
  const constructors = await Promise.all(
    ['Alfa', 'Beta'].map((n, i) =>
      prisma.constructor.create({
        data: { name: `${n} ${runId}`, color: '#FF0000', externalId: `sm9-k${i}-${runId}` },
      }),
    ),
  );
  const drivers: { id: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const d = await prisma.driver.create({
      data: {
        firstName: 'Piloto',
        lastName: `P${i}-${runId}`,
        number: 60 + i,
        code: `S${i}${runId % 10}`,
        externalId: `sm9-d${i}-${runId}`,
      },
    });
    await prisma.driverSeason.create({
      data: { driverId: d.id, constructorId: constructors[i % 2].id, seasonId: season.id },
    });
    drivers.push(d);
  }
  ok(`Season ${YEAR} (id=${season.id}), 2 escuderias, 4 pilotos`);

  step('Dos usuarios: uno crea la liga, el otro se une');
  const owner = await registerUser('owner');
  const rival = await registerUser('rival');
  const inviteCode = `sm9${runId}`.slice(0, 20);
  const created = await api('POST', '/leagues', {
    token: owner.token,
    body: { name: `Smoke 9 ${runId}`, inviteCode, seasonId: season.id, maxMembers: 2 },
  });
  if (created.status !== 201) fail('No pude crear la liga', created.body);
  const leagueId = created.body.data.id as number;
  const joined = await api('POST', '/leagues/join', {
    token: rival.token,
    body: { inviteCode },
  });
  if (joined.status !== 201 && joined.status !== 200) fail('El rival no pudo unirse', joined.body);
  ok(`Liga id=${leagueId} con 2 miembros`);

  step('Draft completo: 3 rondas x 2 miembros = 6 picks');
  const start = await api('POST', `/leagues/${leagueId}/draft/start`, { token: owner.token });
  if (start.status !== 200 && start.status !== 201) fail('No arranco el draft', start.body);

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    select: { id: true, userId: true },
  });
  const tokenByMemberId = new Map(
    members.map((m) => [m.id, m.userId === owner.userId ? owner.token : rival.token]),
  );

  for (let i = 0; i < 6; i++) {
    const state = await api('GET', `/leagues/${leagueId}/draft/state`, { token: owner.token });
    const turn = state.body.data.currentTurnLeagueMemberId as number | null;
    if (turn === null) fail(`Turno nulo en el pick ${i + 1}`, state.body.data);
    const available = await api('GET', `/leagues/${leagueId}/draft/available`, {
      token: owner.token,
    });
    const round = state.body.data.round as number;

    // Se eligen EXPLICITAMENTE los pilotos y escuderias de esta corrida, no el primero de la
    // lista. Motivo: getAvailablePicks devuelve el catalogo entero ordenado por apellido, asi
    // que "el primero" son los del seed 2026 (Albon, Alonso...). Con esos, la carga de
    // resultados rebota con DRIVER_NOT_IN_SEASON — correctamente, porque no corren esta
    // temporada. Ver BOX-39: el draft deberia filtrar por temporada y no lo hace.
    const fixtureDriverIds = new Set(drivers.map((d) => d.id));
    const fixtureConstructorIds = new Set(constructors.map((c) => c.id));

    let body: Record<string, number>;
    if (round === 3) {
      // Ronda 3 es constructor (ADR-0006: 3 rondas, sin reserva).
      const pick = (available.body.data.constructors as { id: number }[]).find((c) =>
        fixtureConstructorIds.has(c.id),
      );
      if (!pick) fail('No quedan escuderias de esta corrida disponibles', available.body.data);
      body = { constructorId: pick.id };
    } else {
      const pick = (available.body.data.drivers as { id: number }[]).find((d) =>
        fixtureDriverIds.has(d.id),
      );
      if (!pick) fail('No quedan pilotos de esta corrida disponibles', available.body.data);
      body = { driverId: pick.id };
    }
    const pick = await api('POST', `/leagues/${leagueId}/draft/pick`, {
      token: tokenByMemberId.get(turn),
      body,
    });
    if (pick.status !== 200 && pick.status !== 201) fail(`Fallo el pick ${i + 1}`, pick.body);
  }

  const finalState = await api('GET', `/leagues/${leagueId}/draft/state`, { token: owner.token });
  expect(finalState.body.data.draftStatus, 'COMPLETED', 'draftStatus tras 6 picks');

  const teams = await prisma.fantasyTeam.findMany({
    where: { leagueMember: { leagueId } },
    // `as Prisma.FantasyTeamSelect` por la colision del nombre `constructor` con
    // Object.prototype — ver docs/roadmap.md. Tercera vez que aparece en el proyecto.
    select: {
      leagueMemberId: true,
      driver1Id: true,
      driver2Id: true,
      constructorId: true,
    } as Prisma.FantasyTeamSelect,
    orderBy: { leagueMemberId: 'asc' },
  });
  ok(`Equipos armados: ${teams.map((t) => `${t.driver1Id}/${t.driver2Id}/${t.constructorId}`).join(' · ')}`);

  const draftedDriverIds = teams.flatMap((t) => [t.driver1Id, t.driver2Id]).filter(Boolean) as number[];

  step('Los pilotos drafteados corren la temporada de la liga');
  const inSeason = await prisma.driverSeason.count({
    where: { seasonId: season.id, driverId: { in: draftedDriverIds } },
  });
  if (inSeason < draftedDriverIds.length) {
    console.log(
      `  ${red('!')} ${draftedDriverIds.length - inSeason} de ${draftedDriverIds.length} pilotos drafteados NO corren la temporada ${YEAR}.`,
    );
    console.log(
      dim(
        '    getAvailablePicks (draft.service.ts) no filtra por temporada: ofrece el catalogo\n' +
          '    entero. En una liga de la temporada X se puede draftear a alguien que no corre\n' +
          '    esa temporada, y despues saca cero para siempre sin que nadie avise.\n' +
          '    No rompe este smoke — abajo se cargan resultados para los drafteados — pero es\n' +
          '    un bug real del Slice 5.',
      ),
    );
  } else {
    ok('Todos los drafteados corren la temporada de la liga');
  }

  const [teamA, teamB] = teams as unknown as {
    leagueMemberId: number;
    driver1Id: number;
    driver2Id: number;
    constructorId: number;
  }[];

  // ── Helpers de carrera ────────────────────────────────────────────────
  // Puntos por piloto; el resto de la grilla no corre. Los ConstructorResult los deriva
  // loadResults solo (Slice 8), asi que no hay que mandarlos.
  async function runRace(round: number, pointsByDriverId: Map<number, number>) {
    const race = await prisma.race.create({
      data: {
        name: `GP ${round} (${runId})`,
        round,
        date: new Date(`${YEAR}-0${round}-01T15:00:00Z`),
        lockDate: new Date(`${YEAR}-0${round}-01T13:00:00Z`),
        seasonId: season.id,
        circuitId: circuit.id,
      },
    });
    // Los resultados se cargan para los pilotos que QUEDARON en los equipos, no para los del
    // fixture: el draft no filtra por temporada (ver el chequeo del paso anterior), asi que
    // puede haber elegido pilotos del catalogo que no son los que creamos aca.
    const results = draftedDriverIds.map((driverId, i) => ({
      driverId,
      position: i + 1,
      points: pointsByDriverId.get(driverId) ?? 0,
      status: 'CLASSIFIED' as const,
    }));
    const loaded = await api('POST', `/races/${race.id}/results`, {
      token: adminToken,
      body: { results },
    });
    if (loaded.status !== 200 && loaded.status !== 201) {
      fail(`No pude cargar los resultados de la fecha ${round}`, loaded.body);
    }
    return race.id;
  }

  async function standingsOf(token: string, raceId?: number) {
    const res = await api('GET', `/leagues/${leagueId}/standings${raceId ? `?raceId=${raceId}` : ''}`, {
      token,
    });
    if (res.status !== 200) fail('GET standings no devolvio 200', res.body);
    return res.body.data.standings as {
      leagueMemberId: number;
      driverPoints: number;
      constructorPoints: number;
      totalPoints: number;
      position: number;
      positionChange: number;
    }[];
  }

  // ── Fecha 1 ───────────────────────────────────────────────────────────
  step('Fecha 1: cargar resultados y recalcular standings');
  // A saca poco en la fecha 1 y B gana la 2. Asimetrico A PROPOSITO: con el mismo puntaje en
  // las dos fechas los totales empatan y el positionChange se queda en cero, que es como
  // quedo la primera version de este script — verde sin haber probado lo que importa.
  const race1 = await runRace(1, new Map([[teamA.driver1Id, 10]]));
  const recalc1 = await api('POST', `/races/${race1}/recalculate`, { token: adminToken });
  if (recalc1.status !== 200) fail('recalculate fecha 1 fallo', recalc1.body);
  expect(recalc1.body.data.standings, 2, 'standings generados');

  step('Verificar la aritmetica, no solo el 200');
  const t1 = await standingsOf(owner.token);
  const a1 = t1.find((s) => s.leagueMemberId === teamA.leagueMemberId)!;
  const b1 = t1.find((s) => s.leagueMemberId === teamB.leagueMemberId)!;
  // A: 25 de su piloto + los del constructor que le toco. B: lo que le quede.
  console.log(dim(`    A: ${a1.driverPoints}+${a1.constructorPoints}=${a1.totalPoints} (pos ${a1.position})`));
  console.log(dim(`    B: ${b1.driverPoints}+${b1.constructorPoints}=${b1.totalPoints} (pos ${b1.position})`));
  expect(a1.driverPoints, 10, 'A driverPoints');
  expect(a1.totalPoints, a1.driverPoints + a1.constructorPoints, 'A totalPoints = suma de partes');
  expect(a1.position, 1, 'A position');
  expect(b1.position, 2, 'B position');
  expect(a1.positionChange, 0, 'positionChange en la primera fecha');

  // ── Fecha 2 ───────────────────────────────────────────────────────────
  step('Fecha 2 al reves: B saca 25, A saca 0');
  const race2 = await runRace(2, new Map([[teamB.driver1Id, 25]]));
  const recalc2 = await api('POST', `/races/${race2}/recalculate`, { token: adminToken });
  if (recalc2.status !== 200) fail('recalculate fecha 2 fallo', recalc2.body);

  step('Los puntos ACUMULAN, no se reemplazan');
  const t2 = await standingsOf(owner.token);
  const a2 = t2.find((s) => s.leagueMemberId === teamA.leagueMemberId)!;
  const b2 = t2.find((s) => s.leagueMemberId === teamB.leagueMemberId)!;
  console.log(dim(`    A: ${a2.totalPoints} (era ${a1.totalPoints}) · B: ${b2.totalPoints} (era ${b1.totalPoints})`));
  if (a2.totalPoints < a1.totalPoints) {
    fail(`A perdio puntos entre fechas: ${a1.totalPoints} -> ${a2.totalPoints}. El standing no acumula.`);
  }
  ok('Nadie perdio puntos entre fechas');
  expect(b2.driverPoints, 25, 'B driverPoints acumulado');

  step('positionChange en las dos direcciones');
  console.log(dim(`    A: pos ${a1.position}->${a2.position} (change ${a2.positionChange}) · B: pos ${b1.position}->${b2.position} (change ${b2.positionChange})`));
  // El fixture esta armado para que B pase a A (20 contra 50), asi que las posiciones TIENEN
  // que darse vuelta. Si no lo hacen, o el scoring esta mal o alguien toco los puntajes de
  // arriba y dejo el test sin filo.
  if (a2.position === a1.position) {
    fail(
      `Las posiciones no se movieron (A sigue ${a1.position}, B sigue ${b1.position}). ` +
        `Con ${a2.totalPoints} contra ${b2.totalPoints} deberian haberse dado vuelta.`,
    );
  }
  expect(a2.positionChange, a1.position - a2.position, 'A positionChange (negativo = bajo)');
  expect(b2.positionChange, b1.position - b2.position, 'B positionChange (positivo = subio)');
  expect(b2.position, 1, 'B quedo primero');

  // ── Guardas ───────────────────────────────────────────────────────────
  step('Idempotencia: recalcular dos veces no duplica');
  await api('POST', `/races/${race2}/recalculate`, { token: adminToken });
  const count = await prisma.leagueStanding.count({
    where: { raceId: race2, leagueMember: { leagueId } },
  });
  expect(count, 2, 'filas tras recalcular dos veces');

  step('409 en una carrera que todavia no se corrio');
  const future = await prisma.race.create({
    data: {
      name: `GP futuro ${runId}`,
      round: 9,
      date: new Date(`${YEAR}-09-01T15:00:00Z`),
      lockDate: new Date(`${YEAR}-09-01T13:00:00Z`),
      seasonId: season.id,
      circuitId: circuit.id,
    },
  });
  const notRun = await api('POST', `/races/${future.id}/recalculate`, { token: adminToken });
  expect(notRun.status, 409, 'status');
  expect(notRun.body.error.code, 'RACE_NOT_COMPLETED', 'codigo de error');

  step('403 si no sos admin');
  const asUser = await api('POST', `/races/${race1}/recalculate`, { token: owner.token });
  expect(asUser.status, 403, 'status');
  expect(asUser.body.error.code, 'ADMIN_REQUIRED', 'codigo de error');

  step('404 para quien no es miembro de la liga (anti-enumeracion)');
  const intruso = await registerUser('intruso');
  const denied = await api('GET', `/leagues/${leagueId}/standings`, { token: intruso.token });
  expect(denied.status, 404, 'status');

  step('400 en ?raceId=abc, no 500');
  const badQuery = await api('GET', `/leagues/${leagueId}/standings?raceId=abc`, {
    token: owner.token,
  });
  expect(badQuery.status, 400, 'status');
  expect(badQuery.body.error.code, 'VALIDATION_ERROR', 'codigo de error');

  console.log(`\n${green('Slice 9 OK')} ${dim(`— liga ${leagueId}, temporada ${YEAR}`)}`);

  // Limpieza POR DEFECTO. Arranco al reves —opt-in con SMOKE_CLEANUP=1— y en cinco corridas
  // la DB de desarrollo junto 20 pilotos inventados, que aparecian en /drivers al lado de los
  // 22 reales. El default tiene que ser el seguro; quien quiera inspeccionar los fixtures que
  // lo pida a mano.
  if (process.env.SMOKE_KEEP !== '1') {
    step('Limpieza de fixtures');
    await prisma.leagueStanding.deleteMany({ where: { leagueMember: { leagueId } } });
    await prisma.draftPick.deleteMany({ where: { leagueId } });
    await prisma.fantasyTeam.deleteMany({ where: { leagueMember: { leagueId } } });
    await prisma.leagueMember.deleteMany({ where: { leagueId } });
    await prisma.league.deleteMany({ where: { id: leagueId } });
    await prisma.constructorResult.deleteMany({ where: { race: { seasonId: season.id } } });
    await prisma.raceResult.deleteMany({ where: { race: { seasonId: season.id } } });
    await prisma.race.deleteMany({ where: { seasonId: season.id } });
    await prisma.driverSeason.deleteMany({ where: { seasonId: season.id } });
    await prisma.driver.deleteMany({ where: { id: { in: drivers.map((d) => d.id) } } });
    await prisma.constructor.deleteMany({ where: { id: { in: constructors.map((c) => c.id) } } });
    await prisma.circuit.deleteMany({ where: { id: circuit.id } });
    await prisma.season.deleteMany({ where: { id: season.id } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `smoke9-${runId}-` } } });
    ok('Fixtures borrados');
  } else {
    console.log(dim('    (SMOKE_KEEP=1: los fixtures quedan en la DB para inspeccionarlos)'));
  }
}

main()
  .catch((err) => {
    console.error(red('\nEl smoke exploto:'), err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
