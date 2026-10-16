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

// Bypass del rate limit solo bajo Vitest (NODE_ENV='test' o VITEST='true' — setean automaticos).
// El cap se aplica en prod normal (sin envs especiales).
// E2E=true lo setea playwright.config.ts al levantar el backend. Hace falta porque la suite
// registra 7 usuarios en ~40 segundos desde 127.0.0.1 y el cap de /auth/register es 5/min por
// IP: sin esto, los ultimos tests fallan con 429 y lo que se estaria probando es el limiter,
// no la app. Paso de verdad el 2026-10-16, con 4 de 7 tests en rojo.
const isTestEnv = () =>
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.E2E === 'true';

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

// ─── Limiters de /auth ────────────────────────────────────────────────────────────────────
// Estos corren ANTES de que exista req.user (nadie esta autenticado todavia), asi que la key
// es puramente la IP. ipKey existe en vez de reusar userKey para que quede explicito: en estas
// rutas no hay usuario al que atribuir el request, y confundirlos fue el bug que estuvimos a
// punto de meter (keyGenerator cayendo al fallback sin que nadie lo note).
//
// Depende de `app.set('trust proxy', 1)` en app.ts. Sin eso, req.ip es la IP del proxy de
// Render y estos dos limiters bloquean a todos los usuarios juntos.
// Prefiere CF-Connecting-IP sobre req.ip. Render sirve todo detras de Cloudflare, que escribe
// ese header con la IP real del cliente y SOBREESCRIBE lo que el cliente haya mandado, asi que
// no se puede falsificar. La ventaja sobre depender solo de `trust proxy 3`: si Render agrega o
// quita un salto, el numero queda mal y el sintoma es silencioso (vuelve el bucket compartido).
// El header no depende del conteo. Fallback a req.ip para local y tests, donde no existe.
export const ipKey = (req: Request) => {
  const cf = req.headers['cf-connecting-ip'];
  const clientIp = typeof cf === 'string' && cf.length > 0 ? cf : req.ip;
  return ipKeyGenerator(clientIp ?? 'anon');
};

// loginLimiter: 10 intentos FALLIDOS por minuto por IP.
// skipSuccessfulRequests hace que un login exitoso no consuma presupuesto: el cap castiga
// adivinar contrasenas, no usar la app. Sin eso, una familia detras del mismo WiFi comparte
// los 10 y el que entra legitimamente deja a otro afuera.
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

// registerLimiter: 5 registros por minuto por IP, exitosos incluidos.
// Aca si cuenta el exito: el riesgo es la creacion masiva de cuentas, no adivinar nada.
export const registerLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  skip: isTestEnv,
  handler: (_req, res) => sendRateLimitError(res, 'Too many registration attempts'),
});
