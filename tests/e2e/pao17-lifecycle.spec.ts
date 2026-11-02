import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const dir = resolve('docs/evidence/PAO-17/structure-lifecycle', process.env.PAO17_PHASE || 'A');
test.beforeEach(async ({ page }) => {
  await mkdir(dir, { recursive: true });
  await page.route('**/pao17-fixture', r => r.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html><html><body style="margin:0"><div id="host" style="width:100vw;height:100vh"></div></body></html>' }));
  await page.goto('/pao17-fixture');
});

test('F real renderer fallback, 20 cycles / 10 resets, dispose/remount, late shared load and host canvas', async ({ page }) => {
  await page.route('**/models/player.glb', r => r.fulfill({ status: 404, body: 'PAO-17 deliberate legacy load failure' }));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const result = await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const { BabylonRenderEngine } = await load('/src/render/babylon.ts');
    const { eventBus } = await load('/src/core/eventBus.ts');
    const transformed = await (await fetch('/src/render/babylon.ts')).text();
    const coreUrl = transformed.match(/from\s*["']([^"']*@babylonjs_core[^"']*)["']/)![1];
    const core = await load(coreUrl);
    const host = document.getElementById('host')!;
    const frame = { state: 'PLAYING', speed: 18, player: { x: 0, y: 0, z: 0, vy: 0, targetX: 0, isJumping: false, isRolling: false, invulnerableTimer: 0 }, chase: { distance: 2.8 }, obstacles: [], coinEntities: [], powerUpEntities: [] };
    const renderer = new BabylonRenderEngine(host); const r = renderer as any;
    const count = () => ({ meshes: r.scene.meshes.length, nodes: r.scene.transformNodes.length, materials: r.scene.materials.length, textures: r.scene.textures.length, animations: r.scene.animationGroups.length, skeletons: r.scene.skeletons.length, particles: r.scene.particleSystems.length, casters: r.shadowGenerator.getShadowMap()?.renderList?.length ?? 0 });
    const tick = () => { renderer.render(frame); };
    for (let i = 0; i < 8; i++) { tick(); await new Promise(requestAnimationFrame); }
    // Await the actual rejected HTTP request, not a synthetic timeout success.
    while (r.playerAssets.counts.pending) await new Promise(resolve => setTimeout(resolve, 50));
    if (r.playerAssets.counts.failed !== 1) throw new Error('Expected cached legacy failure');
    const populated = { ...frame, obstacles: [{ id: 'train', type: 'STATIC_TRAIN', x: 0, y: 0, z: 30, width: 2.4, height: 3, depth: 12 }], coinEntities: [{ id: 'coin', x: 0, y: 1, z: 10 }], powerUpEntities: [{ id: 'magnet', type: 'MAGNET', x: 0, y: 1, z: 20 }] };
    renderer.render(populated); renderer.reset(); tick(); const baseline = count(); const cycles = [];
    for (let i = 0; i < 20; i++) { renderer.render(populated); tick(); cycles.push(count()); }
    const resets = []; for (let i = 0; i < 10; i++) { renderer.render(populated); renderer.reset(); tick(); resets.push(count()); }
    const oldCanvas = host.querySelector('canvas')!; renderer.dispose(); renderer.dispose(); renderer.reset(); tick();
    const disposed = { ...count(), sceneDisposed: r.scene.isDisposed, cache: r.playerAssets.counts, canvasRemoved: !oldCanvas.isConnected };
    // Real host remount with retained host canvas; synthetic resource only for controlled late arrival.
    const external = document.createElement('canvas'); host.appendChild(external);
    const original = core.SceneLoader.LoadAssetContainerAsync; let complete: (value: any) => void = () => {};
    core.SceneLoader.LoadAssetContainerAsync = () => new Promise(resolve => complete = resolve);
    const second = new BabylonRenderEngine(host); const s = second as any;
    second.dispose(); eventBus.emit('SKIN_CHANGED', { color: '#ff0000', secondaryColor: '#000000' });
    window.dispatchEvent(new Event('resize'));
    let lateDisposed = 0; complete({ meshes: [{}], dispose: () => lateDisposed++ });
    await new Promise(resolve => setTimeout(resolve, 0)); core.SceneLoader.LoadAssetContainerAsync = original;
    return { baseline, cycles, resets, disposed, lateDisposed, hostCanvasPreserved: external.isConnected, oldSkinUnchanged: s.currentSkin === null };
  });
  for (const counts of [...result.cycles, ...result.resets]) expect(counts).toEqual(result.baseline);
  expect(result.disposed).toMatchObject({ meshes: 0, nodes: 0, materials: 0, textures: 0, animations: 0, skeletons: 0, particles: 0, casters: 0, sceneDisposed: true, canvasRemoved: true });
  expect(result.lateDisposed).toBe(1); expect(result.hostCanvasPreserved).toBe(true); expect(result.oldSkinUnchanged).toBe(true);
  expect(errors).toEqual([]); await writeFile(resolve(dir, 'F-renderer-resources.json'), JSON.stringify({ result, errors }, null, 2));
});

test('F production main dispose bridge releases the actual renderer engine and scene', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.waitForFunction(() => !!(window as any).__GAME_SENSOR__);
  const result = await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const transformed = await (await fetch('/src/render/babylon.ts')).text();
    const core = await load(transformed.match(/from\s*["']([^"']*@babylonjs_core[^"']*)["']/)![1]);
    const main = await load('/src/main.ts');
    const scene = core.EngineStore.LastCreatedScene;
    const before = { engines: core.EngineStore.Instances.length, meshes: scene.meshes.length };
    main.disposeGame(); main.disposeGame();
    const { eventBus } = await load('/src/core/eventBus.ts');
    eventBus.emit('SKIN_CHANGED', { color: '#ff0000', secondaryColor: '#000000' });
    window.dispatchEvent(new Event('resize'));
    await new Promise(resolve => setTimeout(resolve, 100));
    return { before, after: { engines: core.EngineStore.Instances.length, meshes: scene.meshes.length, nodes: scene.transformNodes.length, materials: scene.materials.length, textures: scene.textures.length, animations: scene.animationGroups.length, skeletons: scene.skeletons.length, particles: scene.particleSystems.length, disposed: scene.isDisposed } };
  });
  expect(result.before.engines).toBe(1); expect(result.before.meshes).toBeGreaterThan(0);
  expect(result.after).toEqual({ engines: 0, meshes: 0, nodes: 0, materials: 0, textures: 0, animations: 0, skeletons: 0, particles: 0, disposed: true });
  expect(errors).toEqual([]); await writeFile(resolve(dir, 'F-main-release.json'), JSON.stringify({ result, errors }, null, 2));
});
