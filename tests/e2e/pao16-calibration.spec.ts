import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const evidence = 'docs/evidence/PAO-16/calibration-spike';
const files = ['train_metro.glb', 'obstacle_slide_barrier.glb', 'train_ramp_or_car.glb', 'obstacle_hurdle_barrier.glb'];
test('independent original-geometry preview verifies loader space, source identity and four inputs', async ({ page, request }) => {
  const errors: string[] = [];
  const results: any[] = [];
  const hashes: any[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const file of files) {
    const response = await request.get('/inputs/' + file);
    expect(response.ok()).toBeTruthy();
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(createHash('sha256').update(readFileSync('.pao16-local/inputs/' + file)).digest('hex'));
    hashes.push({ file, httpSHA256:createHash('sha256').update(await response.body()).digest('hex') });
  }
  const raw = await request.get('/tools/pao16-calibration/preview.ts?raw');
  // Vite wraps ?raw as a JS string export. Request via browser import and compare bytes exactly.
  await page.goto('/tools/pao16-calibration/preview.html');
  const rawSource = await page.evaluate(async () => (await import('/tools/pao16-calibration/preview.ts?raw')).default);
  expect(createHash('sha256').update(rawSource).digest('hex')).toBe(createHash('sha256').update(readFileSync('tools/pao16-calibration/preview.ts')).digest('hex'));
  expect(raw.ok()).toBeTruthy();
  mkdirSync(evidence, { recursive: true });
  for (const [index, file] of files.entries()) {
    await page.goto('/tools/pao16-calibration/preview.html?asset=' + file);
    await page.waitForFunction(() => (window as any).__CALIBRATION__?.ready, undefined, { timeout: 60000 });
    const status = await page.evaluate(() => (window as any).__CALIBRATION__);
    expect(status.file).toBe(file);
    expect(status.meshes).toBeGreaterThan(0);
    expect(status.loaderMaxError).toBeLessThan(0.00001);
    expect(status.candidateAppliedError).toBeLessThan(0.0001);
    expect(status.visualRootCount).toBe(1);
    expect(status.logicalChildCount).toBe(file === 'train_metro.glb' ? 2 : 1);
    expect(status.rightHanded).toBe(true);
    results.push(status);
    if (index < 3) await page.screenshot({ path: `${evidence}/${index + 1}-${file}.png` });
  }
  expect(errors).toEqual([]);
  writeFileSync(`${evidence}/preview-verification.json`, JSON.stringify({ sourceSHA256:createHash('sha256').update(rawSource).digest('hex'), hashes, results, errors, backend:'Chromium ANGLE D3D11; desktop technical preview, not target-device acceptance', renderedOriginalAssets:true }, null, 2));
});
