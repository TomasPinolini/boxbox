import { Request, Response, NextFunction } from 'express';
import { RaceStatus } from '../../generated/prisma/enums';
import * as racesService from './races.service';

// Un ?status invalido se ignora en vez de dar 400. No usar `raw in RaceStatus`: `in` tambien
// matchea keys heredadas (?status=toString) y Prisma terminaria en un 500.
function parseRaceStatusQuery(raw: unknown): RaceStatus | undefined {
  if (typeof raw !== 'string') return undefined;
  return (Object.values(RaceStatus) as string[]).includes(raw) ? (raw as RaceStatus) : undefined;
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : undefined;
    const status = parseRaceStatusQuery(req.query.status);
    const races = await racesService.findAll(seasonId, status);
    res.json({ data: races });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const race = await racesService.findById(Number(req.params.id));
    res.json({ data: race });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const race = await racesService.create(req.body);
    res.status(201).json({ data: race });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const race = await racesService.update(Number(req.params.id), req.body);
    res.json({ data: race });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await racesService.remove(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function loadResults(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await racesService.loadResults(Number(req.params.id), req.body);
    res.status(201).json({ data: results });
  } catch (err) {
    next(err);
  }
}

export async function getResults(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await racesService.getResults(Number(req.params.id));
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}
