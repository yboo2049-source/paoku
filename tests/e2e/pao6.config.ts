import { defineConfig } from '@playwright/test';

// PAO-6 captures an existing implementation; this config does not alter production.
export default defineConfig({
  testDir: '.', testMatch: 'pao6-baseline.spec.ts', workers: 1, timeout: 90000,
  outputDir: '../../docs/evidence/PAO-6/fixture-results',
  reporter: [['list'], ['json', { outputFile: '../../docs/evidence/PAO-6/fixture-test-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174', viewport: { width: 1440, height: 900 },
    video: { mode: 'on', size: { width: 960, height: 600 } },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'] },
  },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5174', reuseExistingServer: true },
});
