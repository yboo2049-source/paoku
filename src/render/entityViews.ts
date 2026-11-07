import { Color3, Mesh, MeshBuilder, TransformNode, VertexData } from '@babylonjs/core';
import type { GlowLayer, Scene, ShadowGenerator } from '@babylonjs/core';
import type { DeepReadonly } from '../types/contracts';
import type { GameContext, ObstacleEntity, PowerUpType } from '../types';
import { POWERUP_CATALOG } from '../systems/powerupCatalog';
import { SharedMaterials } from './assets';
import { WorldAssetManager } from './worldAssetManager';

export class ViewRegistry<T> extends Map<string, T> {
  private release: (view: T) => void;
  constructor(release: (view: T) => void) { super(); this.release = release; }
  ensure(key: string, create: () => T): T { if (!this.has(key)) this.set(key, create()); return this.get(key)!; }
  override delete(key: string): boolean { const view = this.get(key); if (!super.delete(key)) return false; this.release(view!); return true; }
  retain(keys: ReadonlySet<string>): void { for (const key of this.keys()) if (!keys.has(key)) this.delete(key); }
  override clear(): void { for (const key of [...this.keys()]) this.delete(key); }
}

export class EntityViews {
  private obstacleMeshes = new ViewRegistry<TransformNode>(node => this.release(node));
  private coinMeshes = new ViewRegistry<Mesh>(node => this.release(node));
  private powerUpMeshes = new ViewRegistry<TransformNode>(node => this.release(node));
  private scene: Scene;
  private shadowGenerator: ShadowGenerator;
  private materials: SharedMaterials;
  private glow?: GlowLayer;
  private casters = new Set<Mesh>();
  private worldAssets: WorldAssetManager;
  constructor(scene: Scene, shadowGenerator: ShadowGenerator, materials: SharedMaterials, glow?: GlowLayer) {
    this.scene = scene;
    this.shadowGenerator = shadowGenerator;
    this.materials = materials;
    this.glow = glow;
    this.worldAssets = new WorldAssetManager(scene, shadowGenerator);
    this.worldAssets.preload();
  }
  private release(node: TransformNode): void {
    this.worldAssets.releaseEntity(node.name);
    for (const mesh of node.getChildMeshes()) {
      this.shadowGenerator.removeShadowCaster(mesh); this.casters.delete(mesh as Mesh); this.glow?.removeIncludedOnlyMesh(mesh as Mesh);
    }
    this.casters.delete(node as Mesh); this.glow?.removeIncludedOnlyMesh(node as Mesh);
    this.shadowGenerator.removeShadowCaster(node as Mesh);
    node.dispose(false, false);
  }
  limitShadows(playerZ: number, range: number): void {
    for (const mesh of this.casters) {
      mesh.computeWorldMatrix(true);
      if (Math.abs(mesh.getAbsolutePosition().z - playerZ) <= range) this.shadowGenerator.addShadowCaster(mesh, false);
      else this.shadowGenerator.removeShadowCaster(mesh);
    }
  }
  private getCachedMaterial(key: string, opts: { diffuse?: Color3; emissive?: Color3 }) { return this.materials.get(key, opts); }
  sync(ctx: DeepReadonly<GameContext>, totalTime: number, dt: number): void {
    this.syncObstacles(ctx); this.syncCoins(ctx, totalTime, dt); this.syncPowerUps(ctx, totalTime, dt);
  }
  reset(): void {
    this.worldAssets.reset();
    this.obstacleMeshes.clear();
    this.coinMeshes.clear();
    this.powerUpMeshes.clear();
  }
  dispose(): void {
    this.worldAssets.dispose();
    this.reset();
  }
  private triangleMesh(name: string, positions: number[], indices: number[]): Mesh {
    const mesh = new Mesh(name, this.scene); const data = new VertexData();
    // Babylon's default LH front-face winding is opposite to the geometric cross-product ordering above.
    const winding = indices.slice();
    for (let i = 0; i < winding.length; i += 3) [winding[i + 1], winding[i + 2]] = [winding[i + 2], winding[i + 1]];
    const normals: number[] = []; VertexData.ComputeNormals(positions, winding, normals);
    data.positions = positions; data.indices = winding; data.normals = normals; data.applyToMesh(mesh);
    return mesh;
  }
  private buildWedge(obs: DeepReadonly<ObstacleEntity>): Mesh {
    const w = obs.width / 2, d = obs.depth / 2, h = obs.height;
    const a = [-w, 0, -d], b = [w, 0, -d], c = [-w, h, d], e = [-w, 0, d], f = [w, 0, d], top = [w, h, d];
    // Separate triangle vertices retain hard face normals at the top/side boundaries.
    const triangles = [[a, c, b], [b, c, top], [a, e, c], [b, top, f], [a, b, e], [b, f, e], [e, f, c], [f, top, c]];
    const positions = triangles.flat(2); const indices = Array.from({ length: positions.length / 3 }, (_, i) => i);
    return this.triangleMesh('ramp_' + obs.id, positions, indices);
  }

  private syncObstacles(ctx: DeepReadonly<GameContext>): void {
    const activeIds = new Set<string>();

    ctx.obstacles.forEach((obs) => {
      activeIds.add(obs.id);
      const node = this.obstacleMeshes.ensure(obs.id, () => {
        const node = new TransformNode(obs.id, this.scene);

        if (obs.type === 'STATIC_TRAIN' || obs.type === 'MOVING_TRAIN') {
          // 精细化 3D 火车 Mesh (包含车身、发光灯、车轮与车顶风口)
          const isMoving = obs.type === 'MOVING_TRAIN';
          const bodyMat = this.getCachedMaterial(
            isMoving ? 'train_body_moving' : 'train_body_static',
            { diffuse: isMoving ? Color3.FromHexString('#C44F46') : Color3.FromHexString('#39799D') }
          );

          const body = MeshBuilder.CreateBox(`train_${obs.id}`, { width: obs.width, height: obs.height * 0.8, depth: obs.depth }, this.scene);
          body.position.y = obs.height * 0.5;
          body.material = bodyMat;
          body.parent = node;
          this.casters.add(body); this.shadowGenerator.addShadowCaster(body);

          // 车顶遮罩
          const roof = MeshBuilder.CreateBox(`roof_${obs.id}`, { width: obs.width, height: 0.15, depth: obs.depth }, this.scene);
          roof.position.y = obs.height - 0.075;
          roof.material = this.getCachedMaterial('train_roof', { diffuse: Color3.FromHexString('#647988') });
          roof.receiveShadows = true;
          roof.parent = node;

          // 黄色醒目警戒线
          const stripeMat = this.getCachedMaterial('train_stripe', { diffuse: Color3.FromHexString('#E8B74F'), emissive: new Color3(0.06, 0.04, 0) });
          const stripe = MeshBuilder.CreateBox(`stripe_${obs.id}`, { width: obs.width + 0.02, height: 0.15, depth: obs.depth * 0.98 }, this.scene);
          stripe.position.y = obs.height * 0.45;
          stripe.material = stripeMat;
          stripe.parent = node;

          // 迎面车头发光大灯
          const lightMat = this.getCachedMaterial('train_headlight', { diffuse: Color3.FromHexString('#FFF2D5'), emissive: new Color3(0.12, 0.11, 0.08) });
          const rootNode = node;
          [-obs.width * 0.3, obs.width * 0.3].forEach((lx) => {
            const hl = MeshBuilder.CreateCylinder(`hl_${obs.id}_${lx}`, { diameter: 0.35, height: 0.05 }, this.scene);
            hl.rotation.x = Math.PI / 2;
            hl.position.set(lx, obs.height * 0.3, -obs.depth / 2 - 0.02);
            hl.material = lightMat;
            hl.parent = rootNode;
          });

          // 挂载高精度 3D 列车模型 (并在就绪后隐退过程化占位网格)
          this.worldAssets.attachModel(obs.id, 'TRAIN_CARRIAGE', node, () => {
            body.isVisible = false;
            roof.isVisible = false;
            stripe.isVisible = false;
            node.getChildMeshes().forEach((m) => {
              if (m.name.startsWith(`hl_${obs.id}`)) m.isVisible = false;
            });
          });

        } else if (obs.type === 'RAMP') {
          const rampMat = this.getCachedMaterial('ramp_body', { diffuse: Color3.FromHexString('#D7A74A') });
          const ramp = this.buildWedge(obs);
          ramp.material = rampMat; ramp.parent = node; ramp.receiveShadows = true;
          this.casters.add(ramp); this.shadowGenerator.addShadowCaster(ramp);
          const arrowMat = this.getCachedMaterial('ramp_arrow', { diffuse: Color3.FromHexString('#FFF2D5') });
          for (let i = -1; i <= 1; i++) {
            const cz = i * obs.depth * 0.25;
            const positions: number[] = [];
            for (const [x, z] of [[-obs.width * 0.22, cz - 0.2], [0, cz + 0.2], [obs.width * 0.22, cz - 0.2]]) {
              positions.push(x, (z / obs.depth + 0.5) * obs.height + 0.018, z);
            }
            const arrow = this.triangleMesh('arrow_' + obs.id + '_' + i, positions, [0, 1, 2]);
            arrow.material = arrowMat; arrow.parent = node;
          }

          // 挂载高精度 3D 带坡工程车模型
          this.worldAssets.attachModel(obs.id, 'TRAIN_RAMP', node, () => {
            ramp.isVisible = false;
            node.getChildMeshes().forEach((m) => {
              if (m.name.startsWith(`arrow_${obs.id}`)) m.isVisible = false;
            });
          });

        } else {
          // 精细化低/高空障碍栅栏 (含有双侧红/黄闪烁警示灯与黄黑斜纹拉线)
          const isLow = obs.type === 'LOW_OBSTACLE';
          const frameMat = this.getCachedMaterial(
            isLow ? 'obstacle_low' : 'obstacle_high',
            { diffuse: isLow ? Color3.FromHexString('#E8B74F') : Color3.FromHexString('#BB5145') }
          );

          const bar = MeshBuilder.CreateBox(`bar_${obs.id}`, { width: obs.width, height: obs.height, depth: obs.depth }, this.scene);
          bar.position.y = obs.height / 2;
          bar.material = frameMat;
          bar.parent = node;

          // 警示闪灯
          const lampMat = this.getCachedMaterial('obstacle_lamp', { diffuse: new Color3(0.8, 0.1, 0.1), emissive: new Color3(0.08, 0.01, 0.01) });
          const rootNode = node;
          [-obs.width * 0.4, obs.width * 0.4].forEach((lx) => {
            const lamp = MeshBuilder.CreateSphere(`lamp_${obs.id}_${lx}`, { diameter: 0.25 }, this.scene);
            lamp.position.set(lx, obs.height + 0.12, 0);
            lamp.material = lampMat;
            lamp.parent = rootNode;
          });

          // 挂载高精度 3D 障碍模型
          const modelKey = isLow ? 'OBSTACLE_HURDLE' : 'OBSTACLE_SLIDE';
          this.worldAssets.attachModel(obs.id, modelKey, node, () => {
            bar.isVisible = false;
            node.getChildMeshes().forEach((m) => {
              if (m.name.startsWith(`lamp_${obs.id}`)) m.isVisible = false;
            });
          });
        }

        return node;
      });

      if (node) node.position.set(obs.x, obs.y, obs.z);
    });

    this.obstacleMeshes.retain(activeIds);
  }

  private syncCoins(ctx: DeepReadonly<GameContext>, totalTime: number, dt: number): void {
    const activeIds = new Set<string>();

    ctx.coinEntities.forEach((coin) => {
      if (coin.collected) {
        const mesh = this.coinMeshes.get(coin.id);
        if (mesh) {
          this.coinMeshes.delete(coin.id);
        }
        return;
      }

      activeIds.add(coin.id);
      const coinMesh = this.coinMeshes.ensure(coin.id, () => {
        const coinMesh = MeshBuilder.CreateCylinder(coin.id, { diameter: 0.8, height: 0.08 }, this.scene);
        coinMesh.rotation.x = Math.PI / 2;

        const goldMat = this.getCachedMaterial('coin_gold', {
          diffuse: Color3.FromHexString('#E8B74F'),
          emissive: new Color3(0.12, 0.08, 0),
        });
        coinMesh.material = goldMat;

        // 星标凸起
        const star = MeshBuilder.CreateBox(`star_${coin.id}`, { width: 0.22, height: 0.22, depth: 0.12 }, this.scene);
        star.rotation.z = Math.PI / 4;
        star.material = goldMat;
        star.parent = coinMesh;

        this.glow?.addIncludedOnlyMesh(coinMesh); this.glow?.addIncludedOnlyMesh(star);

        // 挂载高精度 3D 金币模型
        this.worldAssets.attachModel(coin.id, 'PROP_COIN', coinMesh, () => {
          star.isVisible = false;
          coinMesh.visibility = 0;
        });

        return coinMesh;
      });

      const bobbing = Math.sin(totalTime * 4.5 + coin.x * 2) * 0.08;
      coinMesh.position.set(coin.x, coin.y + 0.4 + bobbing, coin.z);
      coinMesh.rotation.y += dt * 3.5;
    });

    this.coinMeshes.retain(activeIds);
  }

  private buildPowerUpSilhouette(id: string, type: PowerUpType): TransformNode {
    const descriptor = POWERUP_CATALOG[type];
    const node = new TransformNode(id, this.scene);
    const primaryColor = Color3.FromHexString(descriptor.primaryHex);
    const secondaryColor = Color3.FromHexString(descriptor.secondaryHex);

    const primaryMat = this.getCachedMaterial(`powerup_${type}_primary`, {
      diffuse: primaryColor,
      emissive: primaryColor.scale(0.14),
    });
    const secondaryMat = this.getCachedMaterial(`powerup_${type}_secondary`, {
      diffuse: secondaryColor,
      emissive: secondaryColor.scale(0.08),
    });

    const attachPart = (partName: string, mesh: Mesh, material: typeof primaryMat): Mesh => {
      mesh.material = material;
      mesh.parent = node;
      mesh.metadata = { partName, powerUpType: type, silhouetteKind: descriptor.silhouetteKind };
      return mesh;
    };

    if (type === 'MAGNET') {
      const archLeft = MeshBuilder.CreateBox(`pu_${id}_arch_left`, { width: 0.18, height: 0.52, depth: 0.18 }, this.scene);
      archLeft.position.set(-0.22, 0.06, 0);
      attachPart('arch_left', archLeft, primaryMat);

      const archRight = MeshBuilder.CreateBox(`pu_${id}_arch_right`, { width: 0.18, height: 0.52, depth: 0.18 }, this.scene);
      archRight.position.set(0.22, 0.06, 0);
      attachPart('arch_right', archRight, primaryMat);

      const archBridge = MeshBuilder.CreateBox(`pu_${id}_arch_bridge`, { width: 0.62, height: 0.18, depth: 0.18 }, this.scene);
      archBridge.position.set(0, 0.34, 0);
      attachPart('arch_bridge', archBridge, primaryMat);

      const tipLeft = MeshBuilder.CreateBox(`pu_${id}_tip_left`, { width: 0.2, height: 0.14, depth: 0.2 }, this.scene);
      tipLeft.position.set(-0.22, -0.24, 0);
      attachPart('tip_left', tipLeft, secondaryMat);

      const tipRight = MeshBuilder.CreateBox(`pu_${id}_tip_right`, { width: 0.2, height: 0.14, depth: 0.2 }, this.scene);
      tipRight.position.set(0.22, -0.24, 0);
      attachPart('tip_right', tipRight, secondaryMat);
    } else if (type === 'DOUBLE_SCORE') {
      const coreOcta = MeshBuilder.CreatePolyhedron(`pu_${id}_core_octa`, { type: 1, size: 0.28 }, this.scene);
      coreOcta.position.set(0, 0, 0);
      attachPart('core_octa', coreOcta, primaryMat);

      const ringOrbit = MeshBuilder.CreateTorus(`pu_${id}_ring_orbit`, { diameter: 0.78, thickness: 0.08, tessellation: 24 }, this.scene);
      ringOrbit.rotation.x = Math.PI / 3;
      attachPart('ring_orbit', ringOrbit, secondaryMat);

      const crestTop = MeshBuilder.CreateBox(`pu_${id}_crest_top`, { width: 0.22, height: 0.22, depth: 0.12 }, this.scene);
      crestTop.position.set(0, 0.44, 0);
      crestTop.rotation.z = Math.PI / 4;
      attachPart('crest_top', crestTop, primaryMat);
    } else if (type === 'SUPER_SNEAKERS') {
      const bootSole = MeshBuilder.CreateBox(`pu_${id}_boot_sole`, { width: 0.34, height: 0.16, depth: 0.64 }, this.scene);
      bootSole.position.set(0, -0.2, 0.04);
      attachPart('boot_sole', bootSole, secondaryMat);

      const bootUpper = MeshBuilder.CreateBox(`pu_${id}_boot_upper`, { width: 0.3, height: 0.42, depth: 0.34 }, this.scene);
      bootUpper.position.set(0, 0.08, -0.08);
      attachPart('boot_upper', bootUpper, primaryMat);

      const wingLeft = MeshBuilder.CreateBox(`pu_${id}_wing_left`, { width: 0.06, height: 0.24, depth: 0.42 }, this.scene);
      wingLeft.position.set(-0.22, 0.16, -0.14);
      wingLeft.rotation.z = 0.35;
      attachPart('wing_left', wingLeft, secondaryMat);

      const wingRight = MeshBuilder.CreateBox(`pu_${id}_wing_right`, { width: 0.06, height: 0.24, depth: 0.42 }, this.scene);
      wingRight.position.set(0.22, 0.16, -0.14);
      wingRight.rotation.z = -0.35;
      attachPart('wing_right', wingRight, secondaryMat);
    } else {
      const deckMain = MeshBuilder.CreateBox(`pu_${id}_deck_main`, { width: 0.48, height: 0.09, depth: 0.92 }, this.scene);
      deckMain.position.set(0, 0.04, 0);
      attachPart('deck_main', deckMain, primaryMat);

      const railLeft = MeshBuilder.CreateBox(`pu_${id}_rail_left`, { width: 0.08, height: 0.12, depth: 0.86 }, this.scene);
      railLeft.position.set(-0.26, 0.06, 0);
      attachPart('rail_left', railLeft, secondaryMat);

      const railRight = MeshBuilder.CreateBox(`pu_${id}_rail_right`, { width: 0.08, height: 0.12, depth: 0.86 }, this.scene);
      railRight.position.set(0.26, 0.06, 0);
      attachPart('rail_right', railRight, secondaryMat);

      const thrusterCore = MeshBuilder.CreateCylinder(`pu_${id}_thruster_core`, { diameter: 0.32, height: 0.1 }, this.scene);
      thrusterCore.position.set(0, -0.06, 0);
      attachPart('thruster_core', thrusterCore, secondaryMat);
    }

    node.metadata = {
      powerUpType: type,
      silhouetteKind: descriptor.silhouetteKind,
      partNames: descriptor.partNames,
    };

    return node;
  }

  private syncPowerUps(ctx: DeepReadonly<GameContext>, totalTime: number, dt: number): void {
    const activeIds = new Set<string>();

    ctx.powerUpEntities.forEach((pu) => {
      if (pu.collected) {
        const node = this.powerUpMeshes.get(pu.id);
        if (node) {
          this.powerUpMeshes.delete(pu.id);
        }
        return;
      }

      activeIds.add(pu.id);
      const node = this.powerUpMeshes.ensure(pu.id, () => this.buildPowerUpSilhouette(pu.id, pu.type));

      const floatY = Math.sin(totalTime * 3.0 + pu.x) * 0.15;
      node.position.set(pu.x, pu.y + floatY, pu.z);
      node.rotation.y += dt * 2.0;
    });

    this.powerUpMeshes.retain(activeIds);
  }

  getPowerUpVisualDiagnostics(): ReadonlyArray<{
    id: string;
    type: PowerUpType;
    silhouetteKind: string;
    meshCount: number;
    partNames: readonly string[];
  }> {
    const diagnostics: Array<{
      id: string;
      type: PowerUpType;
      silhouetteKind: string;
      meshCount: number;
      partNames: readonly string[];
    }> = [];
    for (const [id, node] of this.powerUpMeshes.entries()) {
      const childMeshes = node.getChildMeshes(true);
      const meta = (node.metadata ?? {}) as {
        powerUpType?: PowerUpType;
        silhouetteKind?: string;
        partNames?: readonly string[];
      };
      diagnostics.push({
        id,
        type: meta.powerUpType ?? 'MAGNET',
        silhouetteKind: meta.silhouetteKind ?? 'UNKNOWN',
        meshCount: childMeshes.length,
        partNames: meta.partNames ?? childMeshes.map((m) => String(m.metadata?.partName ?? m.name)),
      });
    }
    return Object.freeze(diagnostics);
  }

}
