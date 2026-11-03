import { Matrix, Vector3, Viewport } from '@babylonjs/core';
import type { TargetCamera, TransformNode } from '@babylonjs/core';
import type { GameContext } from '../types';
import type { DeepReadonly } from '../types/contracts';

export interface SafeArea { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number }
export interface CameraInput {
  readonly width: number; readonly height: number;
  readonly safeArea?: SafeArea;
  readonly reservedRects?: readonly { x: number; y: number; width: number; height: number }[];
  readonly reducedMotion?: boolean;
}
export interface ActorBounds { readonly name: string; readonly corners: readonly Vector3[] }

/** Fixed legacy profile: top badges/buttons, speedometer + up to five buff rows. Not a dynamic UI bridge. */
export function legacyHudProfile(_width: number, _height: number): SafeArea {
  return { top: 140, bottom: 240, left: 8, right: 8 };
}

/** Current geometry, including CPU-skinned bounds; hidden primitive fallback never widens the loaded character. */
export function actorBounds(name: string, root: TransformNode): ActorBounds {
  const corners: Vector3[] = [];
  for (const mesh of root.getChildMeshes()) {
    if (!mesh.isVisible || !mesh.isEnabled() || mesh.getTotalVertices() === 0) continue;
    mesh.skeleton?.prepare(true);
    mesh.refreshBoundingInfo({ applySkeleton: true, applyMorph: true });
    mesh.computeWorldMatrix(true);
    corners.push(...mesh.getBoundingInfo().boundingBox.vectorsWorld.map(v => v.clone()));
  }
  return { name, corners };
}

export function projectActors(camera: TargetCamera, actors: readonly ActorBounds[], input: CameraInput) {
  const { width, height } = input;
  const area = input.safeArea ?? legacyHudProfile(width, height);
  const validRegion = width > area.left + area.right && height > area.top + area.bottom;
  const view = camera.getViewMatrix(true);
  const transform = view.multiply(camera.getProjectionMatrix(true));
  const viewport = new Viewport(0, 0, width, height);
  const projections = actors.filter(a => a.corners.length).map(actor => {
    const screen = actor.corners.map(v => Vector3.Project(v, Matrix.IdentityReadOnly, transform, viewport));
    const front = actor.corners.every(v => Vector3.TransformCoordinates(v, view).z > camera.minZ);
    const minX = Math.min(...screen.map(v => v.x)), maxX = Math.max(...screen.map(v => v.x));
    const minY = Math.min(...screen.map(v => v.y)), maxY = Math.max(...screen.map(v => v.y));
    const blocked = input.reservedRects?.some(r => maxX > r.x && minX < r.x + r.width && maxY > r.y && minY < r.y + r.height) ?? false;
    return { name: actor.name, front, minX, maxX, minY, maxY,
      safe: front && !blocked && minX >= area.left && maxX <= width - area.right && minY >= area.top && maxY <= height - area.bottom };
  });
  const safe = validRegion && projections.every(a => a.safe);
  return { safe, reason: !validRegion ? 'NO_SAFE_REGION' : safe ? null : 'FRAMING_CONFLICT', actors: projections };
}

/** Presentation-only rig. The solver moves the camera, never the actors or authoritative chase distance. */
export class CameraRig {
  private camera: TargetCamera;
  private initialized = false;
  private supportHeight = 0;
  private positionHeight = 0;
  private targetHeight = 0;
  private roll = 0;
  private impulse = 0;
  private time = 0;
  private disposed = false;
  private projection: ReturnType<typeof projectActors> = { safe: false, reason: 'NOT_SAMPLED', actors: [] };

  constructor(camera: TargetCamera) { this.camera = camera; }
  get status() { return { supportHeight: this.supportHeight, positionHeight: this.positionHeight,
    targetHeight: this.targetHeight, projection: this.projection }; }

  sync(ctx: DeepReadonly<GameContext>, actors: readonly ActorBounds[], input: CameraInput, dt: number, contactEdge = false): void {
    if (this.disposed || this.initialized && (ctx.state === 'PAUSED' || ctx.state === 'GAMEOVER')) return;
    dt = Math.min(0.05, Math.max(0, Number.isFinite(dt) ? dt : 0));
    const p = ctx.player;
    if (!this.initialized) {
      this.supportHeight = p.contact === 'SUPPORTED' ? p.supportSample?.y ?? p.y : p.y;
      this.positionHeight = this.targetHeight = this.supportHeight;
      this.initialized = true;
    }
    if (p.contact === 'SUPPORTED') this.supportHeight = p.supportSample?.y ?? p.y;
    this.positionHeight += (this.supportHeight - this.positionHeight) * (1 - Math.exp(-dt / 0.18));
    this.targetHeight += (this.supportHeight - this.targetHeight) * (1 - Math.exp(-dt / 0.26));
    const reduced = !!input.reducedMotion;
    this.time += dt;
    const speed = Math.max(0, Math.min(1, (ctx.speed - 18) / 27));
    this.camera.fov = 0.85 + (reduced ? 0 : speed * 0.17);
    this.roll += ((reduced ? 0 : Math.max(-0.026, Math.min(0.026, (p.targetX - p.x) * -0.009))) - this.roll) * (1 - Math.exp(-dt / 0.16));
    if (reduced) { this.roll = 0; this.impulse = 0; }
    else if (contactEdge) this.impulse = 0.12;
    this.impulse = Math.max(0, this.impulse - dt);
    const shake = reduced ? 0 : Math.sin(this.impulse * 40) * (this.impulse / 0.12) * 0.06;
    if (ctx.state === 'MENU' || ctx.state === 'SHOP') {
      const angle = reduced ? 0 : this.time * 0.35;
      this.camera.position.set(Math.sin(angle) * 6.2, 3.2, Math.cos(angle) * 6.2 - 1);
      this.camera.setTarget(new Vector3(0, 1.25, 0)); this.camera.rotation.z = 0;
      return;
    }
    const lift = Math.max(-3, Math.min(9, p.y - this.supportHeight));
    const look = 12 + speed * 6;
    const target = new Vector3(p.x * 0.15, this.targetHeight + 1.5 + lift * 0.35, p.z + look);
    const area = input.safeArea ?? legacyHudProfile(input.width, input.height);
    let distance = 9;
    const aim = () => {
      this.camera.position.set(p.x * 0.35, this.positionHeight + 4.5 + lift * 0.25 + shake + (distance - 9) * 0.1, p.z - distance);
      this.camera.setTarget(target); this.camera.rotation.z = this.roll;
      this.projection = projectActors(this.camera, actors, input);
    };
    // Center the projected union in the usable region, then back away only when extents need it.
    for (let attempt = 0; attempt < 18; attempt++) {
      aim();
      if (this.projection.safe || this.projection.reason === 'NO_SAFE_REGION' || !this.projection.actors.length) break;
      const visible = this.projection.actors;
      const left = Math.min(...visible.map(a => a.minX)), right = Math.max(...visible.map(a => a.maxX));
      const top = Math.min(...visible.map(a => a.minY)), bottom = Math.max(...visible.map(a => a.maxY));
      const scale = 2 * Math.tan(this.camera.fov / 2) * (distance + look);
      target.x += ((left + right - input.width - area.left + area.right) / 2) * scale / input.height;
      target.y -= ((top + bottom - input.height - area.top + area.bottom) / 2) * scale / input.height;
      if (!visible.every(a => a.front) || right - left > input.width - area.left - area.right - 4 || bottom - top > input.height - area.top - area.bottom - 4) distance = Math.min(42, distance + 1.5);
    }
    aim(); // Status always describes the final camera, including roll/shake, not an intermediate proposal.
  }

  reset(): void { this.initialized = false; this.roll = this.impulse = this.time = 0; }
  dispose(): void { if (this.disposed) return; this.reset(); this.projection = { safe: false, reason: 'DISPOSED', actors: [] }; this.disposed = true; }
}
