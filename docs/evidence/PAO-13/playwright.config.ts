import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const phase = process.env.PAO13_PHASE || 'final';
if (!/^[a-zA-Z0-9-]+$/.test(phase)) throw new Error('Invalid PAO-13 evidence phase');

export default defineConfig({
  testDir: '../../../tests/e2e', testMatch: '**/*.spec.ts', workers: 1, timeout: 90000,
  outputDir: resolve('.pao13-local', phase, 'test-results'),
  reporter: [['list'], ['json', { outputFile: resolve('docs/evidence/PAO-13/runs', phase, 'e2e-results.json') }]],
  use: {
    baseURL: 'http://127.0.0.1:5184', viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5184 --strictPort',
    url: 'http://127.0.0.1:5184', reuseExistingServer: false, cwd: resolve('.'),
  },
});
