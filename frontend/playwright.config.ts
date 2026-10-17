import { defineConfig } from '@playwright/test';

// PLAYWRIGHT_CHROMIUM_PATH es solo para entornos sandbox sin acceso a la CDN de Playwright —
// en una máquina normal `npx playwright install chromium` alcanza y esto queda undefined.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  // Los DOS servidores, no solo el front. Antes el backend habia que levantarlo aparte y
  // acordarse: si no estaba, 5 de los 7 tests fallaban con mensajes que apuntan al codigo de
  // la app ("Verstappen no esta visible", "la URL es /register") y ninguno decia que faltaba
  // el backend. Pasa el 15/10/2026: se diagnostico por el PATRON de cuales dos pasaban —los
  // dos que no hablan con la API— y no por los mensajes. Ahora, si el backend no arranca,
  // Playwright falla antes de correr un solo test y dice por que.
  //
  // reuseExistingServer: si ya los tenes levantados para desarrollar, los usa y no arranca
  // nada. La DB sigue siendo cosa tuya: migrada y seedeada (ver docs/tutorial.md).
  webServer: [
    {
      // E2E=true apaga los rate limiters de /auth/* (ver backend/src/middleware/rateLimit.ts).
      // OJO: con reuseExistingServer, si ya tenias `npm run dev` levantado a mano, Playwright
      // usa ESE proceso y la variable no esta puesta — los tests que registran usuarios van a
      // fallar con 429. Si pasa, bajá tu server y dejá que Playwright lo levante.
      command: 'E2E=true npm run dev',
      cwd: '../backend',
      // El health check y no el puerto pelado: el puerto abre antes de que Express termine de
      // montar los routers, y un test que sale en esa ventana recibe un 404 confuso.
      url: 'http://localhost:3000/api/v1/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
