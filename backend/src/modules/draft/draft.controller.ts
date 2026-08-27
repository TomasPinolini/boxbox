// CONTROLLER — traductor HTTP. Convierte requests en llamadas al service.
// leagueId sale de req.leagueMember!.leagueId (poblado por requireLeagueMember en el mount
// de leagues.routes.ts) en vez de req.params.id — evita depender de mergeParams en el
// sub-router y de paso evita una segunda fuente de verdad para el mismo dato.
//
// Slice 6: despues de start/pick/reset exitosos, si hay un Server de Socket.io activo
// (getIo() — null en tests que importan `app` directo, o en un boot sin server.ts), este
// controller dispara los mismos broadcasts que dispara el gateway cuando la accion llega por
// socket. Sin esto, un pick hecho por REST dejaria a los clientes conectados por WS con
// estado viejo — Slice 6 es un overlay sobre Slice 5, tiene que reflejar TODAS las vias.

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
      // .catch obligatorio: es fire-and-forget (no bloqueamos la respuesta HTTP), y una promesa
      // rechazada sin catch termina el proceso de Node entero (B1 / BOX-16).
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
