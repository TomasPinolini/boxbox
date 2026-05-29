// JWT HELPERS — envoltorio fino de jsonwebtoken
// Acá vive el contrato del access token: shape del payload + algoritmo + expiración.
// El service de auth importa estos helpers; el middleware de Slice 1b también.

import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

// Shape del payload que metemos al token.
// Importante: si agregamos campos acá, también van al frontend (cualquiera puede decodear el JWT — la firma garantiza que no fue tampered, NO que el contenido sea privado).
// Por eso solo userId + role. NUNCA passwordHash, email, ni datos sensibles.
export type TokenPayload = {
  userId: number;
  role: 'USER' | 'ADMIN';
};

export function signAccessToken(payload: TokenPayload): string {
  // El cast a SignOptions['expiresIn'] es porque jsonwebtoken acepta string ("15m") pero su tipo es estricto.
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}
