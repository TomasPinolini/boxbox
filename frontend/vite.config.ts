/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { execSync } from 'node:child_process';

// El SHA del commit, que es lo que el plugin de Sentry autodetecta cuando no le decis nada.
// Lo calculamos nosotros para que el release de los mapas y el que reporta el browser salgan
// del MISMO lugar: si no coinciden, Sentry tiene los mapas pero no sabe que son de ese error.
function shaDeGit(): string {
  try {
    return execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return ''; // sin git (algunos CI clonan sin .git) no es un error: se cae a autodeteccion
  }
}

// https://vite.dev/config/
// La config pasa a ser una funcion para poder leer el .env: dentro de vite.config.ts
// `process.env` NO contiene lo que hay en los archivos .env — eso lo hace Vite despues, y solo
// para las VITE_*. loadEnv con prefijo '' trae todo, que es como llegamos a SENTRY_AUTH_TOKEN.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // El token da permiso de ESCRITURA sobre la org en Sentry. No lleva prefijo VITE_ a proposito:
  // si lo llevara, Vite lo meteria en el bundle publico. Vive en frontend/.env (gitignoreado) y
  // en las variables de Vercel, nunca commiteado.
  const authToken = env.SENTRY_AUTH_TOKEN;

  // El release tiene que ser EL MISMO en los mapas que subimos y en los eventos que manda el
  // browser, si no Sentry no sabe que mapa corresponde a que error y el stack sigue ilegible.
  // En Vercel sale del SHA del commit; en local, de SENTRY_RELEASE si alguien la define.
  const release = env.VERCEL_GIT_COMMIT_SHA || env.SENTRY_RELEASE || shaDeGit();

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Solo si hay token: sin el, el plugin NO rompe el build, simplemente no sube nada. Un
      // build verde que deja los stack traces ilegibles es peor que uno rojo, asi que cuando
      // falta avisamos, y cuando falla el upload tiramos el build abajo.
      ...(authToken
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken,
              release: { name: release || undefined },
              sourcemaps: {
                // Los .map quedan en dist/ aunque no esten referenciados ('hidden'). Si no se
                // borran despues de subirlos, se despliegan a Vercel y cualquiera que adivine
                // el nombre se baja el codigo fuente.
                filesToDeleteAfterUpload: ['./dist/**/*.map'],
              },
              errorHandler: (err) => {
                throw err;
              },
            }),
          ]
        : []),
    ],

    // 'hidden' genera los mapas pero NO deja el comentario //# sourceMappingURL en el bundle:
    // Sentry los necesita, un curioso no deberia encontrarlos solo.
    build: { sourcemap: 'hidden' },

    // El valor que lee instrument.ts. Se fija en build time para que coincida exactamente con
    // el release de los mapas de arriba.
    define: {
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(release),
    },

    // host: true (0.0.0.0): TEMPORAL, pedido del usuario 2026-10-14 para probar desde el celular
    // en la misma red mientras seguimos iterando — sacar cuando avise. Sin esto Vite escucha
    // solo en localhost y el celular no llega.
    server: {
      host: true,
      fs: {
        // features/changelog importa ../../../../CHANGELOG.md?raw (la raiz del repo, un nivel
        // arriba de la raiz de Vite) para no duplicar el texto de las limitaciones en el codigo.
        //
        // Tiene que ser un DIRECTORIO, no el archivo: isServerAccessDeniedForTransform chequea dos
        // veces, una con la ruta limpia y otra con el `?raw` todavia pegado (vite/dist/node/chunks/
        // node.js:25116). Una entrada de tipo archivo nunca matchea "CHANGELOG.md?raw"; una de tipo
        // directorio si, porque compara por prefijo. Con el archivo listado, vitest seguia tirando
        // "Denied ID .../CHANGELOG.md?raw".
        //
        // Van los dos: declarar `allow` reemplaza el default, asi que sin '.' el server dejaria de
        // servir lo suyo.
        //
        // Lo que esto expone: con host:true este server escucha en 0.0.0.0, asi que cualquiera en
        // la red puede pedir archivos del repo por /@fs. NO los .env: el fs.deny default de Vite
        // (.env, .env.*, claves, .npmrc, **/.git/**) se evalua ANTES que el allow. Queda expuesto
        // el codigo fuente, que de todas formas vive en un repo. Es solo el server de desarrollo.
        allow: ['.', '..'],
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['e2e/**', 'node_modules/**'],
      css: false,
      // Los tests unitarios no pegan al backend: valores fijos para que `npm test` no dependa
      // de tener un .env (clone fresco, CI). `config/env.ts` tira si faltan.
      env: {
        VITE_API_URL: 'http://localhost:3000/api/v1',
        VITE_SOCKET_URL: 'http://localhost:3000',
      },
    },
  };
});
