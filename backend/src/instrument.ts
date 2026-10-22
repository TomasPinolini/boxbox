import * as Sentry from '@sentry/node';
import { env } from './config/env';

// Se importa en la primera linea de server.ts: Sentry parchea express/http/pg al requerirlos
// y no alcanza a los que ya estan cargados. Los tests importan app.ts, asi que corren sin Sentry.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,

    // 10% en produccion mantiene el plan gratis dentro de su cuota.
    tracesSampleRate: env.NODE_ENV === 'development' ? 1.0 : 0.1,

    includeLocalVariables: true,

    // Nada de bodies, cookies ni Authorization: llevan la contrasena de login/register,
    // el refresh token y el JWT de acceso.
    dataCollection: {
      httpBodies: [],
      cookies: false,
      httpHeaders: { request: { deny: ['authorization', 'cookie'] } },
    },
  });
}
