import type { User } from '../models/user';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from './api-client';

interface AuthPayload {
  user: User;
  accessToken: string;
}

// El "servicio" de auth (rubrica): funciones sobre apiClient + el store. Sin React.
export const authService = {
  async login(email: string, password: string): Promise<User> {
    const { user, accessToken } = await apiClient.post<AuthPayload>('/auth/login', {
      email,
      password,
    });
    useAuthStore.getState().setSession(user, accessToken);
    return user;
  },

  async register(email: string, password: string, name: string): Promise<User> {
    const { user, accessToken } = await apiClient.post<AuthPayload>('/auth/register', {
      email,
      password,
      name,
    });
    useAuthStore.getState().setSession(user, accessToken);
    return user;
  },

  // Al arrancar la app: intenta restaurar la sesion con la cookie. Nunca tira: sin cookie o
  // vencida, simplemente quedamos deslogueados.
  async restoreSession(): Promise<void> {
    try {
      await apiClient.refreshOnce();
    } catch {
      useAuthStore.getState().clear();
    } finally {
      useAuthStore.getState().markReady();
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      useAuthStore.getState().clear();
    }
  },
};
