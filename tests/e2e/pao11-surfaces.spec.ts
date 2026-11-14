import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const phase = process.env.PAO11_PHASE || 'final';
const evidence = resolve('docs/evidence/PAO-11/runs', phase);
const records = new Map<string, { errors: string[]; states: unknown[] }>();
const obstacle = (id: string, type: string, z: number, extra = {}) => ({
  id, type, lane: 1, x: 0, y: 0, z, width: 2.4, height: 3, depth: 12, ...extra,
});
async function snapshot(page: Page) {
  return page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
}
async function capture(page: Page, name: string) {
  const state = await snapshot(page);
  records.get(test.info().title)!.states.push({ name, snapshot: state });
  await page.screenshot({ path: resolve(evidence, 'screenshots', `${name}.png`), animations: 'disabled' });
  return state;
}
async function waitFor(page: Page, predicate: 'roof' | 'ground' | 'jump', y = 3) {
  await page.waitForFunction(({ predicate, y }) => {
    const snapshot = (window as any).__GAME_SENSOR__.getSimulationSnapshot(), p = snapshot.context.player;
    if (snapshot.context.state === 'GAMEOVER') throw new Error('Unexpected GAMEOVER during support route');
    if (predicate === 'roof') return p.supportSurfaceId === 'route-roof:roof' && p.y === y;
    if (predicate === 'jump') return p.y > y + .4 && p.contact === 'AIRBORNE';
    return p.y === 0 && p.supportSurfaceId === 'ground' && p.contact === 'SUPPORTED';
  }, { predicate, y });
}
async function swipe(context: BrowserContext, page: Page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 550 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 350 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test.beforeEach(async ({ page, request }) => {
  await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  records.set(test.info().title, { errors: [], states: [] });
  page.on('pageerror', error => records.get(test.info().title)!.errors.push('pageerror: ' + error.message));
  page.on('console', message => { if (['warning', 'error'].includes(message.type())) records.get(test.info().title)!.errors.push(message.type() + ': ' + message.text()); });
  page.on('requestfailed', request => records.get(test.info().title)!.errors.push(request.url() + ': ' + request.failure()?.errorText));
  const sources = [];
  for (const source of ['src/main.ts', 'src/systems/physics.ts']) {
    const disk = await readFile(resolve(source), 'utf8');
    const response = await request.get(`/${source}?raw`), body = await response.text();
    const exactRawSourceMatch = response.ok() && body.includes(JSON.stringify(disk));
    expect(exactRawSourceMatch, `5182 must serve current checkout ${source}`).toBe(true);
    sources.push({ source, sha256: createHash('sha256').update(disk).digest('hex'), exactRawSourceMatch });
  }
  await writeFile(resolve(evidence, 'browser-source-identity.json'), JSON.stringify({ cwd: resolve('.'), baseURL: 'http://127.0.0.1:5182', sources }, null, 2));
});
test.afterEach(async ({ page }) => {
  const record = records.get(test.info().title)!;
  const trace = await page.evaluate(() => (window as any).__pao11Trace || []).catch(() => []);
  await writeFile(resolve(evidence, `${test.info().title}.json`), JSON.stringify({ title: test.info().title, browser: test.info().project.use, ...record, trace }, null, 2));
  expect(record.errors).toEqual([]);
});

async function fixture(page: Page, highBase = false) {
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  await page.evaluate(async () => {
    const w = window as any;
    const { spawnerSystem } = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
    spawnerSystem.update = (_z: number, obstacles: unknown[], coins: unknown[], powerups: unknown[]) => { w.__pao11World = { obstacles, coins, powerups }; };
    w.__pao11Trace = [];
    const trace = () => {
      const s = w.__GAME_SENSOR__.getSimulationSnapshot(), p = s.context.player;
      if (s.context.state === 'PLAYING') w.__pao11Trace.push({ tick: s.tick, x: p.x, y: p.y, z: p.z, vy: p.vy, supportSurfaceId: p.supportSurfaceId, contact: p.contact });
      requestAnimationFrame(trace);
    };
    trace();
  });
  await page.click('#start-btn');
  await page.waitForFunction(() => !!(window as any).__pao11World);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  const obstacles = highBase ? [
    obstacle('approach', 'STATIC_TRAIN', 85, { height: 5, depth: 18 }),
    obstacle('route-ramp', 'RAMP', 100, { y: 5 }),
    obstacle('route-roof', 'STATIC_TRAIN', 115, { y: 5, depth: 18 }),
  ] : [obstacle('route-ramp', 'RAMP', 18), obstacle('route-roof', 'STATIC_TRAIN', 33, { depth: 18 })];
  await page.evaluate(({ obstacles, highBase }) => {
    const w = window as any, sensor = w.__GAME_SENSOR__;
    sensor.clearWorld(); sensor.setGodMode(false); sensor.grantInvulnerable(0); sensor.setPlayerLane(1);
    sensor.setPlayerPos(0, highBase ? 5 : 0, highBase ? 90 : 0);
    w.__pao11World.obstacles.push(...obstacles); w.__pao11Trace = [];
  }, { obstacles, highBase });
}

for (const portrait of [false, true]) {
  test(`F-${portrait ? 'portrait-touch' : 'desktop-keyboard'}-ground-ramp-roof-jump-ground`, async ({ page, context }) => {
    if (portrait) await page.setViewportSize({ width: 390, height: 844 });
    await fixture(page);
    await page.click('#resume-btn');
    await page.waitForFunction(() => {
      const p = (window as any).__GAME_SENSOR__.getSimulationSnapshot().context.player;
      return p.supportSurfaceId === 'route-ramp:ramp' && p.y > 1 && p.y < 2.8;
    });
    await capture(page, `F-${portrait ? 'portrait' : 'desktop'}-ramp`);
    await waitFor(page, 'roof');
    await capture(page, `F-${portrait ? 'portrait' : 'desktop'}-roof`);
    await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().z > 33);
    if (portrait) await swipe(context, page); else await page.keyboard.press('w');
    await waitFor(page, 'jump');
    const jumping = await capture(page, `F-${portrait ? 'portrait' : 'desktop'}-jump`);
    expect(jumping.context.player.supportSurfaceId).toBeNull();
    await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().z > 44);
    await waitFor(page, 'ground');
    const landed = await capture(page, `F-${portrait ? 'portrait' : 'desktop'}-land`);
    expect(landed.context.state).toBe('PLAYING');
    const inputs = await page.evaluate(() => (window as any).__GAME_SENSOR__.getInputLog());
    expect(inputs.some((input: any) => input.action === 'JUMP' && input.source === (portrait ? 'TOUCH' : 'KEYBOARD'))).toBe(true);
    const trace = await page.evaluate(() => (window as any).__pao11Trace);
    expect(trace.some((p: any) => p.supportSurfaceId === 'ground' && p.z < 12)).toBe(true);
    for (const p of trace.filter((p: any) => p.supportSurfaceId === 'route-ramp:ramp')) expect(p.y).toBeCloseTo((p.z - 12) / 4, 5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('F-high-base-ramp-5-to-8-continuous-roof', async ({ page }) => {
  await fixture(page, true);
  await page.click('#resume-btn');
  await page.waitForFunction(() => {
    const p = (window as any).__GAME_SENSOR__.getSimulationSnapshot().context.player;
    return p.supportSurfaceId === 'route-ramp:ramp' && p.z >= 99 && p.z <= 103;
  });
  const slope = await capture(page, 'F-high-base-ramp');
  expect(slope.context.player.y).toBeCloseTo(5 + (slope.context.player.z - 94) / 4, 5);
  await waitFor(page, 'roof', 8);
  const roof = await capture(page, 'F-high-base-roof');
  expect(roof.context.player.y).toBe(8);
  expect(roof.context.state).toBe('PLAYING');
  const trace = await page.evaluate(() => (window as any).__pao11Trace);
  expect(trace.some((p: any) => p.supportSurfaceId === 'approach:roof')).toBe(true);
  for (const p of trace.filter((p: any) => p.supportSurfaceId === 'route-ramp:ramp')) expect(p.y).toBeCloseTo(5 + (p.z - 94) / 4, 5);
});

test('N-production-input-and-supported-snapshot', async ({ page }) => {
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  expect(await page.evaluate(() => (window as any).__QA_MODE__)).toBeUndefined();
  await capture(page, 'N-desktop-menu');
  await page.click('#start-btn');
  await page.keyboard.press('a');
  await expect.poll(async () => (await snapshot(page)).context.player.lane).toBe(0);
  await page.keyboard.press('d');
  await expect.poll(async () => (await snapshot(page)).context.player.lane).toBe(1);
  await page.keyboard.press('w'); await waitFor(page, 'jump', 0);
  await capture(page, 'N-desktop-jump');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  await capture(page, 'N-desktop-paused');
});
