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
import type { DeepReadonly, SimSnapshot } from '../types/contracts';

/** Identity belongs to the same presentation sample as the supplied context. */
export interface RenderFrameIdentity {
  readonly runId: SimSnapshot['runId'];
  readonly tick: SimSnapshot['tick'];
  readonly discontinuity: SimSnapshot['discontinuity'];
  readonly appState: GameContext['state'];
}
import { eventBus } from '../core/eventBus';
import { AssetCache, SharedMaterials } from './assets';
import type { AssetLease } from './assets';
import { LegacyEnvironment } from './environment';
import { EntityViews } from './entityViews';
import type { AssetContainer } from '@babylonjs/core';

export class BabylonRenderEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: TargetCamera;

  private environment: LegacyEnvironment;
  private entityViews: EntityViews;
  private materials: SharedMaterials;
  private playerAssets: AssetCache<AssetContainer>;
  private playerLease: AssetLease | null = null;
  private playerPendingEpoch: number | null = null;
  private playerAttemptedEpoch: number | null = null;
  private epoch = 0;
  private frameRunId: string | null = null;
  private discontinuityTick = -1;
  private boundaryPrepared = false;
  private disposed = false;
  private ownsCanvas = false;
  private readonly resizeHandler = () => { if (!this.disposed) this.engine.resize(); };
  private readonly skinHandler = (skin?: { color: string; secondaryColor: string }) => {
    if (!this.disposed && skin?.color && skin.secondaryColor) this.applySkin(skin);
  };
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

  private totalTime: number = 0;

  constructor(container: HTMLElement) {
    // 1. 获取或创建 Canvas
    const existingCanvas = container.querySelector('canvas') as HTMLCanvasElement;
    if (existingCanvas) {
      this.canvas = existingCanvas;
    } else {
      this.canvas = document.createElement('canvas');
      this.ownsCanvas = true;
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
    this.environment = new LegacyEnvironment(this.scene);
    this.materials = new SharedMaterials(this.scene);
    this.entityViews = new EntityViews(this.scene, this.shadowGenerator, this.materials);
    this.playerAssets = new AssetCache(() => SceneLoader.LoadAssetContainerAsync('/models/', 'player.glb', this.scene).catch(error => {
      console.error('[GLB] player load failed; keeping primitives', error); throw error;
    }), a => {
      const valid = a.meshes.some(mesh => mesh.getTotalVertices() > 0);
      if (!valid) console.warn('[GLB] empty player geometry; keeping primitives');
      return valid;
    });

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
    eventBus.on('SKIN_CHANGED', this.skinHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * 构建 Babylon.js 高精 3D 跑道与丰富轨旁元素环境 (Subway & Trackside Environment)
   */
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
    this.ensurePlayerAsset(rootMesh);

    return rootMesh;
  }

  private ensurePlayerAsset(root: Mesh): void {
    if (this.disposed || this.playerLease || this.playerPendingEpoch === this.epoch || this.playerAttemptedEpoch === this.epoch) return;
    const epoch = this.epoch;
    this.playerPendingEpoch = epoch;
    this.playerAttemptedEpoch = epoch;
    void this.playerAssets.acquire('legacy-player', () => !this.disposed && this.epoch === epoch, container => {
      const before = {
        meshes: new Set(this.scene.meshes), nodes: new Set(this.scene.transformNodes),
        materials: new Set(this.scene.materials), animations: new Set(this.scene.animationGroups),
        skeletons: new Set(this.scene.skeletons),
      };
      try {
        const entries = container.instantiateModelsToScene(name => name, false, { doNotInstantiate: true });
        for (const node of entries.rootNodes) {
          node.parent = root;
          if (node instanceof TransformNode) { node.scaling.set(1, 1, 1); node.rotation.y = Math.PI; }
        }
        const meshes = entries.rootNodes.flatMap(n => n.getChildMeshes());
        for (const mesh of meshes) this.shadowGenerator.addShadowCaster(mesh, false);
        this.animGroups = entries.animationGroups;
        this.animGroups.forEach(a => a.stop());
        this.currentAnimName = '';
        if (this.currentSkin) this.applySkin(this.currentSkin);
        if (this.animGroups.length) this.playSkeletalAnimation('run', true, 1);
        // Only replace visible fallback once all setup has succeeded.
        for (const name of ['torso', 'armor', 'head', 'visor', 'armLeft', 'armRight', 'legLeft', 'legRight', 'pack']) {
          const mesh = this.scene.getMeshByName(name); if (mesh) mesh.isVisible = false;
        }
        return { dispose: () => { for (const mesh of meshes) this.shadowGenerator.removeShadowCaster(mesh); entries.dispose(); } };
      } catch (error) {
        // Instantiation can fail part-way through cloning. Roll back only this synchronous attempt.
        for (const mesh of this.scene.meshes.slice()) if (!before.meshes.has(mesh)) {
          this.shadowGenerator.removeShadowCaster(mesh); mesh.dispose(false, false);
        }
        for (const node of this.scene.transformNodes.slice()) if (!before.nodes.has(node)) node.dispose(false, false);
        for (const group of this.scene.animationGroups.slice()) if (!before.animations.has(group)) group.dispose();
        for (const skeleton of this.scene.skeletons.slice()) if (!before.skeletons.has(skeleton)) skeleton.dispose();
        // Babylon exposes shared container materials in scene on instantiation; retain cache ownership without an orphan scene entry.
        for (const material of container.materials) if (!before.materials.has(material) && !this.scene.meshes.some(mesh => mesh.material === material)) this.scene.removeMaterial(material);
        this.animGroups = []; this.currentAnimName = '';
        throw error;
      }
    }).then(lease => {
      if (!this.disposed && this.epoch === epoch) { this.playerLease = lease; this.playerPendingEpoch = null; }
      else lease?.release();
    }).catch(error => {
      if (this.epoch === epoch) this.playerPendingEpoch = null;
      console.error('[GLB] legacy player instance failed; keeping primitives', error);
    });
  }

  /**
   * 动态应用皮肤配色至 3D 角色（过程化材质与 GLB 蒙皮网格）
   */
  public applySkin(skin: { color: string; secondaryColor: string }): void {
    if (this.disposed) return;
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
  public render(ctx: DeepReadonly<GameContext>, frame?: RenderFrameIdentity): void {
    if (this.disposed) return;
    if (frame) {
      const changedRun = frame.runId !== this.frameRunId;
      if (changedRun) this.discontinuityTick = -1;
      const newBreak = frame.discontinuity && frame.tick > this.discontinuityTick;
      if ((changedRun || newBreak) && !this.boundaryPrepared) this.reset();
      if (frame.discontinuity) this.discontinuityTick = Math.max(this.discontinuityTick, frame.tick);
      this.frameRunId = frame.runId;
    }
    this.boundaryPrepared = false;
    const dt = ctx.state === 'PAUSED' || ctx.state === 'GAMEOVER' ? 0 : Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    this.totalTime += dt;

    this.environment.sync(ctx.player.z);
    this.ensurePlayerAsset(this.playerBodyMesh);

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
    this.entityViews.sync(ctx, this.totalTime, dt);

    // 8. 执行渲染
    this.scene.render();
  }

  private activeFragments: Array<{ mesh: Mesh; vel: Vector3; rot: Vector3; life: number }> = [];

  public triggerShatterFX(pos: Vector3): void {
    if (this.disposed) return;
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
    return this.materials.get(key, opts);
  }

  /**
   * 重置渲染管线内部动态视效与实体锚点
   */
  public reset(): void {
    if (this.disposed || this.boundaryPrepared) return;
    this.boundaryPrepared = true;
    this.epoch++;
    this.totalTime = 0;
    this.currentAnimName = '';
    this.currentCameraRoll = 0;
    this.lastPlayerY = 0;
    this.landingShakeTime = 0;
    this.environment.reset();
    this.inspectorRoot.position.set(1.2, 0, -1.8);
    this.dogRoot.position.set(1.75, 0, -1.5);

    // 清理残留破碎特效碎片
    this.activeFragments.forEach((f) => f.mesh.dispose());
    this.activeFragments = [];

    this.entityViews.reset();
  }
  /** Release only this renderer's resources; late cache completions dispose themselves. */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.epoch++;
    window.removeEventListener('resize', this.resizeHandler);
    eventBus.off('SKIN_CHANGED', this.skinHandler);
    this.entityViews.dispose();
    this.playerLease?.release(); this.playerLease = null;
    this.animGroups = [];
    this.activeFragments.forEach(f => f.mesh.dispose()); this.activeFragments = [];
    this.speedlineSystem.stop(); this.speedlineSystem.dispose();
    this.environment.dispose();
    this.playerAssets.dispose(); this.materials.dispose();
    this.shadowGenerator.getShadowMap()!.renderList = [];
    this.shadowGenerator.dispose(); this.glowLayer.dispose(); this.pipeline.dispose();
    this.scene.dispose(); this.engine.dispose();
    if (this.ownsCanvas) this.canvas.remove();
  }
}
