import { Request, Response, NextFunction } from 'express';
import * as racesService from './races.service';

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : undefined;
    const status = req.query.status as string | undefined;
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
