# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pao10-simulation.spec.ts >> N-mobile-production-touch
- Location: tests\e2e\pao10-simulation.spec.ts:67:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- dialog "Main menu" [ref=f1e4]:
  - generic [ref=f1e5]:
    - heading "SUBWAY SURFERS" [level=1] [ref=f1e6]
    - generic [ref=f1e7]:
      - generic [ref=f1e8]:
        - generic [ref=f1e9]: BEST SCORE
        - generic [ref=f1e10]: "0"
      - generic [ref=f1e11]:
        - generic [ref=f1e12]: TOTAL CREDITS
        - generic [ref=f1e13]: "0"
    - button "START RUN" [ref=f1e14] [cursor=pointer]
    - button "SHOP & SKINS" [ref=f1e15] [cursor=pointer]
    - generic [ref=f1e16]:
      - generic [ref=f1e17]:
        - generic [ref=f1e18]: A
        - generic [ref=f1e19]: D
        - text: /
        - generic [ref=f1e20]: ←
        - generic [ref=f1e21]: →
        - text: Move
      - generic [ref=f1e22]:
        - generic [ref=f1e23]: W
        - text: /
        - generic [ref=f1e24]: SPACE
        - text: Jump
      - generic [ref=f1e25]:
        - generic [ref=f1e26]: S
        - text: Roll
      - generic [ref=f1e27]:
        - generic [ref=f1e28]: ESC
        - text: Pause
    - generic [ref=f1e29]:
      - generic [ref=f1e30]: AUDIO SETTINGS
      - generic [ref=f1e31]:
        - 'button "MUSIC: ON" [ref=f1e32] [cursor=pointer]'
        - slider "Background music volume" [ref=f1e33]: "60"
      - generic [ref=f1e34]:
        - 'button "SFX: ON" [ref=f1e35] [cursor=pointer]'
        - slider "Sound effects volume" [ref=f1e36]: "90"
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile, readFile } from 'node:fs/promises';
  3   | import { resolve } from 'node:path';
  4   | const evidence = resolve('docs/evidence/PAO-10');
  5   | const sensor = (page: Page) => page.evaluate(() => {
  6   |   const s = (window as any).__GAME_SENSOR__;
  7   |   return { ...s.getSimulationSnapshot(), ...s.getSimulationDiagnostics(), inputs: s.getInputLog(), state: s.getGameState(), player: s.getPlayerState(), position: s.getPlayerPos(), score: s.getScore(), coins: s.getCoins() };
  8   | });
  9   | const traces = new Map<string, unknown[]>();
  10  | const errors = new Map<string, string[]>();
  11  | async function capture(page: Page, name: string) {
  12  |   if (name.includes('paused') || name.includes('failure')) await page.waitForTimeout(450);
  13  |   traces.get(test.info().title)!.push({ name, ...await sensor(page) });
  14  |   await page.screenshot({ path: resolve(evidence, 'screenshots', `${name}.png`), animations: 'disabled' });
  15  | }
  16  | test.beforeEach(async ({ page }) => {
  17  |   await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  18  |   traces.set(test.info().title, []); errors.set(test.info().title, []);
  19  |   page.on('pageerror', e => errors.get(test.info().title)!.push(e.message));
  20  |   page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.get(test.info().title)!.push(m.type() + ': ' + m.text()); });
  21  |   page.on('requestfailed', r => errors.get(test.info().title)!.push(r.url() + ': ' + r.failure()?.errorText));
  22  | });
  23  | test.afterEach(async () => {
  24  |   const title = test.info().title;
  25  |   await writeFile(resolve(evidence, `${title}.json`), JSON.stringify({ title, states: traces.get(title), errors: errors.get(title) }, null, 2));
  26  |   expect(errors.get(title)).toEqual([]);
  27  | });
  28  |
  29  | test('N-desktop-production-keyboard-flow', async ({ page, request }) => {
  30  |   const source = await (await request.get('/src/main.ts?raw')).text();
  31  |   const disk = await readFile(resolve('src/main.ts'), 'utf8');
  32  |   expect(source).toContain(JSON.stringify(disk).slice(1, 80));
  33  |   await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  34  |   expect(await page.evaluate(() => (window as any).__QA_MODE__)).toBeUndefined();
  35  |   await capture(page, 'N-desktop-menu');
  36  |   await page.click('#start-btn');
  37  |   await page.keyboard.press('a'); await expect.poll(async () => (await sensor(page)).player.lane).toBe(0);
  38  |   await page.keyboard.press('d'); await expect.poll(async () => (await sensor(page)).player.lane).toBe(1);
  39  |   await page.keyboard.press('w'); await expect.poll(async () => (await sensor(page)).player.isJumping).toBe(true);
  40  |   await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().y > 0.8);
  41  |   await capture(page, 'N-desktop-jump');
  42  |   await page.keyboard.press('s'); await expect.poll(async () => (await sensor(page)).player.isRolling).toBe(true);
  43  |   await capture(page, 'N-desktop-roll');
  44  |   await page.keyboard.press('Escape'); await expect.poll(async () => (await sensor(page)).state).toBe('PAUSED');
  45  |   await capture(page, 'N-desktop-paused');
  46  |   const paused = await sensor(page);
  47  |   await page.keyboard.press('a'); await page.keyboard.press('w'); await page.waitForTimeout(300);
  48  |   expect((await sensor(page)).tick).toBe(paused.tick);
  49  |   expect((await sensor(page)).player.lane).toBe(paused.player.lane);
  50  |   await page.click('#resume-btn');
  51  |   await expect.poll(async () => (await sensor(page)).tick).toBeGreaterThan(paused.tick);
  52  |   // Real production random world, no setters/god mode/fixture. Keep running until collision.
  53  |   await expect.poll(async () => (await sensor(page)).state, { timeout: 60000 }).toBe('GAMEOVER');
  54  |   await capture(page, 'N-desktop-failure');
  55  |   const ended = await sensor(page);
  56  |   await page.click('#restart-btn');
  57  |   await expect.poll(async () => (await sensor(page)).runId).not.toBe(ended.runId);
  58  |   const restarted = await sensor(page);
  59  |   expect(restarted.state).toBe('PLAYING'); expect(restarted.tick).toBeLessThan(60);
  60  |   expect(restarted.coins).toBe(0); expect(restarted.inputs).toEqual([]);
  61  |   await capture(page, 'N-desktop-restart');
  62  |   await page.keyboard.press('Escape'); await page.click('#pause-menu-btn');
  63  |   await expect.poll(async () => (await sensor(page)).state).toBe('MENU');
  64  |   await capture(page, 'N-desktop-return-menu');
  65  | });
  66  |
  67  | test('N-mobile-production-touch', async ({ page, context }) => {
  68  |   await page.setViewportSize({ width: 390, height: 844 });
  69  |   const cdp = await context.newCDPSession(page);
  70  |   await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  71  |   await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  72  |   await capture(page, 'N-mobile-menu'); await page.click('#start-btn');
  73  |   async function swipe(x: number, y: number, toX: number, toY: number) {
  74  |     await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  75  |     await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: toX, y: toY }] });
  76  |     await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  77  |   }
  78  |   await swipe(250, 420, 100, 420); await expect.poll(async () => (await sensor(page)).player.lane).toBe(0);
  79  |   await capture(page, 'N-mobile-left');
  80  |   await swipe(100, 420, 250, 420); await expect.poll(async () => (await sensor(page)).player.lane).toBe(1);
  81  |   await page.waitForFunction(() => Math.abs((window as any).__GAME_SENSOR__.getPlayerPos().x) < .1);
  82  |   await capture(page, 'N-mobile-centered');
> 83  |   await swipe(180, 500, 180, 300); await expect.poll(async () => (await sensor(page)).player.isJumping).toBe(true);
      |                                                                                                         ^ Error: expect(received).toBe(expected) // Object.is equality
  84  |   await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().y > .8);
  85  |   await capture(page, 'N-mobile-jump');
  86  |   await swipe(180, 350, 180, 550); await expect.poll(async () => (await sensor(page)).player.isRolling).toBe(true);
  87  |   await capture(page, 'N-mobile-gameplay');
  88  |   await page.click('#hud-pause-btn'); await expect.poll(async () => (await sensor(page)).state).toBe('PAUSED');
  89  |   await capture(page, 'N-mobile-paused');
  90  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  91  |   expect((await sensor(page)).inputs.every((c: any) => c.source === 'TOUCH')).toBe(true);
  92  |   await page.click('#resume-btn'); await expect.poll(async () => (await sensor(page)).state).toBe('PLAYING');
  93  |   await page.click('#hud-pause-btn'); await page.click('#pause-menu-btn');
  94  |   await expect.poll(async () => (await sensor(page)).state).toBe('MENU');
  95  | });
  96  |
  97  | test('F-lifecycle-clears-input-and-hidden-time', async ({ page }) => {
  98  |   await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  99  |   await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  100 |   await page.click('#start-btn');
  101 |   await page.evaluate(() => { const s = (window as any).__GAME_SENSOR__; s.freezeSpawner(true); s.clearWorld(); });
  102 |   const before = await sensor(page);
  103 |   // F: synthetic focus/visibility events in an empty QA world; actual keyboard dispatch,
  104 |   // no position writes. The browser remains on port5180 in this worktree.
  105 |   await page.evaluate(() => {
  106 |     window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
  107 |     window.dispatchEvent(new Event('blur'));
  108 |   });
  109 |   const paused = await sensor(page);
  110 |   expect(paused.phase).toBe('PAUSED'); expect(paused.player.lane).toBe(before.player.lane);
  111 |   await page.evaluate(() => {
  112 |     Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  113 |     document.dispatchEvent(new Event('visibilitychange'));
  114 |   });
  115 |   await page.waitForTimeout(600);
  116 |   expect((await sensor(page)).tick).toBe(paused.tick);
  117 |   await page.keyboard.press('d');
  118 |   await page.evaluate(() => {
  119 |     Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  120 |     document.dispatchEvent(new Event('visibilitychange'));
  121 |   });
  122 |   await page.click('#resume-btn'); await page.waitForTimeout(180);
  123 |   const resumed = await sensor(page);
  124 |   expect(resumed.tick - paused.tick).toBeLessThan(30);
  125 |   expect(resumed.position.z - paused.position.z).toBeLessThan(8);
  126 |   expect(resumed.player.lane).toBe(before.player.lane);
  127 |   expect(resumed.inputs).toEqual([]);
  128 |   expect(resumed.input.cleared).toBeGreaterThan(0);
  129 |   expect(resumed.input.paused).toBeGreaterThan(0);
  130 |   expect(resumed.timeSec).toBe(resumed.tick * resumed.stepSec);
  131 |   await capture(page, 'F-lifecycle-resumed');
  132 |   await page.keyboard.press('Escape');
  133 |   const pausedSnapshot = await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot());
  134 |   const immutable = await page.evaluate(() => {
  135 |     const s = (window as any).__GAME_SENSOR__, snapshot = s.getSimulationSnapshot();
  136 |     let rejected = 0;
  137 |     for (const action of [() => { snapshot.context.player.x = 999; }, () => { snapshot.context.obstacles.push({}); }, () => { snapshot.context.player.activePowerUps.set('MAGNET', 999); }]) {
  138 |       try { action(); } catch { rejected++; }
  139 |     }
  140 |     return { rejected, same: snapshot.context.player.x === s.getSimulationSnapshot().context.player.x,
  141 |       empty: snapshot.context.obstacles.length === 0, noEffect: !snapshot.context.player.activePowerUps.has('MAGNET'), frozen: Object.isFrozen(snapshot.context.player) };
  142 |   });
  143 |   // Non-strict JS silently ignores a frozen property assignment; Map/Array mutations throw.
  144 |   expect(immutable.rejected).toBeGreaterThanOrEqual(2);
  145 |   expect(immutable).toMatchObject({ same: true, empty: true, noEffect: true, frozen: true });
  146 |   expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot())).toEqual(pausedSnapshot);
  147 |   await capture(page, 'F-lifecycle-readonly');
  148 |   await page.click('#pause-menu-btn'); await page.click('#start-btn');
  149 |   const restarted = await sensor(page);
  150 |   expect(restarted.runId).not.toBe(resumed.runId); expect(restarted.inputs).toEqual([]);
  151 |   expect(restarted.player.lane).toBe(1);
  152 | });
  153 |
```
