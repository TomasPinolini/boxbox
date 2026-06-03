// SCHEMAS Zod para Leagues — fuente unica de verdad sobre que shape acepta el body.
// El middleware validate() los aplica antes del controller; si fallan, devuelve 400 VALIDATION_ERROR
// automaticamente y el controller nunca corre. Si pasan, reemplaza req.body por el valor parsed
// (con transforms aplicados — ej. inviteCode ya viene lowercase aca abajo).

import { z } from 'zod';

// Palabras reservadas: el inviteCode NO puede ser una de estas. La utilidad real es baja
// (el inviteCode nunca va como path segment top-level), pero el costo es minimo y previene
// confusion futura. Lista corta a proposito.
const RESERVED_INVITE_CODES = ['admin', 'test', 'me', 'api', 'health'] as const;

// inviteCode sub-schema. Orden IMPORTA:
//   1. regex valida charset original (case-insensitive)
//   2. transform pasa a lowercase
//   3. refine chequea blacklist YA en lowercase
// Si invirtieramos transform <-> refine, 'ADMIN' pasaria la blacklist (que tiene 'admin' lowercase).
const inviteCodeSchema = z
  .string()
  .min(4, 'inviteCode must be 4-20 chars')
  .max(20, 'inviteCode must be 4-20 chars')
  .regex(/^[a-zA-Z0-9_-]+$/, 'inviteCode only allows letters, numbers, dashes, underscores')
  .transform((s) => s.toLowerCase())
  .refine((s) => !RESERVED_INVITE_CODES.includes(s as (typeof RESERVED_INVITE_CODES)[number]), {
    message: 'inviteCode is reserved',
  });

// POST /leagues body. seasonId obligatorio (decision: required, no default a isActive).
// maxMembers opcional; si se omite, Prisma usa el default del schema (11).
export const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  inviteCode: inviteCodeSchema,
  seasonId: z.number().int().positive(),
  maxMembers: z.number().int().min(2).max(20).optional(),
});

// PATCH /leagues/:id body. Todos los fields opcionales, pero el body NO puede estar vacio
// (si el cliente manda {}, devolvemos 400 — sin nada para actualizar la request es ruido).
// Lo enforcemos con un .refine al final que cuenta las keys del objeto.
export const updateLeagueSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    maxMembers: z.number().int().min(2).max(20).optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'CANCELLED']).optional(),
    inviteCode: inviteCodeSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// z.infer extrae el tipo TypeScript del schema. Los services consumen estos tipos en su firma
// para que el controller pueda pasarles req.body directamente con type safety.
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;

// ─── Slice 3: join + path param schemas ──────────────────────────────

// Path params para rutas /:id (single league). z.coerce.number() convierte "42" → 42 antes
// de validar. "abc" se transforma a NaN y la validacion .int() lo rechaza con 400.
export const leagueIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Path params para DELETE /:id/members/:userId. Mismo coerce sobre dos params.
export const memberKickParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

// Body para POST /leagues/join. inviteCode reusable del create, pero MENOS estricto:
//   - Sin blacklist de reserved words: el cliente esta consultando un codigo que ya existe
//     en DB; si por algun bug se cole un reserved al create, igual deberia poder joinear.
//   - Lowercase normalize si — para matchear contra el inviteCode guardado (que ya esta lowercase).
//   - Length y charset iguales — defensa contra inputs absurdos antes de la DB.
export const joinLeagueSchema = z.object({
  inviteCode: z
    .string()
    .min(4, 'inviteCode must be 4-20 chars')
    .max(20, 'inviteCode must be 4-20 chars')
    .regex(/^[a-zA-Z0-9_-]+$/, 'inviteCode only allows letters, numbers, dashes, underscores')
    .transform((s) => s.toLowerCase()),
});

export type JoinLeagueInput = z.infer<typeof joinLeagueSchema>;
