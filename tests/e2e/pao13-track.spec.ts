import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const phase = process.env.PAO13_PHASE || 'final';
const evidence = resolve('docs/evidence/PAO-13/runs', phase);
const records = new Map<string, { errors: string[]; states: unknown[] }>();
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
  for (const source of ['src/main.ts', 'src/core/simulation.ts', 'src/systems/spawner.ts', 'src/systems/track.ts', 'src/data/trackSegments.ts', 'src/data/modelBindings.ts', 'src/systems/physics.ts']) {
    const disk = await readFile(resolve(source), 'utf8');
    const response = await request.get(`/${source}?raw`), body = await response.text();
    const exactRawSourceMatch = response.ok() && body.includes(JSON.stringify(disk));
    expect(exactRawSourceMatch, `5184 must serve current checkout ${source}`).toBe(true);
    sources.push({ source, sha256: createHash('sha256').update(disk).digest('hex'), exactRawSourceMatch });
  }
  await writeFile(resolve(evidence, 'browser-source-identity.json'), JSON.stringify({ cwd: resolve('.'), baseURL: 'http://127.0.0.1:5184', sources }, null, 2));
});

test.afterEach(async ({ page }) => {
  const record = records.get(test.info().title)!;
  const detail = await page.evaluate(() => ({ firstGeneratedRuns: (window as any).__pao13FirstGenerated || [], userAgent: navigator.userAgent, devicePixelRatio })).catch(() => ({}));
  await writeFile(resolve(evidence, `${test.info().title}.json`), JSON.stringify({ title: test.info().title, viewport: page.viewportSize(), browserVersion: page.context().browser()?.version(), ...record, ...detail }, null, 2));
  expect(record.errors).toEqual([]);
});

async function naturalStart(page: Page) {
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  expect(await page.evaluate(() => (window as any).__QA_MODE__)).toBeUndefined();
  // Read-only observer: preserves the first committed generated world per run.
  // It never changes simulation state, seed, time, inputs, or spawner behavior.
  await page.evaluate(() => {
    const w = window as any;
    w.__pao13FirstGenerated = [];
    const observe = () => {
      const s = w.__GAME_SENSOR__.getSimulationSnapshot();
      if (s.generation?.cursor > 0 && !w.__pao13FirstGenerated.some((r: any) => r.runId === s.runId)) {
        const normalize = (value: any): any => typeof value === 'string' ? value.replaceAll(s.runId, '<run>')
          : Array.isArray(value) ? value.map(normalize)
          : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
          : value;
        w.__pao13FirstGenerated.push({ runId: s.runId, tick: s.tick, seed: s.seed,
          generation: normalize({ ...s.generation, lastTick: 0 }),
          obstacles: normalize(s.context.obstacles.filter((o: any) => o.type !== 'MOVING_TRAIN')),
          rewards: normalize([...s.context.coinEntities, ...s.context.powerUpEntities]),
        });
      }
      requestAnimationFrame(observe);
    };
    observe();
  });
  await page.click('#start-btn');
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot().generation?.cursor > 0);
  const s = await snapshot(page);
  expect(s.generation).toMatchObject({ runId: s.runId, seed: s.seed, contentRevision: s.contentRevision, rngAlgorithmVersion: s.rngAlgorithmVersion });
  expect(s.generation.contentRevision).not.toBe('legacy-unseeded-spawner');
  expect(s.generation.rngState).toBe(s.rngState);
  expect(s.generation.lastTick).toBeLessThanOrEqual(s.tick);
  expect(s.generation.nextZ).toBeGreaterThan(s.context.player.z);
  return s;
}

test('N-desktop-seeded-generation-keyboard-and-reset', async ({ page }) => {
  await naturalStart(page);
  await page.keyboard.press('a');
  await expect.poll(async () => (await snapshot(page)).context.player.lane).toBe(0);
  await page.keyboard.press('d');
  await expect.poll(async () => (await snapshot(page)).context.player.lane).toBe(1);
  await page.keyboard.press('w');
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().y > .4);
  await capture(page, 'N-desktop-seeded-jump');
  await page.click('#hud-pause-btn');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  const paused = await capture(page, 'N-desktop-seeded-paused');
  await page.waitForTimeout(200);
  expect((await snapshot(page)).generation).toEqual(paused.generation);
  await page.click('#pause-restart-btn');
  await page.waitForFunction(oldRun => (window as any).__GAME_SENSOR__.getSimulationSnapshot().runId !== oldRun, paused.runId);
  await page.waitForFunction(() => (window as any).__pao13FirstGenerated.length === 2);
  const runs = await page.evaluate(() => (window as any).__pao13FirstGenerated);
  expect(runs[0].runId).not.toBe(runs[1].runId);
  expect(runs[0].seed).toBe(runs[1].seed);
  expect(runs[0].generation).toEqual(runs[1].generation);
  expect(runs[0].obstacles).toEqual(runs[1].obstacles);
  expect(runs[0].rewards).toEqual(runs[1].rewards);
  await page.click('#hud-pause-btn');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  const restarted = await capture(page, 'N-desktop-seeded-restart');
  expect(restarted.tick).toBeLessThan(paused.tick);
  expect(restarted.generation.cursor).toBe(runs[1].generation.cursor);
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getInputLog())).toEqual([]);
});

test('N-portrait-seeded-generation-touch', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await naturalStart(page);
  async function swipe(x: number, y: number, toX: number, toY: number) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: toX, y: toY }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await swipe(100, 420, 250, 420);
  await expect.poll(async () => (await snapshot(page)).context.player.lane).toBe(2);
  await swipe(250, 420, 100, 420);
  await expect.poll(async () => (await snapshot(page)).context.player.lane).toBe(1);
  await page.waitForFunction(() => Math.abs((window as any).__GAME_SENSOR__.getPlayerPos().x) < .1);
  await swipe(180, 500, 180, 300);
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().y > .4);
  await capture(page, 'N-portrait-seeded-jump');
  await page.click('#hud-pause-btn');
  await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  const paused = await capture(page, 'N-portrait-seeded-paused');
  expect(paused.generation.cursor).toBeGreaterThan(0);
  const inputs = await page.evaluate(() => (window as any).__GAME_SENSOR__.getInputLog());
  expect(inputs.map((i: any) => i.action)).toEqual(['RIGHT', 'LEFT', 'JUMP']);
  expect(inputs.every((i: any) => i.source === 'TOUCH')).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cdp.detach();
});

test('F-isolated-browser-real-physics-segment-and-pair-witnesses', async ({ page }) => {
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  expect((await snapshot(page)).phase).toBe('ABANDONED');
  // Ordinary preference click supplies a user gesture and avoids synthesizing
  // hundreds of simultaneous sounds from the isolated witness's legacy facts.
  await page.click('#sfx-toggle-btn');
  // F is a separate validator simulation while the real application remains in
  // its menu. Physics emits legacy bus facts, so it must not run during a live N run.
  const results = await page.evaluate(async () => {
    const { TRACK_SEGMENTS } = await import(/* @vite-ignore */ '/src/data/trackSegments.ts');
    const { validateTrackSequence } = await import(/* @vite-ignore */ '/src/systems/track.ts');
    const results = [];
    const speeds = [18, 30, 45];
    const combinations = TRACK_SEGMENTS.flatMap((a: any) => [[a], ...TRACK_SEGMENTS.map((b: any) => [a, b])]);
    for (const definitions of combinations) for (const speed of speeds) {
      const witness = validateTrackSequence(definitions, { seed: 137, speed, spawnLead: 150 });
      const trace = witness.trace || [];
      results.push({
        ...witness,
        trace: !witness.ok || (definitions.length === 1 && definitions[0].definitionId === 'ramp-truck' && speed === 45) ? trace : undefined,
        traceSamples: trace.length,
        maximumFootY: Math.max(0, ...trace.map((p: any) => p.y)),
        sawRoof: trace.some((p: any) => String(p.supportSurfaceId).endsWith(':roof')),
        sawRamp: trace.some((p: any) => String(p.supportSurfaceId).endsWith(':ramp')),
      });
    }
    return { level: 'F-isolated-browser-physics-not-natural-app-run', seed: 137,
      definitionCount: TRACK_SEGMENTS.length, speeds, results,
      applicationState: (window as any).__GAME_SENSOR__.getGameState(),
      applicationTick: (window as any).__GAME_SENSOR__.getSimulationSnapshot().tick,
    };
  });
  await writeFile(resolve(evidence, 'F-browser-route-witnesses.json'), JSON.stringify(results, null, 2));
  expect(results.applicationState).toBe('MENU');
  expect(results.applicationTick).toBe(0);
  expect(results.definitionCount).toBeGreaterThanOrEqual(4);
  expect(results.results).toHaveLength(results.definitionCount * (results.definitionCount + 1) * results.speeds.length);
  expect(results.results.filter((r: any) => !r.ok), 'all sampled witnesses must pass accepted physics').toEqual([]);
  for (const witness of results.results) {
    expect(witness.steps).toBeGreaterThan(0);
    expect(witness.traceSamples).toBeGreaterThan(0);
    expect(witness.uncollectedRewardIds).toEqual([]);
  }
  const ramp = results.results.find((r: any) => r.definitionIds.length === 1 && r.definitionIds[0] === 'ramp-truck' && r.speed === 45);
  expect(ramp).toMatchObject({ sawRamp: true, sawRoof: true });
  expect(ramp.maximumFootY).toBe(3);
  records.get(test.info().title)!.states.push({ sampledRoutes: results.results.length, level: results.level, applicationState: results.applicationState });
});
