# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pao12-collision.spec.ts >> F-desktop-relative-high-speed-thin-train-terminal-once
- Location: tests\e2e\pao12-collision.spec.ts:79:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "PAUSED"
Received: "RUNNING"

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic:
    - generic:
      - generic:
        - generic:
          - generic "Score":
            - generic:
              - generic: SCORE
              - generic: "9"
          - generic "Coins":
            - generic:
              - generic: COINS
              - generic: "0"
        - generic:
          - button "Toggle sound" [ref=e4] [cursor=pointer]
          - button "Pause game" [ref=e7] [cursor=pointer]
      - generic:
        - generic:
          - generic: RUN SPEED
          - generic: 19 KM/H
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir, readFile, writeFile } from 'node:fs/promises';
  3   | import { resolve } from 'node:path';
  4   | import { createHash } from 'node:crypto';
  5   |
  6   | const phase = process.env.PAO12_PHASE || 'final';
  7   | const evidence = resolve('docs/evidence/PAO-12/runs', phase);
  8   | const records = new Map<string, { errors: string[]; states: unknown[] }>();
  9   | const obstacle = (id: string, type: string, z: number, extra = {}) => ({
  10  |   id, type, lane: 1, x: 0, y: 0, z, width: 2.4, height: 1.2, depth: .05, ...extra,
  11  | });
  12  | const snapshot = (page: Page) => page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
  13  | async function capture(page: Page, name: string) {
  14  |   const state = await snapshot(page);
  15  |   records.get(test.info().title)!.states.push({ name, snapshot: state });
  16  |   await page.screenshot({ path: resolve(evidence, 'screenshots', `${name}.png`), animations: 'disabled' });
  17  |   return state;
  18  | }
  19  |
  20  | test.beforeEach(async ({ page, request }) => {
  21  |   await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  22  |   records.set(test.info().title, { errors: [], states: [] });
  23  |   page.on('pageerror', error => records.get(test.info().title)!.errors.push('pageerror: ' + error.message));
  24  |   page.on('console', message => { if (['warning', 'error'].includes(message.type())) records.get(test.info().title)!.errors.push(message.type() + ': ' + message.text()); });
  25  |   page.on('requestfailed', request => records.get(test.info().title)!.errors.push(request.url() + ': ' + request.failure()?.errorText));
  26  |   const sources = [];
  27  |   for (const source of ['src/main.ts', 'src/core/simulation.ts', 'src/systems/physics.ts', 'src/systems/contacts.ts']) {
  28  |     const disk = await readFile(resolve(source), 'utf8');
  29  |     const response = await request.get(`/${source}?raw`), body = await response.text();
  30  |     const exactRawSourceMatch = response.ok() && body.includes(JSON.stringify(disk));
  31  |     expect(exactRawSourceMatch, `5183 must serve current checkout ${source}`).toBe(true);
  32  |     sources.push({ source, sha256: createHash('sha256').update(disk).digest('hex'), exactRawSourceMatch });
  33  |   }
  34  |   await writeFile(resolve(evidence, 'browser-source-identity.json'), JSON.stringify({ cwd: resolve('.'), baseURL: 'http://127.0.0.1:5183', sources }, null, 2));
  35  | });
  36  |
  37  | test.afterEach(async ({ page }) => {
  38  |   const record = records.get(test.info().title)!;
  39  |   const details = await page.evaluate(() => ({ events: (window as any).__pao12Events || [], trace: (window as any).__pao12Trace || [], userAgent: navigator.userAgent, devicePixelRatio })).catch(() => ({}));
  40  |   await writeFile(resolve(evidence, `${test.info().title}.json`), JSON.stringify({ title: test.info().title, viewport: page.viewportSize(), browserVersion: page.context().browser()?.version(), ...record, ...details }, null, 2));
  41  |   expect(record.errors).toEqual([]);
  42  | });
  43  |
  44  | // F: only existing QA controls and an in-browser spawner replacement. No game
  45  | // source writes, godMode, invulnerability grants, or changes to renderer/assets.
  46  | async function fixture(page: Page) {
  47  |   await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  48  |   await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  49  |   await page.evaluate(async () => {
  50  |     const w = window as any;
  51  |     const { spawnerSystem } = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
  52  |     const { eventBus } = await import(/* @vite-ignore */ '/src/core/eventBus.ts');
  53  |     w.__pao12Events = []; w.__pao12Trace = [];
  54  |     for (const type of ['COLLISION', 'HOVERBOARD_SHIELD_SHATTER', 'POWERUP_ACTIVATED', 'PLAYER_LANDED']) {
  55  |       eventBus.on(type, (payload: unknown) => w.__pao12Events.push({ type, payload }));
  56  |     }
  57  |     spawnerSystem.update = (_z: number, obstacles: unknown[], coins: unknown[], powerups: unknown[]) => {
  58  |       w.__pao12World = { obstacles, coins, powerups };
  59  |       w.__pao12AfterStep?.(w.__GAME_SENSOR__.getSimulationSnapshot());
  60  |     };
  61  |     const trace = () => {
  62  |       const s = w.__GAME_SENSOR__.getSimulationSnapshot(), p = s.context.player;
  63  |       if (s.context.state === 'PLAYING') w.__pao12Trace.push({ tick: s.tick, x: p.x, y: p.y, z: p.z, isRolling: p.isRolling, supportSurfaceId: p.supportSurfaceId, contact: p.contact });
  64  |       requestAnimationFrame(trace);
  65  |     };
  66  |     trace();
  67  |   });
  68  |   await page.click('#start-btn');
  69  |   await page.waitForFunction(() => !!(window as any).__pao12World);
  70  |   await page.keyboard.press('Escape');
  71  |   await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  72  |   await page.evaluate(() => {
  73  |     const w = window as any, sensor = w.__GAME_SENSOR__;
  74  |     sensor.clearWorld(); sensor.setPlayerPos(0, 0, 0);
  75  |     w.__pao12Events = []; w.__pao12Trace = [];
  76  |   });
  77  | }
  78  |
  79  | test('F-desktop-relative-high-speed-thin-train-terminal-once', async ({ page }) => {
  80  |   await fixture(page);
  81  |   await page.evaluate(train => (window as any).__pao12World.obstacles.push(train), obstacle('head-on', 'MOVING_TRAIN', 12, { speedZ: -1800, height: 3 }));
  82  |   await capture(page, 'F-desktop-head-on-before');
  83  |   await page.click('#resume-btn');
  84  |   await expect.poll(async () => (await snapshot(page)).phase).toBe('ENDED');
  85  |   const ended = await snapshot(page);
  86  |   expect(ended.context.obstacles[0].z).toBeLessThan(-.4);
  87  |   expect(ended.context.player.z).toBeGreaterThan(0);
  88  |   await page.waitForTimeout(500);
  89  |   await capture(page, 'F-desktop-head-on-ended');
  90  |   expect(await page.evaluate(() => (window as any).__pao12Events.filter((e: any) => e.type === 'COLLISION').length)).toBe(1);
  91  |   expect((await snapshot(page)).tick).toBe(ended.tick);
  92  |   await page.click('#restart-btn');
  93  |   await expect.poll(async () => (await snapshot(page)).runId).not.toBe(ended.runId);
  94  |   await page.keyboard.press('Escape');
> 95  |   await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
      |                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  96  |   await page.evaluate(train => {
  97  |     const w = window as any;
  98  |     w.__GAME_SENSOR__.clearWorld(); w.__GAME_SENSOR__.setPlayerPos(0, 0, 0);
  99  |     w.__pao12World.obstacles.push(train);
  100 |   }, obstacle('head-on', 'MOVING_TRAIN', 12, { speedZ: -1800, height: 3 }));
  101 |   await page.click('#resume-btn');
  102 |   await expect.poll(async () => (await snapshot(page)).phase).toBe('ENDED');
  103 |   expect(await page.evaluate(() => (window as any).__pao12Events.filter((e: any) => e.type === 'COLLISION').length)).toBe(2);
  104 | });
  105 |
  106 | test('F-portrait-same-tick-shield-multi-hit-single-consumption', async ({ page }) => {
  107 |   await page.setViewportSize({ width: 390, height: 844 });
  108 |   await fixture(page);
  109 |   await page.evaluate(obstacles => {
  110 |     const w = window as any;
  111 |     w.__pao12World.obstacles.push(...obstacles);
  112 |     w.__pao12World.powerups.push({ id: 'same-tick-board', type: 'HOVERBOARD', lane: 1, x: 0, y: 0, z: .3, collected: false });
  113 |   }, [obstacle('b-hit', 'LOW_OBSTACLE', .3), obstacle('a-hit', 'LOW_OBSTACLE', .3)]);
  114 |   await page.click('#resume-btn');
  115 |   await page.waitForFunction(() => (window as any).__pao12Events.some((e: any) => e.type === 'HOVERBOARD_SHIELD_SHATTER'));
  116 |   await page.waitForTimeout(120);
  117 |   const protectedState = await capture(page, 'F-portrait-shield-consumed');
  118 |   expect(protectedState.context.state).toBe('PLAYING');
  119 |   expect(protectedState.context.player).toMatchObject({ hasHoverboard: false, hoverboardActive: false });
  120 |   expect(protectedState.context.player.invulnerableTimer).toBeGreaterThan(0);
  121 |   const events = await page.evaluate(() => (window as any).__pao12Events);
  122 |   expect(events.filter((e: any) => e.type === 'HOVERBOARD_SHIELD_SHATTER')).toHaveLength(1);
  123 |   expect(events.filter((e: any) => e.type === 'COLLISION')).toHaveLength(0);
  124 |   expect(events.findIndex((e: any) => e.type === 'POWERUP_ACTIVATED')).toBeLessThan(events.findIndex((e: any) => e.type === 'HOVERBOARD_SHIELD_SHATTER'));
  125 |   await page.keyboard.press('Escape');
  126 |   await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  127 |   await capture(page, 'F-portrait-shield-paused');
  128 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  129 | });
  130 |
  131 | test('F-desktop-airborne-roll-uses-actual-height-box', async ({ page }) => {
  132 |   await fixture(page);
  133 |   await page.evaluate(() => {
  134 |     const w = window as any;
  135 |     w.__GAME_SENSOR__.setPlayerPos(0, 3, 0);
  136 |     w.__pao12AfterStep = (snapshot: any) => {
  137 |       const p = snapshot.context.player;
  138 |       if (!p.isRolling || w.__pao12World.obstacles.length) return;
  139 |       w.__pao12World.obstacles.push({ id: 'airborne-bar', type: 'HIGH_OBSTACLE', lane: 1, x: 0, y: p.y - .2, z: p.z + .6, width: 2.4, height: 2, depth: .05 });
  140 |     };
  141 |   });
  142 |   await page.click('#resume-btn');
  143 |   await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  144 |   await page.keyboard.press('s');
  145 |   await expect.poll(async () => (await snapshot(page)).phase).toBe('ENDED');
  146 |   const ended = await snapshot(page);
  147 |   expect(ended.context.player.isRolling).toBe(true);
  148 |   expect(ended.context.player.y).toBeGreaterThan(1);
  149 |   expect(await page.evaluate(() => (window as any).__pao12Events.filter((e: any) => e.type === 'COLLISION').length)).toBe(1);
  150 |   await page.waitForTimeout(450);
  151 |   await capture(page, 'F-desktop-airborne-roll-collision');
  152 | });
  153 |
  154 | test('F-browser-isolated-highest-speed-large-step-and-pose-matrix', async ({ page }) => {
  155 |   await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  156 |   const results = await page.evaluate(async () => {
  157 |     const { Simulation } = await import(/* @vite-ignore */ '/src/core/simulation.ts');
  158 |     const { updatePhysics, checkObstacleCollision } = await import(/* @vite-ignore */ '/src/systems/physics.ts');
  159 |     const { CONSTANTS } = await import(/* @vite-ignore */ '/src/types/index.ts');
  160 |     const source = (window as any).__GAME_SENSOR__.getSimulationSnapshot().context;
  161 |     const base = { ...source, player: { ...source.player, activePowerUps: new Map(source.player.activePowerUps) }, chase: { ...source.chase }, missions: source.missions.map((m: any) => ({ ...m })) };
  162 |     base.state = 'PLAYING'; base.speed = CONSTANTS.MAX_SPEED;
  163 |     base.player = { ...base.player, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isRolling: false, isJumping: false, invulnerableTimer: 0, hasHoverboard: false, hoverboardActive: false };
  164 |     base.coinEntities = []; base.powerUpEntities = [];
  165 |     const thin = { id: 'thin-static', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: 2.5, width: 2.4, height: 1.2, depth: .02 };
  166 |     base.obstacles = [thin];
  167 |     const sim = new Simulation(base, { runId: 'F-browser-isolated', seed: 12, stepSec: .125, physics: (ctx: any, dt: number, start: any) => updatePhysics(ctx, dt, undefined, start) });
  168 |     sim.step();
  169 |     const high = { ...thin, id: 'high', type: 'HIGH_OBSTACLE', y: 1.4, height: 1.2, z: 0 };
  170 |     const standing = { ...base.player }, rolling = { ...base.player, isRolling: true, rollTimer: .8 };
  171 |     return {
  172 |       level: 'F-isolated-browser-simulation-not-natural-app-run', maxSpeed: CONSTANTS.MAX_SPEED,
  173 |       stepSec: sim.stepSec, thin: sim.snapshot,
  174 |       lowStanding: checkObstacleCollision(standing, { ...thin, z: 0 }),
  175 |       lowRolling: checkObstacleCollision(rolling, { ...thin, z: 0 }),
  176 |       lowJumpClear: checkObstacleCollision({ ...standing, y: 1.3 }, { ...thin, z: 0 }),
  177 |       highStanding: checkObstacleCollision(standing, high), highRollingClear: checkObstacleCollision(rolling, high),
  178 |       airborneRollingHit: checkObstacleCollision({ ...rolling, y: 1.3, isJumping: true }, high),
  179 |     };
  180 |   });
  181 |   records.get(test.info().title)!.states.push(results);
  182 |   expect(results.maxSpeed).toBe(45); expect(results.stepSec).toBe(.125);
  183 |   expect(results.thin.phase).toBe('ENDED');
  184 |   expect(results.thin.context.player.z).toBeGreaterThan(2.5 + .41);
  185 |   expect(results).toMatchObject({ lowStanding: true, lowRolling: true, lowJumpClear: false, highStanding: true, highRollingClear: false, airborneRollingHit: true });
  186 | });
  187 |
  188 | test('F-desktop-QA-teleport-and-world-recycle-do-not-sweep-old-position', async ({ page }) => {
  189 |   await fixture(page);
  190 |   await page.evaluate(block => {
  191 |     const w = window as any;
  192 |     w.__pao12World.obstacles.push(block);
  193 |     w.__GAME_SENSOR__.setPlayerPos(0, 0, 40);
  194 |   }, obstacle('between-old-and-new', 'LOW_OBSTACLE', 20));
  195 |   await page.click('#resume-btn');
```
