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
