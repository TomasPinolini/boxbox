// leagueId sale de req.leagueMember y no de req.params: asi el sub-router no depende de
// mergeParams. Los broadcasts replican los del gateway para que los clientes por socket se
// enteren de lo hecho por REST; getIo() es null en los tests con supertest.

import { Request, Response, NextFunction } from 'express';
import * as draftService from './draft.service';
import { getIo } from '../../shared/socket';
import { announceDraftStarted, announceDraftReset, broadcastPickResult } from './draft.gateway';

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const leagueId = req.leagueMember!.leagueId;
    const result = await draftService.startDraft(leagueId);
    const io = getIo();
    if (io) {
      // .catch obligatorio: es fire-and-forget, y un rechazo sin catch termina el proceso.
      void announceDraftStarted(io, leagueId).catch((err) =>
        console.error('[draft] announceDraftStarted fallo', err),
      );
    }
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
    const leagueId = req.leagueMember!.leagueId;
    const result = await draftService.submitPick(leagueId, req.leagueMember!.id, req.body);
    const io = getIo();
    if (io) {
      void broadcastPickResult(io, leagueId).catch((err) =>
        console.error('[draft] broadcastPickResult fallo', err),
      );
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function reset(req: Request, res: Response, next: NextFunction) {
  try {
    const leagueId = req.leagueMember!.leagueId;
    const result = await draftService.resetDraft(leagueId);
    const io = getIo();
    if (io) {
      void announceDraftReset(io, leagueId).catch((err) =>
        console.error('[draft] announceDraftReset fallo', err),
      );
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
