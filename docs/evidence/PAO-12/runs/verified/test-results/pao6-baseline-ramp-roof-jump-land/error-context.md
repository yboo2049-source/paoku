# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pao6-baseline.spec.ts >> ramp-roof-jump-land
- Location: tests\e2e\pao6-baseline.spec.ts:64:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "PLAYING"
Received: "GAMEOVER"
```

# Page snapshot

```yaml
- dialog "Game over" [ref=e4]:
  - generic [ref=e5]:
    - heading "GAME OVER" [level=1] [ref=e6]
    - generic [ref=e7]: NEW HIGH SCORE!
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: FINAL SCORE
        - generic [ref=e11]: "4"
      - generic [ref=e12]:
        - generic [ref=e13]: COINS EARNED
        - generic [ref=e14]: "+0"
    - generic [ref=e15]: "BEST RECORD: 4"
    - button "REBOOT & RUN AGAIN" [ref=e16] [cursor=pointer]
    - button "CYBER SHOP" [ref=e17] [cursor=pointer]
    - button "MAIN MENU" [ref=e18] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { writeFile, mkdir } from 'node:fs/promises';
  3   | import { resolve } from 'node:path';
  4   |
  5   | /** PAO-6 characterization only. World entities are injected into the EXISTING
  6   |  * spawner's arrays in browser memory. Player controls use real keyboard/CDP touch.
  7   |  * No invulnerability or god mode is enabled. This is not a random-route proof. */
  8   | const dir = resolve('docs/evidence/PAO-6');
  9   | const logs: Record<string, unknown[]> = {};
  10  | const states: Record<string, unknown[]> = {};
  11  | const obstacle = (type: string, z: number, extra = {}) => ({ id: type + z, type, lane: 1, x: 0, y: 0, z, width: 2.4, height: 3, depth: 2, ...extra });
  12  |
  13  | async function snap(page: Page, name: string) {
  14  |   if (['failure', 'restart', 'mobile-paused', 'mobile-menu', 'mobile-shop'].includes(name)) await page.waitForTimeout(450);
  15  |   const data = await page.evaluate(() => {
  16  |     const w = window as any; const s = w.__GAME_SENSOR__;
  17  |     return { layout: { viewportWidth: innerWidth, viewportHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }, at: new Date().toISOString(), state: s.getGameState(), position: s.getPlayerPos(), player: s.getPlayerState(), score: s.getScore(), coins: s.getCoins(), speed: s.getSpeed(), missions: s.getMissions(), hud: document.querySelector('#hud-buffs')?.textContent, events: w.__paoEvents };
  18  |   });
  19  |   states[test.info().title].push({ name, ...data });
  20  |   await page.screenshot({ animations: 'disabled', path: resolve(dir, `fixture-${name}.png`) });
  21  |   return data;
  22  | }
  23  | async function world(page: Page, obstacles: unknown[] = [], powerups: unknown[] = [], coins: unknown[] = []) {
  24  |   await page.evaluate(({ obstacles, powerups, coins }) => {
  25  |     const w = window as any; const s = w.__GAME_SENSOR__;
  26  |     s.clearWorld(); s.setPlayerPos(0, 0, 0); s.setPlayerLane(1); s.setGodMode(false); s.grantInvulnerable(0);
  27  |     w.__paoWorld.obstacles.push(...obstacles); w.__paoWorld.powerups.push(...powerups); w.__paoWorld.coins.push(...coins);
  28  |   }, { obstacles, powerups, coins });
  29  | }
  30  | async function reach(page: Page, z: number) {
  31  |   await page.waitForFunction(z => { const s = (window as any).__GAME_SENSOR__; return s.getPlayerPos().z >= z || s.getGameState() === 'GAMEOVER'; }, z);
  32  | }
  33  | async function pause(page: Page) {
  34  |   if (await page.evaluate(() => (window as any).__GAME_SENSOR__.getGameState()) === 'PLAYING') await page.keyboard.press('Escape');
  35  | }
  36  | async function resume(page: Page) { if (await page.evaluate(() => (window as any).__GAME_SENSOR__.getGameState()) === 'PAUSED') { await expect(page.locator('#resume-btn')).toBeVisible(); await page.click('#resume-btn'); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING'); } }
  37  |
  38  | test.beforeEach(async ({ page }) => {
  39  |   await mkdir(dir, { recursive: true }); logs[test.info().title] = []; states[test.info().title] = [];
  40  |   page.on('console', m => logs[test.info().title].push({ type: m.type(), text: m.text() }));
  41  |   page.on('pageerror', e => logs[test.info().title].push({ type: 'pageerror', text: e.message }));
  42  |   page.on('requestfailed', r => logs[test.info().title].push({ type: 'requestfailed', url: r.url(), text: r.failure()?.errorText }));
  43  |   await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  44  |   await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  45  |   await page.evaluate(async () => {
  46  |     const w = window as any;
  47  |     const spawner = await import(/* @vite-ignore */ '/src/systems/spawner.ts');
  48  |     const events = await import(/* @vite-ignore */ '/src/core/eventBus.ts');
  49  |     w.__paoEvents = []; w.__paoTrace = [];
  50  |     for (const name of ['PLAYER_ACTION', 'PLAYER_LANDED', 'COIN_COLLECTED', 'POWERUP_ACTIVATED', 'HOVERBOARD_SHIELD_SHATTER', 'COLLISION', 'MISSION_COMPLETED']) events.eventBus.on(name, (payload: unknown) => w.__paoEvents.push({ name, payload, t: performance.now() }));
  51  |     spawner.spawnerSystem.update = (_z: number, obstacles: unknown[], coins: unknown[], powerups: unknown[]) => { w.__paoWorld = { obstacles, coins, powerups }; };
  52  |     const trace = () => { const s = w.__GAME_SENSOR__; if (s && s.getGameState() === 'PLAYING') w.__paoTrace.push({ t: performance.now(), ...s.getPlayerPos(), ...s.getPlayerState(), score: s.getScore(), coins: s.getCoins(), speed: s.getSpeed() }); requestAnimationFrame(trace); }; trace();
  53  |   });
  54  |   await page.click('#start-btn'); await page.waitForFunction(() => !!(window as any).__paoWorld);
  55  |   await world(page); await pause(page);
  56  | });
  57  | test.afterEach(async ({ page }) => {
  58  |   const title = test.info().title;
  59  |   const trace = await page.evaluate(() => (window as any).__paoTrace).catch(() => []);
  60  |   expect(logs[title].filter((l: any) => l.type === 'pageerror')).toEqual([]);
  61  |   await writeFile(resolve(dir, `fixture-${title}.json`), JSON.stringify({ mode: 'runtime spawner fixture, real input, godMode=false', title, browser: test.info().project.use, logs: logs[title], states: states[title], trace }, null, 2));
  62  | });
  63  |
  64  | test('ramp-roof-jump-land', async ({ page }) => {
  65  |   await world(page, [obstacle('RAMP', 18, { depth: 12 }), obstacle('STATIC_TRAIN', 33, { depth: 18 })]);
  66  |   await resume(page); await snap(page, 'ramp-approach'); await reach(page, 18); await snap(page, 'ramp-ascent');
  67  |   await reach(page, 27); const roof = await snap(page, 'roof-contact');
  68  |   expect(roof.state).toBe('PLAYING'); expect(roof.position.y).toBe(3);
  69  |   if (roof.state === 'PLAYING' || roof.state === 'PAUSED') {
  70  |     await page.keyboard.press('w'); await page.waitForTimeout(150); await snap(page, 'roof-jump');
> 71  |     await reach(page, 60); const landed = await snap(page, 'roof-exit-land'); expect(landed.state).toBe('PLAYING'); expect(landed.position.y).toBe(0);
      |                                                                                                    ^ Error: expect(received).toBe(expected) // Object.is equality
  72  |   }
  73  |   expect(await page.evaluate(() => (window as any).__paoTrace.length)).toBeGreaterThan(10);
  74  | });
  75  |
  76  | test('obstacles-failure-restart', async ({ page }) => {
  77  |   await world(page, [obstacle('LOW_OBSTACLE', 9, { height: 1.2 })]); await resume(page); await reach(page, 3); await page.keyboard.press('w'); await reach(page, 8); await pause(page); await snap(page, 'low-obstacle-jump');
  78  |   await resume(page); await reach(page, 15); await pause(page); expect((await snap(page, 'low-obstacle-result')).state).toBe('PAUSED');
  79  |   if (await page.locator('#restart-btn').isVisible()) { await page.click('#restart-btn'); await pause(page); }
  80  |   await world(page, [obstacle('HIGH_OBSTACLE', 9, { y: 1.4, height: 1.2 })]); await resume(page); await reach(page, 3); await page.keyboard.press('s'); await reach(page, 8); await pause(page); await snap(page, 'high-obstacle-roll');
  81  |   await resume(page); await reach(page, 15); await pause(page); expect((await snap(page, 'high-obstacle-result')).state).toBe('PAUSED');
  82  |   await world(page, [obstacle('STATIC_TRAIN', 9, { depth: 3 })]); await resume(page); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'GAMEOVER'); await snap(page, 'failure');
  83  |   await page.click('#restart-btn'); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING'); await pause(page); const restarted = await snap(page, 'restart'); expect(restarted.coins).toBe(0); expect(restarted.score).toBeLessThan(1);
  84  | });
  85  |
  86  | test('powerups-shield-missions', async ({ page }) => {
  87  |   const powerups = ['MAGNET', 'DOUBLE_SCORE', 'SUPER_SNEAKERS', 'HOVERBOARD'].map((type, i) => ({ id: type, type, lane: 1, x: 0, y: 1, z: 6 + i * 7, collected: false }));
  88  |   const coins = Array.from({ length: 30 }, (_, i) => ({ id: 'c' + i, lane: 0, x: -3, y: 1, z: 10 + i * .04, collected: false }));
  89  |   await world(page, [], powerups, coins); await resume(page);
  90  |   for (const [i, name] of ['magnet', 'double-score', 'super-sneakers', 'hoverboard'].entries()) { await reach(page, 6 + i * 7); await pause(page); await snap(page, name); await resume(page); }
  91  |   await pause(page); await page.evaluate(() => { const w = window as any; const z = w.__GAME_SENSOR__.getPlayerPos().z; w.__paoWorld.obstacles.push({ id: 'shield-test', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: z + 5, width: 2.4, height: 1.2, depth: 2 }); });
  92  |   await resume(page); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerState().invulnerableTimer > 0); await pause(page); await snap(page, 'shield-break');
  93  |   await page.evaluate(() => (window as any).__GAME_SENSOR__.clearWorld()); await resume(page); await page.keyboard.press('w'); await page.waitForTimeout(350); await pause(page); await snap(page, 'super-jump');
  94  |   await resume(page); await page.waitForTimeout(3000); await pause(page); await snap(page, 'mission-status');
  95  |   expect(await page.evaluate(() => (window as any).__paoEvents.filter((e: any) => e.name === 'POWERUP_ACTIVATED').length)).toBe(4);
  96  | });
  97  |
  98  | test('mobile-touch-layout', async ({ page, context }) => {
  99  |   await page.setViewportSize({ width: 390, height: 844 }); await snap(page, 'mobile-paused'); await resume(page);
  100 |   const cdp = await context.newCDPSession(page);
  101 |   async function swipe(x: number, y: number, nx: number, ny: number) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: nx, y: ny }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  102 |   await swipe(220, 600, 100, 600); await expect.poll(() => page.evaluate(() => (window as any).__GAME_SENSOR__.getPlayerState().lane)).toBe(0); await pause(page); await snap(page, 'mobile-left');
  103 |   await resume(page); await swipe(180, 650, 180, 450); await page.waitForTimeout(150); await pause(page); expect((await snap(page, 'mobile-jump')).player.isJumping).toBe(true);
  104 |   await resume(page); await swipe(180, 450, 180, 650);
  105 |   await expect.poll(() => page.evaluate(() => (window as any).__GAME_SENSOR__.getPlayerState().isRolling)).toBe(true);
  106 |   await pause(page); expect((await snap(page, 'mobile-roll')).player.isRolling).toBe(true);
  107 |   await page.click('#pause-menu-btn'); await snap(page, 'mobile-menu'); await page.click('#open-shop-btn'); await snap(page, 'mobile-shop'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  108 | });
  109 |
```
