// El service role key saltea RLS a proposito: no usamos Supabase Auth, asi que una politica
// con auth.uid() no tendria con que comparar; al usuario ya lo valido nuestro JWT.

import { env } from '../config/env';
import { AppError } from './errors';

const TIMEOUT_MS = 10_000;
// Creado a mano en el dashboard de Supabase (publico, 2MB, png/jpeg/webp).
const BUCKET = 'avatars';

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
        // El path es por userId: subir otra foto pisa la anterior en vez de dar 409.
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

  return `${env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
