// CONTROLLER — traductor HTTP del módulo auth.
// Reglas: nada de lógica de negocio, nada de Prisma. Solo arma envelope y delega errores.

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    // req.body ya fue parseado y typed por validate(registerSchema) en routes.
    const result = await authService.register(req.body);
    res.status(201).json({ data: result }); // 201 Created — usuario nuevo
  } catch (err) {
    next(err); // delega al errorHandler central
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.json({ data: result }); // 200 OK por default
  } catch (err) {
    next(err);
  }
}
