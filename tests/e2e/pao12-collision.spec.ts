import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const phase = process.env.PAO12_PHASE || 'final';
const evidence = resolve('docs/evidence/PAO-12/runs', phase);
const records = new Map<string, { errors: string[]; states: unknown[] }>();
const obstacle = (id: string, type: string, z: number, extra = {}) => ({
  id, type, lane: 1, x: 0, y: 0, z, width: 2.4, height: 1.2, depth: .05, ...extra,
});
const snapshot = (page: Page) => page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
async function capture(page: Page, name: string) {
  const state = await snapshot(page);
  records.get(test.info().title)!.states.push({ name, snapshot: state });
  await page.screenshot({ path: resolve(evidence, 'screenshots', `${name}.png`), animations: 'disabled' });
  return state;
}

test.beforeEach(async ({ page, request }) => {
  await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  records.set(test.info().title, { errors: [], states: [] });
  page.on('pageerror', error => records.get(test.info().title)!.errors.push('pageerror: ' + error.message));
  page.on('console', message => { if (['warning', 'error'].includes(message.type())) records.get(test.info().title)!.errors.push(message.type() + ': ' + message.text()); });
  page.on('requestfailed', request => records.get(test.info().title)!.errors.push(request.url() + ': ' + request.failure()?.errorText));
  const sources = [];
  for (const source of ['src/main.ts', 'src/core/simulation.ts', 'src/systems/physics.ts', 'src/systems/contacts.ts']) {
    const disk = await readFile(resolve(source), 'utf8');
    const response = await request.get(`/${source}?raw`), body = await response.text();
    const exactRawSourceMatch = response.ok() && body.includes(JSON.stringify(disk));
    expect(exactRawSourceMatch, `5183 must serve current checkout ${source}`).toBe(true);
    sources.push({ source, sha256: createHash('sha256').update(disk).digest('hex'), exactRawSourceMatch });
  }
  await writeFile(resolve(evidence, 'browser-source-identity.json'), JSON.stringify({ cwd: resolve('.'), baseURL: 'http://127.0.0.1:5183', sources }, null, 2));
});

test.afterEach(async ({ page }) => {
  const record = records.get(test.info().title)!;
  const details = await page.evaluate(() => ({ events: (window as any).__pao12Events || [], trace: (window as any).__pao12Trace || [], userAgent: navigator.userAgent, devicePixelRatio })).catch(() => ({}));
  await writeFile(resolve(evidence, `${test.info().title}.json`), JSON.stringify({ title: test.info().title, viewport: page.viewportSize(), browserVersion: page.context().browser()?.version(), ...record, ...details }, null, 2));
  expect(record.errors).toEqual([]);
});

// F: only existing QA controls and an in-browser spawner replacement. No game
// source writes, godMode, invulnerability grants, or changes to renderer/assets.
async function fixture(page: Page) {
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  await page.evaluate(async () => {
    const w = window as any;
    const { spawnerSystem } = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
    const { eventBus } = await import(/* @vite-ignore */ '/src/core/eventBus.ts');
    w.__pao12Events = []; w.__pao12Trace = [];
    for (const type of ['COLLISION', 'HOVERBOARD_SHIELD_SHATTER', 'POWERUP_ACTIVATED', 'PLAYER_LANDED']) {
      eventBus.on(type, (payload: unknown) => w.__pao12Events.push({ type, payload }));
    }
    spawnerSystem.update = (_z: number, obstacles: unknown[], coins: unknown[], powerups: unknown[]) => {
      w.__pao12World = { obstacles, coins, powerups, runId: w.__GAME_SENSOR__.getSimulationSnapshot().runId };
      w.__pao12AfterStep?.(w.__GAME_SENSOR__.getSimulationSnapshot());
    };
    const trace = () => {
      const s = w.__GAME_SENSOR__.getSimulationSnapshot(), p = s.context.player;
      if (s.context.state === 'PLAYING') w.__pao12Trace.push({ tick: s.tick, x: p.x, y: p.y, z: p.z, isRolling: p.isRolling, supportSurfaceId: p.supportSurfaceId, contact: p.contact });
      requestAnimationFrame(trace);
    };
    trace();
  });
  await page.click('#start-btn');
  await page.waitForFunction(() => !!(window as any).__pao12World);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  await page.evaluate(() => {
    const w = window as any, sensor = w.__GAME_SENSOR__;
    sensor.clearWorld(); sensor.setPlayerPos(0, 0, 0);
    w.__pao12Events = []; w.__pao12Trace = [];
  });
}

test('F-desktop-relative-high-speed-thin-train-terminal-once', async ({ page }) => {
  await fixture(page);
  await page.evaluate(train => (window as any).__pao12World.obstacles.push(train), obstacle('head-on', 'MOVING_TRAIN', 12, { speedZ: -1800, height: 3 }));
  await capture(page, 'F-desktop-head-on-before');
  await page.click('#resume-btn');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('ENDED');
  const ended = await snapshot(page);
  expect(ended.context.obstacles[0].z).toBeLessThan(-.4);
  expect(ended.context.player.z).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await capture(page, 'F-desktop-head-on-ended');
  expect(await page.evaluate(() => (window as any).__pao12Events.filter((e: any) => e.type === 'COLLISION').length)).toBe(1);
  expect((await snapshot(page)).tick).toBe(ended.tick);
  await page.click('#restart-btn');
  await expect.poll(async () => (await snapshot(page)).runId).not.toBe(ended.runId);
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__pao12World.runId === w.__GAME_SENSOR__.getSimulationSnapshot().runId;
  });
  const restartBoundary = await page.evaluate(() => ({
    name: 'restart-before-pause-UI-boundary',
    activeElement: { id: document.activeElement?.id, tagName: document.activeElement?.tagName },
    hudPausePresent: !!document.querySelector('#hud-pause-btn'),
    state: (window as any).__GAME_SENSOR__.getGameState(),
  }));
  records.get(test.info().title)!.states.push(restartBoundary);
  // Restart updates the owner synchronously; Escape's legacy UI handler reads
  // lastState on the next render. Wait for the actual new-run HUD and click it.
  await page.click('#hud-pause-btn');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  await page.evaluate(train => {
    const w = window as any;
    w.__GAME_SENSOR__.clearWorld(); w.__GAME_SENSOR__.setPlayerPos(0, 0, 0);
    w.__pao12World.obstacles.push(train);
  }, obstacle('head-on', 'MOVING_TRAIN', 12, { speedZ: -1800, height: 3 }));
  await page.click('#resume-btn');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('ENDED');
  expect(await page.evaluate(() => (window as any).__pao12Events.filter((e: any) => e.type === 'COLLISION').length)).toBe(2);
});

test('F-portrait-same-tick-shield-multi-hit-single-consumption', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.evaluate(obstacles => {
    const w = window as any;
    w.__pao12World.obstacles.push(...obstacles);
    w.__pao12World.powerups.push({ id: 'same-tick-board', type: 'HOVERBOARD', lane: 1, x: 0, y: 0, z: .3, collected: false });
  }, [obstacle('b-hit', 'LOW_OBSTACLE', .3), obstacle('a-hit', 'LOW_OBSTACLE', .3)]);
  await page.click('#resume-btn');
  await page.waitForFunction(() => (window as any).__pao12Events.some((e: any) => e.type === 'HOVERBOARD_SHIELD_SHATTER'));
  await page.waitForTimeout(120);
  const protectedState = await capture(page, 'F-portrait-shield-consumed');
  expect(protectedState.context.state).toBe('PLAYING');
  expect(protectedState.context.player).toMatchObject({ hasHoverboard: false, hoverboardActive: false });
  expect(protectedState.context.player.invulnerableTimer).toBeGreaterThan(0);
  const events = await page.evaluate(() => (window as any).__pao12Events);
  expect(events.filter((e: any) => e.type === 'HOVERBOARD_SHIELD_SHATTER')).toHaveLength(1);
  expect(events.filter((e: any) => e.type === 'COLLISION')).toHaveLength(0);
  expect(events.findIndex((e: any) => e.type === 'POWERUP_ACTIVATED')).toBeLessThan(events.findIndex((e: any) => e.type === 'HOVERBOARD_SHIELD_SHATTER'));
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  await capture(page, 'F-portrait-shield-paused');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('F-desktop-airborne-roll-uses-actual-height-box', async ({ page }) => {
  await fixture(page);
  await page.evaluate(() => {
    const w = window as any;
    w.__GAME_SENSOR__.setPlayerPos(0, 3, 0);
    w.__pao12AfterStep = (snapshot: any) => {
      const p = snapshot.context.player;
      if (!p.isRolling || w.__pao12World.obstacles.length) return;
      w.__pao12World.obstacles.push({ id: 'airborne-bar', type: 'HIGH_OBSTACLE', lane: 1, x: 0, y: p.y - .2, z: p.z + .6, width: 2.4, height: 2, depth: .05 });
    };
  });
  await page.click('#resume-btn');
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press('s');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('ENDED');
  const ended = await snapshot(page);
  expect(ended.context.player.isRolling).toBe(true);
  expect(ended.context.player.y).toBeGreaterThan(1);
  expect(await page.evaluate(() => (window as any).__pao12Events.filter((e: any) => e.type === 'COLLISION').length)).toBe(1);
  await page.waitForTimeout(450);
  await capture(page, 'F-desktop-airborne-roll-collision');
});

test('F-browser-isolated-highest-speed-large-step-and-pose-matrix', async ({ page }) => {
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  const results = await page.evaluate(async () => {
    const { Simulation } = await import(/* @vite-ignore */ '/src/core/simulation.ts');
    const { updatePhysics, checkObstacleCollision } = await import(/* @vite-ignore */ '/src/systems/physics.ts');
    const { CONSTANTS } = await import(/* @vite-ignore */ '/src/types/index.ts');
    const source = (window as any).__GAME_SENSOR__.getSimulationSnapshot().context;
    const base = { ...source, player: { ...source.player, activePowerUps: new Map(source.player.activePowerUps) }, chase: { ...source.chase }, missions: source.missions.map((m: any) => ({ ...m })) };
    base.state = 'PLAYING'; base.speed = CONSTANTS.MAX_SPEED;
    base.player = { ...base.player, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isRolling: false, isJumping: false, invulnerableTimer: 0, hasHoverboard: false, hoverboardActive: false };
    base.coinEntities = []; base.powerUpEntities = [];
    const thin = { id: 'thin-static', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: 2.5, width: 2.4, height: 1.2, depth: .02 };
    base.obstacles = [thin];
    const sim = new Simulation(base, { runId: 'F-browser-isolated', seed: 12, stepSec: .125, physics: (ctx: any, dt: number, start: any) => updatePhysics(ctx, dt, undefined, start) });
    sim.step();
    const high = { ...thin, id: 'high', type: 'HIGH_OBSTACLE', y: 1.4, height: 1.2, z: 0 };
    const standing = { ...base.player }, rolling = { ...base.player, isRolling: true, rollTimer: .8 };
    return {
      level: 'F-isolated-browser-simulation-not-natural-app-run', maxSpeed: CONSTANTS.MAX_SPEED,
      stepSec: sim.stepSec, thin: sim.snapshot,
      lowStanding: checkObstacleCollision(standing, { ...thin, z: 0 }),
      lowRolling: checkObstacleCollision(rolling, { ...thin, z: 0 }),
      lowJumpClear: checkObstacleCollision({ ...standing, y: 1.3 }, { ...thin, z: 0 }),
      highStanding: checkObstacleCollision(standing, high), highRollingClear: checkObstacleCollision(rolling, high),
      airborneRollingHit: checkObstacleCollision({ ...rolling, y: 1.3, isJumping: true }, high),
    };
  });
  records.get(test.info().title)!.states.push(results);
  expect(results.maxSpeed).toBe(45); expect(results.stepSec).toBe(.125);
  expect(results.thin.phase).toBe('ENDED');
  expect(results.thin.context.player.z).toBeGreaterThan(2.5 + .41);
  expect(results).toMatchObject({ lowStanding: true, lowRolling: true, lowJumpClear: false, highStanding: true, highRollingClear: false, airborneRollingHit: true });
});

test('F-desktop-QA-teleport-and-world-recycle-do-not-sweep-old-position', async ({ page }) => {
  await fixture(page);
  await page.evaluate(block => {
    const w = window as any;
    w.__pao12World.obstacles.push(block);
    w.__GAME_SENSOR__.setPlayerPos(0, 0, 40);
  }, obstacle('between-old-and-new', 'LOW_OBSTACLE', 20));
  await page.click('#resume-btn');
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().z > 43);
  expect((await snapshot(page)).phase).toBe('RUNNING');
  expect(await page.evaluate(() => (window as any).__pao12Events.filter((e: any) => e.type === 'COLLISION').length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  await page.evaluate(() => {
    const w = window as any;
    w.__GAME_SENSOR__.clearWorld(); w.__GAME_SENSOR__.setPlayerLane(0);
    w.__GAME_SENSOR__.setPlayerPos(-3, 0, 0);
  });
  const changed = await snapshot(page);
  expect(changed.context.player.supportSample).toBeUndefined();
  expect(changed.context.player.supportDeparture ?? null).toBeNull();
  expect(changed.context.player.collisionEnded).not.toBe(true);
  await page.click('#resume-btn');
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().z > 3);
  expect((await snapshot(page)).phase).toBe('RUNNING');
  await capture(page, 'F-desktop-teleport-recycled');
});
