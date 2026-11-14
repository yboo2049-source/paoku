import { test, expect } from '@playwright/test';
const output = (name: string) => test.info().outputPath(name);
const attachJson = (name: string, body: unknown) => test.info().attach(name, { body: JSON.stringify(body, null, 2), contentType: 'application/json' });
test('N production exposes committed motion delivery and natural input is single-path', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.click('#start-btn');
  expect(await page.evaluate(() => typeof (window as any).__GAME_SENSOR__.getMotionBridge)).toBe('function');
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150); await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape'); await expect(page.locator('#resume-btn')).toBeVisible();
  const report = await page.evaluate(() => (window as any).__GAME_SENSOR__.getMotionBridge());
  expect(report.mode).toBe('committed-motion-v1');
  expect(report.audio.items.some((x: { type: string }) => x.type === 'ACTION_STARTED')).toBe(true);
  expect(report.faulted).toBe(false);
  const ids = report.audio.items.map((x: { eventId: string }) => x.eventId);
  expect(new Set(ids).size).toBe(ids.length);
  const frozen = report.render.character.playhead;
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getMotionBridge().render.character.playhead)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getMotionBridge().render.groupsPaused)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: output('N-paused.png') });
  await attachJson('N-main.json', report);
  await page.click('#resume-btn'); await page.waitForTimeout(80); await page.keyboard.press('Escape');
  await page.click('#pause-restart-btn'); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING');
  const fresh = await page.evaluate(() => (window as any).__GAME_SENSOR__.getMotionBridge());
  expect(fresh.audio.cursor.runId).not.toBe(report.audio.cursor.runId);
});

test('F actual multi-step production bridge, sound order, duplicate render and reentrant pause', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: output('video'), size: { width: 390, height: 844 } } });
  const page = await context.newPage(), video = page.video()!;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('http://127.0.0.1:5198/'); await page.click('#start-btn');
  expect(await page.evaluate(() => typeof (window as any).__GAME_SENSOR__.driveMotionForQa)).toBe('function');
  const report = await page.evaluate(async () => {
    const s = (window as any).__GAME_SENSOR__;
    const load = (url: string) => import(/* @vite-ignore */ url);
    const { audioEngine } = await load('/src/systems/audio.ts');
    const { eventBus } = await load('/src/core/eventBus.ts');
    const sounds: string[] = [];
    const jump = audioEngine.playJump, land = audioEngine.playLanding, coin = audioEngine.playCoin;
    audioEngine.playJump = () => sounds.push('jump'); audioEngine.playLanding = () => sounds.push('land'); audioEngine.playCoin = () => sounds.push('coin');
    s.clearWorld(); s.freezeSpawner(true); s.setGodMode(true); s.setPlayerPos(0, 0, 40);
    const before = s.getMotionBridge();
    const facts = s.driveMotionForQa([[], ['JUMP']], true);
    const duplicate = s.driveMotionForQa([], true);
    let pauses = 0;
    const observer = () => { pauses++; eventBus.emit('TOGGLE_PAUSE'); };
    eventBus.on('PLAYER_ACTION', observer);
    s.driveMotionForQa([['ROLL']], true);
    eventBus.off('PLAYER_ACTION', observer);
    audioEngine.playJump = jump; audioEngine.playLanding = land; audioEngine.playCoin = coin;
    await Promise.resolve();
    return { before, facts, duplicate, afterPause: s.getMotionBridge(), sounds, pauses, player: s.getSimulationSnapshot().context.player, state: s.getGameState() };
  });
  const fresh = report.facts.committedItems.filter((x: { eventId: string }) => !report.before.committedItems.some((old: { eventId: string }) => old.eventId === x.eventId));
  expect(fresh.map((x: { type: string }) => x.type)).toEqual(['PLAYER_LANDED', 'ACTION_STARTED']);
  for (const item of fresh) {
    expect(report.facts.audio.items.filter((x: { eventId: string }) => x.eventId === item.eventId)).toHaveLength(1);
    expect(report.facts.render.items.filter((x: { eventId: string }) => x.eventId === item.eventId)).toHaveLength(1);
  }
  expect(report.facts.render.character.phase).toBe('ASCEND');
  expect(report.duplicate.render.items).toEqual(report.facts.render.items);
  expect(report.sounds.slice(0, 2)).toEqual(['land', 'jump']);
  expect(report.pauses).toBe(1); expect(report.state).toBe('PAUSED');
  expect(report.afterPause.render.root).toMatchObject({ x: report.player.x, y: report.player.y, z: report.player.z });
  expect(report.afterPause.render.failures).toBe(0);
  await page.screenshot({ path: output('F-390-multitick.png') });
  await attachJson('F-multitick.json', { report, fresh, errors });
  expect(errors).toEqual([]);
  await context.close(); await video.saveAs(output('F-multitick-jump-roll-pause.webm'));
});

test('F failed real step keeps last commit and audio silent; original application restart recovers', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('/'); await page.click('#start-btn');
  const result = await page.evaluate(async () => {
    const s = (window as any).__GAME_SENSOR__;
    const load = (url: string) => import(/* @vite-ignore */ url);
    const { spawnerSystem } = await load('/src/systems/spawner.ts');
    const update = spawnerSystem.update;
    s.setPlayerPos(0, 0, 0); const before = s.getSimulationSnapshot(), audio = s.getMotionBridge().audio.items;
    spawnerSystem.update = () => { throw new Error('F deliberate after-physics fault'); };
    s.driveMotionForQa([['JUMP']], false); spawnerSystem.update = update;
    await Promise.resolve();
    return { before, after: s.getSimulationSnapshot(), report: s.getMotionBridge(), audio };
  });
  expect(result.after).toEqual(result.before); expect(result.report.faulted).toBe(true);
  expect(result.report.audio.items).toEqual(result.audio);
  await expect(page.locator('#pause-restart-btn')).toBeVisible();
  await page.click('#pause-restart-btn'); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING');
  expect(await page.evaluate(() => (window as any).__GAME_SENSOR__.getMotionBridge().faulted)).toBe(false);
  await attachJson('F-fault.json', result);
});

test('F HTTP raw source identity witnesses (disk hash comparison recorded by the local harness)', async ({ request }) => {
  const sources: Record<string, string> = {};
  for (const path of ['src/main.ts', 'src/types/contracts.ts', 'src/core/simulation.ts', 'src/systems/input.ts', 'src/systems/physics.ts', 'src/render/babylon.ts', 'src/render/characterView.ts', 'src/render/cameraRig.ts']) {
    const response = await request.get('/' + path + '?raw');
    expect(response.ok()).toBe(true);
    const source = await response.text();
    sources[path] = JSON.parse(source.match(/export default ("(?:\\.|[^"\\])*")/)![1]);
    expect(sources[path]).toContain('import');
  }
  const asset = await request.get('/models/player.glb'); expect(asset.ok()).toBe(true);
  expect((await asset.body()).byteLength).toBeGreaterThan(0);
  await attachJson('HTTP-raw-sources.json', sources);
});

test('F original audio API ordering and throwing legacy observer do not drain render', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('/'); await page.click('#start-btn');
  const result = await page.evaluate(async () => {
    const s = (window as any).__GAME_SENSOR__, load = (url: string) => import(/* @vite-ignore */ url);
    const { spawnerSystem } = await load('/src/systems/spawner.ts'), { eventBus } = await load('/src/core/eventBus.ts'), { audioEngine } = await load('/src/systems/audio.ts');
    const update = spawnerSystem.update, jump = audioEngine.playJump, coin = audioEngine.playCoin, crash = audioEngine.playCrash;
    s.clearWorld(); s.setPlayerPos(0, 0, 0);
    const before = s.getMotionBridge(); const calls: { method: string; tick: number }[] = [];
    const note = (method: string) => calls.push({ method, tick: s.getSimulationSnapshot().tick });
    audioEngine.playJump = () => note('jump'); audioEngine.playCoin = () => note('coin'); audioEngine.playCrash = () => note('crash');
    // F: inject only legacy non-motion audio notifications in real afterStep;
    // the JUMP and its event identity still originate in the actual input branch.
    spawnerSystem.update = () => { eventBus.emit('COIN_COLLECTED'); eventBus.emit('COLLISION'); };
    const throwing = () => { throw new Error('F observer failure'); }; eventBus.on('PLAYER_ACTION', throwing);
    const report = s.driveMotionForQa([['JUMP']], true);
    eventBus.off('PLAYER_ACTION', throwing); spawnerSystem.update = update;
    audioEngine.playJump = jump; audioEngine.playCoin = coin; audioEngine.playCrash = crash;
    return { before, report, calls };
  });
  expect(result.calls.map((c: { method: string }) => c.method)).toEqual(['jump', 'coin', 'crash']);
  expect(result.calls.every((c: { tick: number }) => c.tick === result.report.stamp.throughTick)).toBe(true);
  expect(result.report.audio.observerFailures).toBe(result.before.audio.observerFailures + 1);
  const item = result.report.committedItems.at(-1);
  expect(result.report.render.items.some((x: { eventId: string }) => x.eventId === item.eventId)).toBe(true);
  await attachJson('F-audio-order.json', result);
});

test('N touch input and restart use the same committed bridge at 390', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5198/'); await page.click('#start-btn');
  const session = await context.newCDPSession(page);
  const swipe = async (dx: number, dy: number) => {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 450 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190 + dx, y: 450 + dy }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(-110, 0); await swipe(0, -130); await page.waitForTimeout(120); await swipe(0, 130);
  // A touch-end queues an intent for the next fixed step. Pause deliberately
  // clears pending input, so observe consumption before requesting pause.
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getInputLog().some((c: { source: string; action: string }) => c.source === 'TOUCH' && c.action === 'ROLL'));
  await page.keyboard.press('Escape'); await expect(page.locator('#resume-btn')).toBeVisible();
  const report = await page.evaluate(() => (window as any).__GAME_SENSOR__.getMotionBridge());
  expect(report.render.character.factMode).toBe('COMMITTED_MOTION');
  expect(report.audio.items.filter((x: { type: string }) => x.type === 'ACTION_STARTED').length).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: output('N-390-touch-paused.png') });
  await attachJson('N-touch.json', { report, errors }); expect(errors).toEqual([]);
  await session.detach(); await context.close();
});

test('F bounded audio overflow and render failure receipts remain independent', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('/'); await page.click('#start-btn');
  const result = await page.evaluate(async () => {
    const s = (window as any).__GAME_SENSOR__, load = (url: string) => import(/* @vite-ignore */ url);
    const { spawnerSystem } = await load('/src/systems/spawner.ts'), { eventBus } = await load('/src/core/eventBus.ts');
    const { audioEngine } = await load('/src/systems/audio.ts'), { BabylonRenderEngine } = await load('/src/render/babylon.ts');
    const update = spawnerSystem.update, render = BabylonRenderEngine.prototype.render;
    const jump = audioEngine.playJump, coin = audioEngine.playCoin; let attempts = 0;
    audioEngine.playJump = () => { attempts++; }; audioEngine.playCoin = () => { attempts++; };
    s.clearWorld(); s.setPlayerPos(0, 0, 0); const before = s.getMotionBridge();
    spawnerSystem.update = () => { for (let i = 0; i < 257; i++) eventBus.emit('COIN_COLLECTED'); };
    BabylonRenderEngine.prototype.render = () => { throw new Error('F deliberately failed render attempt'); };
    const failed = s.driveMotionForQa([['JUMP']], true);
    spawnerSystem.update = update; BabylonRenderEngine.prototype.render = render;
    const retry = s.driveMotionForQa([], true);
    audioEngine.playJump = jump; audioEngine.playCoin = coin;
    return { before, failed, retry, attempts };
  });
  expect(result.attempts).toBe(256); expect(result.failed.audio.dropped - result.before.audio.dropped).toBe(2);
  const fact = result.failed.committedItems.at(-1);
  expect(result.failed.audio.items.filter((x: { eventId: string }) => x.eventId === fact.eventId)).toHaveLength(1);
  expect(result.failed.render.items.filter((x: { eventId: string; outcome: string }) => x.eventId === fact.eventId && x.outcome === 'attempt-failed')).toHaveLength(1);
  expect(result.retry.render.items).toEqual(result.failed.render.items);
  expect(result.retry.render.cursor.throughSequence).toBe(result.retry.audio.cursor.throughSequence);
  await attachJson('F-consumer-failure-overflow.json', result);
});
