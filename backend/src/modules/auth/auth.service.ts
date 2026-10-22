// Limitaciones de seguridad conocidas:
//   - Timing side-channel en login: si el email no existe se responde antes del bcrypt.compare.
//   - Refresh sin rotación ni registro en DB: un refresh robado vale 7d y /logout no lo invalida.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { ConflictError, NotFoundError, UnauthorizedError, AppError } from '../../shared/errors';
import { hashPassword, comparePassword } from '../../shared/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/jwt';
import { uploadAvatar } from '../../shared/supabase-storage';
import type { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema';

// passwordHash queda afuera a propósito: nunca viaja al cliente.
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
  const passwordHash = await hashPassword(data.password);

  // Sin pre-check con findUnique: el P2002 de la unique constraint es atómico y no tiene carrera.
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
  const userRow = await prisma.user.findUnique({ where: { email: data.email } });

  // Mismo error que con password incorrecta: no revela qué emails están registrados.
  if (!userRow) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Separar el hash ya: así ningún log o stack trace que capture `user` lo filtra.
  const { passwordHash, ...user } = userRow;

  const ok = await comparePassword(data.password, passwordHash);
  if (!ok) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  return { user, accessToken, refreshToken };
}

// Re-lee el user de DB para que el access nuevo lleve el role actual, no el de cuando se
// emitió el refresh. No emite refresh nuevo (sin rotación).
export async function refreshAccessToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  // Un user borrado invalida el refresh aunque la firma sea válida.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: userSelect,
  });
  if (!user) {
    throw new UnauthorizedError('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  return { user, accessToken };
}

// El JWT solo trae {userId, role}; el resto sale de la fila actual para reflejar cambios post-login.
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

// motto '' se guarda como null: "nunca puso uno" y "lo borró" quedan iguales para el front.
export async function updateProfile(userId: number, data: UpdateProfileInput) {
  const motto = data.motto === '' ? null : data.motto;
  return prisma.user.update({
    where: { id: userId },
    data: { name: data.name, motto },
    select: userSelect,
  });
}

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/]+=*)$/;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // matchea el file_size_limit del bucket en Supabase
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// El path `<userId>.<ext>` no depende del cliente: re-subir pisa la foto vieja y nadie puede
// escribir la de otro usuario.
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

// No borra el archivo de Storage a propósito: la próxima foto lo pisa, y una llamada de red
// menos es una falla posible menos.
export async function removeAvatar(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    select: userSelect,
  });
}
