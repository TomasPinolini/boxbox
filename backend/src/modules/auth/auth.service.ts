// SERVICE — toda la lógica de register y login vive acá.
// No sabe que existe HTTP: nunca toca req/res/next.
// Comunica errores tirando AppError subclasses → el controller los pasa al errorHandler.
//
// DEUDA DE SEGURIDAD CONOCIDA (post Security Engineer review en Slice 1a):
//   - bcrypt rounds = 10. OWASP 2024-2026 recomienda 12 para servidores web.
//     Subir a 12 cuando deploy a prod o cuando el suite de tests tolere ~400ms por hash.
//     → tracking: ADR futura o Slice 1c.
//   - Timing side-channel en login (rama "email no existe" sale antes que bcrypt.compare).
//     Fix: comparePassword contra un DUMMY_HASH cuando user no exists. Innecesario sin
//     exposición pública. → tracking: Slice "production hardening" post-MVP.
//   - Sin rate limiting en /register y /login. Brute force y CPU-DoS posibles.
//     → tracking: Slice 1c (cuando entremos a refresh tokens).
//   - Sin chequeo HIBP (passwords breached). Innecesario para TP. → tracking: post-TP.

import { prisma } from '../../shared/prisma';
import { Prisma } from '../../generated/prisma/client';
import { ConflictError, UnauthorizedError } from '../../shared/errors';
import { hashPassword, comparePassword } from '../../shared/password';
import { signAccessToken } from '../../shared/jwt';
import type { RegisterInput, LoginInput } from './auth.schema';

// userSelect — campos que SÍ devolvemos al cliente.
// passwordHash nunca aparece acá. Si lo necesitamos internamente (login), pedimos la fila entera sin select.
const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
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
    return { user, accessToken };
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

  // 5. Firmar token y devolver.
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  return { user, accessToken };
}
