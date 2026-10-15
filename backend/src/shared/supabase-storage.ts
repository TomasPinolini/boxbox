// SUPABASE STORAGE CLIENT — único punto de contacto para la foto de perfil del usuario.
// fetch nativo + AbortSignal.timeout, mismo patrón que shared/jolpica.ts: sin dependencias
// nuevas, sin el SDK de supabase-js — el resto del proyecto ya habla con el Postgres de
// Supabase vía Prisma/@prisma/adapter-pg, no vía ese cliente.
//
// El service role key bypassea RLS a propósito: quién es el usuario ya se validó con NUESTRO
// JWT (requireAuth) antes de llegar acá. Storage no sabe nada de nuestra autenticación — no
// usamos Supabase Auth, así que una política RLS basada en auth.uid() no tendría con qué
// matchear.
//
// Los tests NO pegan a la red: stubean `fetch` global, mismo criterio que jolpica.ts.

import { env } from '../config/env';
import { AppError } from './errors';

const TIMEOUT_MS = 10_000;
const BUCKET = 'avatars';

// Bucket creado a mano en el dashboard de Supabase (público, 2MB, png/jpeg/webp) — no hay
// endpoint de management API para esto en el cliente fetch, y no vale la pena el SDK completo
// por un solo bucket que no cambia.
export async function uploadAvatar(path: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(503, 'AVATAR_STORAGE_NOT_CONFIGURED', 'La foto de perfil no está disponible todavía');
  }

  let res: Response;
  try {
    res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': contentType,
        // Upsert: re-subir la misma foto (mismo path, = mismo userId) pisa el archivo viejo en
        // vez de tirar 409 — es un "reemplazar", no un "crear uno nuevo" para el usuario.
        'x-upsert': 'true',
      },
      body: buffer,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error';
    throw new AppError(502, 'AVATAR_UPLOAD_FAILED', `Supabase Storage request failed: ${reason}`);
  }

  if (!res.ok) {
    throw new AppError(502, 'AVATAR_UPLOAD_FAILED', `Supabase Storage respondió ${res.status}`);
  }

  // Bucket público: la URL pública no necesita firma ni token para leerse.
  return `${env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
