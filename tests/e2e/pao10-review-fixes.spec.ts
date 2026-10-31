import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const evidence = resolve('docs/evidence/PAO-10/review-fixes');
const phase = process.env.PAO10_REVIEW_PHASE || 'final';
const records = new Map<string, { errors: string[]; samples: unknown[] }>();
async function snapshot(page: Page) { return page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot()); }
async function capture(page: Page, name: string) {
  records.get(test.info().title)!.samples.push({ name, snapshot: await snapshot(page) });
  await page.screenshot({ path: resolve(evidence, 'screenshots', `${phase}-${name}.png`), animations: 'disabled' });
}
test.beforeEach(async ({ page, request }) => {
  await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  records.set(test.info().title, { errors: [], samples: [] });
  const errors = records.get(test.info().title)!.errors;
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
  page.on('requestfailed', r => errors.push(r.url() + ': ' + r.failure()?.errorText));
  const body = await (await request.get('/src/systems/input.ts?raw')).text();
  const disk = await readFile(resolve('src/systems/input.ts'), 'utf8');
  expect(body).toContain(JSON.stringify(disk));
  await writeFile(resolve(evidence, `${phase}-source-identity.json`), JSON.stringify({
    cwd: resolve('.'), url: 'http://127.0.0.1:5180', source: 'src/systems/input.ts',
    sha256: createHash('sha256').update(disk).digest('hex'), exactRawSourceMatch: body.includes(JSON.stringify(disk)),
  }, null, 2));
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
});
test.afterEach(async () => {
  const record = records.get(test.info().title)!;
  await writeFile(resolve(evidence, `${phase}-${test.info().title}.json`), JSON.stringify(record, null, 2));
  expect(record.errors).toEqual([]);
});

test('native-menu-slider-and-start-space', async ({ page }) => {
  const slider = page.locator('#bgm-volume');
  await slider.focus(); const before = Number(await slider.inputValue());
  await page.keyboard.press('ArrowRight');
  expect.soft(Number(await slider.inputValue()), 'MENU slider ArrowRight must retain native behavior').toBeGreaterThan(before);
  await page.locator('#start-btn').focus();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).phase, { timeout: 2000 }).toBe('RUNNING');
  // Native button activation must not also enqueue a gameplay jump.
  expect((await snapshot(page)).context.player.isJumping).toBe(false);
  await capture(page, 'desktop-native-start');
});

test('paused-rejects-motion-and-resume-space', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#start-btn'); await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  // Focus outside a control: paused motions remain rejected instead of accumulating.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  const before = await snapshot(page);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('w');
  await page.waitForTimeout(150);
  expect(await snapshot(page)).toEqual(before);
  await page.locator('#resume-btn').focus(); await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).phase, { timeout: 2000 }).toBe('RUNNING');
  expect((await snapshot(page)).context.player.lane).toBe(before.context.player.lane);
  expect((await snapshot(page)).context.player.isJumping).toBe(false);
  await capture(page, 'portrait-native-resume');
  await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  await capture(page, 'portrait-stable-paused');
});

test('playing-interactive-arrows-do-not-move-player', async ({ page }) => {
  await page.click('#start-btn');
  const before = await snapshot(page);
  await page.locator('#hud-pause-btn').focus(); await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  expect((await snapshot(page)).context.player.lane).toBe(before.context.player.lane);
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getInputLog())).toEqual([]);
  await capture(page, 'desktop-interactive-arrow');
});
