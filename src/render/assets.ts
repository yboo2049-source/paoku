import type { Color3 } from '@babylonjs/core';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core';

export interface DisposableAsset { dispose(): void }
export interface AssetLease { release(): void }

/** Renderer cache lifetime is independent of the run/consumer that requested it. */
export class AssetCache<T extends DisposableAsset> {
  private entries = new Map<string, { promise: Promise<T | null>; resource?: T; failed: boolean; pending: boolean }>();
  private leases = new Set<AssetLease>();
  private disposed = false;

  private load: (key: string) => Promise<T>;
  private valid: (asset: T) => boolean;
  constructor(load: (key: string) => Promise<T>, valid: (asset: T) => boolean = () => true) { this.load = load; this.valid = valid; }

  async acquire(key: string, current: () => boolean, instantiate: (asset: T) => DisposableAsset): Promise<AssetLease | null> {
    if (this.disposed) return null;
    let entry = this.entries.get(key);
    if (!entry) {
      const created = { promise: null as unknown as Promise<T | null>, failed: false, pending: true, resource: undefined as T | undefined };
      this.entries.set(key, created);
      // Invoke immediately; a synchronous loader exception is also a cached failure.
      let loading: Promise<T>;
      try { loading = this.load(key); } catch (error) { loading = Promise.reject(error); }
      created.promise = loading.then(resource => {
        created.pending = false;
        if (this.disposed || !this.valid(resource)) {
          resource.dispose(); created.failed = !this.disposed; return null;
        }
        created.resource = resource;
        return resource;
      }).catch(() => { created.pending = false; created.failed = true; return null; });
      entry = created;
    }
    const resource = await entry.promise;
    if (!resource || this.disposed || !current()) return null;
    const instance = instantiate(resource);
    let released = false;
    const lease: AssetLease = { release: () => {
      if (released) return;
      released = true; this.leases.delete(lease); instance.dispose();
    } };
    this.leases.add(lease);
    return lease;
  }

  get counts() {
    const entries = [...this.entries.values()];
    return { resources: entries.filter(e => e.resource).length, leases: this.leases.size,
      pending: entries.filter(e => e.pending).length, failed: entries.filter(e => e.failed).length };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const lease of [...this.leases]) lease.release();
    for (const entry of this.entries.values()) entry.resource?.dispose();
    this.entries.clear();
  }
}

/** Materials outlive individual views, but never the renderer. */
export class SharedMaterials {
  private cache = new Map<string, StandardMaterial>();
  private scene: Scene;
  constructor(scene: Scene) { this.scene = scene; }
  get(key: string, opts: { diffuse?: Color3; emissive?: Color3 }): StandardMaterial {
    let mat = this.cache.get(key);
    if (!mat) {
      mat = new StandardMaterial(`cache_${key}`, this.scene);
      if (opts.diffuse) mat.diffuseColor = opts.diffuse;
      if (opts.emissive) mat.emissiveColor = opts.emissive;
      this.cache.set(key, mat);
    }
    return mat;
  }
  dispose(): void { for (const mat of this.cache.values()) mat.dispose(); this.cache.clear(); }
}
