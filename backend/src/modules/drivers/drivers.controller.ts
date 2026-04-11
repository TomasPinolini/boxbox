import { Request, Response, NextFunction } from 'express';
import * as driversService from './drivers.service';

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const constructorId = req.query.constructorId ? Number(req.query.constructorId) : undefined;
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : undefined;
    const drivers = await driversService.findAll(constructorId, seasonId);
    res.json({ data: drivers });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await driversService.findById(Number(req.params.id));
    res.json({ data: driver });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await driversService.create(req.body);
    res.status(201).json({ data: driver });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await driversService.update(Number(req.params.id), req.body);
    res.json({ data: driver });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await driversService.softDelete(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
