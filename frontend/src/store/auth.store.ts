import { create } from 'zustand';
import type { User } from '../models/user';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  // false hasta que el refresh inicial termino (con o sin sesion). SessionGate lo espera.
  sessionReady: boolean;
  isLoggedIn: () => boolean;
  setSession: (user: User, accessToken: string) => void;
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
  clear: () => set({ user: null, accessToken: null }),
  markReady: () => set({ sessionReady: true }),
}));
