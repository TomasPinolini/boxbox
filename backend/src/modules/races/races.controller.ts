import { Request, Response } from 'express';
import * as racesService from './races.service';
import type { ListRacesQuery } from './races.schema';

export async function getAll(req: Request, res: Response) {
  const { seasonId, status } = (req.validatedQuery ?? {}) as ListRacesQuery;
  const races = await racesService.findAll(seasonId, status);
  res.json({ data: races });
}

export async function getById(req: Request, res: Response) {
  const race = await racesService.findById(Number(req.params.id));
  res.json({ data: race });
}

export async function create(req: Request, res: Response) {
  const race = await racesService.create(req.body);
  res.status(201).json({ data: race });
}

export async function update(req: Request, res: Response) {
  const race = await racesService.update(Number(req.params.id), req.body);
  res.json({ data: race });
}

export async function remove(req: Request, res: Response) {
  await racesService.remove(Number(req.params.id));
  res.status(204).send();
}

export async function loadResults(req: Request, res: Response) {
  const results = await racesService.loadResults(Number(req.params.id), req.body);
  res.status(201).json({ data: results });
}

export async function getResults(req: Request, res: Response) {
  const results = await racesService.getResults(Number(req.params.id));
  res.json({ data: results });
}
