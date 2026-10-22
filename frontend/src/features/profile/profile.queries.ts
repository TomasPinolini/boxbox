import { useMutation } from '@tanstack/react-query';
import type { User } from '../../models/user';
import { ApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';

// Sin invalidación: el usuario actual vive en useAuthStore, no en una query, y authService ya
// escribe el store.
export function useUpdateProfile() {
  return useMutation<User, ApiError, { name?: string; motto?: string }>({
    mutationFn: authService.updateProfile,
  });
}

export function useUpdateAvatar() {
  return useMutation<User, ApiError, string>({
    mutationFn: authService.updateAvatar,
  });
}

export function useRemoveAvatar() {
  return useMutation<User, ApiError, void>({
    mutationFn: authService.removeAvatar,
  });
}
