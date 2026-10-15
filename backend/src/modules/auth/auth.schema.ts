// SCHEMA — el contrato de datos del módulo auth
// Validamos el body de /register y /login con Zod antes de que llegue al controller.
// Los tipos TypeScript salen del schema con z.infer — un solo lugar para los dos.

import { z } from 'zod';

// REGISTER — todos los campos requeridos con restricciones explícitas.
// Email se lowercasea para que "Test@x.com" y "test@x.com" no sean dos cuentas distintas.
// Password tiene un upper bound de 72: bcrypt trunca silenciosamente arriba de eso → mejor rechazar explícito.
export const registerSchema = z.object({
  // .trim() corre antes que email validation para que " user@x.com " no falle por whitespace de copy-paste.
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100),
});

// LOGIN — no aplicamos las restricciones de register al login.
// Si subimos el `.min(8)` mañana, el user con password "abc" (registrado antes de la regla) tiene que poder loguear.
// La fuente de verdad de "esta password es correcta o no" es bcrypt.compare, no el schema.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// PATCH /auth/me — nombre y/o lema, los dos opcionales (se manda solo lo que cambió).
// motto vacío ("") es "lo borré", no un error: se normaliza a null en el service, no acá —
// z.string().max(40) ya lo deja pasar vacío, y acá solo valida forma, no decide significado.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  // 40: el límite que se ve en el popup (contador "x/40"), ver features/profile/EditProfileModal.tsx.
  motto: z.string().trim().max(40).optional(),
});

// POST /auth/me/avatar — un data URL (data:image/png;base64,...), no multipart. Sin multer:
// el resto del proyecto no sube archivos, y una imagen de perfil entra cómoda en un body JSON
// como base64 (ver app.ts, el límite del body subió a 3mb para esto). El mime real y el
// tamaño del buffer decodificado se revisan en el service, no acá — ahí es donde importan.
export const updateAvatarSchema = z.object({
  avatar: z.string().min(1),
});

// Tipos derivados — si cambiás el schema, los tipos cambian solos.
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
