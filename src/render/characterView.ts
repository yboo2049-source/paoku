import { Matrix, Quaternion, Vector3 } from '@babylonjs/core';
import type { AnimationGroup, Mesh, TransformNode } from '@babylonjs/core';
import type { GameContext, PlayerEntity } from '../types';
import type { DeepReadonly } from '../types/contracts';

export type Motion = 'IDLE' | 'RUN' | 'ASCEND' | 'DESCEND' | 'AIR_TUCK' |
  'SLIDE_ENTER' | 'SLIDE_HOLD' | 'SLIDE_EXIT' | 'FAIL';
export interface ClipBinding { readonly name: string; readonly loop: boolean }
export type ClipProfile = Readonly<Partial<Record<Motion, ClipBinding>>>;

// Explicit compatibility only: these aliases do not turn the legacy clips into formal actions.
const LEGACY: ClipProfile = {
  IDLE: { name: 'idle', loop: true }, RUN: { name: 'run', loop: true },
  ASCEND: { name: 'run', loop: false }, DESCEND: { name: 'run', loop: false },
  AIR_TUCK: { name: 'sneak_pose', loop: false },
  SLIDE_ENTER: { name: 'sneak_pose', loop: false }, SLIDE_HOLD: { name: 'sneak_pose', loop: false },
  SLIDE_EXIT: { name: 'sneak_pose', loop: false }, FAIL: { name: 'sad_pose', loop: false },
};

export function selectMotion(p: DeepReadonly<PlayerEntity>, state: GameContext['state'], rollingAge: number): Motion {
  if (state === 'GAMEOVER') return 'FAIL';
  if (state === 'MENU' || state === 'SHOP') return 'IDLE';
  if (p.contact === 'AIRBORNE' || (p.contact === undefined && p.isJumping)) {
    if (p.isRolling) return 'AIR_TUCK';
    return p.vy > 0.1 ? 'ASCEND' : 'DESCEND';
  }
  if (p.isRolling) {
    if (p.rollTimer <= 0.12) return 'SLIDE_EXIT';
    return rollingAge < 0.1 ? 'SLIDE_ENTER' : 'SLIDE_HOLD';
  }
  return 'RUN';
}

interface Playback { group: AnimationGroup; binding: ClipBinding; seconds: number }
interface PoseChannel { target: any; owner: any; property: string; path: string; rest: any }
const copyPose = (v: any): any => v?.clone ? v.clone() : v;
function mixPose(from: any, to: any, weight: number): any {
  if (typeof from === 'number' && typeof to === 'number') return from + (to - from) * weight;
  if (from instanceof Quaternion && to instanceof Quaternion) return Quaternion.Slerp(from, to, weight);
  if (from instanceof Vector3 && to instanceof Vector3) return Vector3.Lerp(from, to, weight);
  if (from instanceof Matrix && to instanceof Matrix) return Matrix.DecomposeLerp(from, to, weight);
  return weight < 1 ? copyPose(from) : copyPose(to);
}
function writePose(channel: PoseChannel, value: any): void {
  const existing = channel.owner[channel.property];
  if (existing?.copyFrom && value != null) existing.copyFrom(value);
  else channel.owner[channel.property] = copyPose(value);
  channel.target.markAsDirty?.(channel.path);
}

/** Owns presentation state, never the asset lease or the simulation. All groups are manually sampled and paused. */
export class CharacterView {
  private root: TransformNode;
  private visual: Mesh;
  private board: Mesh;
  private profile: ClipProfile;
  private groups: AnimationGroup[] = [];
  private active: Playback | null = null;
  private channels: PoseChannel[] = [];
  private blendFrom: any[] | null = null;
  private blendAge = 0;
  private rollingAge = 0;
  private rolling = false;
  private previousContact: PlayerEntity['contact'];
  private phase: Motion = 'IDLE';
  private clock = 0;
  private disposed = false;
  private snapshot = { phase: 'IDLE' as Motion, playhead: 0, blending: false, landed: false,
    board: false, clip: null as string | null, degraded: true, factMode: 'CONTACT_EDGE_ONLY' as const };

  constructor(root: TransformNode, visual: Mesh, board: Mesh, profile: ClipProfile = LEGACY) {
    this.root = root; this.visual = visual; this.board = board; this.profile = profile;
  }

  get status() { return { ...this.snapshot }; }

  attach(groups: readonly AnimationGroup[]): void {
    if (this.disposed) return;
    this.detach();
    groups.forEach(g => g.stop());
    // Imported bones live below the visual child. Never accept a track against our authoritative anchor/containers.
    this.groups = groups.filter(g => !g.targetedAnimations.some(a => a.target === this.root || a.target === this.visual || a.target === this.board));
    for (const group of this.groups) for (const track of group.targetedAnimations) {
      const path = track.animation.targetProperty;
      if (this.channels.some(c => c.target === track.target && c.path === path)) continue;
      const keys = track.animation.targetPropertyPath;
      let owner = track.target;
      for (const key of keys.slice(0, -1)) owner = owner?.[key];
      if (owner == null) continue;
      const property = keys[keys.length - 1];
      this.channels.push({ target: track.target, owner, property, path, rest: copyPose(owner[property]) });
    }
  }

  detach(): void {
    this.groups.forEach(g => g.stop()); this.channels.forEach(c => writePose(c, c.rest));
    this.groups = []; this.channels = []; this.active = null; this.blendFrom = null;
  }

  private begin(group: AnimationGroup, binding: ClipBinding): Playback {
    group.start(true, 1, group.from, group.to); group.pause();
    return { group, binding, seconds: 0 };
  }

  private sample(play: Playback, weight = 1): void {
    const fps = play.group.targetedAnimations[0]?.animation.framePerSecond || 30;
    const span = Math.max(0, play.group.to - play.group.from);
    const frame = play.seconds * fps;
    const cursor = play.binding.loop && span > 0 ? frame % span : Math.min(frame, span);
    this.channels.forEach(c => writePose(c, c.rest));
    play.group.setWeightForAllAnimatables(1);
    play.group.goToFrame(play.group.from + cursor);
    play.group.pause();
    // goToFrame ignores group weights by default. Blend the actual sampled bone values, before bounds measurement.
    if (this.blendFrom) this.channels.forEach((c, i) => writePose(c, mixPose(this.blendFrom![i], c.owner[c.property], weight)));
  }

  sync(ctx: DeepReadonly<GameContext>, dt: number, reducedMotion = false): void {
    if (this.disposed) return;
    const p = ctx.player;
    this.root.position.set(p.x, p.y, p.z); this.root.scaling.setAll(1);
    this.visual.scaling.setAll(1);
    if (ctx.state === 'PAUSED') {
      this.groups.forEach(g => g.pause()); this.snapshot.landed = false; return;
    }
    dt = Math.min(0.05, Math.max(0, Number.isFinite(dt) ? dt : 0));
    const elapsed = ctx.state === 'GAMEOVER' ? 0 : dt;
    this.clock += elapsed;
    this.rollingAge = p.isRolling ? (this.rolling ? this.rollingAge + elapsed : 0) : 0;
    this.rolling = p.isRolling;
    const next = selectMotion(p, ctx.state, this.rollingAge);
    const binding = this.profile[next];
    const group = binding && this.groups.find(g => g.name.toLowerCase() === binding.name.toLowerCase());
    if (group && (this.active?.group !== group || next !== this.phase && next === 'FAIL')) {
      // Snapshot the displayed pose, including an interrupted blend. Only one paused group needs to stay live.
      this.blendFrom = this.active && next !== 'FAIL' ? this.channels.map(c => copyPose(c.owner[c.property])) : null;
      this.groups.forEach(g => g.stop());
      this.active = this.begin(group, binding!); this.blendAge = 0;
    } else if (this.active && group === this.active.group && binding) {
      this.active.binding = binding;
    } else if (!group) {
      this.groups.forEach(g => g.stop()); this.active = null; this.blendFrom = null;
      this.channels.forEach(c => writePose(c, c.rest));
    }
    this.phase = next;
    const rate = next === 'RUN' ? Math.min(1.4, Math.max(0.8, ctx.speed / 20)) : 1;
    if (this.active) {
      this.active.seconds += elapsed * rate;
      this.blendAge += elapsed;
      const weight = this.blendFrom ? Math.min(1, this.blendAge / 0.1) : 1;
      this.sample(this.active, weight);
      if (weight === 1) this.blendFrom = null;
    }
    const board = !!(p.hoverboardActive || p.hasHoverboard);
    this.board.isVisible = board;
    this.visual.position.setAll(0); this.visual.rotation.x = 0;
    const tilt = reducedMotion ? 0 : Math.max(-0.07, Math.min(0.07, (p.targetX - p.x) * -0.025)) * (board || p.isRolling ? 0.4 : 1);
    this.visual.rotation.z += (tilt - this.visual.rotation.z) * (1 - Math.exp(-elapsed / 0.12));
    // Primitive fallback is deliberately neutral for unavailable formal poses; only running limbs oscillate.
    if (!this.groups.length) {
      for (const [name, direction] of [['armLeft', 1], ['armRight', -1], ['legLeft', -1], ['legRight', 1]] as const) {
        const limb = this.visual.getChildMeshes().find(m => m.name === name);
        if (limb) limb.rotation.x = next === 'RUN' ? Math.sin(this.clock * ctx.speed * 0.8) * 0.45 * direction : 0;
      }
    }
    const landed = ctx.state === 'PLAYING' && this.previousContact === 'AIRBORNE' && p.contact === 'SUPPORTED';
    this.previousContact = p.contact;
    this.snapshot = { phase: next, playhead: this.active?.seconds ?? 0, blending: !!this.blendFrom,
      landed, board, clip: this.active?.group.name ?? null,
      degraded: this.profile === LEGACY || !group || p.contact === undefined, factMode: 'CONTACT_EDGE_ONLY' };
  }

  replay(): void {
    if (this.disposed) return;
    this.blendFrom = null;
    if (this.active) { this.active.seconds = 0; this.sample(this.active, 1); }
    this.snapshot.playhead = 0; this.snapshot.blending = false;
  }

  reset(): void {
    if (this.disposed) return;
    this.groups.forEach(g => g.stop()); this.channels.forEach(c => writePose(c, c.rest));
    this.active = null; this.blendFrom = null;
    this.previousContact = undefined; this.rolling = false; this.rollingAge = this.blendAge = this.clock = 0;
    this.phase = 'IDLE'; this.visual.position.setAll(0); this.visual.rotation.setAll(0); this.visual.scaling.setAll(1);
    this.snapshot = { phase: 'IDLE', playhead: 0, blending: false, landed: false, board: false,
      clip: null, degraded: true, factMode: 'CONTACT_EDGE_ONLY' };
  }

  dispose(): void { if (this.disposed) return; this.reset(); this.detach(); this.disposed = true; }
}
