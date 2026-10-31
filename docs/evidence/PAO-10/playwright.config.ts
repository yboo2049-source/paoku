import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir: '../../../tests/e2e', testMatch: '**/*.spec.ts', workers: 1, timeout: 90000,
  outputDir: './e2e-results',
  reporter: [['list'], ['json', { outputFile: 'docs/evidence/PAO-10/e2e-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5180', viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'] },
  },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5180 --strictPort', url: 'http://127.0.0.1:5180', reuseExistingServer: false, cwd: resolve('.') },
});
