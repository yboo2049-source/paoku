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
  | 'OBSTACLE_BUFFER_STOP'
  | 'OBSTACLE_TRAFFIC_CONE'
  | 'OBSTACLE_SIGNAL_LIGHT'
  | 'OBSTACLE_UTILITY_BOX'
  | 'PROP_COIN'
  | 'PROP_MAGNET'
  | 'PROP_MULTIPLIER_2X'
  | 'PROP_SNEAKERS'
  | 'PROP_HOVERBOARD'
  | 'PROP_JETPACK'
  | 'PROP_SHIELD'
  | 'PROP_MYSTERY_BOX'
  | 'ENV_GANTRY'
  | 'ENV_TUNNEL_ARCH';

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
    // Source: local X=0.9792 (length), local Y=0.4386 (height), local Z=0.3808 (width)
    // With yaw=-90deg: local X maps to game Z (length), local Z maps to game X (width)
    scale: [12.0 / 0.9792, 3.0 / 0.4386, 2.4 / 0.3808],
    offsetY: 0,
  },
  TRAIN_RAMP: {
    file: 'train_metro.glb',
    yaw: -Math.PI / 2,
    // Ramp in game: width=2.4 (game X), height=3.0 (game Y), depth=6.0 (game Z)
    // Source: local X=1.000 (length with slope), local Y=0.311 (height), local Z=0.3208 (width)
    // With yaw=-90deg: local -X (bottom of ramp) faces game -Z (towards player), local +X leads up to game +Z (roof)
    scale: [6.0 / 1.0, 3.0 / 0.311, 2.4 / 0.3208],
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
    // Slide barrier in game: width=2.2 (game X), height=1.8 (game Y), depth=0.5 (game Z)
    // Source bounds: local X=0.1255 (thickness), local Y=0.6314 (height), local Z=0.9995 (width)
    // With yaw=90deg: local X maps to game Z (depth), local Z maps to game X (width)
    scale: [0.5 / 0.1255, 1.8 / 0.6314, 2.2 / 0.9995],
    offsetY: 0.9,
  },
  OBSTACLE_BUFFER_STOP: {
    file: 'obstacle_buffer_stop.glb',
    yaw: 0,
    scale: [2.2 / 1.0, 1.5 / 0.874, 1.0 / 0.868],
    offsetY: 0,
  },
  OBSTACLE_TRAFFIC_CONE: {
    file: 'obstacle_traffic_cone.glb',
    yaw: 0,
    scale: [0.6 / 0.976, 0.8 / 1.0, 0.6 / 0.976],
    offsetY: 0,
  },
  OBSTACLE_SIGNAL_LIGHT: {
    file: 'obstacle_signal_light.glb',
    yaw: 0,
    scale: [0.6 / 0.205, 2.5 / 0.981, 0.6 / 0.219],
    offsetY: 0,
  },
  OBSTACLE_UTILITY_BOX: {
    file: 'obstacle_utility_box.glb',
    yaw: 0,
    scale: [1.0 / 0.789, 1.2 / 0.652, 0.8 / 1.0],
    offsetY: 0,
  },
  PROP_COIN: {
    file: 'prop_coin.glb',
    yaw: 0,
    // Coin in game: diameter=0.8
    scale: [0.85 / 1.0, 0.85 / 1.0, 0.85 / 0.163],
    offsetY: 0.35,
  },
  PROP_MAGNET: {
    file: 'prop_magnet.glb',
    yaw: Math.PI / 2,
    // Source bounds: local X=0.2304 (thickness), local Y=0.9804 (height), local Z=0.8108 (width)
    scale: [0.35 / 0.2304, 0.8 / 0.9804, 0.8 / 0.8108],
    offsetY: 0.1,
  },
  PROP_MULTIPLIER_2X: {
    file: 'prop_multiplier_2x.glb',
    yaw: 0,
    scale: [0.8 / 0.98, 0.8 / 0.9549, 0.8 / 0.1487],
    offsetY: 0.1,
  },
  PROP_SNEAKERS: {
    file: 'prop_sneakers.glb',
    yaw: 0,
    scale: [0.8 / 1.0, 0.8 / 0.978, 0.8 / 0.641],
    offsetY: 0.4,
  },
  PROP_HOVERBOARD: {
    file: 'prop_hoverboard.glb',
    yaw: Math.PI / 2,
    // Hoverboard: width=0.6 (game X), height=0.15 (game Y), length=1.4 (game Z)
    // Source: local X=0.9792 (length), local Y=0.1673 (height), local Z=0.372 (width)
    // With yaw=90deg: local X maps to game Z (length), local Z maps to game X (width)
    scale: [1.4 / 0.9792, 0.15 / 0.1673, 0.6 / 0.372],
    offsetY: 0.05,
  },
  PROP_JETPACK: {
    file: 'prop_jetpack.glb',
    yaw: 0,
    scale: [0.8 / 0.342, 0.8 / 0.819, 0.8 / 1.0],
    offsetY: 0.4,
  },
  PROP_SHIELD: {
    file: 'prop_shield.glb',
    yaw: 0,
    scale: [0.8 / 0.673, 0.8 / 0.979, 0.8 / 0.702],
    offsetY: 0.1,
  },
  PROP_MYSTERY_BOX: {
    file: 'prop_mystery_box.glb',
    yaw: 0,
    scale: [0.8 / 1.0, 0.8 / 0.944, 0.8 / 0.877],
    offsetY: 0.4,
  },
  ENV_GANTRY: {
    file: 'env_gantry.glb',
    yaw: 0,
    scale: [9.2 / 0.9803, 5.2 / 0.6678, 1.2 / 0.138],
    offsetY: 0,
  },
  ENV_TUNNEL_ARCH: {
    file: 'env_tunnel_arch.glb',
    yaw: 0,
    scale: [10.0 / 0.8624, 6.0 / 0.9838, 6.0 / 0.8456],
    offsetY: 0,
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
    const keys: WorldModelKey[] = [
      'TRAIN_CARRIAGE',
      'TRAIN_RAMP',
      'OBSTACLE_HURDLE',
      'OBSTACLE_SLIDE',
      'PROP_COIN',
      'PROP_MAGNET',
      'PROP_MULTIPLIER_2X',
      'PROP_SNEAKERS',
      'PROP_HOVERBOARD',
    ];
    keys.forEach(k => {
      void this.cache.acquire(k, () => !this.disposed, () => ({ dispose: () => {} }));
    });
  }

  /**
   * Mount a 3D model under parentNode. When mounted, onMounted is called (e.g. to hide primitive fallbacks).
   * For train carriages, passing depth > 12 will seamlessly tile 3 to 6 carriages end-to-end.
   */
  public attachModel(
    entityId: string,
    key: WorldModelKey,
    parentNode: TransformNode,
    onMounted?: () => void,
    depth?: number
  ): void {
    if (this.disposed) return;
    const def = MODEL_DEFS[key];
    if (!def) return;

    // Release any previous lease on this entityId
    this.releaseEntity(entityId);

    const numCarriages = (key === 'TRAIN_CARRIAGE' && depth && depth > 12)
      ? Math.max(1, Math.round(depth / 12))
      : 1;

    void this.cache.acquire(
      key,
      () => !this.disposed && !parentNode.isDisposed(),
      (container: AssetContainer) => {
        try {
          const allEntries: ReturnType<typeof container.instantiateModelsToScene>[] = [];
          const allMeshes: Mesh[] = [];

          for (let c = 0; c < numCarriages; c++) {
            const entries = container.instantiateModelsToScene(
              name => `${entityId}_c${c}_${name}`,
              false,
              { doNotInstantiate: true }
            );
            allEntries.push(entries);

            const offsetZ = numCarriages > 1 && depth
              ? -depth / 2 + 6 + c * 12
              : 0;

            for (const rootNode of entries.rootNodes) {
              rootNode.parent = parentNode;
              if (rootNode instanceof TransformNode) {
                rootNode.rotationQuaternion = null;
                rootNode.rotation.y = def.yaw;
                if (def.pitch) rootNode.rotation.x = def.pitch;
                if (def.roll) rootNode.rotation.z = def.roll;
                rootNode.scaling.set(def.scale[0], def.scale[1], def.scale[2]);
                rootNode.position.set(0, def.offsetY ?? 0, offsetZ);
              }
            }

            const meshes = entries.rootNodes.flatMap(n => n.getChildMeshes() as Mesh[]);
            for (const mesh of meshes) {
              this.shadowGenerator.addShadowCaster(mesh, false);
              allMeshes.push(mesh);
            }
          }

          onMounted?.();

          return {
            dispose: () => {
              for (const mesh of allMeshes) {
                this.shadowGenerator.removeShadowCaster(mesh);
              }
              for (const entries of allEntries) {
                entries.dispose();
              }
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
