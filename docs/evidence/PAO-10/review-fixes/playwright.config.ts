import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
const evidence = resolve('docs/evidence/PAO-10/review-fixes');
const phase = process.env.PAO10_REVIEW_PHASE || 'final';
export default defineConfig({
  testDir: resolve('tests/e2e'), workers: 1, timeout: 90000,
  outputDir: resolve(evidence, `${phase}-results`),
  reporter: [['list'], ['json', { outputFile: resolve(evidence, `${phase}-e2e.json`) }]],
  use: {
    baseURL: 'http://127.0.0.1:5180', viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'] },
  },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5180 --strictPort', url: 'http://127.0.0.1:5180', reuseExistingServer: false, cwd: resolve('.') },
});
