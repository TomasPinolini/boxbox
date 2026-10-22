import { Request, Response } from 'express';
import * as driversService from './drivers.service';
import type { ListDriversQuery, StandingsQuery } from './drivers.schema';

export async function getAll(req: Request, res: Response) {
  // req.validatedQuery y no req.query: en Express 5 req.query no se puede reasignar.
  const { constructorId, seasonId } = (req.validatedQuery ?? {}) as ListDriversQuery;
  const drivers = await driversService.findAll(constructorId, seasonId);
  res.json({ data: drivers }); // envelope { data: ... } consistente en toda la API
}

export async function getStandings(req: Request, res: Response) {
  const { seasonId } = (req.validatedQuery ?? {}) as StandingsQuery;
  const standings = await driversService.findStandings(seasonId);
  res.json({ data: standings });
}

export async function getById(req: Request, res: Response) {
  const driver = await driversService.findDetail(Number(req.params.id));
  res.json({ data: driver });
}

export async function create(req: Request, res: Response) {
  const driver = await driversService.create(req.body);
  res.status(201).json({ data: driver }); // 201 Created — recurso nuevo
}

export async function update(req: Request, res: Response) {
  const driver = await driversService.update(Number(req.params.id), req.body);
  res.json({ data: driver }); // 200 OK — actualización exitosa
}

export async function remove(req: Request, res: Response) {
  await driversService.softDelete(Number(req.params.id));
  res.status(204).send(); // 204 No Content — borrado exitoso, sin body
}
