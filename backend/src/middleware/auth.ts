import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../shared/jwt';
import { UnauthorizedError } from '../shared/errors';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header) {
    throw new UnauthorizedError('Missing authorization header', 'TOKEN_MISSING');
  }

  if (!header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Invalid authorization header format', 'TOKEN_MISSING');
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new UnauthorizedError('Empty bearer token', 'TOKEN_MISSING');
  }

  const payload = verifyAccessToken(token);

  req.user = payload;
  next();
}
