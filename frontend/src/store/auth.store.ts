import { create } from 'zustand';
import type { User } from '../models/user';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  // false hasta que el refresh inicial termino (con o sin sesion). SessionGate lo espera.
  sessionReady: boolean;
  isLoggedIn: () => boolean;
  setSession: (user: User, accessToken: string) => void;
  // A diferencia de setSession, no hay un accessToken nuevo que guardar.
  updateUser: (user: User) => void;
  clear: () => void;
  markReady: () => void;
}

// El token vive solo en memoria, sin `persist` a proposito: entre recargas la sesion la da la
// cookie httpOnly de refresh, no localStorage.
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
