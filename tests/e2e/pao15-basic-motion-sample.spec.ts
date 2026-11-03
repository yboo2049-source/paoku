import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dir = resolve('docs/evidence/PAO-15/basic-motion-sample/v1');
test('four real clips: numerical parity, pause, switching, loops and warm disposal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await mkdir(dir, { recursive: true });
  await page.goto('/tools/pao15-basic-motion-sample/');
  await page.waitForFunction(() => (window as any).__BASIC_MOTION__?.ready);
  const imported = await page.evaluate(() => (window as any).__BASIC_MOTION__.info());
  expect(imported.clips.map((c: any) => c.name).sort()).toEqual(['tech_idle_v1', 'tech_jump_v1', 'tech_run_v1', 'tech_slide_v1']);
  // glTF stores times as float32; enforce the approved 1e-5s file/loader tolerance.
  imported.clips.map((c: any) => c.durationSec).sort().forEach((t: number, i: number) => expect(Math.abs(t - [.8, 1.2, 1.2, 2][i])).toBeLessThan(1e-5));
  expect(imported.skeletons).toBe(1); expect(imported.skinnedMeshes).toBe(34);
  const parity = await page.evaluate(() => (window as any).__BASIC_MOTION__.compareAll());
  expect(parity.samples).toHaveLength(30);
  expect(parity.maxVertexErrorM).toBeLessThan(1e-4);
  expect(parity.maxBoneMatrixError).toBeLessThan(1e-4);
  for (const name of ['tech_idle_v1','tech_run_v1','tech_jump_v1','tech_slide_v1']) {
    const sample = await page.evaluate(name => (window as any).__BASIC_MOTION__.seek(name, name === 'tech_idle_v1' ? .5 : .4), name);
    expect(sample.maxDisplacementM).toBeGreaterThan(1e-5);
    expect(sample.rootPosition.every((v: number) => Math.abs(v) < 1e-4)).toBe(true);
  }
  await page.evaluate(() => (window as any).__BASIC_MOTION__.seek('tech_run_v1', .2));
  await page.screenshot({ path: resolve(dir, '01-run.png') });
  await page.evaluate(() => (window as any).__BASIC_MOTION__.seek('tech_jump_v1', .5));
  await page.screenshot({ path: resolve(dir, '02-jump.png') });
  await page.evaluate(() => { const p = (window as any).__BASIC_MOTION__; p.view('side'); p.seek('tech_slide_v1', .5); });
  await page.screenshot({ path: resolve(dir, '03-slide-side.png') });
  await page.evaluate(() => { const p = (window as any).__BASIC_MOTION__; p.view('front'); p.play('tech_run_v1'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => (window as any).__BASIC_MOTION__.pause());
  const paused = await page.evaluate(() => (window as any).__BASIC_MOTION__.info());
  await page.waitForTimeout(350);
  const still = await page.evaluate(() => (window as any).__BASIC_MOTION__.info());
  expect(still.frame).toBeCloseTo(paused.frame, 5); expect(still.markerCount).toBe(paused.markerCount);
  await page.evaluate(() => (window as any).__BASIC_MOTION__.resume());
  await page.waitForTimeout(1800);
  const resumed = await page.evaluate(() => (window as any).__BASIC_MOTION__.info());
  expect(resumed.markerCount).toBeGreaterThan(paused.markerCount);
  await page.evaluate(() => (window as any).__BASIC_MOTION__.play('tech_jump_v1'));
  await page.waitForTimeout(1400);
  const held = await page.evaluate(() => (window as any).__BASIC_MOTION__.info());
  expect(held.frame / held.fps).toBeCloseTo(1.2, 4);
  await page.evaluate(() => (window as any).__BASIC_MOTION__.play('tech_slide_v1'));
  await page.waitForTimeout(1400);
  const heldSlide = await page.evaluate(() => (window as any).__BASIC_MOTION__.info());
  expect(heldSlide.frame / heldSlide.fps).toBeCloseTo(1.2, 4);
  const loops: unknown[] = [];
  for (const clip of ['tech_idle_v1','tech_run_v1']) {
    await page.evaluate(clip => (window as any).__BASIC_MOTION__.play(clip, 10), clip);
    await page.waitForTimeout(clip === 'tech_idle_v1' ? 2250 : 1000);
    const info = await page.evaluate(() => (window as any).__BASIC_MOTION__.info());
    expect(info.loopCount).toBeGreaterThanOrEqual(10); loops.push(info);
  }
  const warm = await page.evaluate(() => (window as any).__BASIC_MOTION__.warmCycles());
  expect(warm.switches).toHaveLength(20); expect(warm.loaded).toHaveLength(10); expect(warm.released).toHaveLength(10);
  expect(warm.switches.every((s: any) => JSON.stringify(s) === JSON.stringify(warm.switches[0]))).toBe(true);
  expect(warm.loaded.every((s: any) => s.skeletons === 1 && s.groups === 4 && s.skinnedMeshes === 34)).toBe(true);
  expect(warm.loaded.every((s: any) => JSON.stringify(s) === JSON.stringify(warm.loaded[0]))).toBe(true);
  expect(warm.released.every((s: any) => s.skeletons === 0 && s.groups === 0 && s.skinnedMeshes === 0)).toBe(true);
  expect(warm.released.every((s: any) => JSON.stringify(s) === JSON.stringify(warm.released[0]))).toBe(true);
  const seekMarkers = await page.evaluate(() => { const p = (window as any).__BASIC_MOTION__; p.seek('tech_jump_v1', .9); const before=p.info().markerCount; p.seek('tech_jump_v1', .1); return {before,after:p.info().markerCount}; });
  expect(seekMarkers.after).toBe(seekMarkers.before);
  const rest = await page.evaluate(() => (window as any).__BASIC_MOTION__.rest());
  expect(rest.maxDisplacementM).toBeLessThan(1e-4);
  await page.evaluate(() => (window as any).__BASIC_MOTION__.dispose());
  await expect(page.locator('#play')).toBeDisabled();
  expect(errors).toEqual([]);
  await writeFile(resolve(dir, 'babylon-report.json'), JSON.stringify({imported,parity,paused,still,resumed,held,heldSlide,loops,warm,seekMarkers,rest,errors,browser:page.context().browser()?.version(),viewport:page.viewportSize(),mode:'F isolated four-clip sample; no new runner game integration'}, null, 2));
});

test('short-sequence: four isolated technical clips play without world root movement', async ({ page }) => {
  await page.goto('/tools/pao15-basic-motion-sample/');
  await page.waitForFunction(() => (window as any).__BASIC_MOTION__?.ready);
  for (const [name, time] of [['tech_idle_v1', 2100], ['tech_run_v1', 2400], ['tech_jump_v1', 1400], ['tech_slide_v1', 1400]] as const) {
    await page.evaluate(name => (window as any).__BASIC_MOTION__.play(name), name);
    await page.waitForTimeout(time);
    const pose = await page.evaluate(() => { const p=(window as any).__BASIC_MOTION__;p.pause();return p.seek(p.info().clip,p.info().frame/p.info().fps); });
    expect(pose.rootPosition.every((v: number) => Math.abs(v) < 1e-4)).toBe(true);
  }
});
