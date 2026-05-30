// CONTROLLER — traductor HTTP del módulo auth.
// Reglas: nada de lógica de negocio, nada de Prisma. Solo arma envelope y delega errores.

import { Request, Response, NextFunction, CookieOptions } from 'express';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../shared/errors';
import * as authService from './auth.service';

// Config de la cookie del refresh token. Centralizado acá para que register/login/refresh/logout
// usen exactamente la misma config (sino el browser no la matchea al borrar/sobreescribir).
const REFRESH_COOKIE_NAME = 'refreshToken';
const refreshCookieOptions: CookieOptions = {
  httpOnly: true, // JS del browser no puede leer la cookie — defense vs XSS
  sameSite: 'lax', // se manda en navegaciones top-level pero no en cross-site requests POST
  secure: env.NODE_ENV === 'production', // solo HTTPS en prod; en dev permitimos HTTP para localhost
  path: '/api/v1/auth', // la cookie solo viaja a endpoints de auth — minimiza superficie
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias en ms; debe matchear con REFRESH_TOKEN_EXPIRES_IN
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.status(201).json({ data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.json({ data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    // cookie-parser middleware (en app.ts) parseo las cookies de req.headers.cookie a req.cookies.
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token', 'REFRESH_TOKEN_MISSING');
    }
    const { user, accessToken } = await authService.refreshAccessToken(refreshToken);
    // Sin rotacion: no sobreescribimos la cookie. El refresh sigue siendo el mismo hasta expirar.
    res.json({ data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    // clearCookie con las MISMAS options que usamos para setear, sino el browser no la matchea.
    // Path en particular es critico — sin path, el browser busca la cookie en otro path y no la borra.
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
