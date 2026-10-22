import * as Sentry from '@sentry/react';
import { env } from './config/env';

// Va en la primera linea de main.tsx: si no, se pierde lo que falle durante el arranque.
// Sin VITE_SENTRY_DSN no inicializa, asi desarrollo no consume la cuota del plan gratis.
if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: import.meta.env.MODE,
    release: env.sentryRelease,

    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // El SDK solo manda la cabecera sentry-trace a estos dominios: sin la API, el trace del
    // browser y el del backend quedan sueltos.
    tracePropagationTargets: ['localhost', env.apiUrl],

    integrations: [Sentry.browserTracingIntegration()],

    // Sin bodies: el de /auth/login y /auth/register lleva la contrasena en texto plano.
    // Sin cookies: no hay razon para mandarlas. Session replay queda apagado a proposito:
    // graba gente sin su permiso, gasta la cuota y suma peso al bundle.
    dataCollection: {
      httpBodies: [],
      cookies: false,
    },
  });
}
