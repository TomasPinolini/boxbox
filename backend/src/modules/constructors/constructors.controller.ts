import { Request, Response } from 'express';
import * as constructorsService from './constructors.service';
import type { StandingsQuery } from './constructors.schema';

export async function getAll(_req: Request, res: Response) {
  const constructors = await constructorsService.findAll();
  res.json({ data: constructors });
}

export async function getStandings(req: Request, res: Response) {
  // validateQuery deja el resultado en req.validatedQuery, no en req.query (Express 5).
  const { seasonId } = (req.validatedQuery ?? {}) as StandingsQuery;
  const standings = await constructorsService.findStandings(seasonId);
  res.json({ data: standings });
}

export async function getById(req: Request, res: Response) {
  const constructor = await constructorsService.findDetail(Number(req.params.id));
  res.json({ data: constructor });
}

export async function create(req: Request, res: Response) {
  const constructor = await constructorsService.create(req.body);
  res.status(201).json({ data: constructor });
}

export async function update(req: Request, res: Response) {
  const constructor = await constructorsService.update(Number(req.params.id), req.body);
  res.json({ data: constructor });
}

export async function remove(req: Request, res: Response) {
  await constructorsService.softDelete(Number(req.params.id));
  res.status(204).send();
}
