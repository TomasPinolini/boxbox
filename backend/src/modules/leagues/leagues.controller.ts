// CONTROLLER — traductor HTTP. Convierte requests en llamadas al service y respuestas
// del service en JSON. No tiene logica de negocio, no toca Prisma.
//
// Slice 3 cambios:
//   - getById / update ya no pasan userId al service (ownership check vivio a middleware).
//   - 4 handlers nuevos: join, leave, listMembers, kickMember.
//   - req.user!.userId sigue siendo el non-null assertion seguro porque requireAuth corre antes.
//   - req.leagueMember!.isOwner se lee en leave para pasarle al service el isOwner del caller.

import { Request, Response, NextFunction } from 'express';
import * as leaguesService from './leagues.service';

// ─── Endpoints Slice 2 (cableados con firmas nuevas del service) ────

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const league = await leaguesService.createLeague(req.body, req.user!.userId);
    res.status(201).json({ data: league });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const leagues = await leaguesService.listLeagues(req.user!.userId);
    res.json({ data: leagues });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    // Number(req.params.id) — validateParams ya coercio a number, esto es redundante pero
    // type-safe (req.params es Record<string, string> en el typing de Express).
    const league = await leaguesService.getLeagueById(Number(req.params.id));
    res.json({ data: league });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const league = await leaguesService.updateLeague(Number(req.params.id), req.body);
    res.json({ data: league });
  } catch (err) {
    next(err);
  }
}

// ─── Endpoints Slice 3 nuevos ───────────────────────────────────────

// POST /leagues/join — body { inviteCode }
export async function join(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await leaguesService.joinLeague(req.body.inviteCode, req.user!.userId);
    res.status(201).json({ data: member });
  } catch (err) {
    next(err);
  }
}

// POST /leagues/:id/leave — el isOwner viene del leagueMember que poblo requireLeagueMember.
export async function leave(req: Request, res: Response, next: NextFunction) {
  try {
    const leagueId = Number(req.params.id);
    const userId = req.user!.userId;
    const isOwner = req.leagueMember!.isOwner;
    const member = await leaguesService.leaveLeague(leagueId, userId, isOwner);
    res.json({ data: member });
  } catch (err) {
    next(err);
  }
}

// GET /leagues/:id/members — solo retorna ACTIVE members.
export async function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await leaguesService.listMembers(Number(req.params.id));
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
}

// DELETE /leagues/:id/members/:userId — owner-only (enforced en middleware).
export async function kickMember(req: Request, res: Response, next: NextFunction) {
  try {
    const leagueId = Number(req.params.id);
    const kickedUserId = Number(req.params.userId);
    const ownerUserId = req.user!.userId;
    const member = await leaguesService.kickMember(leagueId, kickedUserId, ownerUserId);
    res.json({ data: member });
  } catch (err) {
    next(err);
  }
}

// ─── Endpoint Slice 4 nuevo ───────────────────────────────────────────

// GET /leagues/:id/teams/me — mi FantasyTeam en esta liga. req.leagueMember.id viene de
// requireLeagueMember (ya corrio antes en la chain), evita un segundo lookup a LeagueMember.
export async function getMyFantasyTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await leaguesService.getMyFantasyTeam(req.leagueMember!.id);
    res.json({ data: team });
  } catch (err) {
    next(err);
  }
}
