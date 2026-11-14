import { defineConfig } from '@playwright/test';

// Run the existing six checks against this task's isolated server.
// The default suite's root screenshots are copied to this evidence directory
// for inspection and then restored to their original tracked versions.
export default defineConfig({
  testDir: '../../../tests/e2e',
  testMatch: 'gameplay.spec.ts',
  workers: 1,
  timeout: 60000,
  outputDir: './regression-results',
  reporter: [['list'], ['json', { outputFile: './regression-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5178',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: true,
  },
});
