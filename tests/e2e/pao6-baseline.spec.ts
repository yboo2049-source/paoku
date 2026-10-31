import { test, expect, type Page } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

/** PAO-6 characterization only. World entities are injected into the EXISTING
 * spawner's arrays in browser memory. Player controls use real keyboard/CDP touch.
 * No invulnerability or god mode is enabled. This is not a random-route proof. */
const dir = resolve('docs/evidence/PAO-6');
const logs: Record<string, unknown[]> = {};
const states: Record<string, unknown[]> = {};
const obstacle = (type: string, z: number, extra = {}) => ({ id: type + z, type, lane: 1, x: 0, y: 0, z, width: 2.4, height: 3, depth: 2, ...extra });

async function snap(page: Page, name: string) {
  if (['failure', 'restart', 'mobile-paused', 'mobile-menu', 'mobile-shop'].includes(name)) await page.waitForTimeout(450);
  const data = await page.evaluate(() => {
    const w = window as any; const s = w.__GAME_SENSOR__;
    return { layout: { viewportWidth: innerWidth, viewportHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }, at: new Date().toISOString(), state: s.getGameState(), position: s.getPlayerPos(), player: s.getPlayerState(), score: s.getScore(), coins: s.getCoins(), speed: s.getSpeed(), missions: s.getMissions(), hud: document.querySelector('#hud-buffs')?.textContent, events: w.__paoEvents };
  });
  states[test.info().title].push({ name, ...data });
  await page.screenshot({ animations: 'disabled', path: resolve(dir, `fixture-${name}.png`) });
  return data;
}
async function world(page: Page, obstacles: unknown[] = [], powerups: unknown[] = [], coins: unknown[] = []) {
  await page.evaluate(({ obstacles, powerups, coins }) => {
    const w = window as any; const s = w.__GAME_SENSOR__;
    s.clearWorld(); s.setPlayerPos(0, 0, 0); s.setPlayerLane(1); s.setGodMode(false); s.grantInvulnerable(0);
    w.__paoWorld.obstacles.push(...obstacles); w.__paoWorld.powerups.push(...powerups); w.__paoWorld.coins.push(...coins);
  }, { obstacles, powerups, coins });
}
async function reach(page: Page, z: number) {
  await page.waitForFunction(z => { const s = (window as any).__GAME_SENSOR__; return s.getPlayerPos().z >= z || s.getGameState() === 'GAMEOVER'; }, z);
}
async function pause(page: Page) {
  if (await page.evaluate(() => (window as any).__GAME_SENSOR__.getGameState()) === 'PLAYING') await page.keyboard.press('Escape');
}
async function resume(page: Page) { if (await page.evaluate(() => (window as any).__GAME_SENSOR__.getGameState()) === 'PAUSED') { await expect(page.locator('#resume-btn')).toBeVisible(); await page.click('#resume-btn'); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING'); } }

test.beforeEach(async ({ page }) => {
  await mkdir(dir, { recursive: true }); logs[test.info().title] = []; states[test.info().title] = [];
  page.on('console', m => logs[test.info().title].push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => logs[test.info().title].push({ type: 'pageerror', text: e.message }));
  page.on('requestfailed', r => logs[test.info().title].push({ type: 'requestfailed', url: r.url(), text: r.failure()?.errorText }));
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  await page.evaluate(async () => {
    const w = window as any;
    const spawner = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
    const events = await import(/* @vite-ignore */ '/src/core/eventBus.ts');
    w.__paoEvents = []; w.__paoTrace = [];
    for (const name of ['PLAYER_ACTION', 'PLAYER_LANDED', 'COIN_COLLECTED', 'POWERUP_ACTIVATED', 'HOVERBOARD_SHIELD_SHATTER', 'COLLISION', 'MISSION_COMPLETED']) events.eventBus.on(name, (payload: unknown) => w.__paoEvents.push({ name, payload, t: performance.now() }));
    spawner.spawnerSystem.update = (_z: number, obstacles: unknown[], coins: unknown[], powerups: unknown[]) => { w.__paoWorld = { obstacles, coins, powerups }; };
    const trace = () => { const s = w.__GAME_SENSOR__; if (s && s.getGameState() === 'PLAYING') w.__paoTrace.push({ t: performance.now(), ...s.getPlayerPos(), ...s.getPlayerState(), score: s.getScore(), coins: s.getCoins(), speed: s.getSpeed() }); requestAnimationFrame(trace); }; trace();
  });
  await page.click('#start-btn'); await page.waitForFunction(() => !!(window as any).__paoWorld);
  await world(page); await pause(page);
});
test.afterEach(async ({ page }) => {
  const title = test.info().title;
  const trace = await page.evaluate(() => (window as any).__paoTrace).catch(() => []);
  expect(logs[title].filter((l: any) => l.type === 'pageerror')).toEqual([]);
  await writeFile(resolve(dir, `fixture-${title}.json`), JSON.stringify({ mode: 'runtime spawner fixture, real input, godMode=false', title, browser: test.info().project.use, logs: logs[title], states: states[title], trace }, null, 2));
});

test('ramp-roof-jump-land', async ({ page }) => {
  await world(page, [obstacle('RAMP', 18, { depth: 12 }), obstacle('STATIC_TRAIN', 33, { depth: 18 })]);
  await resume(page); await snap(page, 'ramp-approach'); await reach(page, 18); await snap(page, 'ramp-ascent');
  await reach(page, 27); const roof = await snap(page, 'roof-contact');
  expect(roof.state).toBe('PLAYING'); expect(roof.position.y).toBe(3);
  if (roof.state === 'PLAYING' || roof.state === 'PAUSED') {
    await page.keyboard.press('w'); await page.waitForTimeout(150); await snap(page, 'roof-jump');
    await reach(page, 60); const landed = await snap(page, 'roof-exit-land'); expect(landed.state).toBe('PLAYING'); expect(landed.position.y).toBe(0);
  }
  expect(await page.evaluate(() => (window as any).__paoTrace.length)).toBeGreaterThan(10);
});

test('obstacles-failure-restart', async ({ page }) => {
  await world(page, [obstacle('LOW_OBSTACLE', 9, { height: 1.2 })]); await resume(page); await reach(page, 3); await page.keyboard.press('w'); await reach(page, 8); await pause(page); await snap(page, 'low-obstacle-jump');
  await resume(page); await reach(page, 15); await pause(page); expect((await snap(page, 'low-obstacle-result')).state).toBe('PAUSED');
  if (await page.locator('#restart-btn').isVisible()) { await page.click('#restart-btn'); await pause(page); }
  await world(page, [obstacle('HIGH_OBSTACLE', 9, { y: 1.4, height: 1.2 })]); await resume(page); await reach(page, 3); await page.keyboard.press('s'); await reach(page, 8); await pause(page); await snap(page, 'high-obstacle-roll');
  await resume(page); await reach(page, 15); await pause(page); expect((await snap(page, 'high-obstacle-result')).state).toBe('PAUSED');
  await world(page, [obstacle('STATIC_TRAIN', 9, { depth: 3 })]); await resume(page); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'GAMEOVER'); await snap(page, 'failure');
  await page.click('#restart-btn'); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING'); await pause(page); const restarted = await snap(page, 'restart'); expect(restarted.coins).toBe(0); expect(restarted.score).toBeLessThan(1);
});

test('powerups-shield-missions', async ({ page }) => {
  const powerups = ['MAGNET', 'DOUBLE_SCORE', 'SUPER_SNEAKERS', 'HOVERBOARD'].map((type, i) => ({ id: type, type, lane: 1, x: 0, y: 1, z: 6 + i * 7, collected: false }));
  const coins = Array.from({ length: 30 }, (_, i) => ({ id: 'c' + i, lane: 0, x: -3, y: 1, z: 10 + i * .04, collected: false }));
  await world(page, [], powerups, coins); await resume(page);
  for (const [i, name] of ['magnet', 'double-score', 'super-sneakers', 'hoverboard'].entries()) { await reach(page, 6 + i * 7); await pause(page); await snap(page, name); await resume(page); }
  await pause(page); await page.evaluate(() => { const w = window as any; const z = w.__GAME_SENSOR__.getPlayerPos().z; w.__paoWorld.obstacles.push({ id: 'shield-test', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: z + 5, width: 2.4, height: 1.2, depth: 2 }); });
  await resume(page); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerState().invulnerableTimer > 0); await pause(page); await snap(page, 'shield-break');
  await page.evaluate(() => (window as any).__GAME_SENSOR__.clearWorld()); await resume(page); await page.keyboard.press('w'); await page.waitForTimeout(350); await pause(page); await snap(page, 'super-jump');
  await resume(page); await page.waitForTimeout(3000); await pause(page); await snap(page, 'mission-status');
  expect(await page.evaluate(() => (window as any).__paoEvents.filter((e: any) => e.name === 'POWERUP_ACTIVATED').length)).toBe(4);
});

test('mobile-touch-layout', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await snap(page, 'mobile-paused'); await resume(page);
  const cdp = await context.newCDPSession(page);
  async function swipe(x: number, y: number, nx: number, ny: number) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: nx, y: ny }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  await swipe(220, 600, 100, 600); await expect.poll(() => page.evaluate(() => (window as any).__GAME_SENSOR__.getPlayerState().lane)).toBe(0); await pause(page); await snap(page, 'mobile-left');
  await resume(page); await swipe(180, 650, 180, 450); await page.waitForTimeout(150); await pause(page); expect((await snap(page, 'mobile-jump')).player.isJumping).toBe(true);
  await resume(page); await swipe(180, 450, 180, 650); await pause(page); expect((await snap(page, 'mobile-roll')).player.isRolling).toBe(true);
  await page.click('#pause-menu-btn'); await snap(page, 'mobile-menu'); await page.click('#open-shop-btn'); await snap(page, 'mobile-shop'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
