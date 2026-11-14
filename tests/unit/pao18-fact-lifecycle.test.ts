import { it, expect } from 'vitest';
import { Simulation } from '../../src/core/simulation';
import type { GameContext } from '../../src/types';
import { Animation, AnimationGroup, Mesh, NullEngine, Scene, TransformNode, TargetCamera, Vector3 } from '@babylonjs/core';
import { CharacterView } from '../../src/render/characterView';
import { updatePhysics } from '../../src/systems/physics';
import { CameraRig } from '../../src/render/cameraRig';
import * as renderModule from '../../src/render/babylon';
import type { MotionRead } from '../../src/types/contracts';

function context(): GameContext {
  return { state: 'PLAYING', score: 0, highScore: 0, coins: 0, totalCoins: 0, speed: 18, distance: 0,
    player: { lane: 1, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isJumping: false, isRolling: false, rollTimer: 0, hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0, activePowerUps: new Map() },
    obstacles: [], coinEntities: [], powerUpEntities: [], missions: [], chase: { distance: 2.8, isNear: false } };
}
for (const action of ['JUMP', 'ROLL'] as const) for (const laneOrder of ['same-after', 'same-before', 'later'] as const) {
  it(`keeps the ${action} anchor when lane input is ${laneOrder}, including duplicate packets`, () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const build = (lane: boolean) => {
      const sim = new Simulation(context(), { runId: 'anchor', seed: 1, motionMode: 'committed-motion-v1', physics: (c, dt, start, sink) => updatePhysics(c, dt, undefined, start, sink) });
      const cursor = sim.motionCursor();
      for (let tick = 1; tick <= 3; tick++) {
        if (lane && tick === 1 && laneOrder === 'same-before') sim.queue.collect('RIGHT', 'QA', sim.tick);
        if (tick === 1) sim.queue.collect(action, 'QA', sim.tick);
        if (lane && (tick === 1 && laneOrder === 'same-after' || tick === 3 && laneOrder === 'later')) sim.queue.collect('RIGHT', 'QA', sim.tick);
        sim.step();
      }
      const root = new TransformNode('anchor-root', scene), visual = new Mesh('anchor-visual', scene), board = new Mesh('anchor-board', scene);
      const bone = new TransformNode('anchor-bone', scene); bone.parent = visual;
      const groups = ['run', 'sneak_pose'].map(name => {
        const track = new Animation(name, 'rotation.x', 30, Animation.ANIMATIONTYPE_FLOAT);
        track.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: 1 }]);
        const group = new AnimationGroup(name, scene); group.addTargetedAnimation(track, bone); return group;
      });
      const view = new CharacterView(root, visual, board); view.attach(groups);
      const read = sim.readMotionFacts(cursor, sim.snapshot.motionStamp!);
      view.sync(sim.presentation(1).context, 0, false, { read, timeSec: sim.snapshot.timeSec });
      return { sim, root, view, read };
    };
    const baseline = build(false), candidate = build(true);
    try {
      expect(candidate.view.status.playhead).toBeCloseTo(baseline.view.status.playhead, 12);
      expect(candidate.view.status.playhead).toBeCloseTo(2 / 60, 12);
      expect(candidate.view.status.phase).toBe(baseline.view.status.phase);
      if (candidate.read.status !== 'OK') throw new Error('Expected complete read');
      const facts = candidate.read.batches.flatMap(b => b.events);
      const vertical = facts.find(f => f.type === 'ACTION_STARTED' && f.payload.action === action);
      const lane = facts.find(f => f.type === 'ACTION_STARTED' && f.payload.action === 'CHANGE_LANE');
      if (vertical?.type !== 'ACTION_STARTED' || lane?.type !== 'ACTION_STARTED') throw new Error('Expected both successful actions');
      expect(candidate.view.status.actionInstanceId).toBe(vertical.payload.actionInstanceId);
      expect(candidate.view.status.actionTimeSec).toBe(vertical.timeSec);
      expect(candidate.view.status).toMatchObject({ laneActionInstanceId: lane.payload.actionInstanceId, laneActionTimeSec: lane.timeSec });
      expect(candidate.view.status.receipt?.items.map(i => i.eventId)).toEqual(facts.map(f => f.eventId));
      expect(candidate.view.status.receipt?.through).toEqual(candidate.read.through);
      const player = candidate.sim.presentation(1).context.player;
      expect(candidate.root.position.asArray()).toEqual([player.x, player.y, player.z]);
      const before = candidate.view.status;
      candidate.view.sync(candidate.sim.presentation(1).context, 0, false, { read: candidate.read, timeSec: candidate.sim.snapshot.timeSec });
      expect(candidate.view.status.playhead).toBe(before.playhead);
      expect(candidate.view.status.actionInstanceId).toBe(before.actionInstanceId);
      expect(candidate.view.status.receipt?.items).toEqual([]);
      expect(candidate.view.status.receipt?.through).toEqual(candidate.read.through);
    } finally { baseline.view.dispose(); candidate.view.dispose(); engine.dispose(); }
  });
}
it('keeps the last committed world and faults after an afterStep exception', () => {
  const sim = new Simulation(context(), { runId: 'fault', seed: 1, motionMode: 'committed-motion-v1', afterStep: () => { throw new Error('injected'); } } as ConstructorParameters<typeof Simulation>[1]);
  const before = sim.snapshot;
  expect(() => sim.step()).toThrow('injected');
  expect(sim.snapshot).toBe(before);
  expect(sim).toHaveProperty('faulted', true);
  expect(sim.readMotionFacts(sim.motionCursor(), before.motionStamp!)).toMatchObject({ status: 'FAULT', failedTick: 1 });
  sim.step(); expect(sim.snapshot).toBe(before);
  expect(() => sim.change(ctx => { ctx.player.y = 90; })).toThrow('faulted');
  expect(() => sim.setPhase('RUNNING')).toThrow('faulted');
  expect(() => sim.abandon()).toThrow('faulted');
  expect(() => sim.restart('new', 1)).toThrow('fresh context');
  sim.restart('new', 1, context()); expect(sim.faulted).toBe(false); expect(sim.tick).toBe(0);
});
it('camera consumes a real intermediate landing once even when the final snapshot is airborne', () => {
  const ctx = context(); ctx.player.contact = 'AIRBORNE';
  const sim = new Simulation(ctx, { runId: 'camera', seed: 1, motionMode: 'committed-motion-v1', physics: (c, dt, start, sink) => updatePhysics(c, dt, undefined, start, sink) });
  const cursor = sim.motionCursor(); sim.step(); sim.queue.collect('JUMP', 'QA', sim.tick); sim.step();
  const read = sim.readMotionFacts(cursor, sim.snapshot.motionStamp!); if (read.status !== 'OK') throw new Error('Expected read');
  const facts = read.batches.flatMap(b => b.events);
  const engine = new NullEngine(), scene = new Scene(engine), camera = new TargetCamera('camera', Vector3.Zero(), scene), rig = new CameraRig(camera);
  try {
    const input = { width: 390, height: 844 };
    rig.sync(sim.snapshot.context, [], input, sim.stepSec, false, facts);
    expect(rig.status.landedFacts).toBe(1);
    rig.sync(sim.snapshot.context, [], input, sim.stepSec, true, facts);
    expect(rig.status.landedFacts).toBe(1); // Explicit facts disable the old edge channel.
    rig.reset(); rig.sync(sim.snapshot.context, [], { ...input, reducedMotion: true }, sim.stepSec, false, facts);
    expect(rig.status.landedFacts).toBe(1); rig.dispose(); rig.dispose();
  } finally { engine.dispose(); }
});
it('rejects out-of-order or conflicting identities before any render side effect', () => {
  const validate = (renderModule as unknown as { validateMotionRead?: (read: MotionRead) => boolean }).validateMotionRead;
  expect(validate).toBeTypeOf('function');
  const sim = new Simulation(context(), { runId: 'valid', seed: 1, motionMode: 'committed-motion-v1' });
  const cursor = sim.motionCursor(); sim.queue.collect('LEFT', 'QA', 0); sim.queue.collect('RIGHT', 'QA', 0); sim.step();
  const read = sim.readMotionFacts(cursor, sim.snapshot.motionStamp!); if (read.status !== 'OK') throw new Error('Expected read');
  expect(validate!(read)).toBe(true);
  const batch = read.batches[0];
  expect(validate!({ ...read, batches: [{ ...batch, events: [...batch.events].reverse() }] })).toBe(false);
  expect(validate!({ ...read, batches: [{ ...batch, events: [{ ...batch.events[0], eventId: 'forged' }, batch.events[1]] }] })).toBe(false);
});
it('keeps pending committed events on pause and uses new epochs for restart/abandon', () => {
  const sim = new Simulation(context(), { runId: 'same', seed: 1, motionMode: 'committed-motion-v1' });
  const start = sim.motionCursor(); sim.step(); sim.setPhase('PAUSED');
  expect(sim.snapshot.motionStamp!.streamEpoch).toBe(start.streamEpoch);
  expect(sim.readMotionFacts(start, sim.snapshot.motionStamp!)).toMatchObject({ status: 'OK', batches: [{ tick: 1 }] });
  sim.setPhase('RUNNING'); sim.abandon();
  expect(sim.readMotionFacts(start, sim.snapshot.motionStamp!)).toMatchObject({ status: 'REBASE' });
  sim.restart('same', 1, context()); expect(sim.snapshot.motionStamp!.streamEpoch).toBeGreaterThan(start.streamEpoch);
});
it('rejects nested owner writes and never commits a failed reentrant step', () => {
  let sim: Simulation;
  sim = new Simulation(context(), { runId: 'same', seed: 1, motionMode: 'committed-motion-v1', afterStep: () => sim.change(() => {}) });
  const before = sim.snapshot; expect(() => sim.step()).toThrow('stepping'); expect(sim.snapshot).toBe(before); expect(sim.faulted).toBe(true);
});
it('consumes actual action identity and pauses real groups without root displacement', () => {
  const engine = new NullEngine(); const scene = new Scene(engine);
  const root = new TransformNode('root', scene), visual = new Mesh('visual', scene), board = new Mesh('board', scene);
  const bone = new TransformNode('bone', scene); bone.parent = visual;
  const animation = new Animation('run', 'rotation.x', 30, Animation.ANIMATIONTYPE_FLOAT); animation.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: 1 }]);
  const group = new AnimationGroup('run', scene); group.addTargetedAnimation(animation, bone);
  const view = new CharacterView(root, visual, board); view.attach([group]);
  try {
    const sim = new Simulation(context(), { runId: 'same', seed: 1, motionMode: 'committed-motion-v1', physics: (c, dt, start, sink) => updatePhysics(c, dt, undefined, start, sink) }); const cursor = sim.motionCursor();
    sim.queue.collect('JUMP', 'QA', 0); sim.step(); const read = sim.readMotionFacts(cursor, sim.snapshot.motionStamp!);
    const sync = view.sync.bind(view) as (...args: unknown[]) => void;
    sync(sim.snapshot.context, 0, false, { read, timeSec: sim.snapshot.timeSec });
    expect(view.status).toHaveProperty('factMode', 'COMMITTED_MOTION');
    expect(root.position.z).toBe(sim.snapshot.context.player.z);
    const before = view.status.playhead; sim.setPhase('PAUSED');
    sync(sim.snapshot.context, 1, false, { read, timeSec: sim.snapshot.timeSec }); scene._animate();
    expect(view.status.playhead).toBe(before); expect(group.isPlaying).toBe(false);
    sim.setPhase('RUNNING'); const firstAction = view.status.actionInstanceId;
    for (let i = 0; i < 70; i++) sim.step();
    view.sync(sim.snapshot.context, 0.1, false, { read: sim.readMotionFacts(cursor, sim.snapshot.motionStamp!), timeSec: sim.snapshot.timeSec });
    const nextCursor = sim.motionCursor(); sim.queue.collect('JUMP', 'QA', sim.tick); sim.step();
    const secondRead = sim.readMotionFacts(nextCursor, sim.snapshot.motionStamp!);
    view.sync(sim.snapshot.context, sim.stepSec, false, { read: secondRead, timeSec: sim.snapshot.timeSec });
    expect(view.status.actionInstanceId).not.toBe(firstAction);
    expect(view.status.playhead).toBe(0); // Same run alias, new successful instance restarts it.
    const receipt = view.status.receipt;
    view.sync(sim.snapshot.context, 0, false, { read: secondRead, timeSec: sim.snapshot.timeSec });
    expect(view.status.playhead).toBe(0); expect(view.status.receipt!.items).toEqual([]); expect(receipt!.items).toHaveLength(1);
  } finally { view.dispose(); engine.dispose(); }
});
