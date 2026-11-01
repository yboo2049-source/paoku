import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const evidence = resolve('docs/evidence/PAO-14/runs', process.env.PAO14_PHASE || 'revision-full');
const errors = new Map<string, string[]>();
const app = (page: Page) => page.evaluate(() => (window as any).__GAME_SENSOR__.getAppSnapshot());
async function boot(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__?.getAppSnapshot && localStorage.getItem('paoku_save_v1') !== null);
  await expect(page.locator('#menu-screen')).toBeVisible();
}
async function hold(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__revisionLockHeld = false;
    void navigator.locks.request('paoku-save-transaction-v1', async () => {
      w.__revisionLockHeld = true;
      await new Promise<void>(resolve => { w.__revisionUnlock = resolve; });
    });
  });
  await page.waitForFunction(() => (window as any).__revisionLockHeld);
}
async function unlock(page: Page) { await page.evaluate(() => (window as any).__revisionUnlock()); }
async function volume(page: Page, id: string, value: string) {
  await page.locator(id).focus();
  await page.locator(id).evaluate((el, value) => {
    (el as HTMLInputElement).value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function capture(page: Page, name: string, selector: string) {
  await expect(page.locator('.cyber-toast')).toHaveCount(0);
  await expect(page.locator(selector)).toBeVisible();
  await expect.poll(() => page.locator(selector).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.locator(selector).evaluate(async el => {
    await Promise.all(el.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined)));
  });
  await page.screenshot({ path: resolve(evidence, 'screenshots', name + '.png'), animations: 'disabled' });
  await writeFile(resolve(evidence, name + '.json'), JSON.stringify({ app: await app(page), viewport: page.viewportSize() }, null, 2));
}
test.beforeEach(async ({ page }) => {
  await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  const messages: string[] = []; errors.set(test.info().title, messages);
  page.on('pageerror', e => messages.push(e.message));
  page.on('console', m => { if (m.type() === 'error') messages.push(m.text()); });
});
test.afterEach(async () => {
  await writeFile(resolve(evidence, test.info().title + '-errors.json'), JSON.stringify(errors.get(test.info().title)));
  expect(errors.get(test.info().title)).toEqual([]);
});

test('F-review-audio-different-fields-under-lock', async ({ page, request }) => {
  const sources = [];
  for (const source of ['src/application/appService.ts', 'src/application/saveRepository.ts', 'src/application/types.ts', 'src/main.ts', 'src/ui/dom.ts']) {
    const disk = await readFile(resolve(source), 'utf8');
    const response = await request.get('/' + source + '?raw');
    const exactRawSourceMatch = response.ok() && (await response.text()).includes(JSON.stringify(disk));
    expect(exactRawSourceMatch).toBe(true);
    sources.push({ source, exactRawSourceMatch, sha256: createHash('sha256').update(disk).digest('hex') });
  }
  await writeFile(resolve(evidence, 'revision-browser-source-identity.json'), JSON.stringify({ baseURL: 'http://127.0.0.1:5185', cwd: resolve('.'), sources }, null, 2));
  await boot(page); const revision = (await app(page)).revision;
  await hold(page);
  try {
    await page.click('#bgm-toggle-btn'); await page.click('#sfx-toggle-btn');
    expect((await app(page)).audio).toMatchObject({ bgmEnabled: true, sfxEnabled: true });
  } finally { await unlock(page); }
  await expect.poll(async () => (await app(page)).revision).toBe(revision + 2);
  expect((await app(page)).audio).toMatchObject({ bgmEnabled: false, sfxEnabled: false });
  await capture(page, 'F-review-desktop-audio-both-off', '#menu-screen');
  await page.reload(); await boot(page);
  await expect.poll(async () => (await app(page)).audio.bgmEnabled).toBe(false);
  expect((await app(page)).audio.sfxEnabled).toBe(false);
});

test('F-review-audio-repeated-toggle-under-lock', async ({ page }) => {
  await boot(page); const revision = (await app(page)).revision;
  await hold(page);
  try {
    await page.click('#bgm-toggle-btn'); await page.click('#bgm-toggle-btn');
    expect((await app(page)).revision).toBe(revision);
  } finally { await unlock(page); }
  await expect.poll(async () => (await app(page)).revision).toBe(revision + 2);
  expect((await app(page)).audio.bgmEnabled).toBe(true);
  // Master mute is a real HUD button, available during the actual run.
  await page.click('#start-btn'); await expect(page.locator('#audio-toggle-btn')).toBeVisible();
  await hold(page);
  try {
    await page.click('#audio-toggle-btn'); await page.click('#audio-toggle-btn');
    expect((await app(page)).revision).toBe(revision + 2);
  } finally { await unlock(page); }
  await expect.poll(async () => (await app(page)).revision).toBe(revision + 4);
  expect((await app(page)).audio.masterMuted).toBe(false);
});

test('F-review-audio-volume-and-toggle-queue', async ({ page }) => {
  await boot(page); const revision = (await app(page)).revision;
  await hold(page);
  try {
    await volume(page, '#bgm-volume', '20'); await page.click('#sfx-toggle-btn');
    await volume(page, '#sfx-volume', '35'); await volume(page, '#bgm-volume', '40');
    await page.click('#bgm-toggle-btn');
    expect((await app(page)).audio).toMatchObject({ bgmVolume: .6, sfxVolume: .9, bgmEnabled: true, sfxEnabled: true });
  } finally { await unlock(page); }
  await expect.poll(async () => (await app(page)).revision).toBe(revision + 5);
  expect((await app(page)).audio).toEqual({ masterMuted: false, bgmEnabled: false, sfxEnabled: false, bgmVolume: .4, sfxVolume: .35 });
  await page.reload(); await boot(page);
  await expect.poll(async () => (await app(page)).audio.bgmVolume).toBe(.4);
  expect((await app(page)).audio).toMatchObject({ bgmEnabled: false, sfxEnabled: false, sfxVolume: .35 });
});

test('F-review-shop-stale-funds-explicit-retry', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page);
  await page.click('#open-shop-btn'); await expect(page.locator('#shop-screen')).toBeVisible();
  const other = await context.newPage(); await boot(other);
  await other.evaluate(async () => {
    const { AppService } = await import(/* @vite-ignore */ '/src/application/appService.ts');
    const { createBrowserSaveRepository } = await import(/* @vite-ignore */ '/src/application/saveRepository.ts');
    const service = new AppService(createBrowserSaveRepository(), () => 'revision-peer-income');
    await service.initialize(); await service.dispatch({ commandId: 'peer-start', type: 'START_RUN' });
    const result = await service.finish({ runId: 'revision-peer-income', scoreInt: 0, pickupCount: 100, pickupCoins: 100, rewardCoins: 0, earnedCoins: 100, endReason: 'QUIT' });
    if (!result.ok) throw Error(result.errorCode);
  });
  await page.bringToFront();
  async function buy(commandId: string) {
    await page.evaluate(async commandId => {
      const { eventBus } = await import(/* @vite-ignore */ '/src/core/eventBus.ts');
      eventBus.emit('BUY_SKIN', { commandId, skinId: 'pink' });
    }, commandId);
  }
  await buy('revision-stale-buy');
  await expect.poll(async () => (await app(page)).errorCode).toBe('CONFLICT');
  expect((await app(page)).walletCoins).toBe(0);
  await buy('revision-stale-buy');
  await expect.poll(async () => (await app(page)).walletCoins).toBe(50);
  expect((await app(page)).ownedSkinIds).toContain('pink');
  await expect(page.locator('button[data-skin-id="pink"]')).toHaveText('EQUIPPED');
  await capture(page, 'F-review-portrait-shop-retry', '#shop-screen');
  await other.close();
});
