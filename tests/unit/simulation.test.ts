import { describe, it, expect, vi } from 'vitest';
import { GameLoop } from '../../src/core/gameLoop';
import { updatePhysics } from '../../src/systems/physics';
import { eventBus } from '../../src/core/eventBus';
const modules = import.meta.glob('../../src/core/simulation.ts', { eager: true });
function api() {
  const m = Object.values(modules)[0] as any;
  expect(m?.Simulation, 'fixed tick simulation owner is missing').toBeTypeOf('function');
  return m;
}
function initial() {
  return { state: 'PLAYING', score: 0, coins: 0, totalCoins: 0, highScore: 0, speed: 18, distance: 0,
    player: { lane: 1, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isJumping: false, isRolling: false, rollTimer: 0, hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0, activePowerUps: new Map() },
    obstacles: [], coinEntities: [], powerUpEntities: [], missions: [], chase: { distance: 2.8, isNear: false } };
}
function controlled() {
  const { Simulation } = api();
  return new Simulation(initial(), { runId: 'same', seed: 123, physics: updatePhysics,
    afterStep: (ctx: any, _dt: number, rng: any) => { ctx.chase.distance += rng.next() * 0.001; } });
}
function drive(pattern: number[]) {
  const sim = controlled();
  for (const [i, [tick, action]] of [[1, 'LEFT'], [1, 'RIGHT'], [60, 'JUMP'], [70, 'ROLL'], [200, 'RIGHT']].entries())
    sim.queue.enqueue({ runId: 'same', tick, action, sequence: i + 1, source: 'REPLAY' }, 0);
  const loop = new GameLoop(() => sim.step());
  let frame = 0;
  while (sim.tick < 600) { (loop as any).advance(pattern[frame++ % pattern.length]); }
  expect(sim.tick).toBe(600);
  return sim.snapshot;
}
describe('PAO-10 reproducible controlled simulation (legacy spawner excluded)', () => {
  it('same seed and effective inputs at 30/60/120Hz and irregular cadence agree at tick600', () => {
    const reference = drive([1 / 60]);
    for (const p of [[1 / 30], [1 / 120], [1 / 240, 1 / 80, 1 / 60]]) {
      const result = drive(p);
      // Compare committed values: read-only Map proxies deliberately expose fresh bound methods.
      const values = (v: unknown) => JSON.stringify(v, (_key, x) => x instanceof Map ? [...x] : x);
      expect(values(result)).toBe(values(reference));
    }
    expect(reference.timeSec).toBe(10);
    expect(reference.context.speed).toBeCloseTo(20.5, 9);
    expect(reference.context.score).toBeCloseTo(reference.context.distance * 0.1, 9);
    expect(reference.context.coins).toBe(0);
  });
  it('injects explicit versioned RNG, resets run/input state without retaining old snapshots', () => {
    const { createSeededRng } = api();
    const a = createSeededRng(123), b = createSeededRng(123), c = createSeededRng(124);
    const sequence = Array.from({ length: 10 }, () => a.next());
    expect(sequence).toEqual(Array.from({ length: 10 }, () => b.next()));
    expect(sequence).not.toEqual(Array.from({ length: 10 }, () => c.next()));
    expect(a.algorithmVersion).toBe('mulberry32-v1');
    const sim = controlled();
    sim.queue.collect('LEFT', 'KEYBOARD', 0); sim.step();
    const old = sim.snapshot;
    sim.restart('next', 123, initial());
    expect(sim.snapshot.runId).toBe('next'); expect(sim.tick).toBe(0);
    expect(sim.queue.consume(1)).toEqual([]);
    expect(old.runId).toBe('same');
    expect(sim.presentation(0).context.player.x).toBe(0);
  });
  it('does not advance timers, input, distance or score while paused', () => {
    const sim = controlled(); sim.setPhase('PAUSED');
    expect(sim.queue.collect('JUMP', 'KEYBOARD', sim.tick)).toBe(false);
    for (let i = 0; i < 500; i++) sim.step();
    expect(sim.tick).toBe(0); expect(sim.snapshot.context.score).toBe(0);
    sim.setPhase('RUNNING'); sim.step(); expect(sim.tick).toBe(1);
  });
  it('commits once after reentrant legacy action listeners update owner state', () => {
    const sim = controlled();
    sim.step();
    const previous = sim.snapshot;
    const observed: unknown[] = [];
    const listener = () => {
      sim.change((ctx: any) => { ctx.coins += 7; });
      observed.push(sim.snapshot);
    };
    eventBus.on('PLAYER_ACTION', listener);
    try {
      sim.queue.collect('LEFT', 'KEYBOARD', sim.tick);
      sim.step();
    } finally { eventBus.off('PLAYER_ACTION', listener); }
    expect(observed).toEqual([previous]);
    expect(sim.snapshot.context.coins).toBe(7);
    expect(sim.presentation(0).context.player.z).toBe(previous.context.player.z);
    expect(sim.presentation(0).context.coins).toBe(7);
  });
});
describe('PAO-10 scheduler', () => {
  it('rejects negative/nonfinite dt and caps long frames with measured dropped time', () => {
    const steps: number[] = []; const loop = new GameLoop(dt => steps.push(dt));
    expect((loop as any).advance, 'fixed accumulator API missing').toBeTypeOf('function');
    (loop as any).advance(-1); (loop as any).advance(NaN); (loop as any).advance(Infinity);
    expect(steps).toHaveLength(0);
    (loop as any).advance(2);
    expect(steps).toHaveLength(5); expect(new Set(steps)).toEqual(new Set([1 / 60]));
    expect((loop as any).diagnostics.droppedSteps).toBe(115);
    expect((loop as any).diagnostics.invalidDeltas).toBe(3);
  });
  it('one rAF, idempotent lifecycle, pause/background resets wall clock, stop within callback does not rearm', () => {
    const pending = new Map<number, FrameRequestCallback>(); let id = 0; let ticks = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { pending.set(++id, cb); return id; });
    vi.stubGlobal('cancelAnimationFrame', (i: number) => pending.delete(i));
    const fire = (t: number) => { const [i, cb] = [...pending][0]; pending.delete(i); cb(t); };
    const loop = new GameLoop(() => ticks++);
    loop.start(); loop.start(); expect(pending.size).toBe(1);
    fire(100); fire(100 + 1000 / 30); expect(ticks).toBe(2);
    (loop as any).setPaused(true); fire(10000); expect(ticks).toBe(2);
    (loop as any).setPaused(false); fire(20000); expect(ticks).toBe(2);
    fire(20000 + 1000 / 60); expect(ticks).toBe(3);
    loop.stop(); loop.stop(); expect(pending.size).toBe(0);
    loop.start(); fire(999999); expect(ticks).toBe(3); loop.stop();
    const stopping = new GameLoop(() => stopping.stop());
    stopping.start(); fire(0); fire(20); expect(pending.size).toBe(0);
    (loop as any).dispose(); (loop as any).dispose(); loop.start(); expect(pending.size).toBe(0);
    vi.unstubAllGlobals();
  });
});
