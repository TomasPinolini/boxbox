export type UserRole = 'USER' | 'ADMIN';

// Espejo de `userSelect` en backend/src/modules/auth/auth.service.ts (nunca incluye passwordHash).
export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
}
