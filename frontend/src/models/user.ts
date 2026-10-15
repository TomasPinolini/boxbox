export type UserRole = 'USER' | 'ADMIN';

// Espejo de `userSelect` en backend/src/modules/auth/auth.service.ts (nunca incluye passwordHash).
export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  // Frase corta y opcional; se ve en "Ver equipo del rival" (RivalTeamModal). null, no '':
  // PATCH /auth/me normaliza motto vacío a null en el service, nunca llega '' desde la API.
  motto: string | null;
  role: UserRole;
}
