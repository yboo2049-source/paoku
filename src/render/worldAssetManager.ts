import '@babylonjs/loaders/glTF';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { TransformNode } from '@babylonjs/core';
import type { AssetContainer, Mesh, Scene, ShadowGenerator } from '@babylonjs/core';
import { AssetCache, type AssetLease } from './assets';

export type WorldModelKey =
  | 'TRAIN_CARRIAGE'
  | 'TRAIN_RAMP'
  | 'OBSTACLE_HURDLE'
  | 'OBSTACLE_SLIDE'
  | 'PROP_COIN';

interface ModelDef {
  file: string;
  yaw: number;
  roll?: number;
  pitch?: number;
  scale: [number, number, number];
  offsetY?: number;
}

const MODEL_DEFS: Record<WorldModelKey, ModelDef> = {
  TRAIN_CARRIAGE: {
    file: 'train_ramp_or_car.glb',
    yaw: -Math.PI / 2,
    // Train in game: width=2.4 (game X), height=3.0 (game Y), depth=12.0 (game Z)
    // Source: local X=0.979, local Y=0.439, local Z=0.381
    // Rotated -90deg: local X maps to game +Z, local Z maps to game +X
    scale: [2.4 / 0.381, 3.0 / 0.439, 12.0 / 0.979],
    offsetY: 0,
  },
  TRAIN_RAMP: {
    file: 'train_metro.glb',
    yaw: -Math.PI / 2,
    // Ramp in game: width=2.4, height=3.0, depth=6.0
    // Source: local X=1.000, local Y=0.311, local Z=0.321
    scale: [2.4 / 0.321, 3.0 / 0.311, 6.0 / 1.0],
    offsetY: 0,
  },
  OBSTACLE_HURDLE: {
    file: 'obstacle_hurdle_barrier.glb',
    yaw: 0,
    // Hurdle in game: width=2.2, height=1.0, depth=0.5
    // Source: local X=1.000, local Y=0.764, local Z=0.274
    scale: [2.2 / 1.0, 1.0 / 0.764, 0.5 / 0.274],
    offsetY: 0,
  },
  OBSTACLE_SLIDE: {
    file: 'obstacle_slide_barrier.glb',
    yaw: Math.PI / 2,
    // Slide barrier in game: width=2.2, height=1.8, depth=0.5
    // Source bounds: width=0.631, height=1.0, depth=0.125
    scale: [2.2 / 0.631, 1.8 / 1.0, 0.5 / 0.125],
    offsetY: 0,
  },
  PROP_COIN: {
    file: 'prop_coin.glb',
    yaw: 0,
    // Coin in game: diameter=0.8
    scale: [0.8, 0.8, 0.8],
    offsetY: 0.4,
  },
};

export class WorldAssetManager {
  private cache: AssetCache<AssetContainer>;
  private scene: Scene;
  private shadowGenerator: ShadowGenerator;
  private disposed = false;
  private activeLeases = new Map<string, AssetLease>();

  constructor(scene: Scene, shadowGenerator: ShadowGenerator) {
    this.scene = scene;
    this.shadowGenerator = shadowGenerator;
    this.cache = new AssetCache<AssetContainer>(
      async (key: string) => {
        const def = MODEL_DEFS[key as WorldModelKey];
        if (!def) throw new Error(`Unknown model key: ${key}`);
        if (typeof window === 'undefined' || !SceneLoader.IsPluginForExtensionAvailable('.glb')) {
          throw new Error('GLB loader not available in this environment');
        }
        return new Promise<AssetContainer>((resolve, reject) => {
          SceneLoader.LoadAssetContainerAsync('/models/', def.file, this.scene).then(
            container => {
              if (this.disposed) {
                container.dispose();
                reject(new Error('WorldAssetManager disposed'));
              } else {
                resolve(container);
              }
            },
            err => reject(err)
          );
        });
      },
      container => !this.disposed && container.meshes.length > 0
    );
  }

  /**
   * Preload critical 3D world assets in the background.
   */
  public preload(): void {
    if (this.disposed) return;
    const keys: WorldModelKey[] = ['TRAIN_CARRIAGE', 'TRAIN_RAMP', 'OBSTACLE_HURDLE', 'OBSTACLE_SLIDE', 'PROP_COIN'];
    keys.forEach(k => {
      void this.cache.acquire(k, () => !this.disposed, () => ({ dispose: () => {} }));
    });
  }

  /**
   * Mount a 3D model under parentNode. When mounted, onMounted is called (e.g. to hide primitive fallbacks).
   */
  public attachModel(
    entityId: string,
    key: WorldModelKey,
    parentNode: TransformNode,
    onMounted?: () => void
  ): void {
    if (this.disposed) return;
    const def = MODEL_DEFS[key];
    if (!def) return;

    // Release any previous lease on this entityId
    this.releaseEntity(entityId);

    void this.cache.acquire(
      key,
      () => !this.disposed && !parentNode.isDisposed(),
      (container: AssetContainer) => {
        try {
          const entries = container.instantiateModelsToScene(
            name => `${entityId}_${name}`,
            false,
            { doNotInstantiate: true }
          );

          for (const rootNode of entries.rootNodes) {
            rootNode.parent = parentNode;
            if (rootNode instanceof TransformNode) {
              rootNode.rotation.y = def.yaw;
              if (def.pitch) rootNode.rotation.x = def.pitch;
              if (def.roll) rootNode.rotation.z = def.roll;
              rootNode.scaling.set(def.scale[0], def.scale[1], def.scale[2]);
              if (def.offsetY) rootNode.position.y = def.offsetY;
            }
          }

          const meshes = entries.rootNodes.flatMap(n => n.getChildMeshes() as Mesh[]);
          for (const mesh of meshes) {
            this.shadowGenerator.addShadowCaster(mesh, false);
          }

          onMounted?.();

          return {
            dispose: () => {
              for (const mesh of meshes) {
                this.shadowGenerator.removeShadowCaster(mesh);
              }
              entries.dispose();
            },
          };
        } catch {
          // If instantiating fails, keep fallback primitives
          return { dispose: () => {} };
        }
      }
    ).then(lease => {
      if (lease && !this.disposed && !parentNode.isDisposed()) {
        this.activeLeases.set(entityId, lease);
      } else {
        lease?.release();
      }
    });
  }

  public releaseEntity(entityId: string): void {
    const lease = this.activeLeases.get(entityId);
    if (lease) {
      this.activeLeases.delete(entityId);
      lease.release();
    }
  }

  public reset(): void {
    for (const lease of this.activeLeases.values()) {
      lease.release();
    }
    this.activeLeases.clear();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.cache.dispose();
  }
}
