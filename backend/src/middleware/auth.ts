// AUTH MIDDLEWARE — guard de endpoints protegidos.
// Pattern: leer Authorization: Bearer <token>, verificar el JWT, attachear req.user, dejar pasar.
// Cualquier falla = UnauthorizedError tipado que el errorHandler central convierte a 401.

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../shared/jwt';
import { UnauthorizedError } from '../shared/errors';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    // Convencion HTTP estandar: Authorization: Bearer <token>
    const header = req.headers.authorization;

    if (!header) {
      throw new UnauthorizedError('Missing authorization header', 'TOKEN_MISSING');
    }

    // Esperamos exactamente "Bearer <token>". Cualquier otra cosa (Basic, sin Bearer, etc.) la rechazamos.
    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization header format', 'TOKEN_MISSING');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedError('Empty bearer token', 'TOKEN_MISSING');
    }

    // verifyAccessToken puede tirar UnauthorizedError con code TOKEN_INVALID (firma mala, expirado, payload raro).
    // Lo dejamos propagar sin transformacion — el codigo es preciso.
    const payload = verifyAccessToken(token);

    // Engancha el payload al request. El tipo viene de src/types/express.d.ts.
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}
