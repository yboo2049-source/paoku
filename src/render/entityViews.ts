import { Color3, MeshBuilder, TransformNode } from '@babylonjs/core';
import type { Mesh, Scene, ShadowGenerator } from '@babylonjs/core';
import type { DeepReadonly } from '../types/contracts';
import type { GameContext } from '../types';
import { SharedMaterials } from './assets';

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
  constructor(scene: Scene, shadowGenerator: ShadowGenerator, materials: SharedMaterials) { this.scene = scene; this.shadowGenerator = shadowGenerator; this.materials = materials; }
  private release(node: TransformNode): void {
    for (const mesh of node.getChildMeshes()) this.shadowGenerator.removeShadowCaster(mesh);
    this.shadowGenerator.removeShadowCaster(node as Mesh);
    node.dispose(false, false);
  }
  private getCachedMaterial(key: string, opts: { diffuse?: Color3; emissive?: Color3 }) { return this.materials.get(key, opts); }
  sync(ctx: DeepReadonly<GameContext>, totalTime: number, dt: number): void {
    this.syncObstacles(ctx); this.syncCoins(ctx, totalTime, dt); this.syncPowerUps(ctx, totalTime, dt);
  }
  reset(): void { this.obstacleMeshes.clear(); this.coinMeshes.clear(); this.powerUpMeshes.clear(); }
  dispose(): void { this.reset(); }
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
            { diffuse: isMoving ? new Color3(0.9, 0.1, 0.1) : new Color3(0.1, 0.4, 0.85) }
          );

          const body = MeshBuilder.CreateBox(`train_${obs.id}`, { width: obs.width, height: obs.height * 0.8, depth: obs.depth }, this.scene);
          body.position.y = obs.height * 0.5;
          body.material = bodyMat;
          body.parent = node;
          this.shadowGenerator.addShadowCaster(body);

          // 车顶遮罩
          const roof = MeshBuilder.CreateBox(`roof_${obs.id}`, { width: obs.width * 0.96, height: 0.15, depth: obs.depth * 0.98 }, this.scene);
          roof.position.y = obs.height - 0.08;
          roof.parent = node;

          // 黄色醒目警戒线
          const stripeMat = this.getCachedMaterial('train_stripe', { emissive: new Color3(1.0, 0.8, 0) });
          const stripe = MeshBuilder.CreateBox(`stripe_${obs.id}`, { width: obs.width + 0.02, height: 0.15, depth: obs.depth * 0.98 }, this.scene);
          stripe.position.y = obs.height * 0.45;
          stripe.material = stripeMat;
          stripe.parent = node;

          // 迎面车头发光大灯
          const lightMat = this.getCachedMaterial('train_headlight', { emissive: new Color3(1.0, 1.0, 0.6) });
          const rootNode = node;
          [-obs.width * 0.3, obs.width * 0.3].forEach((lx) => {
            const hl = MeshBuilder.CreateCylinder(`hl_${obs.id}_${lx}`, { diameter: 0.35, height: 0.05 }, this.scene);
            hl.rotation.x = Math.PI / 2;
            hl.position.set(lx, obs.height * 0.3, -obs.depth / 2 - 0.02);
            hl.material = lightMat;
            hl.parent = rootNode;
          });

        } else if (obs.type === 'RAMP') {
          // 精细化 3D 斜坡 (包含高亮发光 Yellow 冲刺指示箭头)
          const rampMat = this.getCachedMaterial('ramp_body', { diffuse: new Color3(1.0, 0.45, 0) });

          const ramp = MeshBuilder.CreateBox(`ramp_${obs.id}`, { width: obs.width, height: obs.height, depth: obs.depth }, this.scene);
          ramp.position.y = obs.height / 2;
          ramp.material = rampMat;
          ramp.parent = node;

          // 3 个冲刺箭头标记
          const arrowMat = this.getCachedMaterial('ramp_arrow', { emissive: new Color3(1.0, 1.0, 0) });
          const rootNode = node;
          for (let i = -1; i <= 1; i++) {
            const arrow = MeshBuilder.CreateBox(`arrow_${obs.id}_${i}`, { width: obs.width * 0.5, height: 0.05, depth: 0.4 }, this.scene);
            arrow.position.set(0, obs.height * 0.5 + 0.1, i * (obs.depth * 0.25));
            arrow.material = arrowMat;
            arrow.parent = rootNode;
          }

        } else {
          // 精细化低/高空障碍栅栏 (含有双侧红/黄闪烁警示灯与黄黑斜纹拉线)
          const isLow = obs.type === 'LOW_OBSTACLE';
          const frameMat = this.getCachedMaterial(
            isLow ? 'obstacle_low' : 'obstacle_high',
            { diffuse: isLow ? new Color3(0.9, 0.65, 0) : new Color3(0.85, 0, 0.2) }
          );

          const bar = MeshBuilder.CreateBox(`bar_${obs.id}`, { width: obs.width, height: obs.height, depth: obs.depth }, this.scene);
          bar.position.y = obs.height / 2;
          bar.material = frameMat;
          bar.parent = node;

          // 警示闪灯
          const lampMat = this.getCachedMaterial('obstacle_lamp', { emissive: new Color3(1.0, 0.1, 0.1) });
          const rootNode = node;
          [-obs.width * 0.4, obs.width * 0.4].forEach((lx) => {
            const lamp = MeshBuilder.CreateSphere(`lamp_${obs.id}_${lx}`, { diameter: 0.25 }, this.scene);
            lamp.position.set(lx, obs.height + 0.12, 0);
            lamp.material = lampMat;
            lamp.parent = rootNode;
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
          diffuse: new Color3(1.0, 0.85, 0),
          emissive: new Color3(0.6, 0.45, 0),
        });
        coinMesh.material = goldMat;

        // 星标凸起
        const star = MeshBuilder.CreateBox(`star_${coin.id}`, { width: 0.22, height: 0.22, depth: 0.12 }, this.scene);
        star.rotation.z = Math.PI / 4;
        star.material = goldMat;
        star.parent = coinMesh;

        return coinMesh;
      });

      const bobbing = Math.sin(totalTime * 4.5 + coin.x * 2) * 0.08;
      coinMesh.position.set(coin.x, coin.y + 0.4 + bobbing, coin.z);
      coinMesh.rotation.y += dt * 3.5;
    });

    this.coinMeshes.retain(activeIds);
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
      const node = this.powerUpMeshes.ensure(pu.id, () => {
        const node = new TransformNode(pu.id, this.scene);
        const mesh = MeshBuilder.CreateBox(`pu_mesh_${pu.id}`, { size: 0.7 }, this.scene);

        let color = new Color3(0, 0.95, 1.0);
        if (pu.type === 'MAGNET') color = new Color3(1.0, 0, 0.3);
        else if (pu.type === 'DOUBLE_SCORE') color = new Color3(1.0, 0.85, 0);
        else if (pu.type === 'SUPER_SNEAKERS') color = new Color3(0, 1.0, 0.4);

        const pMat = this.getCachedMaterial(`powerup_${pu.type}`, { diffuse: color, emissive: color });
        mesh.material = pMat;
        mesh.parent = node;

        return node;
      });

      const floatY = Math.sin(totalTime * 3.0 + pu.x) * 0.15;
      node.position.set(pu.x, pu.y + floatY, pu.z);
      node.rotation.y += dt * 2.0;
    });

    this.powerUpMeshes.retain(activeIds);
  }

}
