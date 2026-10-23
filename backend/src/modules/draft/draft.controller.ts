// leagueId sale de req.leagueMember y no de req.params: asi el sub-router no depende de
// mergeParams. Los notify* avisan por socket a la liga lo que se hizo por REST.

import { Request, Response } from 'express';
import * as draftService from './draft.service';
import { notifyDraftStarted, notifyDraftReset, notifyPick } from './draft.gateway';

export async function start(req: Request, res: Response) {
  const leagueId = req.leagueMember!.leagueId;
  const result = await draftService.startDraft(leagueId);
  notifyDraftStarted(leagueId);
  res.status(201).json({ data: result });
}

export async function getState(req: Request, res: Response) {
  const state = await draftService.getDraftState(req.leagueMember!.leagueId);
  res.json({ data: state });
}

export async function getAvailable(req: Request, res: Response) {
  const available = await draftService.getAvailablePicks(req.leagueMember!.leagueId);
  res.json({ data: available });
}

export async function pick(req: Request, res: Response) {
  const leagueId = req.leagueMember!.leagueId;
  const result = await draftService.submitPick(leagueId, req.leagueMember!.id, req.body);
  notifyPick(leagueId);
  res.json({ data: result });
}

export async function reset(req: Request, res: Response) {
  const leagueId = req.leagueMember!.leagueId;
  const result = await draftService.resetDraft(leagueId);
  notifyDraftReset(leagueId);
  res.json({ data: result });
}
