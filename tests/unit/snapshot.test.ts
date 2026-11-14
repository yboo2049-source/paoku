import { it, expect } from 'vitest';
const modules = import.meta.glob('../../src/core/snapshot.ts', { eager: true });
function api() {
  const m = Object.values(modules)[0] as any;
  expect(m?.immutableCopy, 'deep immutable committed snapshots are missing').toBeTypeOf('function');
  return m;
}
const frame = (runId: string, x: number, tick: number) => ({
  runId, tick, phase: 'RUNNING', score: tick, coins: tick,
  player: { x, y: 2 * x, z: 3 * x, lane: tick, isJumping: true, activePowerUps: new Map([['MAGNET', tick]]) },
  coinEntities: [{ id: 'coin', x, y: 0, z: 0, collected: tick > 1 }],
});
it('detaches and freezes every nested object, array and Map mutator', () => {
  const { immutableCopy } = api();
  const original = frame('a', 0, 1), s = immutableCopy(original);
  original.player.x = 99; original.player.activePowerUps.set('MAGNET', 99);
  expect(s.player.x).toBe(0); expect(s.player.activePowerUps.get('MAGNET')).toBe(1);
  expect(() => { s.player.x = 5; }).toThrow();
  expect(() => s.coinEntities.push({})).toThrow();
  for (const mutate of [() => s.player.activePowerUps.set('MAGNET', 5), () => s.player.activePowerUps.clear(), () => s.player.activePowerUps.delete('MAGNET')]) expect(mutate).toThrow();
  s.player.activePowerUps.forEach((_v: number, _k: string, map: Map<string, number>) => expect(() => map.set('MAGNET', 100)).toThrow());
});
it('interpolates position only, takes discrete fields from latest, clamps alpha', () => {
  const { interpolateSnapshots } = api();
  const a = frame('a', 0, 1), b = frame('a', 10, 2);
  const s = interpolateSnapshots(a, b, 0.25);
  expect(s.player).toMatchObject({ x: 2.5, y: 5, z: 7.5, lane: 2 });
  expect(s).toMatchObject({ score: 2, coins: 2, tick: 2 });
  expect(s.coinEntities[0].collected).toBe(true);
  expect(interpolateSnapshots(a, b, -5).player.x).toBe(0);
  expect(interpolateSnapshots(a, b, 5).player.x).toBe(10);
});
it('never blends the first frame, a new run, teleport or paused discrete phase', () => {
  const { interpolateSnapshots } = api();
  const a = frame('a', 0, 1), b = frame('b', 10, 0);
  expect(interpolateSnapshots(null, b, 0).player.x).toBe(10);
  expect(interpolateSnapshots(a, b, 0).player.x).toBe(10);
  expect(interpolateSnapshots(a, { ...a, player: b.player, discontinuity: true }, 0).player.x).toBe(10);
  expect(interpolateSnapshots(a, { ...a, phase: 'PAUSED' }, 0).phase).toBe('PAUSED');
});
it('never exposes a mutable Map receiver through inherited valueOf', () => {
  const { immutableCopy } = api();
  const s = immutableCopy(frame('a', 0, 1));
  const extracted = s.player.activePowerUps.valueOf();
  expect(() => extracted.set('MAGNET', 99)).toThrow();
  expect(s.player.activePowerUps.get('MAGNET')).toBe(1);
});
it('detaches object Map keys as deeply read-only values', () => {
  const { immutableCopy } = api();
  const key = { id: 'nested', position: { x: 1 } };
  const snapshot = immutableCopy(new Map([[key, { score: 1 }]]));
  key.position.x = 99;
  const copiedKey = [...snapshot.keys()][0];
  expect(copiedKey.position.x).toBe(1);
  expect(() => { copiedKey.position.x = 5; }).toThrow();
});
it('uses final positions at every alpha for all non-running phases', () => {
  const { interpolateSnapshots } = api();
  const previous = frame('a', 0, 1);
  for (const phase of ['PAUSED', 'ENDED', 'ABANDONED']) {
    const current = { ...frame('a', 10, 2), phase };
    for (const alpha of [-1, 0, 0.25, 0.75, 1, 2, NaN, Infinity]) {
      const shown = interpolateSnapshots(previous, current, alpha);
      expect(shown.player).toMatchObject(current.player);
      expect(shown.coinEntities).toEqual(current.coinEntities);
      expect(shown).toMatchObject({ tick: 2, phase, score: 2, coins: 2 });
    }
  }
});
