import { afterEach, expect, it } from 'vitest';
import { DirectionalLight, GlowLayer, MeshBuilder, NullEngine, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import { LegacyEnvironment } from '../../src/render/environment';
import { EntityViews } from '../../src/render/entityViews';
import { SharedMaterials } from '../../src/render/assets';
import { immutableCopy } from '../../src/core/snapshot';
import type { GameContext } from '../../src/types';
const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach(e => e.dispose()));
const glowCount = (glow: any) => (glow._thinEffectLayer?._includedOnlyMeshes ?? glow._includedOnlyMeshes ?? []).length;
it('owns a finite bright environment and explicit glow whitelist, with no growth across 20 recycles and 10 resets', () => {
  const engine = new NullEngine(); engines.push(engine); const scene = new Scene(engine); const glow = new GlowLayer('glow', scene);
  const env = new LegacyEnvironment(scene, glow); const signal = scene.meshes.filter(m => m.metadata?.themeRole === 'signal-lights');
  expect(signal.length).toBe(5); expect(glowCount(glow)).toBe(5);
  const track = scene.meshes.find(m => m.metadata?.themeRole === 'track')!;
  expect((track.material as any).diffuseColor.toHexString()).toBe('#657A88');
  const other = MeshBuilder.CreateBox('not-glowing', {}, scene); expect(glow.hasMesh(other)).toBe(false); other.dispose();
  const shadow = new ShadowGenerator(128, new DirectionalLight('sun', new Vector3(0, -1, 0), scene));
  const mats = new SharedMaterials(scene); const views = new EntityViews(scene, shadow, mats, glow);
  const populated = (z: number) => immutableCopy({ obstacles: [{ id: 'train', type: 'STATIC_TRAIN', x: 0, y: 0, z: z + 30, width: 2.4, height: 3, depth: 12 }], coinEntities: [{ id: 'coin', x: 0, y: 1, z: z + 10 }], powerUpEntities: [] } as unknown as GameContext);
  const empty = immutableCopy({ obstacles: [], coinEntities: [], powerUpEntities: [] } as unknown as GameContext);
  const count = () => ({ meshes: scene.meshes.length, nodes: scene.transformNodes.length, materials: scene.materials.length, textures: scene.textures.length, animations: scene.animationGroups.length, skeletons: scene.skeletons.length, particles: scene.particleSystems.length, casters: shadow.getShadowMap()?.renderList?.length ?? 0, glow: glowCount(glow) });
  views.sync(populated(0), 0, 0); views.reset(); env.sync(0, 'PLAYING'); const baseline = count();
  for (let n = 0; n < 20; n++) { const z = (n % 2 ? -1 : 1) * 120 * n * 3; env.sync(z, 'PLAYING'); views.sync(populated(z), 0, 0); views.sync(empty, 0, 0); expect(count()).toEqual(baseline); }
  for (let n = 0; n < 10; n++) { views.sync(populated(0), 0, 0); views.reset(); env.reset(); expect(count()).toEqual(baseline); }
  views.dispose(); env.dispose(); expect(glowCount(glow)).toBe(0);
  mats.dispose(); shadow.dispose(); glow.dispose(); scene.dispose(); expect(scene.meshes.length).toBe(0); expect(scene.materials.length).toBe(0); expect(scene.textures.length).toBe(0);
});
it('removes and re-adds only owned near casters as an existing entity changes distance', () => {
  const engine = new NullEngine(); engines.push(engine); const scene = new Scene(engine);
  const shadow = new ShadowGenerator(128, new DirectionalLight('sun', new Vector3(0, -1, 0), scene));
  const mats = new SharedMaterials(scene); const views = new EntityViews(scene, shadow, mats);
  expect(typeof (views as any).limitShadows).toBe('function');
  const f = { obstacles: [{ id: 'train', type: 'STATIC_TRAIN', x: 0, y: 0, z: 200, width: 2.4, height: 3, depth: 12 }], coinEntities: [], powerUpEntities: [] } as unknown as GameContext;
  views.sync(immutableCopy(f), 0, 0); views.limitShadows(0, 80); expect(shadow.getShadowMap()!.renderList!.length).toBe(0);
  f.obstacles[0].z = 30; views.sync(immutableCopy(f), 0, 0); views.limitShadows(0, 80); expect(shadow.getShadowMap()!.renderList!.length).toBe(1);
  views.limitShadows(0, 80); expect(shadow.getShadowMap()!.renderList!.length).toBe(1);
  views.reset(); expect(shadow.getShadowMap()!.renderList!.length).toBe(0);
});
