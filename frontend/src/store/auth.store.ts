import { create } from 'zustand';
import type { User } from '../models/user';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  // false hasta que el refresh inicial termino (con o sin sesion). SessionGate lo espera.
  sessionReady: boolean;
  isLoggedIn: () => boolean;
  setSession: (user: User, accessToken: string) => void;
  // Para PATCH /auth/me y POST /auth/me/avatar: el user ya está logueado, solo cambió un
  // campo — no hay un accessToken nuevo que guardar, a diferencia de setSession.
  updateUser: (user: User) => void;
  clear: () => void;
  markReady: () => void;
}

// El token vive ACA, en memoria. Sin middleware `persist` a proposito: la persistencia entre
// recargas la da la cookie httpOnly de refresh, no localStorage (spec §3, D3).
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  sessionReady: false,
  isLoggedIn: () => get().accessToken !== null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  updateUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null }),
  markReady: () => set({ sessionReady: true }),
}));
