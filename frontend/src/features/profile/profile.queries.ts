import { useMutation } from '@tanstack/react-query';
import type { User } from '../../models/user';
import { ApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';

// Sin invalidación de query ni queryClient acá: "el usuario actual" no vive en una query de
// react-query, vive en useAuthStore (SessionGate lo lee de ahí) — authService.updateProfile/
// updateAvatar ya escriben el store ellos mismos (updateUser), mismo patrón que login/register
// con setSession. Estos hooks solo exponen el estado de la mutación (isPending, error) a
// EditProfileModal.tsx.
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
