import type { User } from '../models/user';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from './api-client';

interface AuthPayload {
  user: User;
  accessToken: string;
}

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

  // Nunca tira: sin cookie o vencida, simplemente quedamos deslogueados.
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

  async updateProfile(data: { name?: string; motto?: string }): Promise<User> {
    const { user } = await apiClient.patch<{ user: User }>('/auth/me', data);
    useAuthStore.getState().updateUser(user);
    return user;
  },

  // dataUrl: "data:image/png;base64,...", lo arma EditProfileModal.tsx.
  async updateAvatar(dataUrl: string): Promise<User> {
    const { user } = await apiClient.post<{ user: User }>('/auth/me/avatar', { avatar: dataUrl });
    useAuthStore.getState().updateUser(user);
    return user;
  },

  async removeAvatar(): Promise<User> {
    const { user } = await apiClient.delete<{ user: User }>('/auth/me/avatar');
    useAuthStore.getState().updateUser(user);
    return user;
  },
};
