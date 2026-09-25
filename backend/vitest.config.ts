import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    fileParallelism: false, // tests share a real DB — run files sequentially to avoid deadlocks
    // Solo los tests fuente. Sin esto vitest tambien levanta los .test.js compilados en dist/
    // (que existe apenas corres npm run build) y falla con "cannot be imported in a CommonJS module".
    include: ['src/**/*.test.ts'],
  },
});
