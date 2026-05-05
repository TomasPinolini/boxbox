// CONTROLLER — el traductor HTTP
// Convierte una request HTTP en una llamada al service, y la respuesta del service
// en una response HTTP. No tiene lógica de negocio. No toca la base de datos.
// Regla: si ves Prisma acá, está mal.

import { Request, Response, NextFunction } from 'express';
import * as driversService from './drivers.service';

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    // Convierte query strings (siempre strings en HTTP) a números opcionales
    const constructorId = req.query.constructorId ? Number(req.query.constructorId) : undefined;
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : undefined;
    const drivers = await driversService.findAll(constructorId, seasonId);
    res.json({ data: drivers }); // envelope { data: ... } consistente en toda la API
  } catch (err) {
    next(err); // delega el error al errorHandler central — no maneja errores acá
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    // req.params.id es siempre string, Number() lo convierte
    const driver = await driversService.findById(Number(req.params.id));
    res.json({ data: driver });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    // req.body ya fue validado y tipado por validate(createDriverSchema) en routes
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
