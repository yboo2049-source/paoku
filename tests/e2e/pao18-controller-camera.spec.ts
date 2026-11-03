import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const dir = resolve('docs/evidence/PAO-18/controller-camera/v1');
test.beforeEach(async () => { await mkdir(dir, { recursive: true }); });

test('F actual legacy renderer: 390 framing, actual group pause, support edges and stable resources', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/pao18-fixture', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0"><div id="host" style="width:100vw;height:100vh"></div></body></html>' }));
  await page.goto('/pao18-fixture'); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const initial = await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const { BabylonRenderEngine } = await load('/src/render/babylon.ts');
    const renderer = new BabylonRenderEngine(document.getElementById('host')!); const r = renderer as any;
    const c = { state: 'PLAYING', speed: 45, player: { x: 0, y: 0, z: 0, targetX: 0, vy: 0,
      contact: 'SUPPORTED', supportSurfaceId: 'ground', supportSample: { x: 0, y: 0, z: 0 },
      isJumping: false, isRolling: false, rollTimer: 0, activePowerUps: new Map() }, chase: { distance: 1.5 }, obstacles: [], coinEntities: [], powerUpEntities: [] };
    r.engine.getDeltaTime = () => 1000 / 60;
    let tick = 0;
    const draw = async () => { renderer.render(c, { runId: 'F', tick: tick++, discontinuity: false, appState: c.state }); await new Promise(requestAnimationFrame); };
    (window as any).__pao18 = { renderer, r, c, draw };
    const start = performance.now();
    while (!r.playerLease) { await draw(); if (performance.now() - start > 20000) throw new Error('legacy player did not load'); }
    for (let i = 0; i < 20; i++) await draw();
    return { phase: r.characterView?.status.phase, scale: r.playerBodyMesh.scaling.asArray(), projection: r.cameraRig?.status.projection };
  });
  expect(initial.scale).toEqual([1, 1, 1]); expect(initial.phase).toBe('RUN'); expect(initial.projection.safe).toBe(true);
  await writeFile(resolve(dir, 'F-initial.json'), JSON.stringify(initial, null, 2));
  await page.screenshot({ path: resolve(dir, 'F-390-near.png') });
  const motionVideo = await page.evaluate(async () => {
    const { r, c, renderer, draw } = (window as any).__pao18;
    const stream = r.scene.getEngine().getRenderingCanvas().captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }); const chunks: Blob[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); }); recorder.start();
    for (let n = 0; n < 180; n++) {
      c.player.z = n * 45 / 60; c.player.targetX = n < 60 ? -3 : n < 120 ? 3 : 0;
      c.player.x += (c.player.targetX - c.player.x) * 0.15;
      const jump = n >= 40 && n < 90, t = (n - 40) / 50;
      c.player.y = jump ? Math.sin(t * Math.PI) * 3 : 0; c.player.vy = jump ? Math.cos(t * Math.PI) * 10 : 0;
      c.player.contact = jump ? 'AIRBORNE' : 'SUPPORTED'; c.player.isJumping = jump;
      c.player.isRolling = n >= 80 && n < 115; c.player.rollTimer = c.player.isRolling ? (115 - n) / 60 : 0;
      await draw();
    }
    recorder.stop(); await stopped; stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    c.player.x = c.player.y = c.player.z = c.player.targetX = 0; c.player.isJumping = c.player.isRolling = false; c.player.vy = 0;
    renderer.reset(); await draw();
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  await writeFile(resolve(dir, 'F-high-speed-presentation.webm'), Buffer.from(motionVideo));
  const lifecycle = await page.evaluate(async () => {
    const { r, c, renderer, draw } = (window as any).__pao18;
    const pose = () => r.scene.skeletons.map((s: any) => s.bones.map((b: any) => [...b.getLocalMatrix().asArray()]));
    const before = { playhead: r.characterView.status.playhead, pose: pose(), camera: r.camera.position.asArray(), officer: r.scene.getMeshByName('officerTorso').rotation.y };
    c.state = 'PAUSED'; for (let i = 0; i < 8; i++) await draw();
    const paused = { playhead: r.characterView.status.playhead, pose: pose(), camera: r.camera.position.asArray(), officer: r.scene.getMeshByName('officerTorso').rotation.y };
    const groupsPaused = r.scene.animationGroups.every((g: any) => !g.isPlaying);
    c.state = 'PLAYING'; await draw(); const resumed = r.characterView.status.playhead;
    const edges = [];
    for (const [name, y] of [['ground', 0], ['ramp', 2], ['roof', 3]] as const) {
      c.player.contact = 'AIRBORNE'; c.player.y = y + 1; c.player.vy = -3; await draw();
      c.player.contact = 'SUPPORTED'; c.player.y = y; c.player.vy = 0; c.player.supportSample.y = y; c.player.supportSurfaceId = name; await draw();
      edges.push({ name, first: r.characterView.status.landed }); await draw(); edges.push({ name, duplicate: r.characterView.status.landed });
    }
    c.player.y = 0; c.player.supportSample.y = 0; c.player.supportSurfaceId = 'ground';
    const populated = (n: number) => { c.obstacles = [{ id: 'same', type: 'STATIC_TRAIN', x: 0, y: 0, z: c.player.z + 40, width: 2.4, height: 3, depth: 12 }]; c.coinEntities = [{ id: 'coin', x: 0, y: 1, z: c.player.z + 20 }]; c.powerUpEntities = [{ id: 'magnet', type: 'MAGNET', x: 0, y: 1, z: c.player.z + 25 }]; c.player.isRolling = !!(n % 2); c.player.rollTimer = 0.5; };
    const empty = () => { c.obstacles = []; c.coinEntities = []; c.powerUpEntities = []; c.player.isRolling = false; };
    const counts = () => ({ meshes: r.scene.meshes.length, nodes: r.scene.transformNodes.length, animations: r.scene.animationGroups.length, skeletons: r.scene.skeletons.length, materials: r.scene.materials.length, textures: r.scene.textures.length, particles: r.scene.particleSystems.length, casters: r.shadowGenerator.getShadowMap()?.renderList?.length ?? 0, cache: r.playerAssets.counts });
    populated(0); for (let i = 0; i < 10; i++) await draw(); empty(); for (let i = 0; i < 10; i++) await draw();
    const baseline = counts(); const cycles = [], resets = [];
    for (let n = 0; n < 20; n++) { c.player.z = n * 360; populated(n); await draw(); empty(); for (let i = 0; i < 7; i++) await draw(); cycles.push(counts()); }
    for (let n = 0; n < 10; n++) { renderer.reset(); populated(n); await draw(); empty(); for (let i = 0; i < 7; i++) await draw(); resets.push(counts()); }
    c.player.z = 0; renderer.reset(); await draw();
    return { before, paused, groupsPaused, resumed, edges, baseline, cycles, resets };
  });
  expect(lifecycle.paused).toEqual(lifecycle.before); expect(lifecycle.groupsPaused).toBe(true); expect(lifecycle.resumed).toBeGreaterThan(lifecycle.before.playhead);
  for (const edge of lifecycle.edges) { if ('first' in edge) expect(edge.first).toBe(true); else expect(edge.duplicate).toBe(false); }
  for (const counts of [...lifecycle.cycles, ...lifecycle.resets]) expect(counts).toEqual(lifecycle.baseline);
  await writeFile(resolve(dir, 'F-lifecycle.json'), JSON.stringify(lifecycle, null, 2));
  const cases = await page.evaluate(async () => {
    const { r, c, draw } = (window as any).__pao18; const results = [];
    for (const x of [-3, 0, 3]) for (const distance of [1.5, 2.8]) for (const y of [0, 3, 8]) {
      c.player.x = c.player.targetX = x; c.chase.distance = distance; c.player.y = y;
      c.player.contact = y === 8 ? 'AIRBORNE' : 'SUPPORTED'; c.player.supportSample.y = y === 8 ? 3 : y;
      for (let i = 0; i < 30; i++) await draw();
      results.push({ x, distance, y, projection: r.cameraRig.status.projection });
    }
    return results;
  });
  for (const sample of cases) expect(sample.projection.safe, JSON.stringify(sample)).toBe(true);
  await writeFile(resolve(dir, 'F-projection-cases.json'), JSON.stringify(cases, null, 2));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(async () => { const { r, c, draw } = (window as any).__pao18; r.engine.resize(); c.player.x = c.player.targetX = 0; c.player.y = 0; c.player.contact = 'SUPPORTED'; c.player.supportSample.y = 0; for (let i = 0; i < 30; i++) await draw(); });
  await page.screenshot({ path: resolve(dir, 'F-desktop-high-speed.png') });
  const disposed = await page.evaluate(() => {
    const { r, renderer } = (window as any).__pao18; renderer.dispose(); renderer.dispose();
    return { scene: r.scene.isDisposed, meshes: r.scene.meshes.length, nodes: r.scene.transformNodes.length, animations: r.scene.animationGroups.length, materials: r.scene.materials.length, textures: r.scene.textures.length, skeletons: r.scene.skeletons.length, cache: r.playerAssets.counts, character: r.characterView.status.clip, camera: r.cameraRig.status.projection.reason };
  });
  expect(disposed).toEqual({ scene: true, meshes: 0, nodes: 0, animations: 0, materials: 0, textures: 0, skeletons: 0, cache: { resources: 0, leases: 0, pending: 0, failed: 0 }, character: null, camera: 'DISPOSED' });
  await writeFile(resolve(dir, 'F-dispose.json'), JSON.stringify(disposed, null, 2));
  expect(errors).toEqual([]);
});

test('F runtime modules raw identity and actual legacy GLB HTTP hash', async ({ request }) => {
  const hashes: Record<string, string> = {};
  for (const name of ['src/render/babylon.ts', 'src/render/characterView.ts', 'src/render/cameraRig.ts', 'src/main.ts']) {
    const disk = await readFile(name, 'utf8'); const response = await request.get('/' + name + '?raw');
    expect(response.ok()).toBe(true); const module = await response.text();
    expect(JSON.parse(module.match(/export default ("(?:\\.|[^"\\])*")/)![1])).toBe(disk);
    hashes[name] = createHash('sha256').update(disk).digest('hex');
  }
  const response = await request.get('/models/player.glb'); expect(response.ok()).toBe(true);
  const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
  expect(hash(await response.body())).toBe(hash(await readFile('public/models/player.glb')));
  await writeFile(resolve(dir, 'identity.json'), JSON.stringify({ hashes, legacyGLB: hash(await response.body()), baseURL: 'http://127.0.0.1:5188' }, null, 2));
});

for (const mobile of [false, true]) test(`N ${mobile ? '390 touch' : 'desktop keyboard'} controls, real group pause, HUD profile and restart`, async ({ page, context }) => {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.click('#start-btn');
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().z > 2);
  const swipe = async (dx: number, dy: number) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 450 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190 + dx, y: 450 + dy }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  };
  if (mobile) { await swipe(-110, 0); await swipe(0, -130); } else { await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); }
  await page.waitForTimeout(180);
  if (mobile) await swipe(0, 130); else await page.keyboard.press('ArrowDown');
  const getState = () => page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const source = await (await fetch('/src/render/babylon.ts')).text();
    const core = await load(source.match(/from\s*["']([^"']*@babylonjs_core[^"']*)["']/)![1]);
    const scene = core.EngineStore.LastCreatedScene;
    const sensor = (window as any).__GAME_SENSOR__;
    return { sim: sensor.getSimulation(), player: sensor.getSimulationSnapshot().context.player,
      pose: scene.skeletons.map((s: any) => s.bones.map((b: any) => [...b.getLocalMatrix().asArray()])),
      groups: scene.animationGroups.map((g: any) => ({ name: g.name, playing: g.isPlaying })),
      rects: [...document.querySelectorAll('.hud-top-bar,.speedometer-wrap,.buffs-wrap')].map(el => { const r = el.getBoundingClientRect(); return { name: el.className, x: r.x, y: r.y, width: r.width, height: r.height }; }),
      viewport: { width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth } };
  });
  await page.keyboard.press('Escape'); await expect(page.locator('#resume-btn')).toBeVisible();
  const before = await getState(); await page.waitForTimeout(180); const paused = await getState();
  expect(before.pose.length).toBe(1); expect(paused.pose).toEqual(before.pose); expect(paused.groups.every((g: { playing: boolean }) => !g.playing)).toBe(true);
  expect(before.player.lane).toBe(0); expect(before.viewport.scroll).toBeLessThanOrEqual(before.viewport.width);
  const top = before.rects.find(r => r.name === 'hud-top-bar')!; expect(top.y + top.height).toBeLessThanOrEqual(140);
  for (const r of before.rects.filter(r => r.name !== 'hud-top-bar')) expect(r.y).toBeGreaterThanOrEqual(before.viewport.height - 112);
  await page.click('#resume-btn'); await page.waitForTimeout(100); await page.keyboard.press('Escape');
  await page.click('#pause-restart-btn'); await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING');
  const restarted = await getState(); expect(restarted.sim.runId).not.toBe(before.sim.runId); expect(errors).toEqual([]);
  await writeFile(resolve(dir, `N-${mobile ? '390' : 'desktop'}.json`), JSON.stringify({ before, paused, restarted, errors, mode: 'N: no simulation injection', profile: 'legacy-css@f2680f4; no dynamic UI bridge' }, null, 2));
});

test('F recorded authoritative ramp-to-roof, jump/slide and pause with the production main', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: resolve('.pao18.local/recording'), size: { width: 960, height: 600 } } });
  const page = await context.newPage(); const video = page.video()!; const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { (window as any).__QA_MODE__ = true; });
  await page.goto('http://127.0.0.1:5188/');
  await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const { spawnerSystem } = await load('/src/systems/spawner.ts');
    spawnerSystem.update = (_z: number, obstacles: unknown[]) => { (window as any).__pao18world = obstacles; };
  });
  await page.click('#start-btn'); await page.waitForFunction(() => !!(window as any).__pao18world);
  await page.keyboard.press('Escape'); await expect(page.locator('#resume-btn')).toBeVisible();
  await page.evaluate(() => {
    const w = window as any, s = w.__GAME_SENSOR__; s.clearWorld(); s.setGodMode(true); s.setPlayerLane(1); s.setPlayerPos(0, 0, 63);
    w.__pao18world.push({ id: 'route-ramp', type: 'RAMP', lane: 1, x: 0, y: 0, z: 70, width: 2.4, height: 3, depth: 6 }, { id: 'route-roof', type: 'STATIC_TRAIN', lane: 1, x: 0, y: 0, z: 79, width: 2.4, height: 3, depth: 12 });
    w.__pao18trace = []; const sample = () => { const snap = s.getSimulationSnapshot(); w.__pao18trace.push({ tick: snap.tick, state: s.getGameState(), ...snap.context.player }); requestAnimationFrame(sample); }; sample();
  });
  await page.click('#resume-btn');
  await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getSimulationSnapshot().context.player.supportSurfaceId === 'route-roof:roof');
  await page.screenshot({ path: resolve(dir, 'F-roof-HUD.png') });
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(160); await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(900); await page.keyboard.press('Escape'); await expect(page.locator('#resume-btn')).toBeVisible();
  await page.waitForTimeout(150); await page.click('#resume-btn'); await page.waitForTimeout(600);
  const trace = await page.evaluate(() => (window as any).__pao18trace);
  expect(trace.some((p: any) => p.supportSurfaceId === 'route-ramp:ramp')).toBe(true);
  expect(trace.some((p: any) => p.supportSurfaceId === 'route-roof:roof')).toBe(true);
  expect(trace.some((p: any) => p.isJumping)).toBe(true); expect(trace.some((p: any) => p.isRolling)).toBe(true); expect(errors).toEqual([]);
  await context.close(); await video.saveAs(resolve(dir, 'F-ramp-jump-slide-pause.webm'));
  await writeFile(resolve(dir, 'F-ramp-trace.json'), JSON.stringify({ mode: 'F: fixed world; authoritative physics, natural keys; not N', trace, errors }, null, 2));
});

test('F real legacy request delayed across reset: same asset ID, latest skin, dispose before completion', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(r => release = r); let requests = 0;
  await page.route('**/models/player.glb', async route => { requests++; await gate; await route.continue(); });
  await page.route('**/pao18-delay', route => route.fulfill({ contentType: 'text/html', body: '<div id="host" style="width:390px;height:844px"></div>' }));
  await page.goto('/pao18-delay');
  await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const { BabylonRenderEngine } = await load('/src/render/babylon.ts');
    const renderer = new BabylonRenderEngine(document.getElementById('host')!); const r = renderer as any;
    const c = { state: 'PLAYING', speed: 18, player: { x: 0, y: 0, z: 0, targetX: 0, contact: 'SUPPORTED' }, chase: { distance: 1.5 }, obstacles: [], coinEntities: [], powerUpEntities: [] };
    renderer.render(c, { runId: 'A', tick: 0, appState: 'PLAYING', discontinuity: true }); renderer.reset();
    renderer.applySkin({ color: '#ff0000', secondaryColor: '#001122' });
    renderer.render(c, { runId: 'B', tick: 0, appState: 'PLAYING', discontinuity: true });
    (window as any).__late = { renderer, r, c };
  });
  release(); await page.waitForFunction(() => !!(window as any).__late.r.playerLease);
  const loaded = await page.evaluate(() => {
    const { r, renderer, c } = (window as any).__late; renderer.render(c);
    return { cache: r.playerAssets.counts, skin: r.scene.getMeshByName('Beta_Surface').material.albedoColor.toHexString(), skeletons: r.scene.skeletons.length, phase: r.characterView.status.phase };
  });
  expect(requests).toBe(1); expect(loaded.cache.leases).toBe(1); expect(loaded.skeletons).toBe(1); expect(loaded.skin).toBe('#FF0000'); expect(loaded.phase).toBe('RUN');
  await page.evaluate(() => (window as any).__late.renderer.dispose());
  let releaseDisposed!: () => void; const afterDispose = new Promise<void>(r => releaseDisposed = r);
  await page.unroute('**/models/player.glb'); await page.route('**/models/player.glb', async route => { await afterDispose; await route.continue(); });
  await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url); const { BabylonRenderEngine } = await load('/src/render/babylon.ts');
    const renderer = new BabylonRenderEngine(document.getElementById('host')!); const r = renderer as any;
    (window as any).__disposedLate = r;
    const pending = [...r.playerAssets.entries.values()][0] as { promise: Promise<unknown> };
    (window as any).__disposedCompletion = false;
    pending.promise.then(() => { (window as any).__disposedCompletion = true; });
    renderer.dispose();
  });
  releaseDisposed(); await page.waitForFunction(() => (window as any).__disposedCompletion === true);
  const disposed = await page.evaluate(() => { const r = (window as any).__disposedLate; return { cache: r.playerAssets.counts, scene: r.scene.isDisposed, meshes: r.scene.meshes.length, animations: r.scene.animationGroups.length, skeletons: r.scene.skeletons.length }; });
  expect(disposed).toEqual({ cache: { resources: 0, leases: 0, pending: 0, failed: 0 }, scene: true, meshes: 0, animations: 0, skeletons: 0 });
  await writeFile(resolve(dir, 'F-delayed.json'), JSON.stringify({ loaded, disposed, requests }, null, 2));
});

test('F fixed old HUD five-row profile measured with actual CSS at 390 and desktop', async ({ page }) => {
  const measurements = [];
  for (const viewport of [{ width: 390, height: 667 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport); await page.goto('/'); await page.click('#start-btn'); await page.keyboard.press('Escape');
    const rect = await page.evaluate(() => {
      const el = document.querySelector('#hud-buffs')!;
      el.innerHTML = ['HOVERBOARD ACTIVE', 'MAGNET (30.0s)', 'DOUBLE_SCORE (30.0s)', 'SUPER_SNEAKERS (30.0s)', 'HOVERBOARD (30.0s)'].map(text => `<div class="buff-pill"><span>${text}</span></div>`).join('');
      const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, viewportHeight: innerHeight };
    });
    expect(rect.top).toBeGreaterThanOrEqual(viewport.height - 240); measurements.push({ viewport, rect });
  }
  await writeFile(resolve(dir, 'F-legacy-HUD-profile.json'), JSON.stringify({ profile: { top: 140, bottom: 240, left: 8, right: 8 }, mode: 'F: exact legacy CSS with maximum five synthetic buff rows, no production DOM bridge', measurements }, null, 2));
});
