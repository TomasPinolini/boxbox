// Contador in-memory: se pierde al reiniciar y no se comparte entre instancias.

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

// E2E=true lo pone playwright.config.ts: la suite registra varios usuarios seguidos desde
// 127.0.0.1 y sin esto terminaria probando el limiter en vez de la app.
const isTestEnv = () =>
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.E2E === 'true';

// Por userId y no por IP, para que dos usuarios en la misma red no compartan contador.
// ipKeyGenerator agrupa IPv6 por /64: sin eso se evade el limite cambiando el sufijo.
const userKey = (req: Request) =>
  req.user?.userId?.toString() ?? ipKeyGenerator(req.ip ?? 'anon');

const sendRateLimitError = (res: Response, message: string) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      status: 429,
    },
  });
};

export const leagueCreateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-7', // headers RateLimit-* segun RFC draft 7
  legacyHeaders: false,
  keyGenerator: userKey,
  skip: isTestEnv,
  handler: (_req, res) => sendRateLimitError(res, 'Too many league creation requests'),
});

// 10/min hace inviable barrer los inviteCodes por fuerza bruta.
export const leagueJoinLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userKey,
  skip: isTestEnv,
  handler: (_req, res) => sendRateLimitError(res, 'Too many league join attempts'),
});

// Para /auth, donde todavia no hay req.user. CF-Connecting-IP lo sobreescribe Cloudflare (no se
// puede falsificar) y no depende del conteo de saltos de `trust proxy`, que si falla mete a todos
// los usuarios en un mismo contador. req.ip queda para local y tests.
export const ipKey = (req: Request) => {
  const cf = req.headers['cf-connecting-ip'];
  const clientIp = typeof cf === 'string' && cf.length > 0 ? cf : req.ip;
  return ipKeyGenerator(clientIp ?? 'anon');
};

// Solo cuentan los fallidos: el cap castiga adivinar contrasenas, no a quienes comparten WiFi.
export const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  skip: isTestEnv,
  handler: (_req, res) => sendRateLimitError(res, 'Too many login attempts'),
});

// Cuentan tambien los exitosos (el riesgo es crear cuentas en masa). 20 y no menos porque toda
// una casa comparte IP; contra un script que crea cientos, 20/min frena igual.
export const registerLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  skip: isTestEnv,
  handler: (_req, res) => sendRateLimitError(res, 'Too many registration attempts'),
});
