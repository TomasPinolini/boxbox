// SERVICE — toda la lógica de register y login vive acá.
// No sabe que existe HTTP: nunca toca req/res/next.
// Comunica errores tirando AppError subclasses → el controller los pasa al errorHandler.
//
// DEUDA DE SEGURIDAD CONOCIDA (post Security Engineer reviews en Slices 1a y 1c):
//   - bcrypt rounds = 10. OWASP 2024-2026 recomienda 12 para servidores web.
//     Subir cuando deploy a prod o cuando los tests toleren ~400ms por hash. → post-MVP.
//   - Timing side-channel en login (rama "email no existe" sale antes que bcrypt.compare).
//     Fix: comparePassword contra DUMMY_HASH cuando user no exists. Innecesario sin
//     exposicion publica. → post-MVP.
//   - Sin rate limiting en /register, /login, /refresh. Brute force y CPU-DoS posibles. → pre-prod.
//   - Refresh sin rotacion + sin DB tracking. Implicaciones:
//       (a) si te roban el refresh, vale 7d hasta que expire — no podemos invalidarlo server-side.
//       (b) /logout limpia la cookie del browser pero no invalida el token si fue copiado.
//     Fix: tabla RefreshToken con jti + revocation, rotacion en cada /refresh. → post-MVP.
//   - Sin chequeo HIBP (passwords breached). Innecesario para TP. → post-TP.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { ConflictError, NotFoundError, UnauthorizedError, AppError } from '../../shared/errors';
import { hashPassword, comparePassword } from '../../shared/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/jwt';
import { uploadAvatar } from '../../shared/supabase-storage';
import type { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema';

// userSelect — campos que SÍ devolvemos al cliente.
// passwordHash nunca aparece acá. Si lo necesitamos internamente (login), pedimos la fila entera sin select.
const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  motto: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function register(data: RegisterInput) {
  // 1. Hashear password. ~100ms con 10 rounds.
  const passwordHash = await hashPassword(data.password);

  // 2. Intentar crear. Si el email ya existe, Prisma tira P2002 (unique constraint).
  // Atrapamos eso y lo convertimos a ConflictError tipado. Esto evita la race condition
  // entre pre-check (findUnique) + create — la unique constraint de la DB es atómica.
  try {
    const user = await prisma.user.create({
      data: { email: data.email, passwordHash, name: data.name },
      select: userSelect,
    });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });
    return { user, accessToken, refreshToken };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('A user with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }
    throw err;
  }
}

export async function login(data: LoginInput) {
  // 1. Buscar user por email — sin `select` porque necesitamos passwordHash para compare.
  const userRow = await prisma.user.findUnique({ where: { email: data.email } });

  // 2. Si el email no existe, tiramos el MISMO error que cuando el password está mal.
  // Esto evita "account enumeration": un atacante probando emails no puede saber cuáles están registrados.
  if (!userRow) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // 3. Stripear passwordHash inmediatamente a una variable local.
  // El objeto `user` ya no contiene el hash, así que ningún stack trace ni log que
  // capture `user` puede leakearlo. `passwordHash` queda en scope solo para el compare.
  const { passwordHash, ...user } = userRow;

  // 4. Comparar password tipeado contra el hash.
  const ok = await comparePassword(data.password, passwordHash);
  if (!ok) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // 5. Firmar tokens y devolver.
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  return { user, accessToken, refreshToken };
}

// POST /refresh — verifica el refresh token (que viene en una cookie httpOnly),
// re-fetcha el user de DB (para tener role actualizado) y emite un access token nuevo.
// NO emite refresh nuevo (sin rotacion — deuda P3 documentada al top del archivo).
// El refresh original sigue vigente hasta que expire (7d).
export async function refreshAccessToken(refreshToken: string) {
  // 1. Verificar el refresh — tira UnauthorizedError REFRESH_TOKEN_INVALID si falla.
  const payload = verifyRefreshToken(refreshToken);

  // 2. Fetch user de DB. Si el user fue eliminado, el refresh es invalido aunque la firma matchee.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: userSelect,
  });
  if (!user) {
    throw new UnauthorizedError('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
  }

  // 3. Emitir access nuevo con el role actual (puede ser distinto al que tenia cuando se emitio el refresh).
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  return { user, accessToken };
}

// GET /me — devuelve el User fresco de DB segun el userId que vino en el JWT.
// Vamos a DB en vez de devolver el payload del token directo porque el token guarda solo {userId, role};
// el resto (name, email, avatarUrl) viene de la fila actual — refleja cambios post-login.
// Si el user fue eliminado entre login y este request, devolvemos 404 (token valido pero recurso no existe).
export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });
  if (!user) {
    throw new NotFoundError('User');
  }
  return user;
}

// PATCH /me — nombre y/o lema. motto === '' (el campo se vació en el popup) se guarda como
// null, no como string vacío: así `rival.motto &&` en RivalTeamModal no tiene que distinguir
// entre "nunca puso uno" y "lo puso y lo borró", y el "x/40" del popup arranca en 0 las dos veces.
export async function updateProfile(userId: number, data: UpdateProfileInput) {
  const motto = data.motto === '' ? null : data.motto;
  return prisma.user.update({
    where: { id: userId },
    data: { name: data.name, motto },
    select: userSelect,
  });
}

// data:image/png;base64,iVBORw0KG... — no multipart, ver auth.schema.ts.
const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/]+=*)$/;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // matchea el file_size_limit del bucket en Supabase
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// POST /me/avatar — el path es `<userId>.<ext>` a propósito: re-subir pisa el archivo viejo
// (x-upsert en supabase-storage.ts) en vez de acumular uno por cada cambio de foto, y evita
// que alguien escriba el archivo de OTRO usuario (no depende de nada que mande el cliente).
export async function updateAvatar(userId: number, dataUrl: string) {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    throw new AppError(400, 'INVALID_AVATAR_FORMAT', 'La imagen tiene que ser PNG, JPEG o WebP');
  }
  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new AppError(400, 'AVATAR_TOO_LARGE', 'La imagen no puede pesar más de 2MB');
  }

  const path = `${userId}.${EXT_BY_MIME[contentType]}`;
  const avatarUrl = await uploadAvatar(path, buffer, contentType);

  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: userSelect,
  });
}

// DELETE /me/avatar — solo limpia la referencia en Postgres, no borra el archivo de Supabase
// Storage. El blob huérfano queda ahí (2MB como mucho, y el path es `<userId>.<ext>`, así que
// la próxima foto que suba este mismo user lo pisa igual vía x-upsert) — evita una llamada de
// red más que podría fallar por separado de la que sí importa (limpiar el dato que se muestra).
export async function removeAvatar(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    select: userSelect,
  });
}
