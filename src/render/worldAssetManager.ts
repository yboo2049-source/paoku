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
  OBSTACLE_BUFFER_STOP: {
    file: 'obstacle_buffer_stop.glb',
    yaw: 0,
    scale: [2.2 / 1.0001, 1.2 / 0.8741, 1.5 / 0.8679],
    offsetY: 0,
  },
  OBSTACLE_TRAFFIC_CONE: {
    file: 'obstacle_traffic_cone.glb',
    yaw: 0,
    scale: [0.8, 1.0, 0.8],
    offsetY: 0,
  },
  OBSTACLE_SIGNAL_LIGHT: {
    file: 'obstacle_signal_light.glb',
    yaw: 0,
    scale: [0.6, 2.5, 0.6],
    offsetY: 0,
  },
  OBSTACLE_UTILITY_BOX: {
    file: 'obstacle_utility_box.glb',
    yaw: 0,
    scale: [1.0, 1.2, 0.8],
    offsetY: 0,
  },
  PROP_COIN: {
    file: 'prop_coin.glb',
    yaw: 0,
    // Coin in game: diameter=0.8
    scale: [0.8, 0.8, 0.8],
    offsetY: 0.4,
  },
  PROP_MAGNET: {
    file: 'prop_magnet.glb',
    yaw: Math.PI / 2,
    scale: [0.8, 0.8, 0.8],
    offsetY: 0.2,
  },
  PROP_MULTIPLIER_2X: {
    file: 'prop_multiplier_2x.glb',
    yaw: 0,
    scale: [0.8, 0.8, 0.8],
    offsetY: 0.2,
  },
  PROP_SNEAKERS: {
    file: 'prop_sneakers.glb',
    yaw: 0,
    scale: [0.8, 0.8, 0.8],
    offsetY: 0.15,
  },
  PROP_HOVERBOARD: {
    file: 'prop_hoverboard.glb',
    yaw: Math.PI / 2,
    scale: [0.6 / 0.372, 0.9, 1.4 / 0.9792],
    offsetY: 0.08,
  },
  PROP_JETPACK: {
    file: 'prop_jetpack.glb',
    yaw: 0,
    scale: [0.8, 0.8, 0.8],
    offsetY: 0.2,
  },
  PROP_SHIELD: {
    file: 'prop_shield.glb',
    yaw: 0,
    scale: [0.8, 0.8, 0.8],
    offsetY: 0.2,
  },
  PROP_MYSTERY_BOX: {
    file: 'prop_mystery_box.glb',
    yaw: 0,
    scale: [0.8, 0.8, 0.8],
    offsetY: 0.2,
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
