import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
const phase = process.env.PAO11_PHASE || 'final';
export default defineConfig({
  testDir: '../../../tests/e2e', testMatch: '**/*.spec.ts', workers: 1, timeout: 90000,
  outputDir: `./runs/${phase}/test-results`,
  reporter: [['list'], ['json', { outputFile: resolve(`docs/evidence/PAO-11/runs/${phase}/e2e-results.json`) }]],
  use: {
    baseURL: 'http://127.0.0.1:5182', viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5182 --strictPort',
    url: 'http://127.0.0.1:5182', reuseExistingServer: false, cwd: resolve('.'),
  },
});
