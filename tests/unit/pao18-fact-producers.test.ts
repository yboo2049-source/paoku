import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/core/simulation';
import { updatePhysics } from '../../src/systems/physics';
import { eventBus } from '../../src/core/eventBus';
import type { GameContext } from '../../src/types';
import { missionSystem } from '../../src/systems/mission';
import { GameLoop } from '../../src/core/gameLoop';

function context(): GameContext {
  return { state: 'PLAYING', score: 0, highScore: 0, coins: 0, totalCoins: 0, speed: 18, distance: 0,
    player: { lane: 1, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isJumping: false, isRolling: false, rollTimer: 0, hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0, activePowerUps: new Map() },
    obstacles: [], coinEntities: [], powerUpEntities: [], missions: [], chase: { distance: 2.8, isNear: false } };
}
describe('PAO18 real producers', () => {
  for (const [actions, expected] of [
    [['JUMP', 'ROLL', 'JUMP'], [[true, false], [true, true]]],
    [['ROLL', 'JUMP', 'ROLL'], [[false, true], [true, false], [true, true]]],
  ] as const) it(`observes successful branches only: ${actions.join(' -> ')}`, () => {
    const states: boolean[][] = [];
    const sim = new Simulation(context(), { runId: 'same', seed: 1, motionMode: 'committed-motion-v1',
      onAppliedAction: ctx => states.push([ctx.player.isJumping, ctx.player.isRolling]) });
    const start = sim.motionCursor(); for (const action of actions) sim.queue.collect(action, 'REPLAY', 0); sim.step();
    expect(states).toEqual(expected);
    const read = sim.readMotionFacts(start, sim.snapshot.motionStamp!); expect(read.status).toBe('OK');
    if (read.status === 'OK') {
      const facts = read.batches.flatMap(b => b.events);
      expect(facts).toHaveLength(expected.length);
      expect(new Set(facts.map(f => f.type === 'ACTION_STARTED' && f.payload.actionInstanceId)).size).toBe(expected.length);
    }
    expect(sim.acceptedInputs).toHaveLength(3);
    expect(sim.snapshot.context.player).toMatchObject({ isJumping: true, isRolling: true });
  });
  it('keeps same-tick mission counting before reward update, ignoring ineffective inputs', () => {
    const ctx = context(); ctx.missions = [{ id: 'jump', title: 'jump', description: 'fixture', type: 'JUMP_TIMES', current: 0, target: 1, rewardCoins: 3, completed: false }];
    const sim = new Simulation(ctx, { runId: 'same', seed: 1, motionMode: 'committed-motion-v1',
      onAppliedAction: (owned, action) => { if (action.action === 'JUMP' || action.action === 'ROLL') missionSystem.trackAction(owned.missions, action.action); },
      afterStep: owned => missionSystem.update(owned, true) });
    sim.queue.collect('JUMP', 'QA', 0); sim.queue.collect('JUMP', 'QA', 0); sim.step();
    expect(sim.snapshot.context.missions[0]).toMatchObject({ completed: true, current: 1 }); expect(sim.snapshot.context.coins).toBe(3);
  });
  it('does not accept raw bus events as authority and suppresses production legacy emits', () => {
    let notified = 0; const listener = () => notified++;
    eventBus.on('PLAYER_ACTION', listener);
    try {
      const sim = new Simulation(context(), { runId: 'same', seed: 1, motionMode: 'committed-motion-v1' });
      const start = sim.motionCursor(); eventBus.emit('PLAYER_ACTION', { action: 'JUMP' });
      sim.queue.collect('LEFT', 'QA', 0); sim.queue.collect('LEFT', 'QA', 0); sim.step();
      expect(notified).toBe(1);
      const read = sim.readMotionFacts(start, sim.snapshot.motionStamp!);
      if (read.status !== 'OK') throw new Error('Expected read'); expect(read.batches[0].events).toHaveLength(1);
    } finally { eventBus.off('PLAYER_ACTION', listener); }
  });
  it('captures actual ground/ramp/roof didLand identity and nonzero producer position', () => {
    for (const kind of ['GROUND', 'RAMP', 'ROOF'] as const) {
      const ctx = context();
      if (kind !== 'GROUND') ctx.obstacles = [{ id: 'surface', type: kind === 'RAMP' ? 'RAMP' : 'STATIC_TRAIN', x: 0, y: 0, z: 0, width: 3, height: 3, depth: 30, lane: 1 }];
      ctx.player.y = kind === 'GROUND' ? 0.01 : kind === 'ROOF' ? 3.01 : 1.54;
      ctx.player.vy = -2; ctx.player.isJumping = true; ctx.player.contact = 'AIRBORNE';
      const sim = new Simulation(ctx, { runId: 'same', seed: 1, motionMode: 'committed-motion-v1',
        physics: (owned, dt, start, sink) => updatePhysics(owned, dt, undefined, start, sink) });
      const start = sim.motionCursor(); sim.step();
      const read = sim.readMotionFacts(start, sim.snapshot.motionStamp!); if (read.status !== 'OK') throw new Error('Expected read');
      const landed = read.batches.flatMap(b => b.events).find(f => f.type === 'PLAYER_LANDED');
      expect(landed?.payload).toMatchObject({ surfaceKind: kind, relativeImpactSpeedMps: null, supportStatus: 'KNOWN' });
      expect(landed?.payload.position.z).toBeGreaterThan(0);
    }
  });
  it('keeps all intermediate landing/new jump facts when final state is airborne again', () => {
    const ctx = context(); ctx.player.y = 0.01; ctx.player.vy = -2; ctx.player.isJumping = true; ctx.player.contact = 'AIRBORNE';
    const sim = new Simulation(ctx, { runId: 'same', seed: 1, motionMode: 'committed-motion-v1', physics: (c, dt, start, sink) => updatePhysics(c, dt, undefined, start, sink) });
    const start = sim.motionCursor(); sim.step(); sim.queue.collect('JUMP', 'QA', sim.tick); sim.step();
    expect(sim.snapshot.context.player.contact).toBe('AIRBORNE');
    const read = sim.readMotionFacts(start, sim.presentation(0.4).motionStamp!);
    if (read.status !== 'OK') throw new Error('Expected read');
    expect(read.batches.flatMap(b => b.events).map(f => f.type)).toEqual(['PLAYER_LANDED', 'ACTION_STARTED']);
  });
  it('has identical actual event identity/time at 30/60/120Hz and irregular fixed-step cadence', () => {
    const drive = (pattern: number[]) => {
      const sim = new Simulation(context(), { runId: 'same', seed: 1, motionMode: 'committed-motion-v1', physics: (c, dt, start, sink) => updatePhysics(c, dt, undefined, start, sink) });
      const cursor = sim.motionCursor(); for (const tick of [2, 80]) sim.queue.enqueue({ runId: 'same', tick, sequence: tick, action: 'JUMP', source: 'REPLAY' }, 0);
      const loop = new GameLoop(() => sim.step()); let i = 0;
      while (sim.tick < 120) (loop as unknown as { advance(dt: number): void }).advance(pattern[i++ % pattern.length]);
      const read = sim.readMotionFacts(cursor, sim.snapshot.motionStamp!); if (read.status !== 'OK') throw new Error('Expected read');
      return read.batches.flatMap(b => b.events);
    };
    const expected = drive([1 / 60]); for (const pattern of [[1 / 30], [1 / 120], [1 / 240, 1 / 80, 1 / 60]]) expect(drive(pattern)).toEqual(expected);
  });
});
