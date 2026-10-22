import { Request, Response, NextFunction } from 'express';
import * as leaguesService from './leagues.service';
import { getIo } from '../../shared/socket';
import { announceLeagueArchived } from '../draft/draft.gateway';

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
    const league = await leaguesService.getLeagueById(Number(req.params.id));
    res.json({ data: league });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const league = await leaguesService.updateLeague(Number(req.params.id), req.body);
    // Archivar con un draft en vivo saca a los jugadores de la pantalla del draft.
    // getIo() es null en los tests con supertest, asi que ahi no hace nada.
    if (league.status === 'ARCHIVED') {
      const io = getIo();
      if (io) {
        announceLeagueArchived(io, league.id);
      }
    }
    res.json({ data: league });
  } catch (err) {
    next(err);
  }
}

export async function join(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await leaguesService.joinLeague(req.body.inviteCode, req.user!.userId);
    res.status(201).json({ data: member });
  } catch (err) {
    next(err);
  }
}

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

export async function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await leaguesService.listMembers(Number(req.params.id));
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
}

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

export async function getMyFantasyTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await leaguesService.getMyFantasyTeam(req.leagueMember!.id);
    res.json({ data: team });
  } catch (err) {
    next(err);
  }
}
