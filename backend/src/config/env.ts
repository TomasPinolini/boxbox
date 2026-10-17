import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  // 256 bits de entropía mínima (HS256 key length per RFC 7518). Generar con: openssl rand -base64 48
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener >= 32 chars (256 bits de entropia)'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, 'REFRESH_TOKEN_SECRET debe tener >= 32 chars (256 bits de entropia)'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  // Foto de perfil (Slice ??): shared/supabase-storage.ts sube directo a Storage con fetch
  // nativo, sin el SDK de supabase-js — el resto del proyecto ya habla con el Postgres de
  // Supabase via Prisma/@prisma/adapter-pg, no via ese cliente. SERVICE_ROLE_KEY bypassea RLS;
  // quien es el usuario ya lo validamos con NUESTRO JWT antes de llegar ahí. Opcionales: sin
  // ellas, POST /auth/me/avatar tira 503 en vez de tumbar el boot entero — la app funciona
  // igual sin foto de perfil.
  // Sentry: opcional A PROPOSITO. Sin DSN, instrument.ts ni llama a Sentry.init() y la app
  // arranca igual — que es lo que queremos en dev, en los tests y en un clone fresco.
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
