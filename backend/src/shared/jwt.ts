// JWT HELPERS — envoltorio fino de jsonwebtoken
// Acá vive el contrato del access token: shape del payload + algoritmo + expiración + verificación.
// El service de auth importa signAccessToken; el middleware de Slice 1b importa verifyAccessToken.

import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

// Shape del payload que metemos al token.
// Importante: si agregamos campos acá, también van al frontend (cualquiera puede decodear el JWT — la firma garantiza que no fue tampered, NO que el contenido sea privado).
// Por eso solo userId + role. NUNCA passwordHash, email, ni datos sensibles.
export type TokenPayload = {
  userId: number;
  role: 'USER' | 'ADMIN';
};

// Schema runtime para validar el payload DECODIFICADO.
// Defense in depth: aun si la firma matchea, si el shape no es lo que esperamos, rechazamos.
// Esto cubre: tokens viejos con shape distinto, tokens firmados con un payload manipulado, bugs futuros.
const tokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['USER', 'ADMIN']),
});

export function signAccessToken(payload: TokenPayload): string {
  // El cast a SignOptions['expiresIn'] es porque jsonwebtoken acepta string ("15m") pero su tipo es estricto.
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  // `algorithms: ['HS256']` es CRITICAL: previene el CVE historico "alg=none" donde un atacante
  // podia mandar un token con header { alg: 'none' } y jsonwebtoken lo aceptaba sin verificar firma.
  // Al pasar el allowlist explicito, rechazamos cualquier algoritmo que no sea el nuestro.
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    // jsonwebtoken tira TokenExpiredError, JsonWebTokenError, NotBeforeError.
    // No diferenciamos al cliente — todo es TOKEN_INVALID (no le decimos si esta expirado vs si la firma esta mal).
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }

  // Validamos el shape post-verify. Si pasamos esto, podemos confiar en el tipo.
  const result = tokenPayloadSchema.safeParse(decoded);
  if (!result.success) {
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }
  return result.data;
}
