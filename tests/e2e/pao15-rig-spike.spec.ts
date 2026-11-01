import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dir = resolve('docs/evidence/PAO-15/rig-spike');

test('runner diagnostic imports, deforms, replays and disposes in Babylon', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir(dir, { recursive: true });
  await page.goto('/tools/pao15-rig-spike/');
  await page.waitForFunction(() => (window as any).__RIG_PROBE__?.ready === true);
  const imported = await page.evaluate(() => (window as any).__RIG_PROBE__.info());
  expect(imported.skeletons).toBe(1);
  expect(imported.jointCount).toBeLessThanOrEqual(48);
  expect(imported.groups).toEqual(['rig_diagnostic']);
  expect(imported.skinnedMeshes).toBe(34);
  const rest = await page.evaluate(() => (window as any).__RIG_PROBE__.pose('rest'));
  expect(rest.maxDisplacementM).toBeLessThan(1e-4);
  await page.screenshot({ path: resolve(dir, '01-rest-front.png') });
  const poses: unknown[] = [];
  for (const name of ['shoulder_l', 'elbow_l', 'hip_l', 'knee_l', 'shoulder_r', 'elbow_r', 'hip_r', 'knee_r', 'combined_squat']) {
    const result = await page.evaluate(name => (window as any).__RIG_PROBE__.pose(name), name);
    expect(result.maxDisplacementM, name).toBeGreaterThan(0.03);
    expect(result.rootPosition.every((v: number) => Math.abs(v) < 1e-4), name).toBe(true);
    poses.push(result);
  }
  await page.screenshot({ path: resolve(dir, '02-combined-front.png') });
  await page.evaluate(() => { const p = (window as any).__RIG_PROBE__; p.view('side'); p.pose('knee_l'); });
  await page.screenshot({ path: resolve(dir, '03-knee-side.png') });
  await page.evaluate(() => { const p = (window as any).__RIG_PROBE__; p.view('front'); p.play(); });
  const start = await page.evaluate(() => (window as any).__RIG_PROBE__.info().frame);
  await page.waitForTimeout(600);
  const played = await page.evaluate(() => (window as any).__RIG_PROBE__.info());
  expect(played.frame).not.toBe(start);
  await page.waitForTimeout(4800);
  const returned = await page.evaluate(() => (window as any).__RIG_PROBE__.pose('rest_return'));
  expect(returned.maxDisplacementM).toBeLessThan(1e-4);
  const disposed = await page.evaluate(() => (window as any).__RIG_PROBE__.dispose());
  expect(disposed.skeletons).toBe(0);
  expect(disposed.skinnedMeshes).toBe(0);
  await expect(page.locator('#play')).toBeDisabled();
  await expect(page.locator('#pose')).toBeDisabled();
  const released = await page.evaluate(() => (window as any).__RIG_PROBE__.info());
  expect(released.groups).toEqual([]);
  await page.evaluate(() => (window as any).__RIG_PROBE__.load());
  await expect(page.locator('#play')).toBeEnabled();
  const reloaded = await page.evaluate(() => (window as any).__RIG_PROBE__.info());
  expect(reloaded.skeletons).toBe(1);
  expect(reloaded.groups).toEqual(['rig_diagnostic']);
  expect(errors).toEqual([]);
  await writeFile(resolve(dir, 'babylon-report.json'), JSON.stringify({ imported, rest, poses, played, returned, disposed, reloaded, errors,
    browser: page.context().browser()?.version(), viewport: page.viewportSize(), mode: 'F isolated diagnostic poses; not game natural input' }, null, 2));
});
