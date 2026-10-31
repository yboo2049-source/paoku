# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pao10-review-fixes.spec.ts >> paused-rejects-motion-and-resume-space
- Location: tests\e2e\pao10-review-fixes.spec.ts:42:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "RUNNING"
Received: "PAUSED"

Call Log:
- Timeout 2000ms exceeded while waiting on the predicate
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
              - generic: "0"
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
          - generic: 18 KM/H
    - dialog "Paused" [ref=e10]:
      - generic [ref=e11]:
        - heading "PAUSED" [level=1] [ref=e12]
        - paragraph [ref=e13]: Game is currently paused.
        - button "RESUME RUN" [active] [ref=e14] [cursor=pointer]
        - button "RESTART" [ref=e15] [cursor=pointer]
        - button "MAIN MENU" [ref=e16] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { mkdir, writeFile, readFile } from 'node:fs/promises';
  3  | import { resolve } from 'node:path';
  4  | const evidence = resolve('docs/evidence/PAO-10/review-fixes');
  5  | const phase = process.env.PAO10_REVIEW_PHASE || 'final';
  6  | const records = new Map<string, { errors: string[]; samples: unknown[] }>();
  7  | async function snapshot(page: Page) { return page.evaluate(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot()); }
  8  | async function capture(page: Page, name: string) {
  9  |   records.get(test.info().title)!.samples.push({ name, snapshot: await snapshot(page) });
  10 |   await page.screenshot({ path: resolve(evidence, 'screenshots', `${phase}-${name}.png`), animations: 'disabled' });
  11 | }
  12 | test.beforeEach(async ({ page, request }) => {
  13 |   await mkdir(resolve(evidence, 'screenshots'), { recursive: true });
  14 |   records.set(test.info().title, { errors: [], samples: [] });
  15 |   const errors = records.get(test.info().title)!.errors;
  16 |   page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  17 |   page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
  18 |   page.on('requestfailed', r => errors.push(r.url() + ': ' + r.failure()?.errorText));
  19 |   const body = await (await request.get('/src/systems/input.ts?raw')).text();
  20 |   expect(body).toContain(JSON.stringify(await readFile(resolve('src/systems/input.ts'), 'utf8')));
  21 |   await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  22 | });
  23 | test.afterEach(async () => {
  24 |   const record = records.get(test.info().title)!;
  25 |   await writeFile(resolve(evidence, `${phase}-${test.info().title}.json`), JSON.stringify(record, null, 2));
  26 |   expect(record.errors).toEqual([]);
  27 | });
  28 |
  29 | test('native-menu-slider-and-start-space', async ({ page }) => {
  30 |   const slider = page.locator('#bgm-volume');
  31 |   await slider.focus(); const before = Number(await slider.inputValue());
  32 |   await page.keyboard.press('ArrowRight');
  33 |   expect.soft(Number(await slider.inputValue()), 'MENU slider ArrowRight must retain native behavior').toBeGreaterThan(before);
  34 |   await page.locator('#start-btn').focus();
  35 |   await page.keyboard.press('Space');
  36 |   await expect.poll(async () => (await snapshot(page)).phase, { timeout: 2000 }).toBe('RUNNING');
  37 |   // Native button activation must not also enqueue a gameplay jump.
  38 |   expect((await snapshot(page)).context.player.isJumping).toBe(false);
  39 |   await capture(page, 'desktop-native-start');
  40 | });
  41 |
  42 | test('paused-rejects-motion-and-resume-space', async ({ page }) => {
  43 |   await page.setViewportSize({ width: 390, height: 844 });
  44 |   await page.click('#start-btn'); await page.keyboard.press('Escape');
  45 |   await expect.poll(async () => (await snapshot(page)).phase).toBe('PAUSED');
  46 |   // Focus outside a control: paused motions remain rejected instead of accumulating.
  47 |   await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  48 |   const before = await snapshot(page);
  49 |   await page.keyboard.press('ArrowLeft'); await page.keyboard.press('w');
  50 |   await page.waitForTimeout(150);
  51 |   expect(await snapshot(page)).toEqual(before);
  52 |   await page.locator('#resume-btn').focus(); await page.keyboard.press('Space');
> 53 |   await expect.poll(async () => (await snapshot(page)).phase, { timeout: 2000 }).toBe('RUNNING');
     |                                                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  54 |   expect((await snapshot(page)).context.player.lane).toBe(before.context.player.lane);
  55 |   expect((await snapshot(page)).context.player.isJumping).toBe(false);
  56 |   await capture(page, 'portrait-native-resume');
  57 |   await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  58 |   await capture(page, 'portrait-stable-paused');
  59 | });
  60 |
  61 | test('playing-interactive-arrows-do-not-move-player', async ({ page }) => {
  62 |   await page.click('#start-btn');
  63 |   const before = await snapshot(page);
  64 |   await page.locator('#hud-pause-btn').focus(); await page.keyboard.press('ArrowLeft');
  65 |   await page.waitForTimeout(150);
  66 |   expect((await snapshot(page)).context.player.lane).toBe(before.context.player.lane);
  67 |   expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getInputLog())).toEqual([]);
  68 |   await capture(page, 'desktop-interactive-arrow');
  69 | });
  70 |
```
