import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { GameContext, GameEntity, Lane } from '../types';
import { textures } from './textures';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

export class ThreeRenderer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  
  private playerMesh: THREE.Mesh;
  private groundMesh: THREE.Mesh;
  private trackGroup: THREE.Group;
  private entityMeshes: Map<string, THREE.Object3D> = new Map();
  private hoverboardMesh: THREE.Mesh;
  private jetpackMesh: THREE.Group;
  
  // Juice variables
  private visualPlayerX: number = 0;
  private visualPlayerVelX: number = 0;
  private lastZ: number = 0;
  private squashTime: number = 0;
  private shakeTime: number = 0;
  private particles: Particle[] = [];
  
  private lastHoverboardTimer: number = 0;
  private lastState: string = 'MENU';
  private lastPlayerState: string = 'RUNNING';
  private lastStumbleCount: number = 0;

  // Particle Geometries
  private dustGeo = new THREE.BoxGeometry(2, 2, 2);
  private dustMat = new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true });
  private burstGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  private burstMat = new THREE.MeshLambertMaterial({ color: 0xffaa00, transparent: true });

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050511); // Cyberpunk night
    this.scene.fog = new THREE.Fog(0x050511, 100, 1000);

    // Setup Camera
    const container = canvas.parentElement!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000); // Wider FOV for speed sense
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadows

    // Setup Post-Processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // Bloom Pass parameters: resolution, strength, radius, threshold
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.8, 0.4, 0.85);
    // Adjusted strength for neon pop without blinding glare
    bloomPass.strength = 0.8;
    bloomPass.radius = 0.5;
    bloomPass.threshold = 0.85;
    this.composer.addPass(bloomPass);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); // Sky color, ground color, intensity
    hemiLight.position.set(0, 200, 0);
    this.scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(100, 200, 150); // Angled for dramatic shadows
    directionalLight.castShadow = true;
    
    // Configure shadow camera and resolution for larger area
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -150;
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 300;
    directionalLight.shadow.camera.bottom = -300;
    directionalLight.shadow.bias = -0.0005; // Reduce shadow acne
    
    this.scene.add(directionalLight);

    // Ground & Tracks
    this.trackGroup = new THREE.Group();
    
    // Base gravel ground
    const groundGeometry = new THREE.PlaneGeometry(150, 3000);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a3a, // Darker gravel color
      roughness: 0.9,
      metalness: 0.1
    });
    this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.trackGroup.add(this.groundMesh);

    // 3D Metal Rails
    const railGeo = new THREE.BoxGeometry(0.5, 1, 3000);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const lanes = [-20, 0, 20];
    lanes.forEach(laneX => {
      // Left rail of lane
      const railL = new THREE.Mesh(railGeo, railMat);
      railL.position.set(laneX - 3, 0.5, 0);
      railL.castShadow = true;
      railL.receiveShadow = true;
      this.trackGroup.add(railL);
      // Right rail of lane
      const railR = new THREE.Mesh(railGeo, railMat);
      railR.position.set(laneX + 3, 0.5, 0);
      railR.castShadow = true;
      railR.receiveShadow = true;
      this.trackGroup.add(railR);
    });

    // Side Walls for speed parallax
    const wallGeo = new THREE.BoxGeometry(10, 50, 3000);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x050511, roughness: 0.9 });
    const wallL = new THREE.Mesh(wallGeo, wallMat);
    wallL.position.set(-60, 25, 0);
    wallL.receiveShadow = true;
    this.trackGroup.add(wallL);
    
    const wallR = new THREE.Mesh(wallGeo, wallMat);
    wallR.position.set(60, 25, 0);
    wallR.receiveShadow = true;
    this.trackGroup.add(wallR);

    // Neon Strips on the walls
    const neonGeo = new THREE.BoxGeometry(1, 2, 3000);
    const neonMatL = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2 });
    const neonMatR = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 2 });
    
    const neonL = new THREE.Mesh(neonGeo, neonMatL);
    neonL.position.set(-54.5, 30, 0);
    this.trackGroup.add(neonL);
    
    const neonR = new THREE.Mesh(neonGeo, neonMatR);
    neonR.position.set(54.5, 30, 0);
    this.trackGroup.add(neonR);

    // Procedural Skyline
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x020205, roughness: 0.9, metalness: 0.1 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.5 });
    
    for (let i = 0; i < 40; i++) {
      // Left skyline
      const hL = 50 + Math.random() * 150;
      const bL = new THREE.Mesh(new THREE.BoxGeometry(20 + Math.random() * 20, hL, 50 + Math.random() * 50), buildingMat);
      bL.position.set(-80 - Math.random() * 50, hL / 2, -1500 + Math.random() * 3000);
      this.trackGroup.add(bL);
      
      // Right skyline
      const hR = 50 + Math.random() * 150;
      const bR = new THREE.Mesh(new THREE.BoxGeometry(20 + Math.random() * 20, hR, 50 + Math.random() * 50), buildingMat);
      bR.position.set(80 + Math.random() * 50, hR / 2, -1500 + Math.random() * 3000);
      this.trackGroup.add(bR);
      
      // Random neon signs on some buildings
      if (Math.random() > 0.5) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 20), windowMat);
        sign.position.set(bR.position.x - 11, bR.position.y, bR.position.z);
        this.trackGroup.add(sign);
      }
    }

    this.scene.add(this.trackGroup);

    for (let i = -1; i <= 1; i += 2) {
      const lineGeo = new THREE.PlaneGeometry(0.5, 3000);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.x = i * 10;
      line.position.z = 0.1; 
      this.groundMesh.add(line);
    }

    // Player Mesh
    const playerGeo = new THREE.PlaneGeometry(15, 15);
    const playerMat = new THREE.MeshLambertMaterial({ map: textures.playerSprite, transparent: true, side: THREE.DoubleSide });
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this.playerMesh.castShadow = true;
    this.scene.add(this.playerMesh);

    // Hoverboard Mesh
    const boardGeo = new THREE.BoxGeometry(12, 2, 24);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0x550011, roughness: 0.1, metalness: 0.8 });
    this.hoverboardMesh = new THREE.Mesh(boardGeo, boardMat);
    this.hoverboardMesh.position.y = -8.5; 
    this.hoverboardMesh.visible = false;
    this.playerMesh.add(this.hoverboardMesh);

    // Jetpack Mesh
    this.jetpackMesh = new THREE.Group();
    const packGeo = new THREE.BoxGeometry(8, 10, 4);
    const packMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 0, 7); 
    this.jetpackMesh.add(pack);
    
    const fireGeo = new THREE.ConeGeometry(3, 10, 8);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const fire1 = new THREE.Mesh(fireGeo, fireMat);
    fire1.position.set(-2, -8, 7);
    fire1.rotation.x = Math.PI;
    this.jetpackMesh.add(fire1);
    
    const fire2 = new THREE.Mesh(fireGeo, fireMat);
    fire2.position.set(2, -8, 7);
    fire2.rotation.x = Math.PI;
    this.jetpackMesh.add(fire2);
    
    this.jetpackMesh.visible = false;
    this.playerMesh.add(this.jetpackMesh);

    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  public handleResize() {
    const container = this.canvas.parentElement;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private laneToX(lane: Lane): number {
    return (lane - 1) * 20;
  }

  private spawnBurstParticles(x: number, y: number, z: number, color?: number) {
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(this.burstGeo, color ? new THREE.MeshLambertMaterial({ color, transparent: true }) : this.burstMat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 15, Math.random() * 10 + 5, (Math.random() - 0.5) * 15),
        life: 1.0
      });
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= 0.05;
      p.mesh.position.addScaledVector(p.velocity, 0.1);
      p.velocity.y -= 0.5; // gravity
      p.mesh.scale.setScalar(p.life);
      (p.mesh.material as THREE.Material).opacity = p.life;
      
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private createEntityMesh(entity: GameEntity): THREE.Object3D {
    let mesh: THREE.Object3D;
    let geo: THREE.BufferGeometry;
    let mat: any;

    switch (entity.type) {
      case 'OBSTACLE':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        mat = new THREE.MeshStandardMaterial({ map: textures.crate, roughness: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        break;
      case 'MOVING_TRAIN':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        const mtSide = new THREE.MeshStandardMaterial({ map: textures.movingTrainSide, roughness: 0.4, metalness: 0.6 });
        const mtFront = new THREE.MeshStandardMaterial({ map: textures.movingTrainFront, roughness: 0.4, metalness: 0.6 });
        const mtTop = new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.4, metalness: 0.6 });
        mat = [mtSide, mtSide, mtTop, mtTop, mtFront, mtFront];
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        break;
      case 'STATIC_TRAIN':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        const stSide = new THREE.MeshStandardMaterial({ map: textures.staticTrainSide, roughness: 0.4, metalness: 0.6 });
        const stFront = new THREE.MeshStandardMaterial({ map: textures.staticTrainFront, roughness: 0.4, metalness: 0.6 });
        const stTop = new THREE.MeshStandardMaterial({ color: 0x222299, roughness: 0.4, metalness: 0.6 });
        mat = [stSide, stSide, stTop, stTop, stFront, stFront];
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        break;
      case 'COIN':
        geo = new THREE.CylinderGeometry(3, 3, 1, 16);
        mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.2 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI / 2; // Coins stand up
        mesh.castShadow = true;
        break;
      case 'MAGNET_ITEM':
        geo = new THREE.PlaneGeometry(10, 10);
        mat = new THREE.MeshLambertMaterial({ map: textures.magnet, transparent: true, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case 'SHIELD_ITEM':
        geo = new THREE.PlaneGeometry(10, 10);
        mat = new THREE.MeshLambertMaterial({ map: textures.shield, transparent: true, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case 'DOUBLE_SCORE_ITEM':
        geo = new THREE.PlaneGeometry(10, 10);
        mat = new THREE.MeshLambertMaterial({ map: textures.doubleScore, transparent: true, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case 'JETPACK_ITEM':
        geo = new THREE.PlaneGeometry(10, 10);
        mat = new THREE.MeshLambertMaterial({ map: textures.jetpack, transparent: true, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case 'RAMP':
        geo = new THREE.BoxGeometry(entity.width, 1, Math.hypot(entity.length, entity.height));
        mat = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Brown wooden ramp
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.atan2(entity.height, entity.length); // Positive angle for correct slope
        break;
      case 'LOW_OBSTACLE': {
        mesh = new THREE.Group();
        // Group center ey = 2.5. Ground is at -2.5. Top is at 2.5.
        const postGeo = new THREE.CylinderGeometry(1, 1, 5);
        const barGeo = new THREE.BoxGeometry(entity.width, 2.5, 2);
        const obsMat = new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.3, roughness: 0.7 }); // Red hurdle
        const postMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 });
        
        const leftPost = new THREE.Mesh(postGeo, postMat);
        leftPost.position.set(-entity.width / 2 + 1, 0, 0);
        leftPost.castShadow = true;
        
        const rightPost = new THREE.Mesh(postGeo, postMat);
        rightPost.position.set(entity.width / 2 - 1, 0, 0);
        rightPost.castShadow = true;
        
        const bar = new THREE.Mesh(barGeo, obsMat);
        bar.position.set(0, 1.25, 0); // Near the top
        bar.castShadow = true;
        
        mesh.add(leftPost, rightPost, bar);
        break;
      }
      case 'HIGH_OBSTACLE': {
        mesh = new THREE.Group();
        // Group center ey = 12.5. Ground is at -12.5. Top is at 2.5.
        const postGeo = new THREE.CylinderGeometry(1, 1, 15);
        const topBarGeo = new THREE.BoxGeometry(entity.width, 4, 3); // Thicker bar
        const obsMat = new THREE.MeshStandardMaterial({ color: 0x4444ff, metalness: 0.3, roughness: 0.7 }); // Blue overhead sign
        const postMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 });
        
        const leftPost = new THREE.Mesh(postGeo, postMat);
        leftPost.position.set(-entity.width / 2 + 1, -5, 0); // Shift down to reach ground
        leftPost.castShadow = true;
        
        const rightPost = new THREE.Mesh(postGeo, postMat);
        rightPost.position.set(entity.width / 2 - 1, -5, 0);
        rightPost.castShadow = true;
        
        const topBar = new THREE.Mesh(topBarGeo, obsMat);
        topBar.position.set(0, 0.5, 0); // Top of the arch
        topBar.castShadow = true;
        
        mesh.add(leftPost, rightPost, topBar);
        break;
      }
      case 'SUPER_SNEAKERS_ITEM':
        geo = new THREE.PlaneGeometry(10, 10);
        mat = new THREE.MeshLambertMaterial({ map: textures.sneakers, transparent: true, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case 'GROUND':
        // The track system (gravel/rails) is static and infinite, so we don't render these logical ground blocks
        mesh = new THREE.Group();
        break;
      default:
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geo, mat);
    }
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.type = entity.type;
    return mesh;
  }

  public render(context: GameContext) {
    const { player, entities } = context;

    // Detect Triggers for Shake
    if (context.state === 'GAMEOVER' && this.lastState !== 'GAMEOVER') {
      this.shakeTime = 0.5;
    }
    if (this.lastHoverboardTimer > 0 && player.buffs.hoverboardTimer === 0 && context.state !== 'MENU') {
      this.shakeTime = 0.4;
      this.spawnBurstParticles(this.playerMesh.position.x, this.playerMesh.position.y, this.playerMesh.position.z, 0xff0055);
    }

    // Jump & Land Dust
    if (player.state === 'JUMPING' && this.lastPlayerState !== 'JUMPING') {
      this.spawnBurstParticles(this.visualPlayerX, player.z + 5, -player.y, 0xffffff);
    }
    if (player.state === 'RUNNING' && this.lastPlayerState === 'JUMPING') {
      this.spawnBurstParticles(this.visualPlayerX, player.z + 5, -player.y, 0xaaaaaa);
    }
    this.lastPlayerState = player.state;
    
    // Stumble detection for animation
    if (player.stumbleCount > this.lastStumbleCount) {
      this.shakeTime = 0.3;
      // Stumble wobble effect (using squash mechanics temporarily)
      this.squashTime = 0.3;
      // Red particles to indicate damage
      this.spawnBurstParticles(this.playerMesh.position.x, this.playerMesh.position.y + 10, this.playerMesh.position.z, 0xff0000);
      
      // Make player briefly flash red
      if (this.playerMesh.material && !Array.isArray(this.playerMesh.material)) {
        const mat = this.playerMesh.material as THREE.MeshLambertMaterial;
        mat.color.setHex(0xffaaaa);
        setTimeout(() => mat.color.setHex(0xffffff), 200);
      }
    }
    
    this.lastState = context.state;
    this.lastHoverboardTimer = player.buffs.hoverboardTimer;
    this.lastStumbleCount = player.stumbleCount;

    // 1. Update Player with Elastic Easing
    const targetX = this.laneToX(player.lane);
    // Spring physics for X axis
    const diff = targetX - this.visualPlayerX;
    this.visualPlayerVelX += diff * 0.2; // Stiffness
    this.visualPlayerVelX *= 0.7; // Friction
    this.visualPlayerX += this.visualPlayerVelX;

    const playerZ = -player.y;
    
    // Squash and stretch based on Z velocity
    const zVelocity = player.z - this.lastZ;
    if (this.lastZ > 0 && player.z <= 0) {
      this.squashTime = 0.2; // Hit ground
    }
    this.lastZ = player.z;

    let stretchY = 1.0;
    let stretchXZ = 1.0;

    if (zVelocity > 0) {
      stretchY = 1.2;
      stretchXZ = 0.9;
    } else if (zVelocity < -1) {
      stretchY = 1.1;
      stretchXZ = 0.95;
    }
    
    if (this.squashTime > 0) {
      stretchY = 0.6;
      stretchXZ = 1.3;
      this.squashTime -= 0.016;
    }

    const isRolling = player.state === 'ROLLING';
    const playerHeight = isRolling ? 7.5 : 15;
    const playerY = player.z + playerHeight / 2;

    this.playerMesh.position.set(this.visualPlayerX, playerY, playerZ);
    
    // Apply Squash/Stretch
    this.playerMesh.scale.set(stretchXZ, isRolling ? 0.5 : stretchY, stretchXZ);

    // Dust particles when running
    if (player.state === 'RUNNING' && Math.random() < 0.3) {
      const dust = new THREE.Mesh(this.dustGeo, this.dustMat);
      dust.position.set(this.visualPlayerX + (Math.random() - 0.5) * 5, 1, playerZ + 5);
      this.scene.add(dust);
      this.particles.push({
        mesh: dust,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2 + 1, Math.random() * 5 + 2),
        life: 1.0
      });
    }

    if (player.skinColor) {
      // Skin color changes are baked into the SVG.
    }

    if (Math.random() < 0.05) {
      console.log('DEBUG PLAYER_MESH:', {
        pos: this.playerMesh.position.toArray(),
        scale: this.playerMesh.scale.toArray(),
        visible: this.playerMesh.visible,
        mat: (this.playerMesh.material as THREE.Material).opacity,
        z: player.z,
        state: player.state
      });
    }

    // Hoverboard & Jetpack
    this.hoverboardMesh.visible = player.buffs.hoverboardTimer > 0;
    this.jetpackMesh.visible = player.buffs.jetpackTimer > 0;
    if (this.jetpackMesh.visible) {
      const scale = 1 + Math.sin(Date.now() / 50) * 0.3;
      this.jetpackMesh.children[1].scale.set(scale, scale, scale);
      this.jetpackMesh.children[2].scale.set(scale, scale, scale);
    }

    // 2. Camera with FOV and Shake
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.visualPlayerX, 0.1);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, playerY + 35, 0.1);
    this.camera.position.z = playerZ + 60;
    
    // Shake
    if (this.shakeTime > 0) {
      this.camera.position.x += (Math.random() - 0.5) * 5;
      this.camera.position.y += (Math.random() - 0.5) * 5;
      this.shakeTime -= 0.016;
    }

    // FOV Zoom for Jetpack
    const targetFOV = player.buffs.jetpackTimer > 0 ? 90 : 60;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 0.1);
    this.camera.updateProjectionMatrix();

    this.camera.lookAt(this.camera.position.x, playerY * 0.8, playerZ - 40);

    // 3. Ground & Tracks
    // Snap to 100-unit intervals so solid rails/walls appear infinite without moving continuously
    this.trackGroup.position.z = Math.floor(playerZ / 100) * 100 - 500;

    // 4. Entities
    const currentEntityIds = new Set<string>();

    for (const entity of entities) {
      if (entity.isCollected) continue;

      currentEntityIds.add(entity.id);

      let mesh = this.entityMeshes.get(entity.id);
      if (!mesh) {
        mesh = this.createEntityMesh(entity);
        this.scene.add(mesh);
        this.entityMeshes.set(entity.id, mesh);
      }

      // Update position
      let ey = entity.z ? entity.z + entity.height / 2 : entity.height / 2;
      const ex = this.laneToX(entity.lane);
      const ez = -entity.y;

      // Animations
      if (entity.type === 'COIN') {
        mesh.rotation.y += 0.05; // Spin coins
        mesh.rotation.z += 0.05;
        ey += Math.sin(Date.now() / 200 + ex) * 2;
      } else if (entity.type.endsWith('_ITEM')) {
        mesh.rotation.y += 0.03; // Spin powerups slowly
        ey += Math.sin(Date.now() / 200 + ex) * 2;
      }

      mesh.position.set(ex, ey, ez);
    }

    // 5. Remove unused & Spawn Burst
    for (const [id, mesh] of this.entityMeshes.entries()) {
      if (!currentEntityIds.has(id)) {
        // Did the player collect it? If it's a coin/item, spawn a burst!
        const type = mesh.userData.type;
        if (type === 'COIN' || (type && type.endsWith('_ITEM'))) {
          this.spawnBurstParticles(mesh.position.x, mesh.position.y, mesh.position.z, type === 'COIN' ? 0xffaa00 : 0xaa22ff);
        }

        this.scene.remove(mesh);
        if (mesh instanceof THREE.Mesh) {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
             if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
             else mesh.material.dispose();
          }
        }
        this.entityMeshes.delete(id);
      }
    }

    // Update Particles
    this.updateParticles();

    // 6. Render
    this.composer.render();
  }
}
