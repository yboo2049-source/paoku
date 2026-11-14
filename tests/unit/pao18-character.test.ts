import { afterEach, expect, it } from 'vitest';
import { Animation, AnimationGroup, Mesh, NullEngine, Scene, TransformNode } from '@babylonjs/core';
import { CharacterView, selectMotion } from '../../src/render/characterView';
import { immutableCopy } from '../../src/core/snapshot';
import type { GameContext } from '../../src/types';

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).reverse().forEach(f => f()));
function context(patch: Record<string, unknown> = {}, state = 'PLAYING') {
  return immutableCopy({ state, speed: 30, player: { x: 1.25, y: 3, z: 40, targetX: 3, vy: 0,
    contact: 'SUPPORTED', supportSurfaceId: 'roof-A', supportSample: { x: 1.25, y: 3, z: 40 },
    isJumping: false, isRolling: false, rollTimer: 0, invulnerableTimer: 0,
    activePowerUps: new Map([['MAGNET', 2]]), ...patch }, chase: { distance: 1.5 },
    obstacles: [], coinEntities: [], powerUpEntities: [] } as unknown as GameContext);
}
function rig() {
  const engine = new NullEngine(); const scene = new Scene(engine); cleanup.push(() => engine.dispose());
  const root = new TransformNode('root', scene); const body = new Mesh('body', scene); body.parent = root;
  const board = new Mesh('board', scene); const bone = new TransformNode('bone', scene); bone.parent = body;
  const groups = ['idle', 'run', 'sneak_pose', 'sad_pose'].map((name, index) => {
    const a = new Animation(name, 'rotation.x', 30, Animation.ANIMATIONTYPE_FLOAT);
    a.setKeys([{ frame: 0, value: index }, { frame: 30, value: index + 1 }]);
    const g = new AnimationGroup(name, scene); g.addTargetedAnimation(a, bone); return g;
  });
  const view = new CharacterView(root, body, board); view.attach(groups);
  cleanup.push(() => view.dispose());
  return { scene, view, root, body, bone, groups };
}

it('copies only presentation root position, preserving deep readonly input and unit visual scaling', () => {
  const { view, root, body } = rig(); const c = context({ isJumping: true, vy: 5, contact: 'AIRBORNE' });
  view.sync(c, 0.016); view.sync(c, 0.016);
  expect(root.position.asArray()).toEqual([1.25, 3, 40]); expect(root.scaling.asArray()).toEqual([1, 1, 1]);
  expect(body.scaling.asArray()).toEqual([1, 1, 1]); expect([...c.player.activePowerUps]).toEqual([['MAGNET', 2]]);
  expect(() => (c.player.activePowerUps as Map<string, number>).set('MAGNET', 99)).toThrow(); expect(c.player.y).toBe(3);
});

it('selects support/air/rolling priorities and never creates a hurt fact from invulnerability', () => {
  expect(selectMotion(context().player, 'PLAYING', 0)).toBe('RUN');
  expect(selectMotion(context({ contact: 'AIRBORNE', vy: 5, isJumping: true, isRolling: true }).player, 'PLAYING', 0)).toBe('AIR_TUCK');
  expect(selectMotion(context({ contact: 'AIRBORNE', vy: 5 }).player, 'PLAYING', 0)).toBe('ASCEND');
  expect(selectMotion(context({ contact: 'AIRBORNE', vy: -1 }).player, 'PLAYING', 0)).toBe('DESCEND');
  expect(selectMotion(context({ isRolling: true, rollTimer: 0.7 }).player, 'PLAYING', 0)).toBe('SLIDE_ENTER');
  expect(selectMotion(context({ isRolling: true, rollTimer: 0.5 }).player, 'PLAYING', 0.2)).toBe('SLIDE_HOLD');
  expect(selectMotion(context({ isRolling: true, rollTimer: 0.06 }).player, 'PLAYING', 0.4)).toBe('SLIDE_EXIT');
  expect(selectMotion(context({ invulnerableTimer: 1 }).player, 'PLAYING', 0)).toBe('RUN');
  expect(selectMotion(context({ isRolling: true }).player, 'GAMEOVER', 0)).toBe('FAIL');
});

it('freezes actual AnimationGroup and bone pose while paused, then resumes without restarting', () => {
  const { view, groups, bone, scene } = rig(); view.sync(context(), 0.04); view.sync(context(), 0.04);
  const before = view.status.playhead; const pose = bone.rotation.x;
  for (let i = 0; i < 5; i++) { view.sync(context({}, 'PAUSED'), 0.05); scene._animate(); }
  expect(view.status.playhead).toBe(before); expect(bone.rotation.x).toBe(pose);
  expect(groups.every(g => !g.isPlaying)).toBe(true); expect(view.status.phase).toBe('RUN');
  view.sync(context(), 0.02); expect(view.status.playhead).toBeCloseTo(before + 0.02 * 1.4);
  expect(bone.rotation.x).toBeGreaterThan(pose);
});

it('crossfades real groups, does not restart on repeated selection, and failure interrupts immediately', () => {
  const { view, groups, bone } = rig(); view.sync(context(), 0.04); view.sync(context(), 0.04);
  const cursor = view.status.playhead;
  view.sync(context(), 0.02); expect(view.status.playhead).toBeGreaterThan(cursor);
  view.sync(context({ isRolling: true, rollTimer: 0.7 }), 0.02);
  expect(view.status.phase).toBe('SLIDE_ENTER'); expect(view.status.blending).toBe(true);
  expect(bone.rotation.x).toBeGreaterThan(1); expect(bone.rotation.x).toBeLessThan(2.1);
  view.sync(context({}, 'GAMEOVER'), 0.016);
  expect(view.status.phase).toBe('FAIL'); expect(view.status.blending).toBe(false);
  expect(groups.filter(g => g.animatables.length)).toHaveLength(1);
  expect(bone.rotation.x).toBe(3);
  view.sync(context({}, 'GAMEOVER'), 0.05); expect(bone.rotation.x).toBe(3);
});

it('uses observed contact edges at any height only as degraded engineering feedback', () => {
  const { view } = rig(); view.sync(context(), 0.016); expect(view.status.landed).toBe(false);
  view.sync(context({ contact: 'AIRBORNE', y: 7, vy: -4 }), 0.016);
  view.sync(context({ y: 5, supportSurfaceId: 'ramp', supportSample: { x: 0, y: 5, z: 40 } }), 0.016);
  expect(view.status.landed).toBe(true); expect(view.status.factMode).toBe('CONTACT_EDGE_ONLY');
  view.sync(context({ y: 5, supportSurfaceId: 'roof-B' }), 0.016); expect(view.status.landed).toBe(false);
  view.reset(); view.sync(context(), 0.016); expect(view.status.landed).toBe(false);
});

it('holds slide without ending simulation roll, supports board and clears groups on detach/dispose', () => {
  const { view, body, groups } = rig(); const c = context({ isRolling: true, rollTimer: 0.4, hoverboardActive: true });
  for (let i = 0; i < 40; i++) view.sync(c, 0.05);
  expect(c.player.rollTimer).toBe(0.4); expect(view.status.board).toBe(true); expect(body.scaling.y).toBe(1);
  view.replay(); expect(view.status.playhead).toBe(0);
  view.detach(); expect(groups.every(g => !g.isStarted)).toBe(true);
  view.attach(groups); view.sync(context(), 0.02); view.dispose(); view.dispose();
  const before = body.rotation.z; view.sync(context(), 1); expect(body.rotation.z).toBe(before);
});

it('rejects a clip targeting the simulation world root instead of allowing double displacement', () => {
  const { view, root, scene } = rig();
  const track = new Animation('root-motion', 'position.x', 30, Animation.ANIMATIONTYPE_FLOAT);
  track.setKeys([{ frame: 0, value: 100 }, { frame: 30, value: 200 }]);
  const bad = new AnimationGroup('run', scene); bad.addTargetedAnimation(track, root);
  view.attach([bad]); view.sync(context(), 0.03);
  expect(root.position.asArray()).toEqual([1.25, 3, 40]); expect(view.status.degraded).toBe(true);
  expect(view.status.clip).toBeNull();
});

it('preserves the actual blended pose when a transition is interrupted back to its outgoing clip', () => {
  const { view, bone } = rig(); view.sync(context(), 0.04); view.sync(context(), 0.04);
  view.sync(context({ isRolling: true, rollTimer: 0.7 }), 0.02);
  const blended = bone.rotation.x;
  view.sync(context(), 0);
  expect(bone.rotation.x).toBeCloseTo(blended, 8);
  view.sync(context(), 0.02); expect(view.status.phase).toBe('RUN');
});
