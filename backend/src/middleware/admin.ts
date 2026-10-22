// Lee el role del JWT, sin ir a la DB: un ADMIN degradado conserva el acceso hasta que
// vence su access token (~15 min); el refresh ya relee el role de la DB.

import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const role = req.user!.role;

  if (role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required', 'ADMIN_REQUIRED');
  }

  next();
}
