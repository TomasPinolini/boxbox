// PASSWORD HELPERS — envoltorio fino de bcrypt
// Encapsulado acá para que el resto del codebase no toque bcrypt directo.
// Si mañana cambiamos a argon2, solo este archivo cambia.

import bcrypt from 'bcryptjs';

// 10 rounds = ~100ms en hardware moderno (2024-2026).
// Industry default para apps web. Si Security review pide subir, mover acá.
const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
