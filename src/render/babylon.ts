import '@babylonjs/loaders/glTF';
import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  GlowLayer,
  TargetCamera,
  Mesh,
  TransformNode,
  DefaultRenderingPipeline,
  ParticleSystem,
  DynamicTexture,
  Scalar,
  SceneLoader,
  AnimationGroup,
} from '@babylonjs/core';
import type { GameContext } from '../types';
import { CONSTANTS } from '../types';
import { eventBus } from '../core/eventBus';

export class BabylonRenderEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: TargetCamera;

  private envRoot: TransformNode | null = null;
  private playerRoot: TransformNode;
  private playerBodyMesh: Mesh;
  private hoverboardMesh: Mesh;
  private inspectorRoot: TransformNode;
  private dogRoot: TransformNode;

  // 玩家材质与皮肤状态引用
  private suitMat: PBRMaterial | null = null;
  private armorMat: PBRMaterial | null = null;
  private visorMat: StandardMaterial | null = null;
  private currentSkin: { color: string; secondaryColor: string } | null = null;

  private shadowGenerator: ShadowGenerator;
  private glowLayer: GlowLayer;
  private pipeline: DefaultRenderingPipeline;
  private speedlineSystem: ParticleSystem;

  // 摄像机与动效状态
  private currentCameraRoll: number = 0;
  private lastPlayerY: number = 0;
  private landingShakeTime: number = 0;

  // 3D 骨骼动画状态机缓存
  private animGroups: AnimationGroup[] = [];
  private currentAnimName: string = '';

  // Mesh 实例缓存 Map
  private obstacleMeshes: Map<string, TransformNode> = new Map();
  private coinMeshes: Map<string, Mesh> = new Map();
  private powerUpMeshes: Map<string, TransformNode> = new Map();

  // 动态实体材质缓存（按类型复用，避免每实例 new StandardMaterial 造成泄漏）
  private materialCache: Map<string, StandardMaterial> = new Map();

  private totalTime: number = 0;

  constructor(container: HTMLElement) {
    // 1. 获取或创建 Canvas
    const existingCanvas = container.querySelector('canvas') as HTMLCanvasElement;
    if (existingCanvas) {
      this.canvas = existingCanvas;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      container.appendChild(this.canvas);
    }

    const width = container.clientWidth || window.innerWidth || 1280;
    const height = container.clientHeight || window.innerHeight || 720;
    this.canvas.width = width;
    this.canvas.height = height;

    // 2. 初始化 Babylon 引擎与 Scene
    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.engine.setSize(width, height);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.06, 0.12, 1.0); // 深深沉浸赛博夜色

    // 3. 摄像机 (TargetCamera)
    this.camera = new TargetCamera('camera1', new Vector3(0, 4.5, -9.0), this.scene);
    this.camera.setTarget(new Vector3(0, 1.5, 15.0));

    // 4. Glow Layer 与 DefaultRenderingPipeline 高级后处理管线
    this.glowLayer = new GlowLayer('glow', this.scene);
    this.glowLayer.intensity = 0.65;

    this.pipeline = new DefaultRenderingPipeline('defaultPipeline', true, this.scene, [this.camera]);
    // 后处理二选一：保留 GlowLayer 作为主发光，关闭 bloom，避免两套发光通道叠加（双全屏 pass）。
    this.pipeline.bloomEnabled = false;
    this.pipeline.fxaaEnabled = true;

    // 5. 赛博光照系统 (Hemispheric + Directional Shadow)
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene);
    hemiLight.diffuse = new Color3(0.3, 0.95, 1.0); // 青色发光
    hemiLight.groundColor = new Color3(1.0, 0.2, 0.6); // 粉色地面暗部
    hemiLight.intensity = 1.1;

    const dirLight = new DirectionalLight('dirLight', new Vector3(-0.4, -1, 0.5), this.scene);
    dirLight.position = new Vector3(25, 45, 25);
    dirLight.intensity = 1.8;

    this.shadowGenerator = new ShadowGenerator(2048, dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;

    // 6. 构建跑道与赛博城天际线环境
    this.buildCyberEnvironment();

    // 7. 构建玩家 3D 角色模型与悬浮滑板
    this.playerRoot = new TransformNode('playerRoot', this.scene);
    this.playerBodyMesh = this.buildPlayerMesh();
    this.playerBodyMesh.parent = this.playerRoot;

    this.hoverboardMesh = this.buildHoverboardMesh();
    this.hoverboardMesh.parent = this.playerRoot;
    this.hoverboardMesh.isVisible = false;

    // 8. 构建追捕警官与警犬
    this.inspectorRoot = this.buildInspectorMesh();
    this.dogRoot = this.buildDogMesh();

    // 9. 初始化极速风阻拉线粒子系统
    this.speedlineSystem = this.initSpeedlines();

    // 10. 监听皮肤切换事件
    eventBus.on('SKIN_CHANGED', (skin: any) => {
      if (skin?.color && skin?.secondaryColor) {
        this.applySkin(skin);
      }
    });

    // 监听窗口 Resize
    window.addEventListener('resize', () => this.engine.resize());
  }

  /**
   * 构建 Babylon.js 高精 3D 跑道与丰富轨旁元素环境 (Subway & Trackside Environment)
   */
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

  /**
   * 构建精细的 3D 人员模型 (包含头、目镜、战甲躯干、四肢与喷气背包)
   */
  private buildPlayerMesh(): Mesh {
    const rootMesh = new Mesh('playerBodyContainer', this.scene);

    const suitMat = new PBRMaterial('suitMat', this.scene);
    suitMat.albedoColor = new Color3(0, 0.95, 1.0);
    suitMat.metallic = 0.5;
    suitMat.roughness = 0.3;
    this.suitMat = suitMat;

    const armorMat = new PBRMaterial('armorMat', this.scene);
    armorMat.albedoColor = new Color3(0.08, 0.12, 0.2);
    armorMat.metallic = 0.9;
    armorMat.roughness = 0.2;
    this.armorMat = armorMat;

    const visorMat = new StandardMaterial('visorMat', this.scene);
    visorMat.diffuseColor = new Color3(0, 0.95, 1.0);
    visorMat.emissiveColor = new Color3(0, 0.8, 1.0);
    this.visorMat = visorMat;

    const skinMat = new StandardMaterial('skinMat', this.scene);
    skinMat.diffuseColor = new Color3(1.0, 0.8, 0.65);

    // 1. 躯干 Torso
    const torso = MeshBuilder.CreateBox('torso', { width: 0.6, height: 0.7, depth: 0.4 }, this.scene);
    torso.position.y = 1.05;
    torso.material = suitMat;
    torso.parent = rootMesh;
    this.shadowGenerator.addShadowCaster(torso);

    // 2. 胸甲 Armor
    const armor = MeshBuilder.CreateBox('armor', { width: 0.65, height: 0.4, depth: 0.45 }, this.scene);
    armor.position.y = 1.15;
    armor.material = armorMat;
    armor.parent = rootMesh;
    this.shadowGenerator.addShadowCaster(armor);

    // 3. 头部 Head
    const head = MeshBuilder.CreateBox('head', { width: 0.4, height: 0.4, depth: 0.4 }, this.scene);
    head.position.y = 1.6;
    head.material = skinMat;
    head.parent = rootMesh;
    this.shadowGenerator.addShadowCaster(head);

    // 4. 科幻发光目镜 Visor
    const visor = MeshBuilder.CreateBox('visor', { width: 0.42, height: 0.12, depth: 0.15 }, this.scene);
    visor.position.set(0, 1.62, 0.18);
    visor.material = visorMat;
    visor.parent = rootMesh;

    // 5. 左臂 Left Arm & 右臂 Right Arm
    const armLeft = MeshBuilder.CreateBox('armLeft', { width: 0.18, height: 0.6, depth: 0.18 }, this.scene);
    armLeft.position.set(-0.42, 1.05, 0);
    armLeft.material = suitMat;
    armLeft.parent = rootMesh;

    const armRight = MeshBuilder.CreateBox('armRight', { width: 0.18, height: 0.6, depth: 0.18 }, this.scene);
    armRight.position.set(0.42, 1.05, 0);
    armRight.material = suitMat;
    armRight.parent = rootMesh;

    // 6. 左腿 Left Leg & 右腿 Right Leg
    const legLeft = MeshBuilder.CreateBox('legLeft', { width: 0.22, height: 0.7, depth: 0.22 }, this.scene);
    legLeft.position.set(-0.18, 0.35, 0);
    legLeft.material = armorMat;
    legLeft.parent = rootMesh;

    const legRight = MeshBuilder.CreateBox('legRight', { width: 0.22, height: 0.7, depth: 0.22 }, this.scene);
    legRight.position.set(0.18, 0.35, 0);
    legRight.material = armorMat;
    legRight.parent = rootMesh;

    // 7. 背包 Jetpack
    const pack = MeshBuilder.CreateBox('pack', { width: 0.4, height: 0.5, depth: 0.22 }, this.scene);
    pack.position.set(0, 1.15, -0.28);
    pack.material = armorMat;
    pack.parent = rootMesh;

    // 尝试载入 3D 骨骼 GLB 模型 (/models/player.glb)
    SceneLoader.ImportMeshAsync('', '/models/', 'player.glb', this.scene).then((result) => {
      if (this.scene.isDisposed || !result.meshes || result.meshes.length === 0) {
        console.warn('[GLB] 骨骼模型加载结果为空或场景已释放，保留过程化几何');
        return;
      }

      // 载入层级为 Babylon 合成根节点 __root__ → Armature(骨骼) → Beta_Joints / Beta_Surface(蒙皮网格)。
      // result.meshes[0] 即该合成根节点，将其挂到玩家根节点即可整体携带骨骼与网格。
      const glbPlayer = result.meshes[0];
      glbPlayer.parent = rootMesh;

      // 缩放修复：GLB 内已含 Armature 0.01 缩放 + 蒙皮逆绑定矩阵(IBM) 100 倍，二者抵消后
      // 角色世界高度约 1.8 单位，与 CONSTANTS.PLAYER_HEIGHT 对齐。旧代码再乘 0.012 会把角色
      // 缩到 ~2cm（“白盒”根因之一），此处显式归一为 1.0。
      glbPlayer.scaling.set(1, 1, 1);

      // 轴向修复：模型为 Y-up 站立、实际面朝 -Z（朝向相机）。玩家前进方向为 +Z（远离相机），
      // 故需绕 Y 轴旋转 π，让角色背对相机朝 +Z 前进；不旋转则面朝 -Z 呈"倒着跑"。
      glbPlayer.rotation.y = Math.PI;

      // 阴影投射配置：将骨骼蒙皮网格注册至阴影投射器
      result.meshes.forEach((m) => {
        if (m instanceof Mesh && this.shadowGenerator) {
          this.shadowGenerator.addShadowCaster(m, true);
        }
      });

      // 隐藏程序化几何部件（含背包，避免残留几何与骨骼模型叠加显示）
      ['torso', 'armor', 'head', 'visor', 'armLeft', 'armRight', 'legLeft', 'legRight', 'pack'].forEach((name) => {
        const m = this.scene.getMeshByName(name);
        if (m) m.isVisible = false;
      });

      // 若已有选定皮肤，立即应用到 GLB 蒙皮网格
      if (this.currentSkin) {
        this.applySkin(this.currentSkin);
      }

      // 缓存并管理骨骼动画组
      if (result.animationGroups && result.animationGroups.length > 0) {
        this.animGroups = result.animationGroups;
        this.animGroups.forEach((ag) => ag.stop());
        this.playSkeletalAnimation('run', true, 1.0);
      } else {
        console.warn('[GLB] 骨骼模型缺少 AnimationGroup');
      }
    }).catch((err) => {
      // 容错降级：保留过程化几何，并明确输出错误便于排查（不再静默吞错）
      console.error('[GLB] 骨骼模型加载失败，回退到过程化几何。', err);
    });

    return rootMesh;
  }

  /**
   * 动态应用皮肤配色至 3D 角色（过程化材质与 GLB 蒙皮网格）
   */
  public applySkin(skin: { color: string; secondaryColor: string }): void {
    this.currentSkin = skin;
    const primaryColor = Color3.FromHexString(skin.color);
    const secondaryColor = Color3.FromHexString(skin.secondaryColor);

    if (this.suitMat) {
      this.suitMat.albedoColor = primaryColor;
    }
    if (this.visorMat) {
      this.visorMat.diffuseColor = primaryColor;
      this.visorMat.emissiveColor = primaryColor;
    }
    if (this.armorMat) {
      this.armorMat.albedoColor = secondaryColor;
    }

    const surfaceMesh = this.scene.getMeshByName('Beta_Surface');
    if (surfaceMesh && surfaceMesh.material instanceof PBRMaterial) {
      surfaceMesh.material.albedoColor = primaryColor;
      surfaceMesh.material.emissiveColor = primaryColor.scale(0.2);
    }
    const jointsMesh = this.scene.getMeshByName('Beta_Joints');
    if (jointsMesh && jointsMesh.material instanceof PBRMaterial) {
      jointsMesh.material.albedoColor = secondaryColor;
    }
  }

  // 语义动作关键字 → GLB 内实际动画名映射。
  // 当前 GLB 仅含 agree/headShake/idle/run/sad_pose/sneak_pose/walk，
  // jump/slide/stumble 尚无对应动画，暂映射到最接近的已有动画作为占位，
  // 待后续通过 Mixamo/Blender 补齐真实动画后更新此映射（见 docs/art/asset-audit.md §8 P0）。
  private static readonly ANIMATION_ALIASES: Record<string, string> = {
    idle: 'idle',
    run: 'run',
    jump: 'run',         // 占位：跳跃位移由物理层处理，动画暂沿用奔跑
    slide: 'sneak_pose', // 占位：蹲伏姿态最接近滑铲
    stumble: 'sad_pose', // 占位：受击垂头姿态最接近踉跄
  };

  /**
   * 3D 骨骼动画状态机控制
   */
  private playSkeletalAnimation(keyword: string, loop: boolean = true, speedRatio: number = 1.0): void {
    if (this.animGroups.length === 0) return;

    const targetName = BabylonRenderEngine.ANIMATION_ALIASES[keyword] || keyword;

    // 若当前已在该语义动作上，仅更新播放速率
    if (this.currentAnimName === keyword) {
      const active = this.findAnimationGroup(targetName);
      if (active) active.speedRatio = speedRatio;
      return;
    }

    let target = this.findAnimationGroup(targetName);
    if (!target) target = this.findAnimationGroup('idle');
    if (!target) target = this.animGroups[0];
    if (!target) return;

    this.animGroups.forEach((ag) => ag.stop());
    target.speedRatio = speedRatio;
    target.play(loop);
    this.currentAnimName = keyword;
  }

  /**
   * 按名称（忽略大小写）查找动画组，优先精确匹配，其次子串匹配
   */
  private findAnimationGroup(name: string) {
    const lower = name.toLowerCase();
    return (
      this.animGroups.find((ag) => ag.name.toLowerCase() === lower) ||
      this.animGroups.find((ag) => ag.name.toLowerCase().includes(lower))
    );
  }

  /**
   * 构建 Babylon 悬浮滑板 Mesh
   */
  private buildHoverboardMesh(): Mesh {
    const boardMat = new StandardMaterial('boardMat', this.scene);
    boardMat.diffuseColor = new Color3(1.0, 0, 0.5);
    boardMat.emissiveColor = new Color3(0.8, 0, 0.4);

    const board = MeshBuilder.CreateBox('hoverboard', { width: 0.7, height: 0.08, depth: 1.6 }, this.scene);
    board.position.y = 0.04;
    board.material = boardMat;
    return board;
  }

  /**
   * 构建 3D 追捕警官实体 (Inspector Chase Entity)
   */
  private buildInspectorMesh(): TransformNode {
    const root = new TransformNode('inspectorRoot', this.scene);

    const officerMat = new PBRMaterial('officerMat', this.scene);
    officerMat.albedoColor = new Color3(0.05, 0.12, 0.35);
    officerMat.metallic = 0.6;

    const capMat = new StandardMaterial('capMat', this.scene);
    capMat.diffuseColor = new Color3(0.02, 0.05, 0.2);

    const badgeMat = new StandardMaterial('badgeMat', this.scene);
    badgeMat.emissiveColor = new Color3(1.0, 0.85, 0);

    const skinMat = new StandardMaterial('officerSkin', this.scene);
    skinMat.diffuseColor = new Color3(0.9, 0.7, 0.55);

    // 躯干
    const torso = MeshBuilder.CreateBox('officerTorso', { width: 0.75, height: 0.85, depth: 0.45 }, this.scene);
    torso.position.y = 1.1;
    torso.material = officerMat;
    torso.parent = root;

    // 头部与警帽
    const head = MeshBuilder.CreateBox('officerHead', { width: 0.45, height: 0.45, depth: 0.45 }, this.scene);
    head.position.y = 1.75;
    head.material = skinMat;
    head.parent = root;

    const cap = MeshBuilder.CreateBox('officerCap', { width: 0.55, height: 0.18, depth: 0.55 }, this.scene);
    cap.position.set(0, 2.0, 0.05);
    cap.material = capMat;
    cap.parent = root;

    const badge = MeshBuilder.CreateBox('officerBadge', { width: 0.15, height: 0.15, depth: 0.1 }, this.scene);
    badge.position.set(0, 1.25, 0.25);
    badge.material = badgeMat;
    badge.parent = root;

    // 警灯红蓝发光 Beacon
    const sirenRedMat = new StandardMaterial('sirenRed', this.scene);
    sirenRedMat.emissiveColor = new Color3(1.0, 0, 0.2);
    const sirenBlueMat = new StandardMaterial('sirenBlue', this.scene);
    sirenBlueMat.emissiveColor = new Color3(0, 0.5, 1.0);

    const sirenR = MeshBuilder.CreateSphere('sirenR', { diameter: 0.18 }, this.scene);
    sirenR.position.set(-0.2, 2.12, 0);
    sirenR.material = sirenRedMat;
    sirenR.parent = root;

    const sirenB = MeshBuilder.CreateSphere('sirenB', { diameter: 0.18 }, this.scene);
    sirenB.position.set(0.2, 2.12, 0);
    sirenB.material = sirenBlueMat;
    sirenB.parent = root;

    return root;
  }

  /**
   * 构建 3D 追捕警犬实体 (Cyber Dog Entity)
   */
  private buildDogMesh(): TransformNode {
    const root = new TransformNode('dogRoot', this.scene);

    const furMat = new PBRMaterial('furMat', this.scene);
    furMat.albedoColor = new Color3(0.35, 0.2, 0.1);
    furMat.roughness = 0.8;

    const collarMat = new StandardMaterial('collarMat', this.scene);
    collarMat.emissiveColor = new Color3(1.0, 0, 0.3);

    const body = MeshBuilder.CreateBox('dogBody', { width: 0.45, height: 0.45, depth: 0.85 }, this.scene);
    body.position.y = 0.4;
    body.material = furMat;
    body.parent = root;

    const head = MeshBuilder.CreateBox('dogHead', { width: 0.35, height: 0.35, depth: 0.4 }, this.scene);
    head.position.set(0, 0.65, 0.45);
    head.material = furMat;
    head.parent = root;

    const collar = MeshBuilder.CreateBox('dogCollar', { width: 0.38, height: 0.1, depth: 0.38 }, this.scene);
    collar.position.set(0, 0.55, 0.28);
    collar.material = collarMat;
    collar.parent = root;

    return root;
  }

  /**
   * 初始化极速风阻拉线粒子系统 (Speedlines System)
   */
  private initSpeedlines(): ParticleSystem {
    const ps = new ParticleSystem('speedlines', 120, this.scene);
    const dt = new DynamicTexture('speedlineTex', 64, this.scene, false);
    const ctx = dt.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(28, 0, 8, 64);
    dt.hasAlpha = true;
    dt.update();
    ps.particleTexture = dt;
    ps.emitter = this.playerBodyMesh;
    ps.minEmitBox = new Vector3(-8, -4, 4);
    ps.maxEmitBox = new Vector3(8, 4, 12);
    ps.color1 = new Color4(0.8, 0.95, 1.0, 0.6);
    ps.color2 = new Color4(0, 0.95, 1.0, 0.2);
    ps.minSize = 0.1;
    ps.maxSize = 0.25;
    ps.minLifeTime = 0.1;
    ps.maxLifeTime = 0.3;
    ps.emitRate = 60;
    ps.direction1 = new Vector3(0, 0, -40);
    ps.direction2 = new Vector3(0, 0, -60);
    ps.start();
    return ps;
  }

  /**
   * 每帧渲染与动态视觉同步逻辑
   */
  public render(ctx: GameContext): void {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    this.totalTime += dt;

    // 0. 无尽跑道按 600m 步长无缝平移 (所有环境要素均对齐 600m 周期)
    if (this.envRoot && ctx.player.z - this.envRoot.position.z > 600) {
      this.envRoot.position.z += 600;
    }

    // 1. 同步玩家位置与动作
    this.playerRoot.position.set(ctx.player.x, ctx.player.y, ctx.player.z);

    // 2. 果冻起跳与接地伸缩 (Squash & Stretch Animation)
    let targetScaleY = 1.0;
    let targetScaleXZ = 1.0;
    if (ctx.player.isJumping && ctx.player.vy > 0) {
      targetScaleY = 1.25;
      targetScaleXZ = 0.88;
    } else if (ctx.player.isRolling || this.landingShakeTime > 0) {
      targetScaleY = 0.72;
      targetScaleXZ = 1.18;
    }
    this.playerBodyMesh.scaling.y = Scalar.Lerp(this.playerBodyMesh.scaling.y, targetScaleY, dt * 12.0);
    this.playerBodyMesh.scaling.x = Scalar.Lerp(this.playerBodyMesh.scaling.x, targetScaleXZ, dt * 12.0);
    this.playerBodyMesh.scaling.z = Scalar.Lerp(this.playerBodyMesh.scaling.z, targetScaleXZ, dt * 12.0);

    // 肢体跑动与倾斜摆动（仅当 GLB 骨骼模型未加载时才用过程化四肢摆动；
    // 骨骼模型加载后由 AnimationGroup 驱动四肢，此处不再手动摆动）
    const animSpeed = ctx.state === 'PLAYING' ? ctx.speed * 0.8 : 0;

    if (this.animGroups.length === 0) {
      const limbAngle = Math.sin(this.totalTime * animSpeed) * 0.45;

      const armLeft = this.scene.getMeshByName('armLeft');
      const armRight = this.scene.getMeshByName('armRight');
      const legLeft = this.scene.getMeshByName('legLeft');
      const legRight = this.scene.getMeshByName('legRight');

      if (armLeft) armLeft.rotation.x = limbAngle;
      if (armRight) armRight.rotation.x = -limbAngle;
      if (legLeft) legLeft.rotation.x = -limbAngle;
      if (legRight) legRight.rotation.x = limbAngle;
    }

    // 根据游戏与玩家状态自动管理并切算 3D 骨骼 AnimationGroup (Idle / Run / Jump / Slide / Stumble)
    if (ctx.state === 'MENU' || ctx.state === 'SHOP') {
      this.playSkeletalAnimation('idle', true, 1.0);
    } else if (ctx.state === 'GAMEOVER') {
      this.playSkeletalAnimation('stumble', false, 1.0);
    } else if (ctx.state === 'PAUSED') {
      this.playSkeletalAnimation('idle', true, 1.0);
    } else if (ctx.player.isJumping) {
      this.playSkeletalAnimation('jump', false, 1.0);
    } else if (ctx.player.isRolling) {
      this.playSkeletalAnimation('slide', false, 1.2);
    } else if (ctx.player.invulnerableTimer > 0) {
      this.playSkeletalAnimation('stumble', false, 1.2);
    } else {
      this.playSkeletalAnimation('run', true, ctx.speed / 20.0);
    }

    if (ctx.player.isRolling) {
      this.playerBodyMesh.scaling.set(1, 0.55, 1);
      this.playerBodyMesh.position.y = -0.3;
      this.playerBodyMesh.rotation.x = Math.PI / 6;
    } else {
      this.playerBodyMesh.position.y = 0;
      this.playerBodyMesh.rotation.x = 0;
    }

    // 悬浮滑板显隐
    const isBoardActive = ctx.player.hoverboardActive || ctx.player.hasHoverboard;
    this.hoverboardMesh.isVisible = isBoardActive;

    // 3. 追捕警官与警犬动态跟随 (Inspector & Dog Chase System, AC-PRD-17 & AC-PRD-19)
    // 追逐距离由逻辑层维护（ctx.chase），渲染层只读，避免逻辑散落在视觉层
    if (ctx.state === 'MENU' || ctx.state === 'SHOP') {
      // 菜单与商店状态：警官与警犬站在 3D 展台上侧后方，不遮挡角色且在 360° 环视中清晰可见
      this.inspectorRoot.position.set(1.2, 0, -1.8);
      this.dogRoot.position.set(1.75, 0, -1.5);
    } else {
      // 奔跑中：警官沿相邻侧翼（Flank）追逐，避免恰好位于摄像机与角色之间造成严重遮挡
      const sideOffset = ctx.player.x >= 1.0 ? -1.25 : 1.25;
      const targetOfficerX = ctx.player.x + sideOffset;
      const chaseDistance = ctx.chase.distance;
      const chaseZ = ctx.player.z - chaseDistance;
      const chaseX = Scalar.Lerp(this.inspectorRoot.position.x, targetOfficerX, dt * 8.0);
      
      this.inspectorRoot.position.set(chaseX, ctx.player.y * 0.5, chaseZ);
      this.dogRoot.position.set(chaseX + (sideOffset > 0 ? 0.55 : -0.55), ctx.player.y * 0.5, chaseZ + 0.2);
    }

    const officerTorso = this.scene.getMeshByName('officerTorso');
    if (officerTorso) officerTorso.rotation.y = Math.sin(this.totalTime * animSpeed) * 0.15;
    const dogHead = this.scene.getMeshByName('dogHead');
    if (dogHead) dogHead.rotation.x = Math.sin(this.totalTime * animSpeed * 1.5) * 0.1;

    // 4. 摄像机切道倾斜 (Bank Tilt) & 落地震屏 (Landing Shake)
    const targetRoll = (ctx.player.targetX - ctx.player.x) * -0.06;
    this.currentCameraRoll = Scalar.Lerp(this.currentCameraRoll, targetRoll, dt * 10.0);
    this.camera.rotation.z = this.currentCameraRoll;

    if (ctx.player.y === 0 && this.lastPlayerY > 0.5) {
      this.landingShakeTime = 0.2;
    }
    this.lastPlayerY = ctx.player.y;

    let shakeY = 0;
    if (this.landingShakeTime > 0) {
      this.landingShakeTime -= dt;
      shakeY = Math.sin(this.landingShakeTime * 40.0) * 0.12;
    }

    // 5. 动态 FOV 与 3D 赛道球形弯曲 (World Bending Target Curvature)
    const speedRatio = (ctx.speed - 18.0) / (45.0 - 18.0);
    this.camera.fov = 0.85 + speedRatio * 0.25;

    if (ctx.state === 'MENU' || ctx.state === 'SHOP') {
      const orbitRadius = 6.2;
      const orbitSpeed = 0.35;
      this.camera.position.set(
        Math.sin(this.totalTime * orbitSpeed) * orbitRadius,
        3.2,
        Math.cos(this.totalTime * orbitSpeed) * orbitRadius - 1.0
      );
      this.camera.setTarget(new Vector3(0, 1.25, 0));
      this.camera.rotation.z = 0;
    } else {
      this.camera.position.set(ctx.player.x * 0.35, ctx.player.y + 4.5 + shakeY, ctx.player.z - 9.0);
      // 赛道远景二次方球形弯曲下沉 (World Bending Downward Pitch)
      const bendTargetY = ctx.player.y + 1.5 - Math.pow(15.0, 2.0) * 0.0008;
      this.camera.setTarget(new Vector3(ctx.player.x * 0.15, bendTargetY, ctx.player.z + 15.0));
    }

    // 6. 风阻拉线与碎片动效更新
    if (this.speedlineSystem) {
      this.speedlineSystem.emitRate = ctx.state === 'PLAYING' ? 50 + speedRatio * 50 : 0;
    }
    this.updateFragments(dt);

    // 7. 同步障碍物/金币/道具
    this.syncObstacles(ctx);
    this.syncCoins(ctx, dt);
    this.syncPowerUps(ctx, dt);

    // 8. 执行渲染
    this.scene.render();
  }

  private activeFragments: Array<{ mesh: Mesh; vel: Vector3; rot: Vector3; life: number }> = [];

  public triggerShatterFX(pos: Vector3): void {
    const shardMat = this.getCachedMaterial('shard', { emissive: new Color3(1.0, 0, 0.5) });

    for (let i = 0; i < 12; i++) {
      const shard = MeshBuilder.CreatePolyhedron(`shard_${i}`, { type: 1, size: 0.15 }, this.scene);
      shard.position = pos.clone();
      shard.material = shardMat;

      const vel = new Vector3(
        (Math.random() - 0.5) * 8.0,
        Math.random() * 6.0 + 2.0,
        (Math.random() - 0.5) * 8.0
      );
      const rot = new Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
      this.activeFragments.push({ mesh: shard, vel, rot, life: 0.5 });
    }
  }

  private updateFragments(dt: number): void {
    for (let i = this.activeFragments.length - 1; i >= 0; i--) {
      const frag = this.activeFragments[i];
      frag.life -= dt;
      if (frag.life <= 0) {
        frag.mesh.dispose();
        this.activeFragments.splice(i, 1);
      } else {
        frag.vel.y -= 15.0 * dt;
        frag.mesh.position.addInPlace(frag.vel.scale(dt));
        frag.mesh.rotation.addInPlace(frag.rot.scale(dt));
        frag.mesh.scaling.scaleInPlace(0.92);
      }
    }
  }

  /**
   * 按类型复用动态实体材质，消除每实例 new StandardMaterial 泄漏。
   * 仅当 diffuse/emissive 显式提供时才写入，与原始单次材质行为保持一致。
   */
  private getCachedMaterial(key: string, opts: { diffuse?: Color3; emissive?: Color3 }): StandardMaterial {
    let mat = this.materialCache.get(key);
    if (!mat) {
      mat = new StandardMaterial(`cache_${key}`, this.scene);
      if (opts.diffuse) mat.diffuseColor = opts.diffuse;
      if (opts.emissive) mat.emissiveColor = opts.emissive;
      this.materialCache.set(key, mat);
    }
    return mat;
  }

  private syncObstacles(ctx: GameContext): void {
    const activeIds = new Set<string>();

    ctx.obstacles.forEach((obs) => {
      activeIds.add(obs.id);
      let node = this.obstacleMeshes.get(obs.id);

      if (!node) {
        node = new TransformNode(obs.id, this.scene);

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

        this.obstacleMeshes.set(obs.id, node);
      }

      if (node) node.position.set(obs.x, obs.y, obs.z);
    });

    this.obstacleMeshes.forEach((node, id) => {
      if (!activeIds.has(id)) {
        node.getChildMeshes().forEach((m) => {
          if (m instanceof Mesh && this.shadowGenerator) {
            this.shadowGenerator.removeShadowCaster(m);
          }
        });
        node.dispose();
        this.obstacleMeshes.delete(id);
      }
    });
  }

  private syncCoins(ctx: GameContext, dt: number): void {
    const activeIds = new Set<string>();

    ctx.coinEntities.forEach((coin) => {
      if (coin.collected) {
        const mesh = this.coinMeshes.get(coin.id);
        if (mesh) {
          mesh.dispose();
          this.coinMeshes.delete(coin.id);
        }
        return;
      }

      activeIds.add(coin.id);
      let coinMesh = this.coinMeshes.get(coin.id);

      if (!coinMesh) {
        coinMesh = MeshBuilder.CreateCylinder(coin.id, { diameter: 0.8, height: 0.08 }, this.scene);
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

        this.coinMeshes.set(coin.id, coinMesh);
      }

      const bobbing = Math.sin(this.totalTime * 4.5 + coin.x * 2) * 0.08;
      coinMesh.position.set(coin.x, coin.y + 0.4 + bobbing, coin.z);
      coinMesh.rotation.y += dt * 3.5;
    });

    this.coinMeshes.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        mesh.dispose();
        this.coinMeshes.delete(id);
      }
    });
  }

  private syncPowerUps(ctx: GameContext, dt: number): void {
    const activeIds = new Set<string>();

    ctx.powerUpEntities.forEach((pu) => {
      if (pu.collected) {
        const node = this.powerUpMeshes.get(pu.id);
        if (node) {
          node.dispose();
          this.powerUpMeshes.delete(pu.id);
        }
        return;
      }

      activeIds.add(pu.id);
      let node = this.powerUpMeshes.get(pu.id);

      if (!node) {
        node = new TransformNode(pu.id, this.scene);
        const mesh = MeshBuilder.CreateBox(`pu_mesh_${pu.id}`, { size: 0.7 }, this.scene);

        let color = new Color3(0, 0.95, 1.0);
        if (pu.type === 'MAGNET') color = new Color3(1.0, 0, 0.3);
        else if (pu.type === 'DOUBLE_SCORE') color = new Color3(1.0, 0.85, 0);
        else if (pu.type === 'SUPER_SNEAKERS') color = new Color3(0, 1.0, 0.4);

        const pMat = this.getCachedMaterial(`powerup_${pu.type}`, { diffuse: color, emissive: color });
        mesh.material = pMat;
        mesh.parent = node;

        this.powerUpMeshes.set(pu.id, node);
      }

      const floatY = Math.sin(this.totalTime * 3.0 + pu.x) * 0.15;
      node.position.set(pu.x, pu.y + floatY, pu.z);
      node.rotation.y += dt * 2.0;
    });

    this.powerUpMeshes.forEach((node, id) => {
      if (!activeIds.has(id)) {
        node.dispose();
        this.powerUpMeshes.delete(id);
      }
    });
  }

  /**
   * 重置渲染管线内部动态视效与实体锚点
   */
  public reset(): void {
    this.currentCameraRoll = 0;
    this.lastPlayerY = 0;
    this.landingShakeTime = 0;
    if (this.envRoot) {
      this.envRoot.position.z = 0;
    }
    this.inspectorRoot.position.set(1.2, 0, -1.8);
    this.dogRoot.position.set(1.75, 0, -1.5);

    // 清理残留破碎特效碎片
    this.activeFragments.forEach((f) => f.mesh.dispose());
    this.activeFragments = [];

    // 清理残留实体网格与阴影投射引用
    this.obstacleMeshes.forEach((node) => {
      node.getChildMeshes().forEach((m) => {
        if (m instanceof Mesh && this.shadowGenerator) {
          this.shadowGenerator.removeShadowCaster(m);
        }
      });
      node.dispose();
    });
    this.obstacleMeshes.clear();

    this.coinMeshes.forEach((mesh) => mesh.dispose());
    this.coinMeshes.clear();

    this.powerUpMeshes.forEach((node) => node.dispose());
    this.powerUpMeshes.clear();
  }
}

