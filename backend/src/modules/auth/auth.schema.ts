import { z } from 'zod';

// Email en minúsculas para que "Test@x.com" y "test@x.com" no sean dos cuentas.
// Password máx. 72: bcrypt trunca en silencio arriba de eso, mejor rechazar.
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100),
});

// Sin las reglas de register: si endurecen, un user con password vieja tiene que poder entrar.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// motto '' significa "lo borré": pasa la validación y el service lo guarda como null.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  // 40 tiene que coincidir con el contador del popup en features/profile/EditProfileModal.tsx.
  motto: z.string().trim().max(40).optional(),
});

// Data URL en base64 en vez de multipart, para no sumar multer por un solo upload (el límite
// del body en app.ts es 3mb por esto). Mime y tamaño real se validan en el service.
export const updateAvatarSchema = z.object({
  avatar: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
