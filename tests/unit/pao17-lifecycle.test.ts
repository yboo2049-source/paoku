import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@babylonjs/core', async importOriginal => {
  const core = await importOriginal<typeof import('@babylonjs/core')>();
  return { ...core, Engine: class extends core.NullEngine {} };
});
import { NullEngine, Scene, DirectionalLight, ShadowGenerator, Vector3, SceneLoader, AssetContainer, Mesh, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { BabylonRenderEngine } from '../../src/render/babylon';
import { EntityViews } from '../../src/render/entityViews';
import { SharedMaterials } from '../../src/render/assets';
import { eventBus } from '../../src/core/eventBus';
import type { GameContext } from '../../src/types';

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(f => f()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const counts = (s: Scene, shadow?: ShadowGenerator) => ({ meshes: s.meshes.length, nodes: s.transformNodes.length,
  materials: s.materials.length, textures: s.textures.length, animations: s.animationGroups.length,
  skeletons: s.skeletons.length, particles: s.particleSystems.length, casters: shadow?.getShadowMap()?.renderList?.length ?? 0 });
function host(external = false) {
  const context = { createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, clearRect() {}, fillText() {}, measureText: () => ({ width: 10 }) };
  const makeCanvas = () => ({ width: 800, height: 600, style: {}, getContext: () => context, remove: vi.fn() });
  const canvas = makeCanvas(); let created = external;
  const win = new EventTarget() as EventTarget & { innerWidth: number; innerHeight: number }; win.innerWidth = 800; win.innerHeight = 600;
  vi.stubGlobal('window', win); vi.stubGlobal('document', Object.assign(new EventTarget(), { createElement: () => { if (!created) { created = true; return canvas; } return makeCanvas(); } }));
  const container = { querySelector: () => external ? canvas : null, clientWidth: 800, clientHeight: 600, appendChild() {} };
  return { canvas, win, container: container as unknown as HTMLElement };
}

it('returns to warmed shared-cache baseline over 20 entity cycles and 10 resets, then disposes all owned resources', () => {
  const engine = new NullEngine(); cleanup.push(() => engine.dispose()); const scene = new Scene(engine);
  const shadow = new ShadowGenerator(128, new DirectionalLight('sun', new Vector3(0, -1, 0), scene));
  const mats = new SharedMaterials(scene); const views = new EntityViews(scene, shadow, mats);
  const f = { obstacles: [{ id: 'train', type: 'STATIC_TRAIN', x: 0, y: 0, z: 30, width: 2.4, height: 3, depth: 12 }], coinEntities: [{ id: 'coin', x: 0, y: 1, z: 10 }], powerUpEntities: [{ id: 'magnet', type: 'MAGNET', x: 0, y: 1, z: 20 }] } as unknown as GameContext;
  views.sync(f, 0, 0); views.reset(); const baseline = counts(scene, shadow);
  for (let i = 0; i < 20; i++) { views.sync(f, i, 0); views.sync({ ...f, obstacles: [], coinEntities: [], powerUpEntities: [] }, i, 0); expect(counts(scene, shadow)).toEqual(baseline); }
  for (let i = 0; i < 10; i++) { views.sync(f, i, 0); views.reset(); expect(counts(scene, shadow)).toEqual(baseline); }
  views.dispose(); mats.dispose(); shadow.dispose(); scene.dispose();
  expect(counts(scene)).toEqual({ meshes: 0, nodes: 0, materials: 0, textures: 0, animations: 0, skeletons: 0, particles: 0, casters: 0 });
});

it('facade unregisters exact callbacks, invalidates late loads and removes only its own canvas', async () => {
  const h = host(); let complete!: (a: AssetContainer) => void;
  vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockImplementation(() => new Promise(r => complete = r));
  const off = vi.spyOn(eventBus, 'off');
  const renderer = new BabylonRenderEngine(h.container); const internals = renderer as any;
  const scene: Scene = internals.scene; const resize = vi.spyOn(internals.engine, 'resize');
  cleanup.push(() => scene.isDisposed || scene.dispose());
  expect(typeof (renderer as any).dispose).toBe('function');
  h.win.dispatchEvent(new Event('resize')); expect(resize).toHaveBeenCalledTimes(1);
  renderer.reset(); renderer.dispose(); renderer.dispose(); renderer.reset();
  h.win.dispatchEvent(new Event('resize')); expect(resize).toHaveBeenCalledTimes(1);
  expect(off).toHaveBeenCalledWith('SKIN_CHANGED', expect.any(Function));
  expect(h.canvas.remove).toHaveBeenCalledTimes(1); expect(scene.isDisposed).toBe(true);
  const late = { meshes: [{}], dispose: vi.fn() } as unknown as AssetContainer;
  complete(late); await new Promise(r => setTimeout(r, 0)); expect(late.dispose).toHaveBeenCalledTimes(1);
  expect(internals.playerAssets.counts.resources).toBe(0);
});

it('preserves host canvas and detaches old skin listener across a real renderer remount', async () => {
  const h = host(true); vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockImplementation(() => new Promise(() => {}));
  const first = new BabylonRenderEngine(h.container); const a = first as any;
  expect(typeof a.dispose).toBe('function');
  const applyOld = vi.spyOn(first, 'applySkin'); first.dispose();
  const second = new BabylonRenderEngine(h.container); const b = second as any;
  cleanup.push(() => second.dispose());
  eventBus.emit('SKIN_CHANGED', { color: '#ff0000', secondaryColor: '#000000' });
  expect(applyOld).not.toHaveBeenCalled(); expect(b.currentSkin.color).toBe('#ff0000');
  expect(h.canvas.remove).not.toHaveBeenCalled(); expect(a.scene.isDisposed).toBe(true);
});

it('keeps primitives visible for a root-only loaded container rather than accepting an empty character', async () => {
  const h = host(); let complete!: (a: AssetContainer) => void;
  vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockImplementation(() => new Promise(r => complete = r));
  const renderer = new BabylonRenderEngine(h.container); cleanup.push(() => renderer.dispose()); const r = renderer as any;
  const container = new AssetContainer(r.scene); const root = new Mesh('empty-root', r.scene);
  container.meshes.push(root); container.removeAllFromScene(); complete(container);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(r.playerAssets.counts.failed).toBe(1); expect(root.isDisposed()).toBe(true);
  expect(r.scene.getMeshByName('torso').isVisible).toBe(true); expect(r.playerLease).toBeNull();
});

it('rolls back a partially mounted character on setup failure, keeping fallback and no instance/caster leak', async () => {
  const h = host(); let complete!: (a: AssetContainer) => void;
  vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockImplementation(() => new Promise(r => complete = r));
  const renderer = new BabylonRenderEngine(h.container); cleanup.push(() => renderer.dispose()); const r = renderer as any;
  renderer.applySkin({ color: '#ff0000', secondaryColor: '#000000' });
  vi.spyOn(renderer, 'applySkin').mockImplementation(() => { throw new Error('fixture skin setup failure'); });
  const container = new AssetContainer(r.scene); const root = new Mesh('asset-root', r.scene);
  const mesh = MeshBuilder.CreateBox('Beta_Surface', {}, r.scene); mesh.parent = root;
  const mat = new StandardMaterial('asset-material', r.scene); mesh.material = mat;
  container.meshes.push(root, mesh); container.materials.push(mat); container.geometries.push(mesh.geometry!); container.removeAllFromScene();
  const baseline = counts(r.scene, r.shadowGenerator); const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  complete(container); await new Promise(resolve => setTimeout(resolve, 0));
  expect(consoleError).toHaveBeenCalled(); expect(r.playerAssets.counts.leases).toBe(0);
  expect(counts(r.scene, r.shadowGenerator)).toEqual(baseline);
  expect(r.scene.getMeshByName('torso').isVisible).toBe(true);
});
