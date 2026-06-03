// RATE LIMIT — middleware basado en express-rate-limit con counter in-memory.
// Aplicado solo a endpoints POST de leagues (create + join) porque ahi vive el riesgo de
// abuso (brute force de inviteCodes, spam de creacion). Lecturas no se limitan.
//
// Por que user-based en vez de IP-based: dos users en la misma red (WiFi de oficina,
// VPN corporativa) no deben compartir contador. El JWT autenticado nos da identidad
// estable; usamos userId como key. Fallback a IP si por algun edge case no hay user
// (no deberia pasar — requireAuth corre antes en la cadena de middlewares).
//
// Skip en tests: si NODE_ENV === 'test', el limiter se salta. Sin esto, los tests de
// integracion que hacen muchos POST /leagues seguidos toparian el cap de 5/min y
// fallarian falsamente. En produccion el cap se aplica normal.

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

// Bypass del rate limit en 3 escenarios:
//   1. Vitest (NODE_ENV='test' o VITEST='true' — setean automaticos).
//   2. Smoke testing manual (SMOKE='1' — setear al arrancar dev server explicitamente).
//      Use: SMOKE=1 npm run dev. Permite correr smoke/ sin pegar contra el cap de 5/min.
// El cap se aplica en prod normal (sin envs especiales).
const isTestEnv = () =>
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.SMOKE === '1';

// userKey: prefiere userId (autenticado) sobre IP. requireAuth ya corrio antes en la cadena.
// IP fallback usa ipKeyGenerator (helper de express-rate-limit v8+) que normaliza IPv6 a
// su prefijo /64 para que IPv6 users no puedan bypassear el limit cambiando el sufijo de
// su address (CVE conocido en rate limiters naive).
const userKey = (req: Request) =>
  req.user?.userId?.toString() ?? ipKeyGenerator(req.ip ?? 'anon');

// errorEnvelope: matchea el shape { error: { code, message, status } } del resto de la API.
const sendRateLimitError = (res: Response, message: string) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      status: 429,
    },
  });
};

// leagueCreateLimiter: 5 requests por minuto por usuario.
// Crear ligas no es accion frecuente — 5/min es generoso para uso humano normal,
// restrictivo para abuso programatico (spam de leagues con inviteCodes especificos).
export const leagueCreateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-7', // headers RateLimit-* segun RFC draft 7
  legacyHeaders: false,
  keyGenerator: userKey,
  skip: isTestEnv,
  handler: (_req, res) => sendRateLimitError(res, 'Too many league creation requests'),
});

// leagueJoinLimiter: 10 requests por minuto por usuario.
// Join es mas frecuente (un user puede unirse a varias ligas en sucesion), pero el
// risk vector principal es brute-force de inviteCodes. 10/min hace inviable barrer
// el espacio (36^4 = 1.6M codigos minimos / 10/min = 11 anos por user).
export const leagueJoinLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userKey,
  skip: isTestEnv,
  handler: (_req, res) => sendRateLimitError(res, 'Too many league join attempts'),
});
