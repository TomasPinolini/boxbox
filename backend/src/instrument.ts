import * as Sentry from '@sentry/node';
import { env } from './config/env';

// Sentry tiene que inicializarse ANTES que cualquier otro modulo instrumentado (express, http,
// pg): su instrumentacion parchea esos modulos al requerirlos, y si ya estan cargados no los
// alcanza. Por eso este archivo se importa en la PRIMERA linea de server.ts y no hace nada mas.
//
// Esto es CommonJS ("module": "commonjs" en tsconfig.json), asi que el patron es ese import
// primero. El `node --import ./instrument.js` que sale en la doc de Sentry es para proyectos
// ESM y aca no aplica.
//
// Los tests importan app.ts directo y nunca pasan por server.ts, asi que la suite corre sin
// Sentry. Es deliberado: 280 tests mandando errores a produccion no sirven para nada.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,

    // 100% en desarrollo para ver todo mientras configuramos; 10% en produccion, que es lo que
    // recomienda Sentry y lo que mantiene el plan gratis dentro de su cuota.
    tracesSampleRate: env.NODE_ENV === 'development' ? 1.0 : 0.1,

    // Valores de las variables locales en cada frame del stack. Es la diferencia entre
    // "fallo en standings.service.ts:120" y "fallo con raceId=undefined".
    includeLocalVariables: true,

    // Lo que SACAMOS del default, y por que. Los tres defaults de la v11 son peligrosos en esta
    // API en particular:
    //
    //   httpBodies  -> por default manda el body de cada request. POST /auth/register y
    //                  /auth/login llevan la contrasena en texto plano. Array vacio = no manda
    //                  ningun body.
    //   cookies     -> por default las manda. El refresh token de 7 dias vive en una cookie
    //                  httpOnly (auth): mandarla es regalar una sesion valida a un tercero.
    //   authorization -> el header lleva el JWT de acceso.
    //
    // Se pierde contexto de debug a cambio de no mandar credenciales afuera. Si algun dia hace
    // falta el body de un endpoint puntual, se habilita ahi y no globalmente.
    dataCollection: {
      httpBodies: [],
      cookies: false,
      httpHeaders: { request: { deny: ['authorization', 'cookie'] } },
    },
  });
}
