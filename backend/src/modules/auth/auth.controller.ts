import { Request, Response, CookieOptions } from 'express';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../shared/errors';
import * as authService from './auth.service';

// Una sola config para setear y borrar: con opciones distintas el browser no matchea la cookie.
const REFRESH_COOKIE_NAME = 'refreshToken';
const refreshCookieOptions: CookieOptions = {
  httpOnly: true, // JS del browser no puede leer la cookie — defense vs XSS
  // 'lax' NO viaja en cross-site POST, y POST /auth/refresh es cross-site cuando el front
  // (Vercel) y el back (Render) estan en dominios distintos: sin 'none' el refresh falla y
  // echa al usuario al expirar el access token de 15m. 'none' exige secure: true.
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: env.NODE_ENV === 'production', // solo HTTPS en prod; en dev permitimos HTTP para localhost
  path: '/api/v1/auth', // la cookie solo viaja a endpoints de auth — minimiza superficie
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias en ms; debe matchear con REFRESH_TOKEN_EXPIRES_IN
};

export async function register(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(201).json({ data: { user, accessToken } });
}

export async function login(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.json({ data: { user, accessToken } });
}

export async function getMe(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.userId);
  res.json({ data: { user } });
}

export async function updateProfile(req: Request, res: Response) {
  const user = await authService.updateProfile(req.user!.userId, req.body);
  res.json({ data: { user } });
}

export async function updateAvatar(req: Request, res: Response) {
  const user = await authService.updateAvatar(req.user!.userId, req.body.avatar);
  res.json({ data: { user } });
}

export async function removeAvatar(req: Request, res: Response) {
  const user = await authService.removeAvatar(req.user!.userId);
  res.json({ data: { user } });
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    throw new UnauthorizedError('Missing refresh token', 'REFRESH_TOKEN_MISSING');
  }
  const { user, accessToken } = await authService.refreshAccessToken(refreshToken);
  res.json({ data: { user, accessToken } });
}

export async function logout(_req: Request, res: Response) {
  // Mismas options que al setear, path incluido: si no, el browser no la borra.
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  res.status(204).send();
}
