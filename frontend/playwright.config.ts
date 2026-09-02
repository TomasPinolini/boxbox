import { defineConfig } from '@playwright/test';

// Backend tiene que estar corriendo aparte (npm run dev en backend/, DB migrada + seedeada).
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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
