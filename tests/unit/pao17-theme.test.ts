import { afterEach, expect, it, vi } from 'vitest';
import { NullEngine, Scene, Vector3, VertexBuffer } from '@babylonjs/core';
import { LegacyEnvironment } from '../../src/render/environment';
const engines: NullEngine[] = [];
afterEach(() => { engines.splice(0).forEach(e => e.dispose()); vi.restoreAllMocks(); });
function setup() { const engine = new NullEngine(); engines.push(engine); const scene = new Scene(engine); return { scene, env: new LegacyEnvironment(scene) }; }
function vertices(mesh: any) {
  mesh.computeWorldMatrix(true); const p = mesh.getVerticesData(VertexBuffer.PositionKind); const world = mesh.getWorldMatrix();
  return Array.from({ length: p.length / 3 }, (_, i) => Vector3.TransformCoordinates(Vector3.FromArray(p, i * 3), world));
}
it('reuses exactly five real track chunks, with continuous world-space coverage through boundaries, jumps, rollback and reset', () => {
  const { scene, env } = setup(); const tracks = scene.meshes.filter(m => m.metadata?.themeRole === 'track');
  expect(tracks.length).toBe(5); const roots = new Set(tracks.map(m => m.parent)); const meshCount = scene.meshes.length;
  const rng = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('background sync must not use randomness'); });
  for (const z of [0, 119.999, 120, 120.001, 120000.5, 17, -120.01, -0.01, 1000]) {
    env.sync(z, 'PLAYING'); const index = Math.floor(z / 120);
    const bounds = tracks.map(mesh => { const v = vertices(mesh); return [Math.min(...v.map(p => p.z)), Math.max(...v.map(p => p.z))]; }).sort((a, b) => a[0] - b[0]);
    for (let n = 0; n < 5; n++) { expect(bounds[n][0]).toBeCloseTo((index - 1 + n) * 120, 6); expect(bounds[n][1]).toBeCloseTo((index + n) * 120, 6); }
    expect(bounds[0][0]).toBeLessThanOrEqual(z - 9); expect(bounds[4][1]).toBeGreaterThanOrEqual(z - 9 + 280);
    expect(scene.meshes.length).toBe(meshCount); expect(new Set(tracks.map(m => m.parent))).toEqual(roots);
    for (const mesh of tracks) { expect(mesh.isWorldMatrixFrozen).toBe(false); expect((mesh.parent as any).isWorldMatrixFrozen).toBe(false); }
  }
  expect(rng).not.toHaveBeenCalled(); env.reset();
  const min = Math.min(...tracks.flatMap(m => vertices(m).map(v => v.z))); expect(min).toBe(-120);
  env.dispose(); env.dispose(); expect(scene.meshes.length).toBe(0); expect(scene.transformNodes.length).toBe(0);
});
it('owns each repeated signal boundary once, using actual merged vertices at world positions', () => {
  const { scene, env } = setup(); env.sync(120, 'PLAYING');
  const posts = scene.meshes.filter(m => m.metadata?.themeRole === 'signal-posts'); expect(posts.length).toBe(5);
  const centers: number[] = [];
  for (const mesh of posts) {
    const zs = [...new Set(vertices(mesh).map(v => Math.round(v.z * 1e4) / 1e4))].sort((a, b) => a - b);
    expect(zs.length).toBe(8);
    for (let i = 0; i < zs.length; i += 2) { expect(zs[i + 1] - zs[i]).toBeCloseTo(0.2, 3); centers.push((zs[i] + zs[i + 1]) / 2); }
  }
  expect(centers.length).toBe(20); expect(new Set(centers).size).toBe(20);
  expect(centers.sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i * 30));
});
it('shows independent podium only in MENU/SHOP and does not re-show it on an in-run reset', () => {
  const { scene, env } = setup(); const podium = scene.getMeshByName('menuPodium')!; expect(podium).toBeTruthy();
  for (const state of ['MENU', 'SHOP', 'PLAYING', 'PAUSED', 'GAMEOVER'] as const) {
    env.sync(900, state); expect(podium.isEnabled()).toBe(state === 'MENU' || state === 'SHOP');
    env.reset(); expect(podium.isEnabled()).toBe(state === 'MENU' || state === 'SHOP');
  }
});
it('covers the existing 360-degree menu orbit with owned backdrop geometry and hides it in-run', () => {
  const { scene, env } = setup(); const backdrop = scene.getMeshByName('menuBackdrop');
  expect(backdrop).toBeTruthy(); const points = vertices(backdrop);
  for (const axis of ['x', 'z'] as const) { expect(Math.min(...points.map(p => p[axis]))).toBeLessThanOrEqual(-286.2); expect(Math.max(...points.map(p => p[axis]))).toBeGreaterThanOrEqual(286.2); }
  env.sync(0, 'GAMEOVER'); expect(backdrop!.isEnabled()).toBe(false); env.reset(); expect(backdrop!.isEnabled()).toBe(false);
  env.sync(0, 'SHOP'); expect(backdrop!.isEnabled()).toBe(true);
});
