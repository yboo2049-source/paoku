import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const dir = resolve('docs/evidence/PAO-17/bright-theme-preview', process.env.PAO17_THEME_RUN || 'preview');
test.beforeEach(async () => { await mkdir(dir, { recursive: true }); });

test('F successful legacy GLB and shadows warmed before 20 bounded recycles / 10 resets / full disposal', async ({ page }) => {
  await page.route('**/pao17-bright-fixture', r => r.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html><html><body style="margin:0"><div id="host" style="width:100vw;height:100vh"></div></body></html>' }));
  await page.goto('/pao17-bright-fixture'); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const result = await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const { BabylonRenderEngine } = await load('/src/render/babylon.ts');
    const { BRIGHT_THEME } = await load('/src/render/environment.ts');
    const renderer = new BabylonRenderEngine(document.getElementById('host')!); const r = renderer as any;
    const frame = (z: number, populated = false) => ({ state: 'PLAYING', speed: 18,
      player: { x: 0, y: 0, z, vy: 0, targetX: 0, isJumping: false, isRolling: false, invulnerableTimer: 0 }, chase: { distance: 2.8 },
      obstacles: populated ? [{ id: 'ramp', type: 'RAMP', x: 0, y: 0, z: z + 70, width: 2.4, height: 3, depth: 6 }, { id: 'train', type: 'STATIC_TRAIN', x: 0, y: 0, z: z + 79, width: 2.4, height: 3, depth: 12 }] : [],
      coinEntities: populated ? [{ id: 'coin', x: 0, y: 1, z: z + 10 }] : [], powerUpEntities: populated ? [{ id: 'magnet', type: 'MAGNET', x: 0, y: 1, z: z + 12 }] : [],
    });
    const counts = () => ({ meshes: r.scene.meshes.length, nodes: r.scene.transformNodes.length, materials: r.scene.materials.length, textures: r.scene.textures.length, animations: r.scene.animationGroups.length, skeletons: r.scene.skeletons.length, particles: r.scene.particleSystems.length, casters: r.shadowGenerator.getShadowMap()?.renderList?.length ?? 0, glow: r.glowLayer._thinEffectLayer?._includedOnlyMeshes?.length ?? 0, cache: r.playerAssets.counts });
    const draw = async (z: number, populated = false) => { renderer.render(frame(z, populated)); await new Promise(requestAnimationFrame); };
    const started = performance.now();
    while (!r.playerLease) { await draw(0, true); if (performance.now() - started > 15000) throw new Error('Actual legacy GLB did not load'); }
    const warm: unknown[] = []; let previous = ''; let stable = 0;
    for (let n = 0; n < 120; n++) {
      await draw(0, true); const current = counts(); warm.push(current); const signature = JSON.stringify(current);
      stable = signature === previous ? stable + 1 : 0; previous = signature;
      if (n >= 8 && stable >= 3 && r.scene.isReady()) break;
      if (n === 119) throw new Error('GLB/shadow warmup did not stabilize');
    }
    for (let n = 0; n < 8; n++) await draw(0);
    const baseline = counts(); const cycles = []; const resets = []; const coverage = [];
    const bounds = () => {
      const tracks = r.scene.meshes.filter((m: any) => m.metadata?.themeRole === 'track');
      return tracks.map((m: any) => { m.computeWorldMatrix(true); const box = m.getBoundingInfo().boundingBox; return [box.minimumWorld.z, box.maximumWorld.z]; }).sort((a: number[], b: number[]) => a[0] - b[0]);
    };
    for (let n = 0; n < 20; n++) { const z = n % 2 ? -120 * n - 0.1 : 360 * n + 119.999; await draw(z, true); await draw(z); cycles.push(counts()); coverage.push({ z, bounds: bounds() }); }
    for (let n = 0; n < 10; n++) { renderer.reset(); await draw(0, true); await draw(0); resets.push(counts()); }
    const parameters = { settings: BRIGHT_THEME, sky: r.scene.clearColor.toHexString(), sleeperDepthBias: r.scene.getMaterialByName('theme-sleepers').zOffset, fog: [r.scene.fogStart, r.scene.fogEnd], far: r.camera.maxZ, glow: r.glowLayer.intensity, fxaa: r.pipeline.fxaaEnabled, bloom: r.pipeline.bloomEnabled, shadow: r.shadowGenerator.getShadowMap().getRenderSize(), shadowTechnique: r.shadowGenerator.usePercentageCloserFiltering ? 'PCF-medium' : 'fallback', webGLVersion: r.engine.webGLVersion, shadowBias: r.shadowGenerator.bias, shadowNormalBias: r.shadowGenerator.normalBias, sun: r.sun.diffuse.toHexString(), sunIntensity: r.sun.intensity, fill: r.scene.getLightByName('hemiLight').diffuse.toHexString(), fillIntensity: r.scene.getLightByName('hemiLight').intensity };
    renderer.dispose(); renderer.dispose(); return { warm, baseline, cycles, resets, coverage, parameters, disposed: counts(), sceneDisposed: r.scene.isDisposed };
  });
  expect(result.baseline.cache).toEqual({ resources: 1, leases: 1, pending: 0, failed: 0 }); expect(result.baseline.glow).toBe(5); expect(result.baseline.animations).toBe(7); expect(result.baseline.skeletons).toBe(1);
  for (const c of [...result.cycles, ...result.resets]) expect(c).toEqual(result.baseline);
  for (const c of result.coverage) { expect(c.bounds.length).toBe(5); const first = Math.floor(c.z / 120) - 1; for (let n = 0; n < 5; n++) expect(c.bounds[n]).toEqual([(first + n) * 120, (first + n + 1) * 120]); expect(c.bounds[0][0]).toBeLessThanOrEqual(c.z - 9); expect(c.bounds[4][1]).toBeGreaterThanOrEqual(c.z - 9 + 280); }
  expect(result.parameters).toMatchObject({ sky: '#BEDFF4FF', sleeperDepthBias: -1, fog: [100, 250], far: 280, glow: 0.15, fxaa: true, bloom: false, shadow: 1024, shadowTechnique: 'PCF-medium', webGLVersion: 2, sun: '#FFF2D5', sunIntensity: 0.7, fill: '#D6E6F4', fillIntensity: 0.4 });
  expect(result.disposed).toEqual({ meshes: 0, nodes: 0, materials: 0, textures: 0, animations: 0, skeletons: 0, particles: 0, casters: 0, glow: 0, cache: { resources: 0, leases: 0, pending: 0, failed: 0 } }); expect(result.sceneDisposed).toBe(true); expect(errors).toEqual([]);
  await writeFile(resolve(dir, 'F-successful-warm-resources.json'), JSON.stringify({ result, errors }, null, 2));
});

for (const mobile of [false, true]) test(`N bright ${mobile ? '390 touch' : 'desktop keyboard'} motion pause resume collision and restart`, async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto('/'); await page.click('#start-btn');
  if (mobile) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 500 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: 350 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  } else { await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); }
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().z > 3);
  const sample = () => page.evaluate(() => { const s = (window as any).__GAME_SENSOR__; return { simulation: s.getSimulation(), state: s.getGameState(), player: s.getPlayerPos(), viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scroll: document.documentElement.scrollWidth } }; });
  const before = await sample(); const image = mobile ? 'N-bright-390.png' : 'N-bright-desktop.png'; await page.screenshot({ path: resolve(dir, image) }); const after = await sample();
  expect(before.viewport.scroll).toBeLessThanOrEqual(before.viewport.width);
  await page.keyboard.press('Escape'); await expect(page.locator('#resume-btn')).toBeVisible(); await page.click('#resume-btn');
  const steering = [];
  for (let attempt = 0; attempt < 100; attempt++) {
    const state = await page.evaluate(() => { const s = (window as any).__GAME_SENSOR__, c = s.getSimulationSnapshot().context; return { state: s.getGameState(), lane: c.player.lane, target: c.obstacles.filter((o: any) => o.type !== 'RAMP' && o.definitionId !== 'ramp-truck' && o.z > c.player.z + 4).sort((a: any, b: any) => a.z - b.z)[0]?.lane }; });
    steering.push(state); if (state.state === 'GAMEOVER') break;
    if (state.target !== undefined && state.target !== state.lane) {
      const right = state.target > state.lane;
      if (mobile) { const cdp = await context.newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 500 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: right ? 310 : 70, y: 500 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); }
      else await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft');
    }
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'GAMEOVER', null, { timeout: 15000 });
  await page.click('#restart-btn'); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING');
  const restarted = await sample(); expect(restarted.simulation.runId).not.toBe(before.simulation.runId); expect(restarted.player.z).toBeLessThan(10); expect(errors).toEqual([]);
  await writeFile(resolve(dir, mobile ? 'N-bright-390.json' : 'N-bright-desktop.json'), JSON.stringify({ image, before, after, restarted, steering, errors, browser: page.context().browser()?.version() }, null, 2));
});
