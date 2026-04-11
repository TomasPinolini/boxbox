import { Request, Response, NextFunction } from 'express';
import * as constructorsService from './constructors.service';

export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const constructors = await constructorsService.findAll();
    res.json({ data: constructors });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const constructor = await constructorsService.findById(Number(req.params.id));
    res.json({ data: constructor });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const constructor = await constructorsService.create(req.body);
    res.status(201).json({ data: constructor });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const constructor = await constructorsService.update(Number(req.params.id), req.body);
    res.json({ data: constructor });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await constructorsService.softDelete(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
