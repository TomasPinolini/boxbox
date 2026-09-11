// CONTROLLER — el traductor HTTP
// Ojo con el origen de los ids: son dos endpoints montados desde DOS padres distintos.

import { Request, Response, NextFunction } from 'express';
import * as standingsService from './standings.service';
import type { StandingsQuery } from './standings.schema';

// POST /races/:id/recalculate — montado desde races.routes.ts (admin).
export async function recalculate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await standingsService.recalculate(Number(req.params.id));
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

// GET /leagues/:id/standings — montado como sub-router desde leagues.routes.ts.
// El leagueId sale de req.leagueMember, que popula requireLeagueMember en el mount, y NO de
// req.params.id: el sub-router no tiene mergeParams. Mismo criterio que draft.controller.ts.
export async function getByLeague(req: Request, res: Response, next: NextFunction) {
  try {
    const { raceId } = (req.validatedQuery ?? {}) as StandingsQuery;
    const result = await standingsService.findByLeague(req.leagueMember!.leagueId, raceId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
