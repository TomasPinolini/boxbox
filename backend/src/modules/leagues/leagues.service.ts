// SERVICE — toda la logica de leagues vive aca.
// No sabe que existe HTTP: nunca toca req/res/next. Recibe datos parsed (post Zod) y userId
// extraido del JWT por el controller. Comunica errores tirando AppError subclasses; el
// controller los pasa al errorHandler.
//
// Slice 3 cambios principales:
//   - createLeague ahora hace nested write atomico: crea League + LeagueMember(isOwner=true)
//     en una sola transaccion implicita. Si la creacion del member falla, la liga tampoco se crea.
//   - listLeagues filtra por membership ACTIVE en lugar de createdById. Como el creator es
//     ahora auto-member, las leagues que cree TAMBIEN aparecen aca.
//   - getLeagueById/updateLeague YA NO hacen ownership check inline. Eso vive en
//     middleware requireLeagueMember/requireLeagueOwner (P2-1 unification 404 vs 403).
//   - Nuevas funciones: joinLeague, leaveLeague, listMembers, kickMember.
//
// Slice 4 cambios:
//   - createLeague y joinLeague ahora crean el FantasyTeam del member atomicamente (nested
//     write dentro del create del LeagueMember). Todos los slots arrancan null.
//   - Rejoin (branch `update` del upsert en joinLeague) NO recrea el FantasyTeam — el que
//     ya existe de la membership original se mantiene (preserva picks si el draft ya corrio).
//   - Nueva funcion: getMyFantasyTeam.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { NotFoundError, ConflictError } from '../../shared/errors';
import type { CreateLeagueInput, UpdateLeagueInput } from './leagues.schema';

// leagueSelect — campos que devolvemos al cliente.
const leagueSelect = {
  id: true,
  name: true,
  inviteCode: true,
  maxMembers: true,
  seasonId: true,
  createdById: true,
  draftStatus: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

// memberSelect — shape de LeagueMember en responses publicas (GET /:id/members).
const memberSelect = {
  id: true,
  userId: true,
  isOwner: true,
  status: true,
  joinedAt: true,
} as const;

// fantasyTeamSelect — shape de FantasyTeam en responses publicas (GET /:id/teams/me).
// `as Prisma.FantasyTeamSelect` (type assertion, NO `: Prisma.FantasyTeamSelect` anotacion ni
// `as const`): FantasyTeam tiene una relacion llamada literalmente `constructor` (FK a
// Constructor), que colisiona con la propiedad `constructor` que TODO objeto JS hereda de
// Object.prototype. Tanto `as const` como una anotacion directa (`: Prisma.FantasyTeamSelect`)
// hacen que TS compare estructuralmente el literal contra el select type y arrastre un
// `constructor: Function` heredado que no es real (a runtime esto siempre funciono bien) —
// tira TS2322. Una type ASSERTION (`as`, no `satisfies`) es el unico approach que evita el
// falso positivo (confirmado empiricamente contra este mismo generated client).
const fantasyTeamSelect = {
  id: true,
  leagueMemberId: true,
  driver1Id: true,
  driver2Id: true,
  reserveDriverId: true,
  constructorId: true,
  createdAt: true,
} as Prisma.FantasyTeamSelect;

export async function createLeague(data: CreateLeagueInput, userId: number) {
  // Nested write atomico: Prisma crea League + LeagueMember en una sola transaccion.
  // Si la insert del member falla (raro — userId viene del JWT validado), la liga tampoco
  // se crea. Eso preserva la invariante de dominio "toda liga tiene exactamente 1 owner".
  try {
    const league = await prisma.league.create({
      data: {
        name: data.name,
        inviteCode: data.inviteCode,
        seasonId: data.seasonId,
        maxMembers: data.maxMembers ?? 11,
        createdById: userId,
        members: {
          // Slice 4: nested create de dos niveles — League → LeagueMember → FantasyTeam,
          // todo en la misma transaccion implicita de Prisma. Si algo falla en el medio,
          // nada se crea.
          create: {
            userId,
            isOwner: true,
            status: 'ACTIVE',
            fantasyTeam: { create: {} },
          },
        },
      },
      select: leagueSelect,
    });
    return league;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new ConflictError(
          'A league with this invite code already exists',
          'INVITE_CODE_TAKEN',
        );
      }
      if (err.code === 'P2003') {
        throw new NotFoundError('Season');
      }
    }
    throw err;
  }
}

export async function listLeagues(userId: number) {
  // Slice 3 cambio: filtra por membership ACTIVE en vez de createdById.
  // El creator ahora aparece auto-como member (Step 8a), asi que las ligas creadas por mi
  // siguen apareciendo. Pero ahora TAMBIEN aparecen las que junte por inviteCode.
  return prisma.league.findMany({
    where: {
      members: { some: { userId, status: 'ACTIVE' } },
    },
    select: leagueSelect,
    orderBy: { createdAt: 'desc' },
  });
}

// getLeagueById: ya NO chequea ownership. requireLeagueMember (middleware) ya garantizo
// que el caller es ACTIVE member. El service solo fetchea y devuelve.
export async function getLeagueById(id: number) {
  const league = await prisma.league.findUnique({ where: { id }, select: leagueSelect });
  if (!league) {
    // Defense in depth: si middleware fallo o se omitio en una ruta nueva, esto sigue protegiendo.
    // En la practica requireLeagueMember nunca deja llegar aca con id invalido.
    throw new NotFoundError('League');
  }
  return league;
}

// updateLeague: ya NO chequea ownership. requireLeagueOwner (middleware) ya garantizo isOwner.
export async function updateLeague(id: number, data: UpdateLeagueInput) {
  try {
    return await prisma.league.update({ where: { id }, data, select: leagueSelect });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError(
        'A league with this invite code already exists',
        'INVITE_CODE_TAKEN',
      );
    }
    throw err;
  }
}

// ─── Slice 3: nuevas funciones ────────────────────────────────────────

// joinLeague: lookup por inviteCode lowercase. Lleva 3 checks antes de mutar:
//   1. League existe + status ACTIVE (no archived/cancelled).
//   2. Hay cupo (count(ACTIVE) < maxMembers).
//   3. Yo no soy ya ACTIVE member.
// Rejoin (LEFT/KICKED → ACTIVE) usa upsert: si hay row, update; si no, create.
// Decision consciente: tanto LEFT como KICKED pueden rejoinear. KICKED queda como audit trail.
export async function joinLeague(inviteCode: string, userId: number) {
  const league = await prisma.league.findUnique({ where: { inviteCode } });
  if (!league || league.status !== 'ACTIVE') {
    // Unificamos archived + nonexistent en el mismo error: el cliente externo no debe
    // poder distinguir "esta liga existe pero archived" vs "este codigo no existe".
    // Resource con underscore para que NotFoundError genere 'INVITE_CODE_NOT_FOUND' limpio
// (sin underscore producia 'INVITE CODE_NOT_FOUND' con espacio).
throw new NotFoundError('Invite_code');
  }

  // Capacity check ANTES de upsert. Si maxMembers=11 y ya hay 11 ACTIVE, rechazar.
  const activeCount = await prisma.leagueMember.count({
    where: { leagueId: league.id, status: 'ACTIVE' },
  });
  if (activeCount >= league.maxMembers) {
    throw new ConflictError('League is at capacity', 'LEAGUE_FULL');
  }

  // Existing row check: si ya soy ACTIVE, 409 limpio (no no-op silencioso).
  const existing = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId } },
  });
  if (existing && existing.status === 'ACTIVE') {
    throw new ConflictError('You are already a member of this league', 'ALREADY_MEMBER');
  }

  // Upsert: rejoin (update LEFT/KICKED → ACTIVE) o new member.
  // El @@unique(leagueId, userId) hace este upsert atomico — si una race condition mete
  // un insert al mismo tiempo, uno de los dos pierde con P2002 (que Prisma maneja
  // internamente en upsert haciendo update).
  //
  // Slice 4: el branch `create` arma el FantasyTeam nested (mismo shape que createLeague).
  // El branch `update` (rejoin) deliberadamente NO toca fantasyTeam — ya existe desde el
  // join original y @@unique([leagueMemberId]) no permite un segundo. Si el draft ya corrio
  // antes de que este member se fuera, el rejoin conserva sus picks.
  const member = await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId } },
    update: { status: 'ACTIVE', joinedAt: new Date() },
    create: {
      leagueId: league.id,
      userId,
      isOwner: false,
      status: 'ACTIVE',
      fantasyTeam: { create: {} },
    },
    select: memberSelect,
  });
  return member;
}

// leaveLeague: soft transition a LEFT. Owner no puede leave (per roadmap: debe transferir
// ownership antes — fuera de scope de Slice 3).
export async function leaveLeague(leagueId: number, userId: number, isOwner: boolean) {
  if (isOwner) {
    throw new ConflictError(
      'Owner cannot leave the league. Transfer ownership first.',
      'OWNER_CANNOT_LEAVE',
    );
  }
  // Update directo. requireLeagueMember ya garantizo que el row existe y esta ACTIVE.
  return prisma.leagueMember.update({
    where: { leagueId_userId: { leagueId, userId } },
    data: { status: 'LEFT' },
    select: memberSelect,
  });
}

// listMembers: solo ACTIVE. LEFT/KICKED se mantienen en DB para audit pero no aparecen
// en el roster actual de la liga. orderBy: joinedAt asc para que el owner aparezca primero
// (creado en el mismo timestamp que la liga, antes que cualquier join).
export async function listMembers(leagueId: number) {
  return prisma.leagueMember.findMany({
    where: { leagueId, status: 'ACTIVE' },
    select: memberSelect,
    orderBy: { joinedAt: 'asc' },
  });
}

// kickMember: solo owner llama esto (enforced en middleware). Soft transition a KICKED.
// Owner no puede kickearse a si mismo — usaria leave (que tambien le falla con OWNER_CANNOT_LEAVE).
// Si el target no es ACTIVE member (ya LEFT/KICKED o nunca fue), 404.
export async function kickMember(leagueId: number, kickedUserId: number, ownerUserId: number) {
  if (kickedUserId === ownerUserId) {
    throw new ConflictError(
      'Owner cannot kick themselves. Transfer ownership first.',
      'OWNER_CANNOT_LEAVE',
    );
  }

  const target = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: kickedUserId } },
  });
  if (!target || target.status !== 'ACTIVE') {
    throw new NotFoundError('Member');
  }

  return prisma.leagueMember.update({
    where: { leagueId_userId: { leagueId, userId: kickedUserId } },
    data: { status: 'KICKED' },
    select: memberSelect,
  });
}

// ─── Slice 4: FantasyTeam ─────────────────────────────────────────────

// getMyFantasyTeam: requireLeagueMember ya corrio y dejo el LeagueMember en req.leagueMember,
// asi que el controller nos pasa directo su id — sin query extra a LeagueMember aca.
// El FantasyTeam se crea atomicamente junto al LeagueMember (createLeague / joinLeague), asi
// que en la practica este lookup siempre resuelve. El NotFoundError es defense in depth,
// mismo criterio que getLeagueById.
export async function getMyFantasyTeam(leagueMemberId: number) {
  const team = await prisma.fantasyTeam.findUnique({
    where: { leagueMemberId },
    select: fantasyTeamSelect,
  });
  if (!team) {
    throw new NotFoundError('Fantasy_team');
  }
  return team;
}
