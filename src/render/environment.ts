import { Mesh, MeshBuilder, PBRMaterial, StandardMaterial, TransformNode, Color3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import { CONSTANTS } from '../types';
/** Legacy geometry and cycle are migrated unchanged; new theme pooling is deferred. */
export class LegacyEnvironment {
  private envRoot: TransformNode | null = null;
  private meshes: Mesh[] = [];
  private materials: import('@babylonjs/core').Material[] = [];
  private scene: Scene;
  constructor(scene: Scene) {
    this.scene = scene;
    const before = new Set(scene.meshes); const mats = new Set(scene.materials);
    this.buildCyberEnvironment();
    this.meshes = scene.meshes.filter(m => !before.has(m)) as Mesh[];
    this.materials = scene.materials.filter(m => !mats.has(m));
  }
  sync(z: number): void { if (this.envRoot && z - this.envRoot.position.z > 600) this.envRoot.position.z += 600; }
  reset(): void { if (this.envRoot) this.envRoot.position.z = 0; }
  dispose(): void { for (const m of this.meshes) m.dispose(); this.envRoot?.dispose(); for (const m of this.materials) m.dispose(); this.meshes = []; this.materials = []; }
  private buildCyberEnvironment(): void {
    const trackLength = 1200;

    // 1. 金属地表与高质感 PBR 材质
    const groundMat = new PBRMaterial('groundMat', this.scene);
    groundMat.albedoColor = new Color3(0.2, 0.35, 0.6);
    groundMat.emissiveColor = new Color3(0.08, 0.15, 0.28);
    groundMat.metallic = 0.5;
    groundMat.roughness = 0.3;
    groundMat.backFaceCulling = false;

    // 发光赛博钢轨材质
    const railMat = new StandardMaterial('railMat', this.scene);
    railMat.diffuseColor = new Color3(0, 0.95, 1.0);
    railMat.emissiveColor = new Color3(0, 0.8, 1.0);
    railMat.backFaceCulling = false;

    // 枕木材质
    const sleeperMat = new PBRMaterial('sleeperMat', this.scene);
    sleeperMat.albedoColor = new Color3(0.35, 0.45, 0.6);
    sleeperMat.emissiveColor = new Color3(0.05, 0.1, 0.2);
    sleeperMat.metallic = 0.7;
    sleeperMat.roughness = 0.2;
    sleeperMat.backFaceCulling = false;

    // 三条跑道基础、钢轨与赛博枕木
    CONSTANTS.LANE_X.forEach((laneX, idx) => {
      const ground = MeshBuilder.CreatePlane(`ground_${idx}`, { width: 2.8, height: trackLength }, this.scene);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(laneX, 0, trackLength / 2 - 50);
      ground.material = groundMat;
      ground.receiveShadows = true;

      // 钢轨
      for (let side of [-0.9, 0.9]) {
        const rail = MeshBuilder.CreateBox(`rail_${idx}_${side}`, { width: 0.08, height: 0.12, depth: trackLength }, this.scene);
        rail.position.set(laneX + side, 0.06, trackLength / 2 - 50);
        rail.material = railMat;
        rail.receiveShadows = true;
      }

      // 轨道连结枕木 (每 3 米一根，对齐 600m 步长整数倍)
      for (let z = -50; z < trackLength - 50; z += 3.0) {
        const sleeper = MeshBuilder.CreateBox(`sleeper_${idx}_${z}`, { width: 2.5, height: 0.06, depth: 0.35 }, this.scene);
        sleeper.position.set(laneX, 0.03, z);
        sleeper.material = sleeperMat;
        sleeper.receiveShadows = true;
      }
    });

    // 2. 轨侧双发光防撞隔离屏障与高光护栏
    const barrierMat = new PBRMaterial('barrierMat', this.scene);
    barrierMat.albedoColor = new Color3(0.1, 0.14, 0.25);
    barrierMat.metallic = 0.8;
    barrierMat.roughness = 0.3;

    const neonStripeMatLeft = new StandardMaterial('neonMatL', this.scene);
    neonStripeMatLeft.emissiveColor = new Color3(1.0, 0, 0.5);

    const neonStripeMatRight = new StandardMaterial('neonMatR', this.scene);
    neonStripeMatRight.emissiveColor = new Color3(0, 0.95, 1.0);

    for (let side of [-4.6, 4.6]) {
      const barrier = MeshBuilder.CreateBox(`barrier_${side}`, { width: 0.3, height: 0.8, depth: trackLength }, this.scene);
      barrier.position.set(side, 0.4, trackLength / 2 - 50);
      barrier.material = barrierMat;

      const stripe = MeshBuilder.CreateBox(`bStripe_${side}`, { width: 0.32, height: 0.1, depth: trackLength }, this.scene);
      stripe.position.set(side, 0.75, trackLength / 2 - 50);
      stripe.material = side > 0 ? neonStripeMatRight : neonStripeMatLeft;
    }

    // 3. 跨轨高压电缆龙门架与接触网 (Catenary Gantries & Overhead Wires)
    const gantryMat = new PBRMaterial('gantryMat', this.scene);
    gantryMat.albedoColor = new Color3(0.3, 0.4, 0.55);
    gantryMat.emissiveColor = new Color3(0.05, 0.1, 0.18);
    gantryMat.metallic = 0.85;

    const wireMat = new StandardMaterial('wireMat', this.scene);
    wireMat.emissiveColor = new Color3(0.1, 0.9, 1.0);

    const insulatorMat = new StandardMaterial('insulatorMat', this.scene);
    insulatorMat.emissiveColor = new Color3(1.0, 0.85, 0);

    const beaconMat = new StandardMaterial('beaconMat', this.scene);
    beaconMat.emissiveColor = new Color3(1.0, 0.1, 0.2);

    // 纵向三条高压接触线 (提升至 y = 8.2 高度避免遮挡)
    CONSTANTS.LANE_X.forEach((laneX, idx) => {
      const wire = MeshBuilder.CreateBox(`catenary_wire_${idx}`, { width: 0.05, height: 0.05, depth: trackLength }, this.scene);
      wire.position.set(laneX, 8.2, trackLength / 2 - 50);
      wire.material = wireMat;
    });

    // 跨轨龙门架 (每 50 米一座，对齐 600m 步长)
    for (let z = 0; z < trackLength - 50; z += 50) {
      // 左右立柱
      [-5.2, 5.2].forEach((xPos) => {
        const pillar = MeshBuilder.CreateBox(`gPillar_${z}_${xPos}`, { width: 0.4, height: 9.0, depth: 0.4 }, this.scene);
        pillar.position.set(xPos, 4.5, z);
        pillar.material = gantryMat;
      });

      // 顶部横梁网架
      const beam = MeshBuilder.CreateBox(`gBeam_${z}`, { width: 10.8, height: 0.5, depth: 0.5 }, this.scene);
      beam.position.set(0, 8.8, z);
      beam.material = gantryMat;

      // 顶部红色航空警示灯
      [-5.2, 0, 5.2].forEach((xPos) => {
        const beacon = MeshBuilder.CreateSphere(`gBeacon_${z}_${xPos}`, { diameter: 0.35 }, this.scene);
        beacon.position.set(xPos, 9.25, z);
        beacon.material = beaconMat;
      });

      // 悬挂绝缘子
      CONSTANTS.LANE_X.forEach((laneX) => {
        const ins = MeshBuilder.CreateCylinder(`gIns_${z}_${laneX}`, { diameter: 0.18, height: 0.4 }, this.scene);
        ins.position.set(laneX, 8.45, z);
        ins.material = insulatorMat;
      });
    }

    // 4. 轨旁三色信号灯杆与防撞控制柜 (Signal Lights & Control Cabinets)
    const signalBoxMat = new StandardMaterial('sigBoxMat', this.scene);
    signalBoxMat.diffuseColor = new Color3(0.08, 0.1, 0.15);

    const redLens = new StandardMaterial('redLens', this.scene);
    redLens.emissiveColor = new Color3(1.0, 0, 0.2);

    const yellowLens = new StandardMaterial('yellowLens', this.scene);
    yellowLens.emissiveColor = new Color3(1.0, 0.75, 0);

    const greenLens = new StandardMaterial('greenLens', this.scene);
    greenLens.emissiveColor = new Color3(0, 1.0, 0.3);

    const cabinetStripeMat = new StandardMaterial('cabStripeMat', this.scene);
    cabinetStripeMat.emissiveColor = new Color3(1.0, 0.85, 0);

    for (let z = 15; z < trackLength - 50; z += 30) {
      const side = (z % 60 === 15) ? -5.0 : 5.0;

      // 信号灯杆
      const pole = MeshBuilder.CreateCylinder(`sigPole_${z}`, { diameter: 0.12, height: 3.6 }, this.scene);
      pole.position.set(side, 1.8, z);
      pole.material = gantryMat;

      // 信号灯灯箱
      const sigBox = MeshBuilder.CreateBox(`sigBox_${z}`, { width: 0.35, height: 0.9, depth: 0.3 }, this.scene);
      sigBox.position.set(side, 3.2, z);
      sigBox.material = signalBoxMat;

      // 3 色 LED 镜头
      const lenses = [redLens, yellowLens, greenLens];
      lenses.forEach((lMat, idx) => {
        const lens = MeshBuilder.CreateCylinder(`lens_${z}_${idx}`, { diameter: 0.15, height: 0.05 }, this.scene);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(side, 3.45 - idx * 0.25, z - 0.16);
        lens.material = lMat;
      });

      // 轨旁地面控制柜 / 继电箱
      const cabX = side > 0 ? 5.5 : -5.5;
      const cab = MeshBuilder.CreateBox(`cab_${z}`, { width: 0.9, height: 1.2, depth: 0.8 }, this.scene);
      cab.position.set(cabX, 0.6, z + 5);
      cab.material = barrierMat;

      // 控制柜防撞警示条
      const cabStripe = MeshBuilder.CreateBox(`cabStripe_${z}`, { width: 0.92, height: 0.15, depth: 0.82 }, this.scene);
      cabStripe.position.set(cabX, 1.1, z + 5);
      cabStripe.material = cabinetStripeMat;
    }

    // 5. 巨型工业通风管道与两侧隔音墙 (Ventilation Ducts & Noise Barrier Walls)
    const wallMat = new PBRMaterial('wallMat', this.scene);
    wallMat.albedoColor = new Color3(0.08, 0.12, 0.22);
    wallMat.metallic = 0.5;
    wallMat.roughness = 0.5;

    const ductMat = new PBRMaterial('ductMat', this.scene);
    ductMat.albedoColor = new Color3(0.2, 0.3, 0.4);
    ductMat.metallic = 0.9;
    ductMat.roughness = 0.15;

    // 两侧连续隔音屏障墙与通长工业通风大管
    [-6.2, 6.2].forEach((xSide) => {
      const wall = MeshBuilder.CreateBox(`wall_${xSide}`, { width: 0.4, height: 2.8, depth: trackLength }, this.scene);
      wall.position.set(xSide, 1.4, trackLength / 2 - 50);
      wall.material = wallMat;

      // 墙顶亮边发光带
      const topNeon = MeshBuilder.CreateBox(`wallTop_${xSide}`, { width: 0.42, height: 0.12, depth: trackLength }, this.scene);
      topNeon.position.set(xSide, 2.8, trackLength / 2 - 50);
      topNeon.material = xSide > 0 ? neonStripeMatRight : neonStripeMatLeft;

      // 沿墙侧运行的巨型圆筒通风管道
      const duct = MeshBuilder.CreateCylinder(`duct_${xSide}`, { diameter: 0.6, height: trackLength }, this.scene);
      duct.rotation.x = Math.PI / 2;
      duct.position.set(xSide > 0 ? xSide - 0.4 : xSide + 0.4, 2.2, trackLength / 2 - 50);
      duct.material = ductMat;
    });

    // 6. 弧形赛博高杆路灯与配电箱体 (Cyber Neon Streetlamps & Utility Boxes)
    const lampHeadMat = new StandardMaterial('lampHeadMat', this.scene);
    lampHeadMat.emissiveColor = new Color3(0, 0.95, 1.0);

    for (let z = 0; z < trackLength - 50; z += 50) {
      const xSide = (z % 100 === 0) ? -7.8 : 7.8;
      const innerDir = xSide > 0 ? -1 : 1;

      // 灯杆主干
      const pole = MeshBuilder.CreateCylinder(`streetPole_${z}`, { diameter: 0.2, height: 7.0 }, this.scene);
      pole.position.set(xSide, 3.5, z);
      pole.material = gantryMat;

      // 弧形延伸横臂
      const arm = MeshBuilder.CreateBox(`streetArm_${z}`, { width: 2.2, height: 0.15, depth: 0.15 }, this.scene);
      arm.position.set(xSide + innerDir * 1.0, 6.9, z);
      arm.material = gantryMat;

      // 霓虹发光灯头
      const lampHead = MeshBuilder.CreateBox(`lampHead_${z}`, { width: 0.8, height: 0.12, depth: 0.3 }, this.scene);
      lampHead.position.set(xSide + innerDir * 2.0, 6.8, z);
      lampHead.material = lampHeadMat;

      // 路边配电柜与危险警示标识
      const box = MeshBuilder.CreateBox(`utilBox_${z}`, { width: 1.0, height: 1.4, depth: 0.8 }, this.scene);
      box.position.set(xSide, 0.7, z + 3);
      box.material = barrierMat;
    }

    // 8. 3D 霓虹交互展台地台 (Menu & Shop 3D Podium Stage)
    const podiumMat = new PBRMaterial('podiumMat', this.scene);
    podiumMat.albedoColor = new Color3(0.1, 0.15, 0.3);
    podiumMat.emissiveColor = new Color3(0.02, 0.08, 0.15);
    podiumMat.metallic = 0.8;
    podiumMat.roughness = 0.2;

    const podiumRingMat = new StandardMaterial('podiumRingMat', this.scene);
    podiumRingMat.emissiveColor = new Color3(0, 0.95, 1.0);

    const podium = MeshBuilder.CreateCylinder('menuPodium', { diameter: 5.5, height: 0.15 }, this.scene);
    podium.position.set(0, 0.075, 0);
    podium.material = podiumMat;

    const ring = MeshBuilder.CreateCylinder('podiumRing', { diameter: 5.7, height: 0.05 }, this.scene);
    ring.position.set(0, 0.025, 0);
    ring.material = podiumRingMat;

    // 9. 巨型 3D 地铁拱形隧道洞口 (3D Metro Tunnel Portals)
    const portalMat = new PBRMaterial('portalMat', this.scene);
    portalMat.albedoColor = new Color3(0.12, 0.16, 0.28);
    portalMat.metallic = 0.7;

    const portalSignMat = new StandardMaterial('portalSignMat', this.scene);
    portalSignMat.emissiveColor = new Color3(0, 0.95, 1.0);

    for (let pz = 100; pz < trackLength - 50; pz += 300) {
      // 洞口左右门柱与拱顶横梁
      [-6.5, 6.5].forEach((px) => {
        const pPillar = MeshBuilder.CreateBox(`portalPillar_${pz}_${px}`, { width: 0.8, height: 6.5, depth: 1.2 }, this.scene);
        pPillar.position.set(px, 3.25, pz);
        pPillar.material = portalMat;
      });

      const pArch = MeshBuilder.CreateBox(`portalArch_${pz}`, { width: 13.8, height: 1.0, depth: 1.2 }, this.scene);
      pArch.position.set(0, 6.0, pz);
      pArch.material = portalMat;

      // 洞口发光名牌
      const pSign = MeshBuilder.CreateBox(`portalSign_${pz}`, { width: 6.0, height: 0.6, depth: 0.2 }, this.scene);
      pSign.position.set(0, 6.0, pz - 0.65);
      pSign.material = portalSignMat;
    }

    // —— 静态环境网格合并（性能优化）——
    // 将 ~1600 个独立静态 Mesh 按材质批量合并为少量大 Mesh，显著降低 draw call 与逐帧视锥剔除遍历开销。
    // 注意：必须在玩家/警官/警犬 Mesh 创建前调用（此时 scene 中仅有环境网格）。
    this.mergeStaticEnvironment();
  }

  /**
   * 将场景中所有静态环境 Mesh 按材质分组合并。
   */
  private mergeStaticEnvironment(): void {
    this.envRoot = new TransformNode('envRoot', this.scene);
    const batches = new Map<string, Mesh[]>();
    for (const abstractMesh of this.scene.meshes.slice()) {
      if (!(abstractMesh instanceof Mesh)) continue;
      const mesh = abstractMesh;
      if (mesh.name === 'menuPodium' || mesh.name === 'podiumRing') continue; // 展台保持在世界原点
      const key = mesh.material?.name ?? '_noMaterial';
      let arr = batches.get(key);
      if (!arr) {
        arr = [];
        batches.set(key, arr);
      }
      arr.push(mesh);
    }

    for (const [key, meshes] of batches) {
      const receiveShadows = meshes.some((m) => m.receiveShadows);
      const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
      if (merged) {
        merged.name = `env_${key}`;
        merged.parent = this.envRoot;
        merged.receiveShadows = receiveShadows;
        merged.isPickable = false;
        merged.freezeWorldMatrix();
      }
    }
  }

}
