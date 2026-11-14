import { afterEach, describe, expect, it } from 'vitest';
import { DirectionalLight, NullEngine, Scene, ShadowGenerator, Vector3, TransformNode } from '@babylonjs/core';
import { immutableCopy } from '../../src/core/snapshot';
import type { GameContext } from '../../src/types';
import { SharedMaterials } from '../../src/render/assets';

export const frame = () => ({
  obstacles: [{ id: 'train', type: 'STATIC_TRAIN', x: 0, y: 0, z: 30, width: 2.4, height: 3, depth: 12 }],
  coinEntities: [{ id: 'coin', x: 0, y: 1, z: 10, collected: false }],
  powerUpEntities: [{ id: 'magnet', type: 'MAGNET', x: 0, y: 1, z: 20, collected: false }],
  player: { activePowerUps: new Map([['MAGNET', 10]]) },
} as unknown as GameContext);
const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach(e => e.dispose()));
async function setup() {
  const mod = await import('../../src/render/entityViews').catch(() => ({}));
  expect(mod).toHaveProperty('EntityViews');
  const engine = new NullEngine(); engines.push(engine); const scene = new Scene(engine);
  const shadow = new ShadowGenerator(128, new DirectionalLight('sun', new Vector3(0, -1, 0), scene));
  const materials = new SharedMaterials(scene);
  const views = new (mod as typeof import('../../src/render/entityViews')).EntityViews(scene, shadow, materials);
  return { views, scene, shadow, materials, mod: mod as typeof import('../../src/render/entityViews') };
}
describe('PAO-17 legacy view ownership', () => {
  it('syncs frozen snapshots without modifying map entries or creating duplicate meshes/casters', async () => {
    const { views, scene, shadow } = await setup(); const f = frame(); f.obstacles.push({ ...f.obstacles[0] });
    const frozen = immutableCopy(f); const before = [...frozen.player.activePowerUps];
    for (const method of ['set', 'delete', 'clear']) expect(() => (frozen.player.activePowerUps as any)[method]('MAGNET', 99)).toThrow('read-only');
    expect(() => (frozen.player.activePowerUps.valueOf() as any).set('MAGNET', 99)).toThrow();
    views.sync(frozen, 0, 0); const count = scene.meshes.length;
    views.sync(frozen, 0, 0); expect(scene.meshes.length).toBe(count);
    expect(shadow.getShadowMap()!.renderList!.length).toBe(1);
    expect([...frozen.player.activePowerUps]).toEqual(before);
    expect(frozen.obstacles[0].z).toBe(30);
  });
  it('removes collected/deleted instances and casters while shared materials survive until cache disposal', async () => {
    const { views, scene, shadow, materials } = await setup(); const f = frame(); views.sync(immutableCopy(f), 0, 0);
    const shared = scene.getMaterialByName('cache_coin_gold')!;
    f.obstacles = []; f.coinEntities[0].collected = true; f.powerUpEntities[0].collected = true;
    views.sync(immutableCopy(f), 0, 0);
    expect(scene.meshes.length).toBe(0); expect(shadow.getShadowMap()!.renderList!.length).toBe(0);
    expect(scene.materials).toContain(shared); views.reset(); views.dispose(); expect(scene.materials).toContain(shared);
    materials.dispose(); expect(scene.materials).not.toContain(shared);
  });
  it('deduplicates synthetic RAMP/ROOF ownership by explicit root key, at nonzero base, releasing once', async () => {
    const { mod, scene } = await setup();
    const registry = new mod.ViewRegistry<TransformNode>(n => n.dispose());
    let creates = 0; const parts = [{ role: 'RAMP', root: 'segment1/truck' }, { role: 'ROOF', root: 'segment1/truck' }];
    for (const part of parts) registry.ensure(part.root, () => { creates++; const n = new TransformNode(part.root, scene); n.position.set(0, 5, 67); return n; });
    expect(creates).toBe(1); expect(registry.get(parts[0].root)!.position.y).toBe(5);
    registry.retain(new Set([parts[1].root])); expect(scene.transformNodes.length).toBe(1);
    registry.retain(new Set()); registry.clear(); expect(scene.transformNodes.length).toBe(0);
  });
});
