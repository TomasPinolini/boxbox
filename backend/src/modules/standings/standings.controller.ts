import { Request, Response } from 'express';
import * as standingsService from './standings.service';
import type { StandingsQuery } from './standings.schema';

// POST /races/:id/recalculate — montado desde races.routes.ts (admin).
export async function recalculate(req: Request, res: Response) {
  const result = await standingsService.recalculate(Number(req.params.id));
  res.json({ data: result });
}

// El leagueId sale de req.leagueMember y no de req.params: el sub-router no tiene mergeParams.
export async function getByLeague(req: Request, res: Response) {
  const { raceId } = (req.validatedQuery ?? {}) as StandingsQuery;
  const result = await standingsService.findByLeague(req.leagueMember!.leagueId, raceId);
  res.json({ data: result });
}
