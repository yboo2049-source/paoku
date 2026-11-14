import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@babylonjs/core', async original => {
  const core = await original<typeof import('@babylonjs/core')>();
  return { ...core, Engine: class extends core.NullEngine {} };
});
import { SceneLoader } from '@babylonjs/core';
import { BabylonRenderEngine } from '../../src/render/babylon';
import { immutableCopy } from '../../src/core/snapshot';
import type { GameContext } from '../../src/types';

let renderer: BabylonRenderEngine | undefined;
afterEach(() => { renderer?.dispose(); renderer = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function boot() {
  const context = { createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, clearRect() {} };
  const canvas = () => ({ width: 800, height: 600, style: {}, getContext: () => context, remove() {} });
  vi.stubGlobal('document', Object.assign(new EventTarget(), { createElement: canvas }));
  vi.stubGlobal('window', Object.assign(new EventTarget(), { innerWidth: 800, innerHeight: 600 }));
  vi.spyOn(SceneLoader, 'LoadAssetContainerAsync').mockImplementation(() => new Promise(() => {}));
  renderer = new BabylonRenderEngine({ querySelector: () => null, appendChild() {}, clientWidth: 800, clientHeight: 600 } as unknown as HTMLElement);
  const internals = renderer as any; vi.spyOn(internals.scene, 'render').mockImplementation(() => {});
  const cleared = vi.spyOn(internals.entityViews, 'reset');
  const ctx = immutableCopy({ state: 'PLAYING', speed: 18, player: { x: 1.25, y: 4, z: 17.125, targetX: 3, vy: 0, isJumping: true, isRolling: false, invulnerableTimer: 0, activePowerUps: new Map([['MAGNET', 4]]) }, chase: { distance: 2.8 }, obstacles: [{ id: 'same', type: 'STATIC_TRAIN', x: 0, y: 0, z: 30, width: 2.4, height: 3, depth: 12 }], coinEntities: [], powerUpEntities: [] } as unknown as GameContext);
  const frame = (runId = 'A', tick = 5, discontinuity = true) => ({ runId, tick, discontinuity, appState: 'PLAYING' as const });
  return { renderer, internals, cleared, ctx, frame };
}
it('consumes one discontinuity per run/tick while repeated render frames preserve the instance and exact supplied position', () => {
  const { renderer: r, internals: i, cleared, ctx, frame } = boot();
  r.render(ctx, frame()); expect(cleared).toHaveBeenCalledTimes(1);
  const mesh = i.scene.getMeshByName('train_same');
  for (let n = 0; n < 4; n++) r.render(ctx, frame());
  expect(cleared).toHaveBeenCalledTimes(1); expect(i.scene.getMeshByName('train_same')).toBe(mesh);
  expect(i.playerRoot.position.asArray()).toEqual([1.25, 4, 17.125]);
  expect([...ctx.player.activePowerUps]).toEqual([['MAGNET', 4]]);
  r.render(ctx, frame('A', 6)); expect(cleared).toHaveBeenCalledTimes(2);
  r.render(ctx, frame('A', 6)); expect(cleared).toHaveBeenCalledTimes(2);
});
it('merges explicit reset with the next new-run boundary, invalidates old same-id views and supports legacy no-envelope calls', () => {
  const { renderer: r, internals: i, cleared, ctx, frame } = boot();
  r.render(ctx, frame()); const mesh = i.scene.getMeshByName('train_same');
  r.reset(); const epoch = i.epoch; r.render(ctx, frame('B', 0));
  expect(i.epoch).toBe(epoch); expect(cleared).toHaveBeenCalledTimes(2);
  expect(i.scene.getMeshByName('train_same')).not.toBe(mesh);
  r.render(ctx, frame('B', 0)); expect(cleared).toHaveBeenCalledTimes(2);
  r.reset(); r.render(ctx); expect(i.playerRoot.position.z).toBe(17.125);
  expect(i.playerAssets.counts.pending).toBe(1);
});
it('freezes the local effect clock during pause, with no change to supplied snapshots', () => {
  const { renderer: r, internals: i, ctx, frame } = boot();
  vi.spyOn(i.engine, 'getDeltaTime').mockReturnValue(16);
  r.render(ctx, frame()); const time = i.totalTime;
  const paused = immutableCopy({ ...ctx, state: 'PAUSED' as const });
  r.render(paused, { ...frame('A', 6, false), appState: 'PAUSED' });
  expect(i.totalTime).toBe(time); expect(i.playerRoot.position.z).toBe(ctx.player.z);
});
