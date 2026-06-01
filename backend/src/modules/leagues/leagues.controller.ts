// CONTROLLER — el traductor HTTP.
// Convierte una request HTTP en una llamada al service, y la respuesta del service
// en una response HTTP. No tiene logica de negocio. No toca la base de datos.
// Regla: si ves Prisma aca, esta mal.
//
// userId viene de req.user!.userId — el `!` es seguro porque requireAuth corre antes
// (orden de middlewares en leagues.routes.ts) y garantiza que req.user esta poblado.
// TypeScript no puede inferir esto solo (el tipo en express.d.ts es `user?: TokenPayload`).

import { Request, Response, NextFunction } from 'express';
import * as leaguesService from './leagues.service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    // req.body ya fue validado y tipado por validate(createLeagueSchema) en routes,
    // y reemplazado por el valor parsed (con inviteCode ya lowercase).
    const league = await leaguesService.createLeague(req.body, req.user!.userId);
    res.status(201).json({ data: league }); // 201 Created — recurso nuevo
  } catch (err) {
    next(err); // delega el error al errorHandler central
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const leagues = await leaguesService.listLeagues(req.user!.userId);
    res.json({ data: leagues }); // envelope { data: ... } consistente en toda la API
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    // Number(req.params.id) — patron del repo (drivers.controller usa lo mismo).
    // Si req.params.id es array por algun edge case raro, Number devuelve NaN, y el
    // service tira NotFoundError al no encontrar id=NaN. Sin crash, sin leak.
    const league = await leaguesService.getLeagueById(Number(req.params.id), req.user!.userId);
    res.json({ data: league });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const league = await leaguesService.updateLeague(
      Number(req.params.id),
      req.body,
      req.user!.userId,
    );
    res.json({ data: league }); // 200 OK — actualizacion exitosa
  } catch (err) {
    next(err);
  }
}
