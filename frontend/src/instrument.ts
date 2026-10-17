import * as Sentry from '@sentry/react';
import { env } from './config/env';

// Se importa en la PRIMERA linea de main.tsx: el SDK tiene que inicializar antes de que corra
// cualquier otro codigo, si no se pierde lo que falle durante el arranque.
//
// Sin VITE_SENTRY_DSN no llama a Sentry.init() y la app funciona igual. Eso es lo que queremos
// en desarrollo: los errores que tiras programando no deben comerse la cuota del plan gratis,
// que esta reservada para los errores de usuarios reales.
if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: import.meta.env.MODE,
    release: env.sentryRelease,

    // 100% de traces en desarrollo, 10% en produccion.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Sin esto el trace del browser y el del backend quedan sueltos: el SDK solo manda la
    // cabecera sentry-trace a los dominios que figuran aca. Con la API incluida, un error del
    // backend se puede seguir hasta el clic que lo provoco.
    tracePropagationTargets: ['localhost', env.apiUrl],

    integrations: [Sentry.browserTracingIntegration()],

    // Qué NO mandamos, y por que. Los defaults de la v11 son peligrosos en esta app:
    //
    //   httpBodies -> manda el body de cada request que sale del browser. El de
    //                 POST /auth/login y /auth/register lleva la contrasena en texto plano.
    //   cookies    -> las manda. Aca importa menos que en el backend porque la cookie del
    //                 refresh token es httpOnly y JS no la ve, pero no hay razon para mandarlas.
    //
    // Session replay NO se activa, aunque la doc de Sentry lo trae en su setup por defecto:
    // graba la pantalla de gente que no dio permiso explicito para eso, consume la cuota mucho
    // mas rapido que los errores, y suma peso a un bundle que ya pasa el aviso de 500 kB.
    dataCollection: {
      httpBodies: [],
      cookies: false,
    },
  });
}
