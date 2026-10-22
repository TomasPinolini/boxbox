import { Request, Response, NextFunction } from 'express';
import * as driversService from './drivers.service';
import type { ListDriversQuery, StandingsQuery } from './drivers.schema';

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    // req.validatedQuery y no req.query: en Express 5 req.query no se puede reasignar.
    const { constructorId, seasonId } = (req.validatedQuery ?? {}) as ListDriversQuery;
    const drivers = await driversService.findAll(constructorId, seasonId);
    res.json({ data: drivers }); // envelope { data: ... } consistente en toda la API
  } catch (err) {
    next(err); // delega el error al errorHandler central — no maneja errores acá
  }
}

export async function getStandings(req: Request, res: Response, next: NextFunction) {
  try {
    const { seasonId } = (req.validatedQuery ?? {}) as StandingsQuery;
    const standings = await driversService.findStandings(seasonId);
    res.json({ data: standings });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await driversService.findDetail(Number(req.params.id));
    res.json({ data: driver });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await driversService.create(req.body);
    res.status(201).json({ data: driver }); // 201 Created — recurso nuevo
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await driversService.update(Number(req.params.id), req.body);
    res.json({ data: driver }); // 200 OK — actualización exitosa
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await driversService.softDelete(Number(req.params.id));
    res.status(204).send(); // 204 No Content — borrado exitoso, sin body
  } catch (err) {
    next(err);
  }
}
