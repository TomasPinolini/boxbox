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

// Tipos derivados — si cambiás el schema, los tipos cambian solos.
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
