export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  // null, nunca '': el backend normaliza el motto vacío a null.
  motto: string | null;
  role: UserRole;
}
