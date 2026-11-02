import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode } from '@babylonjs/core';
import type { GlowLayer, Scene } from '@babylonjs/core';
import type { GameState } from '../types';
import { CONSTANTS } from '../types';

/** Engineering-preview values, not a target-device budget or a production asset manifest. */
export const BRIGHT_THEME = Object.freeze({
  length: 120, segments: 5, cameraFar: 280, fogStart: 100, fogEnd: 250,
  glowIntensity: 0.15, shadowSize: 1024, shadowRange: 80, shadowBias: 0.0005, shadowNormalBias: 0.02, menuBackdropSize: 600, sleeperDepthBias: -1,
  sky: '#BEDFF4', track: '#657A88', rail: '#5E6871', platform: '#F0E7D5', accent: '#E8B74F',
});

/** Class name retained for existing callers; all owned geometry is now a bounded bright preview. */
export class LegacyEnvironment {
  private scene: Scene;
  private glow?: GlowLayer;
  private slots: { root: TransformNode; index: number }[] = [];
  private meshes: Mesh[] = [];
  private materials: StandardMaterial[] = [];
  private podium: Mesh[] = [];
  private signals: Mesh[] = [];
  private state: GameState = 'MENU';
  private disposed = false;

  constructor(scene: Scene, glow?: GlowLayer) {
    this.scene = scene; this.glow = glow;
    const material = (name: string, color: string) => {
      const mat = new StandardMaterial('theme-' + name, scene);
      mat.diffuseColor = Color3.FromHexString(color); mat.specularColor.set(0.12, 0.12, 0.12);
      this.materials.push(mat); return mat;
    };
    const mats = {
      ground: material('ground', '#C5CFCE'), track: material('track', BRIGHT_THEME.track),
      rails: material('rails', BRIGHT_THEME.rail), sleepers: material('sleepers', '#8A938E'),
      platform: material('platform', BRIGHT_THEME.platform), edge: material('edge', BRIGHT_THEME.accent),
      city: material('city', '#A5B7C4'), posts: material('posts', '#5B6C76'),
      signals: material('signals', BRIGHT_THEME.accent),
    };
    // Flush sleeper tops share the logical ground plane; bias the material instead of raising collision-free decoration.
    mats.sleepers.zOffset = BRIGHT_THEME.sleeperDepthBias;
    mats.signals.emissiveColor = Color3.FromHexString(BRIGHT_THEME.accent).scale(0.12);
    for (let slot = 0; slot < BRIGHT_THEME.segments; slot++) this.buildSegment(slot, mats);
    // The existing orbit can look backwards beyond the runner's asymmetric pool.
    // A menu-only floor covers that view without changing the camera or the five game chunks.
    const backdrop = MeshBuilder.CreateGround('menuBackdrop', { width: BRIGHT_THEME.menuBackdropSize, height: BRIGHT_THEME.menuBackdropSize }, scene);
    backdrop.position.y = -0.101; backdrop.material = mats.ground;
    const podium = MeshBuilder.CreateCylinder('menuPodium', { diameter: 4.6, height: 0.2, tessellation: 48 }, scene);
    podium.position.y = -0.1; podium.material = mats.platform; podium.receiveShadows = true;
    const ring = MeshBuilder.CreateTorus('podiumRing', { diameter: 4.5, thickness: 0.035, tessellation: 48 }, scene);
    ring.material = mats.edge; ring.position.y = 0.012;
    for (const mesh of [backdrop, podium, ring]) { mesh.metadata = { themeRole: 'podium' }; mesh.isPickable = false; this.meshes.push(mesh); this.podium.push(mesh); }
    this.sync(0, 'MENU');
  }

  private buildSegment(slot: number, mats: Record<string, StandardMaterial>): void {
    const root = new TransformNode('theme-segment-' + slot, this.scene);
    root.metadata = { themeRole: 'segment', slot };
    this.slots.push({ root, index: Number.NaN });
    const groups = new Map<string, { meshes: Mesh[]; material: StandardMaterial; receive: boolean }>();
    const add = (role: string, mesh: Mesh, mat: StandardMaterial, receive = false) => {
      mesh.material = mat;
      let group = groups.get(role); if (!group) { group = { meshes: [], material: mat, receive }; groups.set(role, group); }
      group.meshes.push(mesh); return mesh;
    };
    const box = (role: string, w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial, receive = false) => {
      const mesh = MeshBuilder.CreateBox(role, { width: w, height: h, depth: d }, this.scene);
      mesh.position.set(x, y, z); return add(role, mesh, mat, receive);
    };
    const L = BRIGHT_THEME.length;
    box('ground', 80, 0.1, L, 0, -0.15, L / 2, mats.ground);
    box('track', 9.4, 0.1, L, 0, -0.05, L / 2, mats.track, true);
    for (const x of CONSTANTS.LANE_X) {
      for (const side of [-0.9, 0.9]) box('rails', 0.075, 0.08, L, x + side, 0.04, L / 2, mats.rails, true);
      // Half-open [0,L) ownership: no duplicate sleeper at the next segment's start.
      for (let z = 0; z < L; z += 3) box('sleepers', 2.5, 0.05, 0.3, x, -0.025, z, mats.sleepers, true);
    }
    for (const side of [-1, 1]) {
      box('platform', 2.8, 0.4, L, side * 6.3, 0.2, L / 2, mats.platform, true);
      box('edge', 0.12, 0.025, L, side * 4.98, 0.4125, L / 2, mats.edge);
      for (let z = 0; z < L; z += 30) {
        box('signal-posts', 0.15, 2.8, 0.2, side * 5.3, 1.8, z, mats.posts);
        const lamp = MeshBuilder.CreateSphere('signal', { diameter: 0.24, segments: 6 }, this.scene);
        lamp.position.set(side * 5.3, 3.3, z); add('signal-lights', lamp, mats.signals);
      }
      for (let i = 0; i < 5; i++) {
        const height = 8 + (i % 4) * 3;
        box('city', 5, height, 8, side * (14 + (i % 2) * 5), height / 2, 12 + i * 24, mats.city);
      }
    }
    for (const [role, group] of groups) {
      const merged = Mesh.MergeMeshes(group.meshes, true, true, undefined, false, false);
      if (!merged) throw new Error('Empty theme batch: ' + role);
      merged.name = 'theme-' + role + '-' + slot; merged.material = group.material;
      merged.metadata = { themeRole: role, slot }; merged.receiveShadows = group.receive;
      merged.parent = root; merged.isPickable = false; this.meshes.push(merged);
      if (role === 'signal-lights') { this.signals.push(merged); this.glow?.addIncludedOnlyMesh(merged); }
      // Moving chunks intentionally retain live world matrices.
    }
  }

  sync(z: number, state: GameState = this.state): void {
    if (this.disposed) return;
    this.state = state;
    const first = Math.floor((Number.isFinite(z) ? z : 0) / BRIGHT_THEME.length) - 1;
    for (let index = first; index < first + BRIGHT_THEME.segments; index++) {
      const slot = this.slots[((index % BRIGHT_THEME.segments) + BRIGHT_THEME.segments) % BRIGHT_THEME.segments];
      if (slot.index === index) continue;
      slot.index = index; slot.root.position.z = index * BRIGHT_THEME.length;
      slot.root.computeWorldMatrix(true);
      for (const mesh of slot.root.getChildMeshes()) mesh.computeWorldMatrix(true);
    }
    const showing = state === 'MENU' || state === 'SHOP';
    for (const mesh of this.podium) mesh.setEnabled(showing);
  }
  reset(): void { this.sync(0, this.state); }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    for (const mesh of this.signals) this.glow?.removeIncludedOnlyMesh(mesh);
    for (const mesh of this.meshes) mesh.dispose(false, false);
    for (const slot of this.slots) slot.root.dispose();
    for (const mat of this.materials) mat.dispose();
    this.meshes = []; this.slots = []; this.signals = []; this.podium = []; this.materials = [];
  }
}
