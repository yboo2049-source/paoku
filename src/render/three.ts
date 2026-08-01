import * as THREE from 'three';
import type { GameContext, GameEntity, Lane } from '../types';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

export class ThreeRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  
  private playerMesh: THREE.Mesh;
  private groundMesh: THREE.Mesh;
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

  // Particle Geometries
  private dustGeo = new THREE.BoxGeometry(2, 2, 2);
  private dustMat = new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true });
  private burstGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  private burstMat = new THREE.MeshLambertMaterial({ color: 0xffaa00, transparent: true });

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 100, 1000);

    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 50);
    directionalLight.castShadow = true;
    
    // Configure shadow camera and resolution for larger area
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    
    this.scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(150, 3000);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
    this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    for (let i = -1; i <= 1; i += 2) {
      const lineGeo = new THREE.PlaneGeometry(0.5, 3000);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.x = i * 10;
      line.position.z = 0.1; 
      this.groundMesh.add(line);
    }

    // Player Mesh
    const playerGeo = new THREE.BoxGeometry(10, 15, 10);
    const playerMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
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

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
    let mesh: THREE.Mesh;
    let geo: THREE.BufferGeometry;
    let mat: THREE.Material;

    switch (entity.type) {
      case 'OBSTACLE':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        mat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'MOVING_TRAIN':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'STATIC_TRAIN':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        mat = new THREE.MeshLambertMaterial({ color: 0x0000ff }); // Blue train
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'COIN':
        geo = new THREE.CylinderGeometry(entity.width / 2, entity.width / 2, entity.height, 16);
        mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.2 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI / 2;
        break;
      case 'MAGNET_ITEM':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        mat = new THREE.MeshStandardMaterial({ color: 0xaa22ff, metalness: 0.5, roughness: 0.1 });
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'SHIELD_ITEM':
        geo = new THREE.SphereGeometry(entity.width / 2, 16, 16);
        mat = new THREE.MeshStandardMaterial({ color: 0x22ffaa, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'DOUBLE_SCORE_ITEM':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length);
        mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.1 });
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'JETPACK_ITEM':
        geo = new THREE.CylinderGeometry(entity.width / 2, entity.width / 2, entity.height, 8);
        mat = new THREE.MeshStandardMaterial({ color: 0xff4500, metalness: 0.6, roughness: 0.3 });
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'RAMP':
        geo = new THREE.BoxGeometry(entity.width, 1, Math.hypot(entity.length, entity.height));
        mat = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Brown wooden ramp
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.atan2(entity.height, entity.length); // Negative angle to slope upwards into -Z
        break;
      case 'LOW_OBSTACLE':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length || 2);
        mat = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Fence look
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'HIGH_OBSTACLE':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length || 2);
        mat = new THREE.MeshLambertMaterial({ color: 0xffa500 }); // Bright orange signboard
        mesh = new THREE.Mesh(geo, mat);
        break;
      case 'SUPER_SNEAKERS_ITEM':
        geo = new THREE.BoxGeometry(entity.width, entity.height, entity.length || 5);
        mat = new THREE.MeshStandardMaterial({ color: 0xff00ff, metalness: 0.8, roughness: 0.2 }); // Shiny pink sneakers
        mesh = new THREE.Mesh(geo, mat);
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
    this.lastState = context.state;
    this.lastHoverboardTimer = player.buffs.hoverboardTimer;

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
      (this.playerMesh.material as THREE.MeshLambertMaterial).color.setStyle(player.skinColor);
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
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.visualPlayerX * 0.3, 0.1);
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

    // 3. Ground
    this.groundMesh.position.z = playerZ;

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

      // Hovering
      if (entity.type === 'COIN' || entity.type.endsWith('_ITEM')) {
        mesh.rotation.y += 0.05;
        if (entity.type === 'COIN') mesh.rotation.z += 0.05;
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
    this.renderer.render(this.scene, this.camera);
  }
}
