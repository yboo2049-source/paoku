import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const evidence = resolve('docs/evidence/PAO-14/runs', process.env.PAO14_PHASE || 'final');
const app = (page: Page) => page.evaluate(() => (window as any).__GAME_SENSOR__.getAppSnapshot());
const sim = (page: Page) => page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
const errors = new Map<string, string[]>();
async function shot(page: Page, name: string, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  await expect.poll(() => page.locator(selector).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.locator(selector).evaluate(async el => {
    await Promise.all(el.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => undefined)));
  });
  await page.screenshot({ path: resolve(evidence, 'screenshots', name + '.png'), animations: 'disabled' });
  await writeFile(resolve(evidence, name + '.json'), JSON.stringify({ app: await app(page), sim: await sim(page), viewport: page.viewportSize() }, null, 2));
}
async function boot(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  expect(await page.evaluate(() => typeof (window as any).__GAME_SENSOR__.getAppSnapshot)).toBe('function');
  await expect(page.locator('#start-btn')).toBeVisible();
}
async function emit(page: Page, name: string, payload: unknown) {
  await page.evaluate(async ({ name, payload }) => {
    const { eventBus } = await import(/* @vite-ignore */ '/src/core/eventBus.ts');
    eventBus.emit(name, payload);
  }, { name, payload });
}
test.beforeEach(async ({ page }) => {
  await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  const list: string[] = []; errors.set(test.info().title, list);
  page.on('pageerror', e => list.push(e.message));
  page.on('console', m => { if (m.type() === 'error') list.push(m.text()); });
});
test.afterEach(async () => {
  await writeFile(resolve(evidence, test.info().title + '-errors.json'), JSON.stringify(errors.get(test.info().title)));
  expect(errors.get(test.info().title)).toEqual([]);
});

test('N-desktop-pause-restart-stale-run-and-DOM-tamper', async ({ page, request }) => {
  const sources = [];
  for (const source of ['src/main.ts', 'src/ui/dom.ts', 'src/core/simulation.ts', 'src/application/appService.ts', 'src/systems/runSettlement.ts']) {
    const disk = await readFile(resolve(source), 'utf8').catch(() => 'MISSING');
    const response = await request.get('/' + source + '?raw');
    const exactRawSourceMatch = response.ok() && (await response.text()).includes(JSON.stringify(disk));
    sources.push({ source, exactRawSourceMatch, sha256: createHash('sha256').update(disk).digest('hex') });
  }
  await writeFile(resolve(evidence, 'browser-source-identity.json'), JSON.stringify({ cwd: resolve('.'), baseURL: 'http://127.0.0.1:5185', sources }, null, 2));
  await boot(page);
  expect(sources.every(s => s.exactRawSourceMatch)).toBe(true);
  expect(await page.evaluate(() => (window as any).__QA_MODE__)).toBeUndefined();
  await page.click('#start-btn'); await expect(page.locator('#hud-pause-btn')).toBeVisible();
  await page.keyboard.press('w');
  await page.click('#hud-pause-btn'); await expect(page.locator('#paused-screen')).toBeVisible();
  const old = await sim(page);
  await page.keyboard.press('a'); await page.keyboard.press('w'); await page.keyboard.press('s');
  expect((await sim(page)).tick).toBe(old.tick);
  await shot(page, 'N-desktop-stable-paused', '#paused-screen');
  await page.click('#pause-restart-btn');
  await expect.poll(async () => (await sim(page)).runId).not.toBe(old.runId);
  await expect(page.locator('#hud-pause-btn')).toBeVisible();
  await emit(page, 'GO_MENU', { runId: old.runId }); await emit(page, 'RESTART', { runId: old.runId });
  await page.click('#hud-pause-btn'); await expect(page.locator('#paused-screen')).toBeVisible();
  const current = await sim(page); expect(current.runId).not.toBe(old.runId);
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getInputLog())).toEqual([]);
  const wallet = (await app(page)).walletCoins;
  await page.locator('#hud-coins').evaluate(el => { el.textContent = '9999999'; });
  await page.click('#pause-menu-btn'); await expect(page.locator('#menu-screen')).toBeVisible();
  expect((await app(page)).walletCoins).toBe(wallet + current.context.coins);
  await page.reload(); await boot(page); await expect(page.locator('#menu-screen')).toBeVisible();
  await expect.poll(async () => (await app(page)).walletCoins).toBe(wallet + current.context.coins);
});

test('N-portrait-touch-paused-input-and-return', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await page.click('#start-btn'); await expect(page.locator('#hud-pause-btn')).toBeVisible();
  for (const [type, points] of [['touchStart', [{ x: 180, y: 500 }]], ['touchMove', [{ x: 300, y: 500 }]], ['touchEnd', []]] as const) {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...points] });
  }
  await expect.poll(async () => (await sim(page)).context.player.lane).toBe(2);
  await page.click('#hud-pause-btn'); await expect(page.locator('#paused-screen')).toBeVisible();
  await shot(page, 'N-portrait-stable-paused', '#paused-screen');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.click('#pause-menu-btn'); await expect(page.locator('#menu-screen')).toBeVisible();
  await page.click('#open-shop-btn'); await expect(page.locator('#shop-screen')).toBeVisible();
  await shot(page, 'N-portrait-stable-shop', '#shop-screen');
});

test('F-30-pickups-50-reward-save-failure-retry-and-repeat-finish', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await boot(page);
  await page.evaluate(async () => {
    const w = window as any;
    const { spawnerSystem } = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
    spawnerSystem.update = (_z: number, obstacles: unknown[], coins: unknown[]) => { w.__pao14World = { obstacles, coins }; };
  });
  await page.click('#start-btn'); await page.waitForFunction(() => !!(window as any).__pao14World);
  await page.click('#hud-pause-btn'); await expect(page.locator('#paused-screen')).toBeVisible();
  await page.evaluate(() => {
    const w = window as any, s = w.__GAME_SENSOR__; s.clearWorld(); s.setPlayerPos(0, 0, 0);
    w.__pao14World.coins.push(...Array.from({ length: 30 }, (_, i) => ({ id: 'pao14-c' + i, lane: 1, x: 0, y: 1, z: 3, collected: false })));
  });
  await page.click('#resume-btn');
  await expect.poll(async () => (await sim(page)).context.coins).toBe(80);
  await page.click('#hud-pause-btn'); await expect(page.locator('#paused-screen')).toBeVisible();
  expect((await sim(page)).context.runLedger).toMatchObject({ pickupCount: 30, pickupCoins: 30, rewardCoins: 50 });
  const before = await app(page), old = await sim(page);
  await page.evaluate(() => {
    const w = window as any; w.__pao14SetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('PAO-14 injected quota', 'QuotaExceededError'); };
  });
  await page.click('#pause-menu-btn');
  await expect.poll(async () => (await app(page)).settlementStatus).toBe('FAILED');
  expect((await app(page)).walletCoins).toBe(before.walletCoins);
  expect((await sim(page)).runId).toBe(old.runId);
  await page.evaluate(() => { Storage.prototype.setItem = (window as any).__pao14SetItem; });
  await emit(page, 'GO_MENU', { runId: old.runId });
  await expect(page.locator('#menu-screen')).toBeVisible();
  expect((await app(page)).walletCoins).toBe(before.walletCoins + 80);
  await emit(page, 'GO_MENU', { runId: old.runId });
  expect((await app(page)).walletCoins).toBe(before.walletCoins + 80);
  await page.reload(); await boot(page); await expect.poll(async () => (await app(page)).walletCoins).toBe(before.walletCoins + 80);
});

test('F-legacy-rights-shop-purchase-and-refresh', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('pao14-seeded')) return;
    localStorage.setItem('paoku_total_coins', '250'); localStorage.setItem('paoku_high_score', '900');
    localStorage.setItem('paoku_unlocked_skins', '["cyan","purple","green"]');
    localStorage.setItem('paoku_selected_skin', 'purple'); sessionStorage.setItem('pao14-seeded', '1');
  });
  await boot(page); await expect.poll(async () => (await app(page)).walletCoins).toBe(250);
  expect((await app(page)).ownedSkinIds).toEqual(expect.arrayContaining(['cyan', 'purple', 'green']));
  await page.click('#open-shop-btn'); await expect(page.locator('#shop-screen')).toBeVisible();
  await page.locator('button[data-skin-id="pink"]').click();
  await expect.poll(async () => (await app(page)).walletCoins).toBe(200);
  expect((await app(page)).ownedSkinIds).toContain('pink');
  await page.reload(); await boot(page); await expect.poll(async () => (await app(page)).walletCoins).toBe(200);
  expect((await app(page)).ownedSkinIds).toEqual(expect.arrayContaining(['pink', 'purple', 'green']));
});

test('F-same-tick-terminal-pickup-and-gameover-shop', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await boot(page);
  await page.evaluate(async () => {
    const w = window as any;
    const { spawnerSystem } = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
    spawnerSystem.update = (_z: number, obstacles: unknown[], coins: unknown[]) => { w.__pao14World = { obstacles, coins }; };
  });
  await page.click('#start-btn'); await page.waitForFunction(() => !!(window as any).__pao14World);
  await page.click('#hud-pause-btn'); await expect(page.locator('#paused-screen')).toBeVisible();
  await page.evaluate(() => {
    const w = window as any; w.__GAME_SENSOR__.clearWorld(); w.__GAME_SENSOR__.setPlayerPos(0, 0, 0);
    w.__pao14World.coins.push(...Array.from({ length: 30 }, (_, i) => ({ id: 'terminal-c' + i, lane: 1, x: 0, y: 0, z: .3, collected: false })));
    w.__pao14World.obstacles.push({ id: 'terminal-train', type: 'STATIC_TRAIN', lane: 1, x: 0, y: 0, z: .3, width: 2, height: 3, depth: 3 });
  });
  await page.click('#resume-btn'); await expect(page.locator('#gameover-screen')).toBeVisible();
  await expect.poll(async () => (await app(page)).settlementStatus).toBe('COMMITTED');
  expect((await app(page)).summary).toMatchObject({ pickupCount: 30, pickupCoins: 30, rewardCoins: 50, earnedCoins: 80, endReason: 'COLLISION' });
  expect((await app(page)).walletCoins).toBe(80);
  await shot(page, 'F-desktop-stable-terminal-summary', '#gameover-screen');
  await page.click('#go-shop-btn'); await expect(page.locator('#shop-screen')).toBeVisible();
  expect((await app(page)).walletCoins).toBe(80); expect((await app(page)).activeRunId).toBeNull();
});

test('F-two-tabs-conflicting-transactions-do-not-overwrite', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('paoku_total_coins', '250');
  });
  await boot(page); const second = await context.newPage(); await boot(second);
  await page.click('#open-shop-btn'); await second.click('#open-shop-btn');
  await expect(page.locator('#shop-screen')).toBeVisible(); await expect(second.locator('#shop-screen')).toBeVisible();
  await expect(page.locator('button[data-skin-id="pink"]')).toBeEnabled();
  await page.locator('button[data-skin-id="pink"]').click();
  await expect.poll(async () => (await app(page)).walletCoins).toBe(200);
  await second.locator('button[data-skin-id="gold"]').click();
  await expect.poll(async () => (await app(second)).errorCode).toBe('CONFLICT');
  await second.reload(); await boot(second);
  await expect.poll(async () => (await app(second)).walletCoins).toBe(200);
  expect((await app(second)).ownedSkinIds).toContain('pink');
  expect((await app(second)).ownedSkinIds).not.toContain('gold');
  await second.close();
});

test('F-pause-isolates-input-while-save-lock-is-held', async ({ page }) => {
  await boot(page); await page.click('#start-btn'); await expect(page.locator('#hud-pause-btn')).toBeVisible();
  await page.evaluate(() => {
    const w = window as any;
    void navigator.locks.request('paoku-save-transaction-v1', async () => {
      w.__pao14LockHeld = true; await new Promise<void>(resolve => { w.__pao14ReleaseLock = resolve; });
    });
  });
  await page.waitForFunction(() => (window as any).__pao14LockHeld);
  await emit(page, 'SET_AUDIO', { ...(await app(page)).audio, bgmVolume: .2 });
  const tick = await page.evaluate(async () => {
    const w = window as any, { eventBus } = await import(/* @vite-ignore */ '/src/core/eventBus.ts');
    eventBus.emit('TOGGLE_PAUSE'); return w.__GAME_SENSOR__.getSimulationSnapshot().tick;
  });
  await page.keyboard.press('a'); await page.keyboard.press('w'); await page.waitForTimeout(160);
  expect((await sim(page)).tick).toBe(tick);
  await page.evaluate(() => (window as any).__pao14ReleaseLock());
  await expect(page.locator('#paused-screen')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getInputLog())).toEqual([]);
});

test('F-reentrant-end-command-seals-complete-fatal-tick', async ({ page }) => {
  await boot(page);
  await page.evaluate(async () => {
    const w = window as any;
    const { spawnerSystem } = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
    const { eventBus } = await import(/* @vite-ignore */ '/src/core/eventBus.ts');
    let populated = false;
    spawnerSystem.update = (z: number, obstacles: unknown[], coins: unknown[]) => {
      if (populated) return; populated = true;
      coins.push(...Array.from({ length: 30 }, (_, i) => ({ id: 'reentrant-c' + i, lane: 1, x: 0, y: 0, z: z + .3, collected: false })));
      obstacles.push({ id: 'reentrant-train', type: 'STATIC_TRAIN', lane: 1, x: 0, y: 0, z: z + .3, width: 2, height: 3, depth: 3 });
    };
    eventBus.on('COLLISION', () => eventBus.emit('GO_MENU', { runId: w.__GAME_SENSOR__.getSimulationSnapshot().runId }));
  });
  await page.click('#start-btn');
  await expect.poll(async () => (await app(page)).walletCoins).toBe(80);
  await expect(page.locator('#menu-screen')).toBeVisible();
  expect((await app(page)).summary).toMatchObject({ endReason: 'COLLISION', pickupCount: 30, earnedCoins: 80 });
});

test('F-native-slider-preserves-draft-while-save-lock-is-held', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => localStorage.getItem('paoku_save_v1') !== null);
  await page.evaluate(() => {
    const w = window as any;
    void navigator.locks.request('paoku-save-transaction-v1', async () => {
      w.__pao14LockHeld = true; await new Promise<void>(resolve => { w.__pao14ReleaseLock = resolve; });
    });
  });
  await page.waitForFunction(() => (window as any).__pao14LockHeld);
  const slider = page.locator('#bgm-volume');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  try {
    expect(await slider.inputValue()).toBe('61');
    expect((await app(page)).audio.bgmVolume).toBe(.6);
  } finally { await page.evaluate(() => (window as any).__pao14ReleaseLock()); }
  await expect.poll(async () => (await app(page)).audio.bgmVolume).toBe(.61);
});
