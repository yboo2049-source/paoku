import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=metal',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ]
    }
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: true,
  }
});

