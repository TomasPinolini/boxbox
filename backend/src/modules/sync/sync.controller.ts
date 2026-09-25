// CONTROLLER — el traductor HTTP

import { Request, Response, NextFunction } from 'express';
import * as syncService from './sync.service';
import type { SyncRacesQuery, SyncResultsQuery } from './sync.schema';

// POST /admin/sync/races?year=2026
export async function syncRaces(req: Request, res: Response, next: NextFunction) {
  try {
    const { year } = req.validatedQuery as SyncRacesQuery;
    const result = await syncService.syncRaces(year, req.user!.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

// POST /admin/sync/races/:id/results[?dryRun=true]
export async function syncResults(req: Request, res: Response, next: NextFunction) {
  try {
    const { dryRun } = req.validatedQuery as SyncResultsQuery;
    const result = await syncService.syncResults(Number(req.params.id), req.user!.userId, dryRun);
    // 201 solo cuando realmente se crearon RaceResults, igual que POST /races/:id/results.
    res.status(dryRun ? 200 : 201).json({ data: result });
  } catch (err) {
    next(err);
  }
}
