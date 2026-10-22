import { Request, Response } from 'express';
import * as syncService from './sync.service';
import type { SyncRacesQuery, SyncResultsQuery } from './sync.schema';

export async function syncRaces(req: Request, res: Response) {
  const { year } = req.validatedQuery as SyncRacesQuery;
  const result = await syncService.syncRaces(year, req.user!.userId);
  res.json({ data: result });
}

export async function syncResults(req: Request, res: Response) {
  const { dryRun } = req.validatedQuery as SyncResultsQuery;
  const result = await syncService.syncResults(Number(req.params.id), req.user!.userId, dryRun);
  // 201 solo cuando realmente se crearon RaceResults, igual que POST /races/:id/results.
  res.status(dryRun ? 200 : 201).json({ data: result });
}
