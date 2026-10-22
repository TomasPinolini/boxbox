import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

// Una sola fuente para la vida del refresh: la firma del token y el maxAge de la cookie.
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// Cualquiera puede decodificar un JWT (la firma no lo cifra): nada sensible en el payload.
export type TokenPayload = {
  userId: number;
  role: 'USER' | 'ADMIN';
};

const tokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['USER', 'ADMIN']),
});

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  // Allowlist explicito de algoritmos: evita el ataque "alg=none".
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }

  const result = tokenPayloadSchema.safeParse(decoded);
  if (!result.success) {
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }
  return result.data;
}

// Solo userId: el role se relee de la DB al emitir cada access token nuevo.
export type RefreshTokenPayload = {
  userId: number;
};

const refreshTokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
});

export function signRefreshToken(payload: RefreshTokenPayload): string {
  // Secreto propio: si se filtra uno, el otro sigue valiendo.
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_TTL_SECONDS };
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, options);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
  }

  const result = refreshTokenPayloadSchema.safeParse(decoded);
  if (!result.success) {
    throw new UnauthorizedError('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
  }
  return result.data;
}
