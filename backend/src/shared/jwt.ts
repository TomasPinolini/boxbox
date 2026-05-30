// JWT HELPERS — envoltorio fino de jsonwebtoken
// Acá vive el contrato del access token: shape del payload + algoritmo + expiración + verificación.
// El service de auth importa signAccessToken; el middleware de Slice 1b importa verifyAccessToken.

import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

// ─── ACCESS TOKEN ────────────────────────────────────────────
// Shape del payload que metemos al token.
// Importante: si agregamos campos acá, también van al frontend (cualquiera puede decodear el JWT — la firma garantiza que no fue tampered, NO que el contenido sea privado).
// Por eso solo userId + role. NUNCA passwordHash, email, ni datos sensibles.
export type TokenPayload = {
  userId: number;
  role: 'USER' | 'ADMIN';
};

// Schema runtime para validar el payload DECODIFICADO.
// Defense in depth: aun si la firma matchea, si el shape no es lo que esperamos, rechazamos.
const tokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['USER', 'ADMIN']),
});

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  // `algorithms: ['HS256']` previene CVE historico "alg=none" — allowlist explicito.
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    // jsonwebtoken tira TokenExpiredError, JsonWebTokenError, NotBeforeError.
    // No diferenciamos al cliente — todo es TOKEN_INVALID.
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }

  const result = tokenPayloadSchema.safeParse(decoded);
  if (!result.success) {
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }
  return result.data;
}

// ─── REFRESH TOKEN ───────────────────────────────────────────
// El refresh token tiene UN solo proposito: pedir un access token nuevo.
// Vive 7 dias por default (env.REFRESH_TOKEN_EXPIRES_IN) y se manda al cliente como cookie httpOnly
// para que JS del browser no lo pueda leer (defense vs XSS).
// Payload minimo: solo userId. El role se re-lee de DB cuando emitimos el access nuevo,
// asi reflejamos cambios de role hechos en los ultimos 7 dias.

export type RefreshTokenPayload = {
  userId: number;
};

const refreshTokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
});

export function signRefreshToken(payload: RefreshTokenPayload): string {
  // Usa REFRESH_TOKEN_SECRET (distinto al JWT_SECRET) — si uno se compromete, el otro sobrevive.
  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
  };
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
