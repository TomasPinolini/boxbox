import { Request, Response } from 'express';
import * as seasonsService from './seasons.service';

export async function getAll(_req: Request, res: Response) {
  const seasons = await seasonsService.findAll();
  res.json({ data: seasons });
}

export async function getActive(_req: Request, res: Response) {
  const season = await seasonsService.findActive();
  res.json({ data: season });
}

export async function create(req: Request, res: Response) {
  const season = await seasonsService.create(req.body);
  res.status(201).json({ data: season });
}

export async function update(req: Request, res: Response) {
  const season = await seasonsService.update(Number(req.params.id), req.body);
  res.json({ data: season });
}

export async function activate(req: Request, res: Response) {
  await seasonsService.activate(Number(req.params.id));
  const season = await seasonsService.findById(Number(req.params.id));
  res.json({ data: season });
}

export async function remove(req: Request, res: Response) {
  await seasonsService.remove(Number(req.params.id));
  res.status(204).send();
}
