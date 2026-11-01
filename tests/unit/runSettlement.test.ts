import { describe, expect, it } from 'vitest';
import type { GameContext } from '../../src/types';
import { Simulation } from '../../src/core/simulation';
import { updatePhysics } from '../../src/systems/physics';
import { MissionSystem } from '../../src/systems/mission';
import { createRunSummary, createRunLedger, initializeRunLedger, awardMissionReward } from '../../src/systems/runSettlement';

function context(): GameContext {
  return {
    state: 'PLAYING', score: 0, highScore: 0, coins: 0, totalCoins: 0, speed: 18, distance: 0,
    player: { lane: 1, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isJumping: false, isRolling: false,
      rollTimer: 0, hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0, activePowerUps: new Map() },
    obstacles: [], coinEntities: [], powerUpEntities: [], missions: new MissionSystem().initMissions(),
    chase: { distance: 2.8, isNear: false },
  };
}
function coins(ctx: GameContext, count: number) {
  ctx.coinEntities = Array.from({ length: count }, (_, i) => ({ id: `coin-${i}`, lane: 1, x: 0, y: 0, z: 0, collected: false }));
}

describe('PAO-14 authoritative run ledger and terminal summary', () => {
  it('separates 30 actual consumed coins from the 50 coin mission reward', () => {
    const ctx = context(); initializeRunLedger(ctx); coins(ctx, 30);
    updatePhysics(ctx, 0); new MissionSystem().update(ctx);
    expect(ctx.runLedger).toEqual({ pickupCount: 30, pickupCoins: 30, rewardCoins: 50, rewardedMissionIds: ['m1'] });
    expect(ctx.coins).toBe(80);
    expect(ctx.missions[0].current).toBe(30);
  });
  it('does not credit a consumed coin twice across repeated physics and mission updates', () => {
    const ctx = context(); initializeRunLedger(ctx); coins(ctx, 30);
    const ms = new MissionSystem();
    for (let i = 0; i < 3; i++) { updatePhysics(ctx, 0); ms.update(ctx); }
    expect(ctx.runLedger?.pickupCount).toBe(30); expect(ctx.coins).toBe(80);
  });
  it('rewards other missions without counting their rewards as collected coins', () => {
    const ctx = context(); initializeRunLedger(ctx);
    const ms = new MissionSystem();
    for (let i = 0; i < 10; i++) ms.trackAction(ctx.missions, 'JUMP');
    ms.update(ctx); ms.update(ctx);
    expect(ctx.coins).toBe(40); expect(ctx.missions[0].current).toBe(0);
    expect(ctx.missions[0].completed).toBe(false); expect(ctx.runLedger?.rewardCoins).toBe(40);
  });
  it('uses mission identity even when a completed flag is reset or duplicated', () => {
    const ctx = context(); initializeRunLedger(ctx);
    expect(awardMissionReward(ctx, 'm2', 40)).toBe(true);
    expect(awardMissionReward(ctx, 'm2', 40)).toBe(false);
    expect(ctx.coins).toBe(40);
  });
  it('creates independent ledgers and has no writable third earned total', () => {
    const a = createRunLedger(), b = createRunLedger(); a.rewardedMissionIds.push('m1');
    expect(b.rewardedMissionIds).toEqual([]);
    const ctx = context(); initializeRunLedger(ctx);
    expect(() => { ctx.coins = 999; }).toThrow();
    expect(ctx.coins).toBe(0);
  });
  it('commits pickups and mission rewards from the same fatal tick before summary creation', () => {
    const ctx = context(); coins(ctx, 30);
    ctx.obstacles = [{ id: 'fatal', type: 'STATIC_TRAIN', lane: 1, x: 0, y: 0, z: 0, width: 2, height: 3, depth: 3 }];
    const ms = new MissionSystem();
    const sim = new Simulation(ctx, { runId: 'fatal-run', seed: 1, physics: updatePhysics,
      afterStep: c => ms.update(c, true) });
    sim.step();
    expect(sim.snapshot.phase).toBe('ENDED'); expect(sim.tick).toBe(1);
    const summary = createRunSummary(sim.snapshot, 'COLLISION');
    expect(summary).toMatchObject({ runId: 'fatal-run', pickupCount: 30, pickupCoins: 30, rewardCoins: 50, earnedCoins: 80, endReason: 'COLLISION' });
    expect(summary.scoreInt).toBe(Math.floor(sim.snapshot.context.score));
    sim.step(); expect(sim.tick).toBe(1);
    expect(createRunSummary(sim.snapshot, 'COLLISION')).toEqual(summary);
  });
  it('seals a quit as ABANDONED without clearing final world or earnings, and resets on restart', () => {
    const ctx = context(); coins(ctx, 30);
    const ms = new MissionSystem();
    const sim = new Simulation(ctx, { runId: 'quit-run', seed: 1, physics: updatePhysics,
      afterStep: c => ms.update(c, true) });
    sim.step();
    sim.queue.collect('JUMP', 'KEYBOARD', sim.tick);
    const before = sim.snapshot;
    sim.abandon();
    expect(sim.snapshot).toMatchObject({ runId: 'quit-run', phase: 'ABANDONED', tick: before.tick,
      context: { state: 'GAMEOVER', coins: 80, distance: before.context.distance } });
    expect(sim.snapshot.context.coinEntities).toEqual(before.context.coinEntities);
    expect(sim.queue.consume(sim.tick + 1)).toEqual([]);
    sim.step(); expect(sim.tick).toBe(before.tick);
    expect(createRunSummary(sim.snapshot, 'QUIT')).toMatchObject({ earnedCoins: 80, endReason: 'QUIT' });
    expect(() => createRunSummary(sim.snapshot, 'COLLISION')).toThrow();
    sim.restart('next-run', 1, context());
    expect(sim.snapshot.phase).toBe('RUNNING'); expect(sim.snapshot.context.coins).toBe(0);
    sim.step(); expect(sim.tick).toBe(1);
  });
  it('freezes the summary before restart and isolates new run accounting', () => {
    const sim = new Simulation(context(), { runId: 'old', seed: 1 });
    sim.change(c => { awardMissionReward(c, 'm1', 50); c.score = 22.9; });
    const summary = createRunSummary(sim.snapshot, 'QUIT');
    expect(Object.isFrozen(summary)).toBe(true);
    sim.restart('new', 1);
    expect(sim.snapshot.context.runLedger).toEqual(createRunLedger()); expect(sim.snapshot.context.coins).toBe(0);
    expect(summary).toMatchObject({ runId: 'old', scoreInt: 22, earnedCoins: 50, endReason: 'QUIT' });
    expect(() => { (summary as { earnedCoins: number }).earnedCoins = 500; }).toThrow();
  });
  it('keeps ledger snapshots immutable and never interpolates reward totals', () => {
    const sim = new Simulation(context(), { runId: 's', seed: 1, afterStep: c => { awardMissionReward(c, 'm2', 40); } });
    sim.step();
    expect(() => { (sim.snapshot.context.runLedger!.rewardedMissionIds as string[]).push('fake'); }).toThrow();
    for (const alpha of [0, 0.5, 1]) expect(sim.presentation(alpha).context.coins).toBe(40);
  });
  it('does not infer new ledger parts from an unaccounted legacy coins value', () => {
    const ctx = context(); ctx.coins = 80;
    const sim = new Simulation(ctx, { runId: 'new', seed: 1 });
    expect(sim.snapshot.context.runLedger).toEqual(createRunLedger());
    expect(sim.snapshot.context.coins).toBe(0);
  });
  it('adapts explicit privileged legacy owner increments as rewards without inventing pickups', () => {
    const sim = new Simulation(context(), { runId: 'legacy-owner', seed: 1 });
    sim.change(c => { c.coins += 7; });
    expect(sim.snapshot.context.runLedger).toEqual({ pickupCount: 0, pickupCoins: 0, rewardCoins: 7,
      rewardedMissionIds: ['legacy-owner:1'] });
    expect(sim.snapshot.context.coins).toBe(7);
    expect(() => { (sim.snapshot.context as GameContext).coins = 100; }).toThrow();
    for (const invalid of [7, 0, -1, 6, 7.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => sim.change(c => { c.coins = invalid; })).toThrow();
    }
    expect(createRunSummary(sim.snapshot, 'QUIT')).toMatchObject({ pickupCount: 0, pickupCoins: 0, rewardCoins: 7, earnedCoins: 7 });
  });
  it('rejects invalid ledger values instead of creating a payable summary', () => {
    const sim = new Simulation(context(), { runId: 'bad', seed: 1 });
    sim.change(c => { c.runLedger!.pickupCoins = Number.NaN; });
    expect(() => createRunSummary(sim.snapshot, 'QUIT')).toThrow();
  });
  it('does not grant missions on an arbitrary paused or ended update', () => {
    for (const state of ['PAUSED', 'GAMEOVER'] as const) {
      const ctx = context(); initializeRunLedger(ctx); ctx.score = 500; ctx.state = state;
      new MissionSystem().update(ctx);
      expect(ctx.coins).toBe(0);
    }
  });
});
