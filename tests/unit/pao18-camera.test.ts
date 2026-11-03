import { afterEach, expect, it } from 'vitest';
import { MeshBuilder, NullEngine, Scene, TargetCamera, TransformNode, Vector3 } from '@babylonjs/core';
import { CameraRig, actorBounds, projectActors, legacyHudProfile } from '../../src/render/cameraRig';
import type { GameContext } from '../../src/types';
const clean: (() => void)[] = [];
afterEach(() => clean.splice(0).reverse().forEach(f => f()));
function boot(width = 390, height = 844) {
  const engine = new NullEngine({ renderWidth: width, renderHeight: height, textureSize: 128, deterministicLockstep: false, lockstepMaxSteps: 4 }); clean.push(() => engine.dispose());
  const scene = new Scene(engine); const camera = new TargetCamera('camera', new Vector3(0, 4.5, -9), scene);
  const rig = new CameraRig(camera);
  const roots = [new TransformNode('player', scene), new TransformNode('officer', scene), new TransformNode('dog', scene)];
  roots.forEach((r, i) => { const m = MeshBuilder.CreateBox('actor', { width: i === 2 ? 0.6 : 1, height: i === 2 ? 0.9 : 2.3, depth: 0.9 }, scene); m.parent = r; m.position.y = i === 2 ? 0.45 : 1.15; });
  roots[1].position.set(1.25, 0, -1.5); roots[2].position.set(1.8, 0, -1.3);
  const ctx = { state: 'PLAYING', speed: 45, player: { x: 0, y: 0, z: 0, targetX: 0, contact: 'SUPPORTED', supportSample: { y: 0 } } } as unknown as GameContext;
  return { rig, roots, camera, ctx, input: { width, height, safeArea: legacyHudProfile(width, height) }, actors: () => roots.map(r => actorBounds(r.name, r)) };
}

it('reserves the fixed old HUD maximum five buff rows as well as its speedometer', () => {
  expect(legacyHudProfile(390, 667).bottom).toBeGreaterThanOrEqual(240);
});

it.each([[390, 844], [390, 667], [1440, 900]])('projects all three actual actor bounds inside %ix%i safe area without moving actors', (w, h) => {
  const f = boot(w, h); const before = f.roots.map(r => r.position.asArray());
  f.rig.sync(f.ctx, f.actors(), f.input, 0.016);
  const result = projectActors(f.camera, f.actors(), f.input);
  expect(result.safe).toBe(true); expect(result.actors).toHaveLength(3);
  for (const a of result.actors) { expect(a.front).toBe(true); expect(a.minX).toBeGreaterThanOrEqual(8); expect(a.maxY).toBeLessThanOrEqual(h - 112); }
  expect(f.roots.map(r => r.position.asArray())).toEqual(before);
});

it('uses separate position and target support buffers and resets discontinuities directly', () => {
  const f = boot(); f.rig.sync(f.ctx, f.actors(), f.input, 0.016);
  f.ctx.player.y = 5; f.ctx.player.supportSample = { x: 0, y: 5, z: 0 };
  f.rig.sync(f.ctx, f.actors(), f.input, 0.02);
  expect(f.rig.status.positionHeight).toBeGreaterThan(f.rig.status.targetHeight);
  expect(f.rig.status.positionHeight).toBeLessThan(5);
  f.ctx.player.contact = 'AIRBORNE'; f.ctx.player.y = 9;
  const base = f.rig.status.supportHeight; f.rig.sync(f.ctx, f.actors(), f.input, 0.02);
  expect(f.rig.status.supportHeight).toBe(base);
  f.rig.reset(); f.ctx.player.contact = 'SUPPORTED'; f.rig.sync(f.ctx, f.actors(), f.input, 0);
  expect(f.rig.status.positionHeight).toBe(5); expect(f.rig.status.targetHeight).toBe(5);
});

it('has frame-rate invariant support buffers at 30/60/120fps', () => {
  const values = [30, 60, 120].map(fps => {
    const f = boot(); f.rig.sync(f.ctx, [], f.input, 0); f.ctx.player.supportSample = { x: 0, y: 5, z: 0 };
    for (let i = 0; i < fps; i++) f.rig.sync(f.ctx, [], f.input, 1 / fps);
    return f.rig.status;
  });
  expect(Math.max(...values.map(v => v.positionHeight)) - Math.min(...values.map(v => v.positionHeight))).toBeLessThan(0.03);
  expect(Math.max(...values.map(v => v.targetHeight)) - Math.min(...values.map(v => v.targetHeight))).toBeLessThan(0.03);
});

it('freezes the actual camera on pause, removes low-motion feedback and reports infeasible input', () => {
  const f = boot(); f.ctx.player.targetX = 3;
  f.rig.sync(f.ctx, f.actors(), f.input, 0.03, true);
  const before = f.camera.position.asArray(); const rotation = f.camera.rotation.asArray();
  f.ctx.state = 'PAUSED'; f.rig.sync(f.ctx, f.actors(), f.input, 10);
  expect(f.camera.position.asArray()).toEqual(before); expect(f.camera.rotation.asArray()).toEqual(rotation);
  f.ctx.state = 'PLAYING'; f.rig.sync(f.ctx, f.actors(), { ...f.input, reducedMotion: true }, 0.03, true);
  expect(f.camera.rotation.z).toBe(0); expect(f.camera.fov).toBe(0.85);
  f.rig.sync(f.ctx, f.actors(), { ...f.input, safeArea: { top: 800, bottom: 100, left: 8, right: 8 } }, 0.02);
  expect(f.rig.status.projection.safe).toBe(false); expect(f.rig.status.projection.reason).toBe('NO_SAFE_REGION');
});

it('updates world bounds from current mesh transforms and excludes hidden fallback geometry', () => {
  const f = boot(); const m = f.roots[0].getChildMeshes()[0];
  m.scaling.y = 2; const a = actorBounds('player', f.roots[0]);
  expect(Math.max(...a.corners.map(v => v.y))).toBeCloseTo(3.45);
  m.isVisible = false; expect(actorBounds('player', f.roots[0]).corners).toHaveLength(0);
});
