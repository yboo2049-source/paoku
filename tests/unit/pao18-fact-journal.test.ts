import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/core/simulation';
import type { GameContext } from '../../src/types';
import type { LandedPayload, MotionSink } from '../../src/types/contracts';

function initial(): GameContext {
  return { state: 'PLAYING', score: 0, coins: 0, totalCoins: 0, highScore: 0, speed: 18, distance: 0,
    player: { lane: 1, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isJumping: false, isRolling: false, rollTimer: 0, hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0, activePowerUps: new Map() },
    obstacles: [], coinEntities: [], powerUpEntities: [], missions: [], chase: { distance: 2.8, isNear: false } };
}
function bridge(extra: Partial<ConstructorParameters<typeof Simulation>[1]> = {}) {
  return new Simulation(initial(), { runId: 'same', seed: 123, motionMode: 'committed-motion-v1', ...extra } as ConstructorParameters<typeof Simulation>[1]);
}
describe('PAO18 committed fact journal', () => {
  it('restarts its floor in the new tick domain without reusing sequences or accepting old cursors', () => {
    const sim = bridge(); sim.queue.collect('LEFT', 'QA', 0);
    sim.step(); sim.step(); sim.step(); const old = sim.motionCursor();
    expect(old.throughSequence).toBe(1);
    sim.restart('same', 123, initial());
    expect(sim.motionDiagnostics.floorTick).toBe(0);
    const fresh = sim.motionCursor();
    expect(fresh).toMatchObject({ throughTick: 0, throughSequence: old.throughSequence });
    expect(fresh.streamEpoch).toBeGreaterThan(old.streamEpoch);
    expect(sim.readMotionFacts(old, sim.snapshot.motionStamp!)).toMatchObject({ status: 'REBASE', reason: 'WORLD_BOUNDARY' });
    expect(sim.readMotionFacts(fresh, sim.snapshot.motionStamp!)).toMatchObject({ status: 'OK', batches: [] });
    sim.queue.collect('RIGHT', 'QA', 0); sim.step();
    const first = sim.readMotionFacts(fresh, sim.snapshot.motionStamp!);
    if (first.status !== 'OK') throw new Error('Expected first new batch');
    expect(first.batches[0]).toMatchObject({ tick: 1, previousSequence: old.throughSequence, throughSequence: old.throughSequence + 1 });
    expect(first.batches[0].events[0].eventId).toBe('same:1:2');
    expect(sim.readMotionFacts({ ...fresh, throughTick: 2 }, sim.snapshot.motionStamp!)).toMatchObject({ status: 'REBASE', reason: 'INVALID_CURSOR' });
    for (let i = 0; i < 259; i++) sim.step();
    expect(sim.motionDiagnostics).toMatchObject({ batches: 256, floorTick: 4, floorSequence: 2 });
    expect(sim.readMotionFacts(fresh, sim.snapshot.motionStamp!)).toMatchObject({ status: 'GAP', floorTick: 4, lostCount: 1 });
  });
  it('publishes a complete empty tick with the same immutable snapshot stamp', () => {
    const sim = bridge(); sim.step();
    expect(sim.snapshot).toHaveProperty('motionStamp');
    const read = sim.readMotionFacts({ runId: 'same', streamEpoch: 1, throughTick: 0, throughSequence: 0 }, sim.snapshot.motionStamp!);
    expect(read.status).toBe('OK');
    if (read.status === 'OK') expect(read.batches[0]).toMatchObject({ complete: true, events: [], tick: 1, timeSec: 1 / 60 });
  });
  const land: LandedPayload = { position: { x: 0, y: 0, z: 0 }, surfaceId: 'ground', surfaceKind: 'GROUND',
    relativeImpactSpeedMps: null, impactStatus: 'NOT_EXPOSED_BY_CURRENT_SOLVER', supportStatus: 'KNOWN' };
  it('is nondestructive across independent cursors, numeric ordering and immutable nested payloads', () => {
    const sim = bridge({ physics: (_ctx, _dt, _start, sink) => { for (let i = 0; i < 12; i++) sink!.landed(land); } });
    const cursor = sim.motionCursor(); sim.step(); sim.step();
    const stamp = sim.presentation(0.2).motionStamp!;
    const a = sim.readMotionFacts(cursor, stamp), b = sim.readMotionFacts(cursor, stamp);
    expect(a).toEqual(b); expect(a.status).toBe('OK');
    if (a.status !== 'OK') throw new Error('Expected complete read');
    const facts = a.batches.flatMap(x => x.events);
    expect(facts.map(x => x.sequence)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(new Set(facts.map(x => x.eventId)).size).toBe(24);
    expect(Reflect.set(facts[0].payload.position, 'y', 99)).toBe(false);
    expect(facts[0].payload.position.y).toBe(0);
    expect(sim.readMotionFacts(a.through, stamp)).toMatchObject({ status: 'OK', batches: [] });
    expect(sim.snapshot.context.player.y).toBe(0);
  });
  it('rejects future/cross-epoch cursors and never fabricates a QA motion', () => {
    const sim = bridge(); const before = sim.motionCursor(); sim.step();
    expect(sim.readMotionFacts({ ...before, throughTick: 100 }, sim.snapshot.motionStamp!)).toMatchObject({ status: 'REBASE', reason: 'INVALID_CURSOR' });
    sim.change(ctx => { ctx.player.y = 10; });
    expect(sim.readMotionFacts(before, sim.snapshot.motionStamp!)).toMatchObject({ status: 'REBASE', reason: 'WORLD_BOUNDARY' });
    const fresh = sim.motionCursor(); sim.step();
    expect(sim.readMotionFacts(fresh, sim.snapshot.motionStamp!)).toMatchObject({ status: 'OK', batches: [{ events: [] }] });
  });
  it('bounds tick retention and reports exact lost sequence count without partial batches', () => {
    const sim = bridge({ physics: (_ctx, _dt, _start, sink) => sink!.landed(land) });
    const cursor = sim.motionCursor(); for (let i = 0; i < 300; i++) sim.step();
    expect(sim.motionDiagnostics.batches).toBe(256);
    expect(sim.readMotionFacts(cursor, sim.snapshot.motionStamp!)).toMatchObject({ status: 'GAP', lostCount: 44, toSequence: 44, floorTick: 44 });
  });
  it('bounds total events at 1024 and an oversized tick becomes an explicit full-tick GAP', () => {
    let size = 64;
    const sim = bridge({ physics: (_ctx, _dt, _start, sink) => { for (let i = 0; i < size; i++) sink!.landed(land); } });
    const start = sim.motionCursor(); for (let i = 0; i < 17; i++) sim.step();
    expect(sim.motionDiagnostics.events).toBe(1024);
    expect(sim.readMotionFacts(start, sim.snapshot.motionStamp!)).toMatchObject({ status: 'GAP', lostCount: 64 });
    const cursor = sim.motionCursor(); size = 65; sim.step();
    expect(sim.snapshot.tick).toBe(18);
    expect(sim.motionDiagnostics.events).toBe(0);
    expect(sim.readMotionFacts(cursor, sim.snapshot.motionStamp!)).toMatchObject({ status: 'GAP', lostCount: 65 });
  });
  it('does not mistake evicted empty ticks for missing events or use a wall-clock TTL', () => {
    const sim = bridge(); const start = sim.motionCursor(); for (let i = 0; i < 300; i++) sim.step();
    expect(sim.readMotionFacts(start, sim.snapshot.motionStamp!)).toMatchObject({ status: 'OK' });
    sim.setPhase('PAUSED'); const stamp = sim.snapshot.motionStamp;
    for (let i = 0; i < 500; i++) sim.step();
    expect(sim.snapshot.motionStamp).toEqual(stamp);
  });
  it('invalidates a captured producer sink once the owning step exits', () => {
    let captured: MotionSink | undefined;
    const sim = bridge({ physics: (_ctx, _dt, _start, sink) => { captured = sink; } }); sim.step();
    expect(() => captured!.landed(land)).toThrow('Expired');
  });
});
