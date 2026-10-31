import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const evidence = resolve('docs/evidence/PAO-10');
const sensor = (page: Page) => page.evaluate(() => {
  const s = (window as any).__GAME_SENSOR__;
  return { ...s.getSimulationSnapshot(), ...s.getSimulationDiagnostics(), inputs: s.getInputLog(), state: s.getGameState(), player: s.getPlayerState(), position: s.getPlayerPos(), score: s.getScore(), coins: s.getCoins() };
});
const traces = new Map<string, unknown[]>();
const errors = new Map<string, string[]>();
async function capture(page: Page, name: string) {
  if (name.includes('paused') || name.includes('failure')) await page.waitForTimeout(450);
  traces.get(test.info().title)!.push({ name, ...await sensor(page) });
  await page.screenshot({ path: resolve(evidence, 'screenshots', `${name}.png`), animations: 'disabled' });
}
test.beforeEach(async ({ page }) => {
  await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  traces.set(test.info().title, []); errors.set(test.info().title, []);
  page.on('pageerror', e => errors.get(test.info().title)!.push(e.message));
  page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.get(test.info().title)!.push(m.type() + ': ' + m.text()); });
  page.on('requestfailed', r => errors.get(test.info().title)!.push(r.url() + ': ' + r.failure()?.errorText));
});
test.afterEach(async () => {
  const title = test.info().title;
  await writeFile(resolve(evidence, `${title}.json`), JSON.stringify({ title, states: traces.get(title), errors: errors.get(title) }, null, 2));
  expect(errors.get(title)).toEqual([]);
});

test('N-desktop-production-keyboard-flow', async ({ page, request }) => {
  const source = await (await request.get('/src/main.ts?raw')).text();
  const disk = await readFile(resolve('src/main.ts'), 'utf8');
  expect(source).toContain(JSON.stringify(disk).slice(1, 80));
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  expect(await page.evaluate(() => (window as any).__QA_MODE__)).toBeUndefined();
  await capture(page, 'N-desktop-menu');
  await page.click('#start-btn');
  await page.keyboard.press('a'); await expect.poll(async () => (await sensor(page)).player.lane).toBe(0);
  await page.keyboard.press('d'); await expect.poll(async () => (await sensor(page)).player.lane).toBe(1);
  await page.keyboard.press('w'); await expect.poll(async () => (await sensor(page)).player.isJumping).toBe(true);
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().y > 0.8);
  await capture(page, 'N-desktop-jump');
  await page.keyboard.press('s'); await expect.poll(async () => (await sensor(page)).player.isRolling).toBe(true);
  await capture(page, 'N-desktop-roll');
  await page.keyboard.press('Escape'); await expect.poll(async () => (await sensor(page)).state).toBe('PAUSED');
  await capture(page, 'N-desktop-paused');
  const paused = await sensor(page);
  await page.keyboard.press('a'); await page.keyboard.press('w'); await page.waitForTimeout(300);
  expect((await sensor(page)).tick).toBe(paused.tick);
  expect((await sensor(page)).player.lane).toBe(paused.player.lane);
  await page.click('#resume-btn');
  await expect.poll(async () => (await sensor(page)).tick).toBeGreaterThan(paused.tick);
  // Real production random world, no setters/god mode/fixture. Keep running until collision.
  await expect.poll(async () => (await sensor(page)).state, { timeout: 60000 }).toBe('GAMEOVER');
  await capture(page, 'N-desktop-failure');
  const ended = await sensor(page);
  await page.click('#restart-btn');
  await expect.poll(async () => (await sensor(page)).runId).not.toBe(ended.runId);
  const restarted = await sensor(page);
  expect(restarted.state).toBe('PLAYING'); expect(restarted.tick).toBeLessThan(60);
  expect(restarted.coins).toBe(0); expect(restarted.inputs).toEqual([]);
  await capture(page, 'N-desktop-restart');
  await page.keyboard.press('Escape'); await page.click('#pause-menu-btn');
  await expect.poll(async () => (await sensor(page)).state).toBe('MENU');
  await capture(page, 'N-desktop-return-menu');
});

test('N-mobile-production-touch', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  await capture(page, 'N-mobile-menu'); await page.click('#start-btn');
  async function swipe(x: number, y: number, toX: number, toY: number) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: toX, y: toY }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await swipe(250, 420, 100, 420); await expect.poll(async () => (await sensor(page)).player.lane).toBe(0);
  await capture(page, 'N-mobile-left');
  await swipe(100, 420, 250, 420); await expect.poll(async () => (await sensor(page)).player.lane).toBe(1);
  await page.waitForFunction(() => Math.abs((window as any).__GAME_SENSOR__.getPlayerPos().x) < .1);
  await capture(page, 'N-mobile-centered');
  await swipe(180, 500, 180, 300); await expect.poll(async () => (await sensor(page)).player.isJumping).toBe(true);
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().y > .8);
  await capture(page, 'N-mobile-jump');
  await swipe(180, 350, 180, 550); await expect.poll(async () => (await sensor(page)).player.isRolling).toBe(true);
  await capture(page, 'N-mobile-gameplay');
  await page.click('#hud-pause-btn'); await expect.poll(async () => (await sensor(page)).state).toBe('PAUSED');
  await capture(page, 'N-mobile-paused');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await sensor(page)).inputs.every((c: any) => c.source === 'TOUCH')).toBe(true);
  await page.click('#resume-btn'); await expect.poll(async () => (await sensor(page)).state).toBe('PLAYING');
  await page.click('#hud-pause-btn'); await page.click('#pause-menu-btn');
  await expect.poll(async () => (await sensor(page)).state).toBe('MENU');
});

test('F-lifecycle-clears-input-and-hidden-time', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  await page.click('#start-btn');
  await page.evaluate(() => { const s = (window as any).__GAME_SENSOR__; s.freezeSpawner(true); s.clearWorld(); });
  const before = await sensor(page);
  // F: synthetic focus/visibility events in an empty QA world; actual keyboard dispatch,
  // no position writes. The browser remains on port5180 in this worktree.
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new Event('blur'));
  });
  const paused = await sensor(page);
  expect(paused.phase).toBe('PAUSED'); expect(paused.player.lane).toBe(before.player.lane);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(600);
  expect((await sensor(page)).tick).toBe(paused.tick);
  await page.keyboard.press('d');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.click('#resume-btn'); await page.waitForTimeout(180);
  const resumed = await sensor(page);
  expect(resumed.tick - paused.tick).toBeLessThan(30);
  expect(resumed.position.z - paused.position.z).toBeLessThan(8);
  expect(resumed.player.lane).toBe(before.player.lane);
  expect(resumed.inputs).toEqual([]);
  expect(resumed.input.cleared).toBeGreaterThan(0);
  expect(resumed.input.paused).toBeGreaterThan(0);
  expect(resumed.timeSec).toBe(resumed.tick * resumed.stepSec);
  await capture(page, 'F-lifecycle-resumed');
  await page.keyboard.press('Escape');
  const pausedSnapshot = await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
  const immutable = await page.evaluate(() => {
    const s = (window as any).__GAME_SENSOR__, snapshot = s.getSimulationSnapshot();
    let rejected = 0;
    for (const action of [() => { snapshot.context.player.x = 999; }, () => { snapshot.context.obstacles.push({}); }, () => { snapshot.context.player.activePowerUps.set('MAGNET', 999); }]) {
      try { action(); } catch { rejected++; }
    }
    return { rejected, same: snapshot.context.player.x === s.getSimulationSnapshot().context.player.x,
      empty: snapshot.context.obstacles.length === 0, noEffect: !snapshot.context.player.activePowerUps.has('MAGNET'), frozen: Object.isFrozen(snapshot.context.player) };
  });
  // Non-strict JS silently ignores a frozen property assignment; Map/Array mutations throw.
  expect(immutable.rejected).toBeGreaterThanOrEqual(2);
  expect(immutable).toMatchObject({ same: true, empty: true, noEffect: true, frozen: true });
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot())).toEqual(pausedSnapshot);
  await capture(page, 'F-lifecycle-readonly');
  await page.click('#pause-menu-btn'); await page.click('#start-btn');
  const restarted = await sensor(page);
  expect(restarted.runId).not.toBe(resumed.runId); expect(restarted.inputs).toEqual([]);
  expect(restarted.player.lane).toBe(1);
});
