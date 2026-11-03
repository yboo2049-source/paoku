import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@babylonjs/core', async original => {
  const core = await original<typeof import('@babylonjs/core')>();
  return { ...core, Engine: class extends core.NullEngine {} };
});
import { AssetContainer, Mesh, MeshBuilder, SceneLoader, StandardMaterial } from '@babylonjs/core';
import { BabylonRenderEngine } from '../../src/render/babylon';
import { immutableCopy } from '../../src/core/snapshot';
import type { GameContext } from '../../src/types';
let renderer: BabylonRenderEngine | undefined;
afterEach(() => { renderer?.dispose(); renderer = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function host() {
  const ctx = { createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, clearRect() {} };
  const canvas = () => ({ width: 390, height: 844, style: {}, getContext: () => ctx, remove: vi.fn() });
  vi.stubGlobal('document', Object.assign(new EventTarget(), { createElement: canvas }));
  vi.stubGlobal('window', Object.assign(new EventTarget(), { innerWidth: 390, innerHeight: 844 }));
  let resolve!: (asset: AssetContainer) => void;
  vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockImplementation(() => new Promise(r => resolve = r));
  renderer = new BabylonRenderEngine({ querySelector: () => null, appendChild() {}, clientWidth: 390, clientHeight: 844 } as unknown as HTMLElement);
  const r = renderer as any; vi.spyOn(r.scene, 'render').mockImplementation(() => {}); vi.spyOn(r.engine, 'getDeltaTime').mockReturnValue(16);
  const c = immutableCopy({ state: 'PLAYING', speed: 45, player: { x: 1.25, y: 5, z: 37.7, targetX: 3,
    contact: 'AIRBORNE', vy: -2, isRolling: true, rollTimer: 0.5, isJumping: true, activePowerUps: new Map([['MAGNET', 1]]) },
    chase: { distance: 1.5 }, obstacles: [], coinEntities: [], powerUpEntities: [] } as unknown as GameContext);
  const frame = (runId = 'A', tick = 1, discontinuity = false) => ({ runId, tick, discontinuity, appState: 'PLAYING' as const });
  return { r, c, frame, resolve };
}
it('facade delegates without squash/stretch or root movement beyond presentation', () => {
  const { r, c, frame } = host(); renderer!.render(c, frame());
  expect(r.playerBodyMesh.scaling.asArray()).toEqual([1, 1, 1]);
  expect(r.playerBodyMesh.position.asArray()).toEqual([0, 0, 0]);
  expect(r.playerRoot.position.asArray()).toEqual([1.25, 5, 37.7]);
  expect(r.characterView.status.phase).toBe('AIR_TUCK');
  expect(r.cameraRig.status.projection.actors).toHaveLength(3);
  expect([...c.player.activePowerUps]).toEqual([['MAGNET', 1]]);
});
it('delegates one reset for a discontinuity and prevents stale same-id loads from mounting over latest skin', async () => {
  const { r, c, frame, resolve } = host(); renderer!.render(c, frame());
  const reset = vi.spyOn(r.characterView, 'reset');
  renderer!.reset(); renderer!.render(c, frame('B', 0, true)); renderer!.render(c, frame('B', 0, true));
  expect(reset).toHaveBeenCalledTimes(1);
  renderer!.applySkin({ color: '#ff0000', secondaryColor: '#000000' });
  const asset = new AssetContainer(r.scene); const root = new Mesh('asset', r.scene);
  const mesh = MeshBuilder.CreateBox('Beta_Surface', {}, r.scene); mesh.parent = root;
  const mat = new StandardMaterial('source', r.scene); mesh.material = mat;
  asset.meshes.push(root, mesh); asset.materials.push(mat); asset.geometries.push(mesh.geometry!); asset.removeAllFromScene();
  resolve(asset); await new Promise(r => setTimeout(r, 0));
  expect(r.playerAssets.counts.leases).toBe(1); expect(r.scene.getMeshByName('Beta_Surface')).not.toBe(mesh);
  expect(r.currentSkin.color).toBe('#ff0000'); expect(r.playerAssets.counts.pending).toBe(0);
  renderer!.dispose(); renderer!.dispose(); expect(r.playerAssets.counts.leases).toBe(0);
  expect(r.characterView.status.clip).toBeNull(); expect(r.cameraRig.status.projection.reason).toBe('DISPOSED');
});

it('settles its own pending asset consumer on dispose even when the external loader never settles', async () => {
  const { r } = host(); const pending = [...r.playerAssets.entries.values()][0] as { promise: Promise<unknown> };
  let settled = false; pending.promise.then(() => { settled = true; });
  renderer!.dispose(); await new Promise(resolve => setTimeout(resolve, 0));
  expect(settled).toBe(true); expect(r.playerAssets.counts.resources).toBe(0);
});
