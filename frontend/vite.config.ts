/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
});
