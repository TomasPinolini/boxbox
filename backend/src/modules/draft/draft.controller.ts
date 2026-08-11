// CONTROLLER — traductor HTTP. Convierte requests en llamadas al service.
// leagueId sale de req.leagueMember!.leagueId (poblado por requireLeagueMember en el mount
// de leagues.routes.ts) en vez de req.params.id — evita depender de mergeParams en el
// sub-router y de paso evita una segunda fuente de verdad para el mismo dato.

import { Request, Response, NextFunction } from 'express';
import * as draftService from './draft.service';

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await draftService.startDraft(req.leagueMember!.leagueId);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getState(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await draftService.getDraftState(req.leagueMember!.leagueId);
    res.json({ data: state });
  } catch (err) {
    next(err);
  }
}

export async function getAvailable(req: Request, res: Response, next: NextFunction) {
  try {
    const available = await draftService.getAvailablePicks(req.leagueMember!.leagueId);
    res.json({ data: available });
  } catch (err) {
    next(err);
  }
}

export async function pick(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await draftService.submitPick(
      req.leagueMember!.leagueId,
      req.leagueMember!.id,
      req.body,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function reset(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await draftService.resetDraft(req.leagueMember!.leagueId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
