import { z } from 'zod';
import { idParamSchema } from '../../shared/params';

const RESERVED_INVITE_CODES = ['admin', 'test', 'me', 'api', 'health'] as const;

// El refine va despues del transform: si no, 'ADMIN' pasaria la blacklist en minuscula.
const inviteCodeSchema = z
  .string()
  .min(4, 'inviteCode must be 4-20 chars')
  .max(20, 'inviteCode must be 4-20 chars')
  .regex(/^[a-zA-Z0-9_-]+$/, 'inviteCode only allows letters, numbers, dashes, underscores')
  .transform((s) => s.toLowerCase())
  .refine((s) => !RESERVED_INVITE_CODES.includes(s as (typeof RESERVED_INVITE_CODES)[number]), {
    message: 'inviteCode is reserved',
  });

// maxMembers omitido = el tope de la temporada (lo resuelve el service).
export const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  inviteCode: inviteCodeSchema,
  seasonId: z.number().int().positive(),
  maxMembers: z.number().int().min(2).max(20).optional(),
});

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

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;

export const memberKickParamSchema = idParamSchema.extend({
  userId: z.coerce.number().int().positive(),
});

// Sin blacklist a proposito: se consulta un codigo que ya existe, aunque sea reservado.
export const joinLeagueSchema = z.object({
  inviteCode: z
    .string()
    .min(4, 'inviteCode must be 4-20 chars')
    .max(20, 'inviteCode must be 4-20 chars')
    .regex(/^[a-zA-Z0-9_-]+$/, 'inviteCode only allows letters, numbers, dashes, underscores')
    .transform((s) => s.toLowerCase()),
});

