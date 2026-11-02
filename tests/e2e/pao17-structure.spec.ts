import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const phase = process.env.PAO17_PHASE || 'A';
const dir = resolve('docs/evidence/PAO-17/structure-lifecycle', phase);
test.beforeEach(async () => { await mkdir(dir, { recursive: true }); });
test('F source raw and legacy HTTP identity', async ({ request }) => {
  const hashes: Record<string, string> = {};
  for (const file of ['src/main.ts', 'src/render/babylon.ts', 'src/render/assets.ts', 'src/render/environment.ts', 'src/render/entityViews.ts']) {
    const text = await readFile(file, 'utf8'); const response = await request.get('/' + file + '?raw');
    expect(response.ok()).toBeTruthy();
    // Vite serializes ?raw as a JS default string; evaluate only the string literal.
    const module = await response.text(); const raw = JSON.parse(module.match(/export default ("(?:\\.|[^"\\])*")/)![1]);
    expect(raw).toBe(text); hashes[file] = createHash('sha256').update(text).digest('hex');
  }
  const bytes = await readFile('public/models/player.glb'); const response = await request.get('/models/player.glb');
  expect(response.ok()).toBeTruthy(); const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
  expect(hash(await response.body())).toBe(hash(bytes)); hashes['public/models/player.glb'] = hash(bytes);
  await writeFile(resolve(dir, 'raw-http-identity.json'), JSON.stringify({ phase, hashes }, null, 2));
});

for (const mobile of [false, true]) test(`N ${mobile ? '390 touch' : 'desktop keyboard'} legacy start motion pause resume end restart`, async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto('/'); await expect(page.locator('#start-btn')).toBeVisible(); await page.click('#start-btn');
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING');
  if (mobile) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 500 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 360 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else { await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); }
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().z > 3);
  await page.screenshot({ path: resolve(dir, mobile ? 'N-390.png' : 'N-desktop.png') });
  await page.keyboard.press('Escape'); await expect(page.locator('#resume-btn')).toBeVisible();
  await page.click('#resume-btn');
  const steering = [];
  // Observe production hazards, then use real inputs to meet one. A safe lane need not end by itself.
  for (let attempt = 0; attempt < 100; attempt++) {
    const ahead = await page.evaluate(() => {
      const sensor = (window as any).__GAME_SENSOR__; const c = sensor.getSimulationSnapshot().context;
      return { state: sensor.getGameState(), lane: c.player.lane, target: c.obstacles.filter((o: any) => o.type !== 'RAMP' && o.definitionId !== 'ramp-truck' && o.z > c.player.z + 4).sort((a: any, b: any) => a.z - b.z)[0]?.lane };
    });
    steering.push({ attempt, ...ahead });
    if (ahead.state === 'GAMEOVER') break;
    if (ahead.target !== undefined && ahead.target !== ahead.lane) {
      const right = ahead.target > ahead.lane;
      if (mobile) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 500 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: right ? 310 : 70, y: 500 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
      } else await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft');
    }
    await page.waitForTimeout(500);
  }
  await writeFile(resolve(dir, `N-${mobile ? '390' : 'desktop'}-steering.json`), JSON.stringify(steering, null, 2));
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'GAMEOVER', null, { timeout: 15000 });
  await page.click('#restart-btn');
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING');
  const state = await page.evaluate(() => { const s = (window as any).__GAME_SENSOR__; return { state: s.getGameState(), position: s.getPlayerPos(), score: s.getScore(), simulation: s.getSimulation(), scroll: document.documentElement.scrollWidth, width: innerWidth }; });
  if (mobile) await page.screenshot({ path: resolve(dir, 'N-390-restart.png') });
  expect(state.position.z).toBeLessThan(10); expect(state.scroll).toBeLessThanOrEqual(state.width);
  expect(errors).toEqual([]); await writeFile(resolve(dir, `N-${mobile ? '390' : 'desktop'}.json`), JSON.stringify({ phase, state, steering, errors, browserVersion: page.context().browser()?.version(), launchOptions: test.info().project.use.launchOptions }, null, 2));
});
