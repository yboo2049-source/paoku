import { describe, expect, it, vi } from 'vitest';

const deferred = <T>() => { let resolve!: (v: T) => void; const promise = new Promise<T>(r => resolve = r); return { promise, resolve }; };
async function cacheType() {
  const mod = await import('../../src/render/assets').catch(() => ({}));
  expect(mod).toHaveProperty('AssetCache');
  return (mod as typeof import('../../src/render/assets')).AssetCache;
}
describe('PAO-17 renderer asset ownership', () => {
  it('shares an in-flight resource, rejects old consumer, preserves current consumer and cache', async () => {
    const Cache = await cacheType(); const d = deferred<{ dispose: () => void }>();
    const resource = { dispose: vi.fn() }; const load = vi.fn(() => d.promise);
    const cache = new Cache(load); let epoch = 0;
    const mountOld = vi.fn(() => ({ dispose: vi.fn() })); const instance = { dispose: vi.fn() };
    const a = cache.acquire('player', () => epoch === 0, mountOld);
    epoch++; const b = cache.acquire('player', () => epoch === 1, () => instance);
    d.resolve(resource); expect(await a).toBeNull(); const lease = await b;
    expect(load).toHaveBeenCalledTimes(1); expect(mountOld).not.toHaveBeenCalled();
    expect(resource.dispose).not.toHaveBeenCalled(); lease!.release(); lease!.release();
    expect(instance.dispose).toHaveBeenCalledTimes(1); expect(resource.dispose).not.toHaveBeenCalled();
    expect(cache.counts).toEqual({ resources: 1, leases: 0, pending: 0, failed: 0 });
    cache.dispose(); cache.dispose(); expect(resource.dispose).toHaveBeenCalledTimes(1);
  });
  it('disposes resources arriving after renderer disposal without mounting', async () => {
    const Cache = await cacheType(); const d = deferred<{ dispose: () => void }>();
    const cache = new Cache(() => d.promise); const mount = vi.fn();
    const pending = cache.acquire('player', () => true, mount);
    cache.dispose(); const resource = { dispose: vi.fn() }; d.resolve(resource);
    expect(await pending).toBeNull(); expect(mount).not.toHaveBeenCalled();
    expect(resource.dispose).toHaveBeenCalledTimes(1);
    expect(cache.counts).toEqual({ resources: 0, leases: 0, pending: 0, failed: 0 });
  });
  it('caches failures and empty resources, keeps fallback consumer unmounted', async () => {
    const Cache = await cacheType(); const load = vi.fn(async () => { throw new Error('404'); });
    const cache = new Cache(load); const mount = vi.fn();
    for (let i = 0; i < 4; i++) expect(await cache.acquire('missing', () => true, mount)).toBeNull();
    expect(load).toHaveBeenCalledTimes(1); expect(cache.counts.failed).toBe(1);
    const empty = { dispose: vi.fn() }; const invalid = new Cache(async () => empty, () => false);
    expect(await invalid.acquire('empty', () => true, mount)).toBeNull();
    expect(empty.dispose).toHaveBeenCalledTimes(1); expect(mount).not.toHaveBeenCalled();
    cache.dispose(); invalid.dispose();
  });
  it('reads the latest skin at mount time; independent instances release before shared container', async () => {
    const Cache = await cacheType(); const d = deferred<{ dispose: () => void }>();
    const cache = new Cache(() => d.promise); let skin = 'old'; const shown: string[] = [];
    const releases: string[] = []; const resource = { dispose: () => releases.push('container') };
    const a = cache.acquire('same', () => true, () => { shown.push(skin); return { dispose: () => releases.push('a') }; });
    const b = cache.acquire('same', () => true, () => ({ dispose: () => releases.push('b') }));
    skin = 'latest'; d.resolve(resource); await Promise.all([a, b]); expect(shown).toEqual(['latest']);
    cache.dispose(); expect(releases).toEqual(['a', 'b', 'container']);
  });
});
