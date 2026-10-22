import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  // Generar con: openssl rand -base64 48
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener >= 32 chars (256 bits de entropia)'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, 'REFRESH_TOKEN_SECRET debe tener >= 32 chars (256 bits de entropia)'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  // Opcionales a proposito: sin DSN no se inicia Sentry, y sin Supabase solo el avatar
  // responde 503. SERVICE_ROLE_KEY saltea RLS; al usuario ya lo valida nuestro JWT.
  SENTRY_DSN: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
