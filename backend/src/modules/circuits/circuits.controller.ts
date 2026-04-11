import { Request, Response, NextFunction } from 'express';
import * as circuitsService from './circuits.service';

export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const circuits = await circuitsService.findAll();
    res.json({ data: circuits });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const circuit = await circuitsService.findById(Number(req.params.id));
    res.json({ data: circuit });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const circuit = await circuitsService.create(req.body);
    res.status(201).json({ data: circuit });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const circuit = await circuitsService.update(Number(req.params.id), req.body);
    res.json({ data: circuit });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await circuitsService.softDelete(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
