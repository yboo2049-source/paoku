import { afterEach, expect, it } from 'vitest';
import { DirectionalLight, NullEngine, Scene, ShadowGenerator, Vector3, VertexBuffer } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
import { EntityViews } from '../../src/render/entityViews';
import { SharedMaterials } from '../../src/render/assets';
import { immutableCopy } from '../../src/core/snapshot';
import { obstacleSurface, sampleSurface } from '../../src/systems/surfaces';
import type { GameContext, ObstacleEntity } from '../../src/types';
const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach(e => e.dispose()));
function setup(obstacles: ObstacleEntity[]) {
  const engine = new NullEngine(); engines.push(engine); const scene = new Scene(engine);
  const shadows = new ShadowGenerator(128, new DirectionalLight('sun', new Vector3(0, -1, 0), scene));
  const views = new EntityViews(scene, shadows, new SharedMaterials(scene));
  views.sync(immutableCopy({ obstacles, coinEntities: [], powerUpEntities: [] } as unknown as GameContext), 0, 0);
  return { scene, views };
}
function positions(mesh: Mesh) { mesh.computeWorldMatrix(true); const p = mesh.getVerticesData(VertexBuffer.PositionKind)!; return Array.from({ length: p.length / 3 }, (_, i) => Vector3.TransformCoordinates(Vector3.FromArray(p, i * 3), mesh.getWorldMatrix())); }
/** Vertical triangle intersection from actual indices, independent of the production generator and Surface interpolation. */
function meshHeight(mesh: Mesh, x: number, z: number): number | null {
  const points = positions(mesh), indices = mesh.getIndices()!; const ys: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [points[indices[i]], points[indices[i + 1]], points[indices[i + 2]]];
    const den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z); if (Math.abs(den) < 1e-12) continue;
    const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / den;
    const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / den;
    if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) ys.push(u * a.y + v * b.y + (1 - u - v) * c.y);
  }
  return ys.length ? Math.max(...ys) : null;
}
const ramp = (extra = {}): ObstacleEntity => ({ id: 'wedge', type: 'RAMP', lane: 1, x: 0, y: 0, z: 70, width: 2.4, height: 3, depth: 6, ...extra });
it.each([{}, { x: 2.7, y: 5 }, { x: -3, y: 5.5, z: -12.5, width: 3.3, height: 2.35, depth: 7.5 }])('matches true wedge triangles to Surface at foot/mid/top and both sides: %j', extra => {
  const obs = ramp(extra); const before = JSON.stringify(obs); const { scene } = setup([obs]);
  const mesh = scene.getMeshByName('ramp_wedge') as Mesh; expect(mesh).toBeTruthy(); const surface = obstacleSurface(obs)!;
  for (const x of [obs.x - obs.width / 2, obs.x, obs.x + obs.width / 2]) for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const z = obs.z - obs.depth / 2 + obs.depth * t; const h = meshHeight(mesh, x, z);
    expect(h).not.toBeNull(); expect(Math.abs(h! - sampleSurface(surface, x, z)!)).toBeLessThan(1e-6);
  }
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
  const slope = new Vector3(0, obs.depth, -obs.height).normalize();
  expect(Array.from({ length: normals.length / 3 }, (_, i) => Vector3.Dot(Vector3.FromArray(normals, i * 3), slope)).some(dot => dot > 0.999999)).toBe(true);
  expect(JSON.stringify(obs)).toBe(before);
});
it.each([0, 5])('covers the complete ROOF at exact support height, with continuous ramp entry/roof exit (base Y=%s)', y => {
  const slope = ramp({ y }); const roof: ObstacleEntity = { ...slope, id: 'car', type: 'STATIC_TRAIN', z: 79, depth: 12 };
  const { scene } = setup([slope, roof]); const wedge = scene.getMeshByName('ramp_wedge') as Mesh; const top = scene.getMeshByName('roof_car') as Mesh;
  for (const x of [-1.2, 0, 1.2]) for (const z of [73, 79, 85]) {
    const actual = meshHeight(top, x, z); expect(actual).not.toBeNull();
    expect(Math.abs(actual! - sampleSurface(obstacleSurface(roof)!, x, z)!)).toBeLessThan(1e-6);
  }
  expect(Math.abs(meshHeight(wedge, 0, 73)! - meshHeight(top, 0, 73)!)).toBeLessThan(1e-6);
});
it('keeps every actual arrow vertex within a narrow offset above the slope instead of floating boxes', () => {
  const obs = ramp({ y: 5 }); const { scene } = setup([obs]); const arrows = scene.meshes.filter(m => m.name.startsWith('arrow_wedge_')) as Mesh[];
  expect(arrows.length).toBe(3);
  for (const arrow of arrows) for (const p of positions(arrow)) {
    const support = sampleSurface(obstacleSurface(obs)!, p.x, p.z); expect(support).not.toBeNull();
    expect(p.y - support!).toBeGreaterThan(0.005); expect(p.y - support!).toBeLessThan(0.04);
  }
});
