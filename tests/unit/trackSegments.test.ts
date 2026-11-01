import { describe, it, expect, vi } from 'vitest';
import { Simulation } from '../../src/core/simulation';
import { GameLoop } from '../../src/core/gameLoop';
import { updatePhysics } from '../../src/systems/physics';
import type { GameContext } from '../../src/types';
import { SpawnerSystem } from '../../src/systems/spawner';
import type { ObstacleEntity, CoinEntity, PowerUpEntity } from '../../src/types';

const modules = import.meta.glob(['../../src/systems/track.ts', '../../src/data/trackSegments.ts', '../../src/data/modelBindings.ts'], { eager: true });
function api() {
  const result = Object.assign({}, ...Object.values(modules)) as any;
  expect(result.validateTrackSequence, 'physical track witness validator is missing').toBeTypeOf('function');
  return result;
}
function world() { return { obstacles: [] as ObstacleEntity[], coins: [] as CoinEntity[], powers: [] as PowerUpEntity[] }; }
function initialTrackContext(): GameContext {
  return { state: 'PLAYING', score: 0, coins: 0, totalCoins: 0, highScore: 0, speed: 18, distance: 0,
    player: { lane: 1, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isJumping: false, isRolling: false, rollTimer: 0,
      hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0, activePowerUps: new Map() },
    obstacles: [], coinEntities: [], powerUpEntities: [], missions: [], chase: { distance: 2.8, isNear: false } };
}
function generated(seed: number, steps = [0, 100, 220, 400, 600, 800]) {
  const s = new SpawnerSystem() as any, w = world();
  s.reset('fixed-run', seed);
  const layouts: unknown[] = [];
  for (const z of steps) {
    s.update(z, w.obstacles, w.coins, w.powers);
    layouts.push(structuredClone(w));
  }
  return { layouts, state: s.generationState };
}

describe('PAO-13 seeded track generation and accepted physics witnesses', () => {
  it('uses versioned seeds and reproducible IDs instead of wall-clock random layout', () => {
    const a = generated(13), b = generated(13), c = generated(14);
    expect(a).toEqual(b);
    expect(a.layouts).not.toEqual(c.layouts);
    expect(a.state.contentRevision).toBe('pao13-track-v1');
  });
  it('reset clears cursor/RNG/previous run identity and never reuses a live entity ID', () => {
    const s = new SpawnerSystem() as any, w = world(); s.reset('first', 13);
    s.update(0, w.obstacles, w.coins, w.powers);
    const ids = [...w.obstacles, ...w.coins, ...w.powers].map(x => x.id);
    s.update(40, w.obstacles, w.coins, w.powers);
    expect(new Set([...w.obstacles, ...w.coins, ...w.powers].map(x => x.id)).size).toBe(w.obstacles.length + w.coins.length + w.powers.length);
    s.reset('second', 13); const w2 = world(); s.update(0, w2.obstacles, w2.coins, w2.powers);
    expect([...w2.obstacles, ...w2.coins, ...w2.powers].every(x => !ids.includes(x.id))).toBe(true);
    expect(s.generationState.cursor).toBeGreaterThan(0);
    expect(s.generationState.runId).toBe('second');
  });
  it('has bounded generation on a QA teleport and reclaims full passed obstacle extents', () => {
    const { MAX_SEGMENTS_PER_UPDATE } = api(); const s = new SpawnerSystem() as any, w = world();
    s.update(1e7, w.obstacles, w.coins, w.powers);
    expect(s.generationState.cursor).toBeLessThanOrEqual(MAX_SEGMENTS_PER_UPDATE);
    expect(w.obstacles.length).toBeLessThan(50);
    const long: ObstacleEntity = { id: 'long', type: 'STATIC_TRAIN', lane: 0, x: -3, y: 0, z: 0, width: 2.4, height: 3, depth: 100 };
    const q = world(); q.obstacles.push(long); s.update(40, q.obstacles, q.coins, q.powers);
    expect(q.obstacles).toContain(long);
  });
  it('declares finite ports, speed ranges, stable definitions, route rewards and rhythm stages', () => {
    const { TRACK_SEGMENTS, validateTrackDefinition } = api();
    expect(TRACK_SEGMENTS.length).toBeGreaterThanOrEqual(4);
    for (const d of TRACK_SEGMENTS) {
      expect(validateTrackDefinition(d)).toEqual([]);
      expect(d.entry).toEqual(d.exit);
      expect(d.minSpeed).toBe(18); expect(d.maxSpeed).toBe(45);
    }
    expect(new Set(TRACK_SEGMENTS.map((d: any) => d.definitionId)).size).toBe(TRACK_SEGMENTS.length);
  });
  it.each([18, 30, 45])('runs every segment and adjacent ordered pair through real PAO-12 physics at %sm/s', speed => {
    const { TRACK_SEGMENTS, validateTrackSequence } = api();
    for (const left of TRACK_SEGMENTS) {
      for (const variant of [0, 1, 2, 3, 4, 5, 6, 7]) {
        const single = validateTrackSequence([left], { seed: 13, speed, variant });
        expect(single.ok, JSON.stringify(single)).toBe(true);
      }
      for (const right of TRACK_SEGMENTS) for (let variant = 0; variant < 8; variant++) {
        const pair = validateTrackSequence([left, right], { seed: 13, speed, variant });
        expect(pair.ok, JSON.stringify(pair)).toBe(true);
        expect(pair.steps).toBeGreaterThan(0);
        expect(pair.trace.at(-1).y).toBeCloseTo(0, 6);
      }
    }
  });
  it('actually rises along the ramp, reaches its shared roof and returns to ground without immunity', () => {
    const { TRACK_SEGMENTS, validateTrackSequence } = api();
    const result = validateTrackSequence([TRACK_SEGMENTS.find((d: any) => d.definitionId === 'ramp-truck')], { seed: 13, speed: 45 });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(result.trace.some((p: any) => p.y > 0 && p.y < 3)).toBe(true);
    expect(result.trace.some((p: any) => Math.abs(p.y - 3) < 1e-6)).toBe(true);
    expect(result.trace.at(-1).y).toBe(0);
    expect(result.uncollectedRewardIds).toEqual([]);
  });
  it('rejects geometrically disconnected ports and an invalid ramp/roof common endpoint', () => {
    const { TRACK_SEGMENTS, validateTrackSequence, validateTrackDefinition } = api();
    const bad = structuredClone(TRACK_SEGMENTS.find((d: any) => d.definitionId === 'ramp-truck'));
    bad.obstacles[1].z += 1;
    expect(validateTrackDefinition(bad).some((s: string) => s.includes('endpoint'))).toBe(true);
    const other = structuredClone(TRACK_SEGMENTS[0]); other.entry.height = 3;
    expect(validateTrackSequence([TRACK_SEGMENTS[0], other], { seed: 99, speed: 30 }).ok).toBe(false);
  });
  it('fails blocked routes, embedded rewards, unknown kinds and unattached route rewards with reproduction data', () => {
    const { TRACK_SEGMENTS, validateTrackSequence } = api();
    for (const mutation of ['block', 'embed', 'unknown', 'route']) {
      const bad = structuredClone(TRACK_SEGMENTS[0]);
      if (mutation === 'block') bad.obstacles.push({ localId: 'block', definitionId: 'carriage', type: 'STATIC_TRAIN', lane: 1, z: 70, y: 0, width: 2.4, height: 3, depth: 12 });
      if (mutation === 'embed') bad.rewards[0].y = -1;
      if (mutation === 'unknown') bad.rewards[0].kind = 'JETPACK';
      if (mutation === 'route') bad.rewards[0].routeId = 'missing';
      const result = validateTrackSequence([bad], { seed: 123, speed: 30 });
      expect(result.ok, mutation).toBe(false);
      expect(result.seed).toBe(123); expect(result.definitionIds).toEqual([bad.definitionId]);
      expect(result.reason).toBeTruthy(); expect(Array.isArray(result.commands)).toBe(true);
    }
  });
  it('checks relative moving-train reaction windows, speed support and finite witness work', () => {
    const { TRACK_SEGMENTS, reactionWindowSec, validateTrackSequence } = api();
    expect(reactionWindowSec(90, 45, -15)).toBe(1.5);
    expect(reactionWindowSec(90, 45, 0)).toBe(2);
    expect(validateTrackSequence([TRACK_SEGMENTS[0]], { seed: 1, speed: 46 }).ok).toBe(false);
    const tinyBudget = validateTrackSequence([TRACK_SEGMENTS[0]], { seed: 1, speed: 18, maxSteps: 2 });
    expect(tinyBudget.ok).toBe(false); expect(tinyBudget.reason).toContain('budget');
  });
  it('pins actual GLB semantics and never uses uncalibrated raw dimensions for collision', () => {
    const { MODEL_BINDINGS, TRACK_SEGMENTS, instantiateTrackSegment } = api();
    expect(MODEL_BINDINGS.carriage.modelPath).toContain('train_ramp_or_car.glb');
    expect(MODEL_BINDINGS['ramp-truck'].modelPath).toContain('train_metro.glb');
    for (const binding of Object.values(MODEL_BINDINGS) as any[]) {
      expect(binding.assetCommit).toBe('622e7daa2262015f34e511e59628a3653273994d'); expect(binding.calibration).toBe('UNCALIBRATED');
      expect(binding.fallback).toBe('LEGACY_PRIMITIVES');
    }
    const d = TRACK_SEGMENTS.find((d: any) => d.definitionId === 'ramp-truck');
    const instance = instantiateTrackSegment(d, { runId: 'run', cursor: 5, startZ: 1000, variant: 0 });
    expect(instance.obstacles[0].width).toBe(2.4); expect(instance.obstacles[0].height).toBe(3); expect(instance.obstacles[0].depth).toBe(6);
    expect(instance.obstacles[1].depth).toBe(12);
    expect(instance.visualRoots).toHaveLength(1);
    const root = instance.visualRoots[0];
    expect(root.childEntityIds).toEqual(instance.obstacles.map((x: any) => x.id));
    expect(instance.obstacles.every((x: any) => x.visualRootId === root.id && x.combinationId === root.combinationId)).toBe(true);
    expect(root.commonEndpoint).toEqual({ x: 0, y: 3, z: 1073 });
  });
  it('rejects no-input hurdle witness rather than merely accepting its geometry', () => {
    const { TRACK_SEGMENTS, validateTrackSequence } = api();
    const bad = structuredClone(TRACK_SEGMENTS.find((d: any) => d.definitionId === 'under-over'));
    bad.routes[0].commands = [];
    const result = validateTrackSequence([bad], { seed: 44013, speed: 45 });
    expect(result.ok).toBe(false); expect(result.reason).toContain('collision');
  });
  it('includes all four power-up variants and physically validates effect-carrying adjacent segments', () => {
    const { TRACK_SEGMENTS, TRACK_VARIANTS, instantiateTrackSegment, validateTrackSequence } = api();
    const kinds = new Set();
    for (let variant = 0; variant < TRACK_VARIANTS; variant++) {
      instantiateTrackSegment(TRACK_SEGMENTS[0], { runId: 'powers', cursor: variant, startZ: 0, variant }).powerUps.forEach((p: any) => kinds.add(p.type));
      for (const left of TRACK_SEGMENTS) for (const right of TRACK_SEGMENTS) {
        const result = validateTrackSequence([left, right], { seed: 13, speed: 45, variant });
        expect(result.ok, JSON.stringify({ variant, ...result })).toBe(true);
      }
    }
    expect([...kinds].sort()).toEqual(['DOUBLE_SCORE', 'HOVERBOARD', 'MAGNET', 'SUPER_SNEAKERS']);
  });
  it('prevents mutation of exported active-run content and model binding definitions', () => {
    const { TRACK_SEGMENTS, MODEL_BINDINGS } = api();
    expect(Object.isFrozen(TRACK_SEGMENTS)).toBe(true);
    expect(Object.isFrozen(TRACK_SEGMENTS[0].entry)).toBe(true);
    expect(Object.isFrozen(TRACK_SEGMENTS[2].obstacles[0])).toBe(true);
    expect(Object.isFrozen(MODEL_BINDINGS.carriage)).toBe(true);
  });
  it('rejects a reward placed inside a solid and synthetic immunity cannot rescue an invalid witness', () => {
    const { TRACK_SEGMENTS, validateTrackSequence } = api();
    const bad = structuredClone(TRACK_SEGMENTS[0]);
    bad.obstacles.push({ localId: 'block', definitionId: 'carriage', type: 'STATIC_TRAIN', lane: 1, z: 145, y: 0, width: 2.4, height: 3, depth: 12 });
    expect(validateTrackSequence([bad], { seed: 99013, speed: 45 }).reason).toContain('embedded');
  });
  it('rejects duplicate combination roots, unknown definitions and malformed bounded content', () => {
    const { TRACK_SEGMENTS, validateTrackDefinition, validateTrackSequence } = api();
    const duplicate = structuredClone(TRACK_SEGMENTS[2]);
    duplicate.obstacles.push({ ...duplicate.obstacles[0], localId: 'second-ramp' });
    expect(validateTrackDefinition(duplicate).some((s: string) => s.includes('combination'))).toBe(true);
    const unknown = structuredClone(TRACK_SEGMENTS[2]); unknown.obstacles[0].definitionId = 'guess-by-filename';
    expect(validateTrackDefinition(unknown).some((s: string) => s.includes('definition'))).toBe(true);
    for (const change of ['routes', 'obstacles', 'rewards']) {
      const malformed = structuredClone(TRACK_SEGMENTS[0]); malformed[change] = null;
      expect(validateTrackSequence([malformed], { seed: 13, speed: 30 }).ok).toBe(false);
    }
  });
  it('checks reward occupancy against incoming movement before collection, not only spawn geometry', () => {
    const { TRACK_SEGMENTS, validateTrackSequence } = api();
    const bad = structuredClone(TRACK_SEGMENTS[3]);
    bad.rewards.push({ localId: 'moving-embed', kind: 'COIN', lane: 0, y: 0.8, z: 40, routeId: 'main' });
    expect(validateTrackSequence([bad], { seed: 44113, speed: 18 }).reason).toContain('embedded during movement');
  });
  it('rejects orphan combination children and raw GLB sizes substituted for accepted proxies', () => {
    const { TRACK_SEGMENTS, validateTrackDefinition } = api();
    const orphan = structuredClone(TRACK_SEGMENTS[2]); orphan.obstacles.shift();
    expect(validateTrackDefinition(orphan).some((s: string) => s.includes('combination'))).toBe(true);
    const raw = structuredClone(TRACK_SEGMENTS[2]); raw.obstacles[0].width = 0.9995;
    expect(validateTrackDefinition(raw).some((s: string) => s.includes('logical dimensions'))).toBe(true);
  });
  it('samples 32 seeds across 32 generated segments with bounded metadata and reproducible selection', () => {
    const { TRACK_CONTENT_REVISION } = api();
    const seenDefinitions = new Set(), seenVariants = new Set();
    for (let seed = 0; seed < 32; seed++) {
      const s = new SpawnerSystem() as any, b = new SpawnerSystem() as any;
      s.reset('sample', seed); b.reset('sample', seed);
      const w = world(), wb = world();
      for (let segment = 0; segment < 32; segment++) {
        const z = segment * 160;
        s.update(z, w.obstacles, w.coins, w.powers); b.update(z, wb.obstacles, wb.coins, wb.powers);
        expect(s.activeSegments).toEqual(b.activeSegments);
        expect(s.generationState.contentRevision).toBe(TRACK_CONTENT_REVISION);
        expect(s.activeSegments.length).toBeLessThanOrEqual(3);
        s.activeSegments.forEach((i: any) => { seenDefinitions.add(i.definitionId); seenVariants.add(i.variant); });
      }
    }
    expect(seenDefinitions.size).toBe(4); expect(seenVariants.size).toBe(8);
  });
});

// Core integration cases first ran RED in docs/evidence/PAO-13; they live here
// for final acceptance so the task's test-file whitelist remains explicit.
describe('PAO-13 authoritative generation wiring', () => {
  it('provides the same owned RNG, run, seed, tick and speed to each generation callback', () => {
    let frame: any;
    let callbackRng: any;
    const sim = new Simulation(initialTrackContext(), { runId: 'run-owned', seed: 13,
      afterStep: (_ctx, _dt, rng, nextFrame) => { callbackRng = rng; frame = nextFrame; } });
    sim.step();
    expect(frame, 'generation frame must be supplied by the simulation').toBeDefined();
    expect(frame).toMatchObject({ runId: 'run-owned', seed: 13, tick: 1, speed: sim.snapshot.context.speed });
    expect(frame.rng).toBe(callbackRng);
    expect(frame.rng.state).toBe(sim.snapshot.rngState);
  });

  it('initializes and resets generation before committing a frozen, versioned snapshot', () => {
    const calls: [string, number][] = [];
    let state: any;
    const generation = {
      reset(runId: string, seed: number) {
        calls.push([runId, seed]);
        state = { runId, seed, contentRevision: 'test-track-v1', rngAlgorithmVersion: 'mulberry32-v1',
          rngState: seed, cursor: 0, nextZ: 30, lastTick: 0, stage: 'INTRO', lastSegmentId: null, fallbackCount: 0 };
      }, snapshot: () => state,
    };
    const sim = new Simulation(initialTrackContext(), { runId: 'first', seed: 1, generation });
    expect(calls, 'generation reset must precede initial commit').toEqual([['first', 1]]);
    expect(sim.snapshot.generation).toEqual(state);
    expect(sim.snapshot.contentRevision).toBe('test-track-v1');
    const first = sim.snapshot;
    expect(() => { (sim.snapshot.generation as any).cursor = 100; }).toThrow();
    state.cursor = 5; sim.step();
    expect(sim.snapshot.generation?.cursor).toBe(5);
    expect(first.generation?.cursor).toBe(0);
    sim.restart('second', 2, initialTrackContext());
    expect(calls).toEqual([['first', 1], ['second', 2]]);
    expect(sim.snapshot.generation).toMatchObject({ runId: 'second', seed: 2, cursor: 0, lastTick: 0 });
    expect(sim.snapshot.rngState).toBe(2);
    expect(sim.snapshot.tick).toBe(0);
  });

  it('keeps generation frames deterministic across different display cadences', () => {
    const drive = (cadence: number[]) => {
      const frames: any[] = [];
      const sim = new Simulation(initialTrackContext(), { runId: 'same', seed: 13, physics: updatePhysics,
        afterStep: (_ctx, _dt, rng, frame) => {
          expect(frame).toBeDefined();
          frames.push({ tick: frame.tick, seed: frame.seed, runId: frame.runId, speed: frame.speed, random: rng.next() });
        } });
      sim.queue.enqueue({ runId: 'same', tick: 20, sequence: 1, action: 'JUMP', source: 'REPLAY' }, 0);
      const loop = new GameLoop(() => { if (sim.tick < 120) sim.step(); });
      let index = 0;
      while (sim.tick < 120) loop.advance(cadence[index++ % cadence.length]);
      return { frames, player: sim.snapshot.context.player, rng: sim.snapshot.rngState };
    };
    const reference = drive([1 / 60]);
    for (const cadence of [[1 / 30], [1 / 120], [1 / 240, 1 / 80, 1 / 60]]) expect(drive(cadence)).toEqual(reference);
  });

  it('runs the real spawner inside fixed ticks and reproduces layouts across cadence and restart', () => {
    const setup = () => {
      const spawner = new SpawnerSystem();
      const sim = new Simulation(initialTrackContext(), { runId: 'seeded', seed: 13, physics: updatePhysics,
        generation: { reset: (runId, seed) => spawner.reset(runId, seed), snapshot: () => spawner.generationState },
        afterStep: (ctx, _dt, _rng, frame) => spawner.update(ctx.player.z, ctx.obstacles, ctx.coinEntities, ctx.powerUpEntities, frame),
      });
      return { sim, spawner };
    };
    const drive = (cadence: number[]) => {
      const { sim, spawner } = setup();
      expect(sim.snapshot.generation, 'real generator state must be in the initial snapshot').toBeDefined();
      const loop = new GameLoop(() => { if (sim.tick < 120) sim.step(); });
      let index = 0;
      while (sim.tick < 120) loop.advance(cadence[index++ % cadence.length]);
      expect(sim.snapshot.phase).toBe('RUNNING');
      expect(sim.snapshot.generation!.cursor).toBeGreaterThan(0);
      expect(sim.snapshot.generation!.rngState).toBe(sim.snapshot.rngState);
      expect(sim.snapshot.generation!.lastTick).toBe(sim.tick);
      expect(sim.snapshot.context.coinEntities.length).toBeGreaterThan(0);
      expect(() => { (sim.snapshot.generation as any).cursor++; }).toThrow();
      expect(spawner.generationState.cursor).toBe(sim.snapshot.generation!.cursor);
      return { sim, snapshot: JSON.stringify(sim.snapshot, (_key, value) => value instanceof Map ? [...value] : value) };
    };
    const reference = drive([1 / 60]);
    for (const cadence of [[1 / 30], [1 / 120], [1 / 240, 1 / 80, 1 / 60]]) expect(drive(cadence).snapshot).toBe(reference.snapshot);
    reference.sim.restart('seeded', 13, initialTrackContext());
    expect(reference.sim.snapshot.generation).toMatchObject({ runId: 'seeded', seed: 13, cursor: 0, lastTick: 0 });
    expect(reference.sim.snapshot.context.coinEntities).toEqual([]);
    for (let tick = 0; tick < 120; tick++) reference.sim.step();
    expect(JSON.stringify(reference.sim.snapshot, (_key, value) => value instanceof Map ? [...value] : value)).toBe(reference.snapshot);
    reference.sim.restart('different', 13, initialTrackContext()); reference.sim.step();
    expect(reference.sim.snapshot.context.coinEntities.every(c => c.id.startsWith('different/'))).toBe(true);
  });
});

// Presentation/unrelated services only: the real input queue, clock, physics,
// seeded spawner and app lifecycle remain connected in this assembly test.
vi.mock('@babylonjs/core', () => ({ Vector3: class {} }));
vi.mock('../../src/render/babylon', () => ({ BabylonRenderEngine: class {
  render() {} reset() {} triggerShatterFX() {}
} }));
vi.mock('../../src/ui/dom', () => ({ UIManager: class { update() {} } }));
vi.mock('../../src/systems/audio', () => ({ audioEngine: new Proxy({}, { get: () => () => {} }) }));
vi.mock('../../src/systems/mission', () => ({ missionSystem: {
  initMissions: () => [], resetMissions() {}, update() {}, trackAction() {},
} }));

it('PAO-13 main owns seed metadata and clean start/menu/shop resets without synthetic witness facts', async () => {
  const browser = new EventTarget() as EventTarget & { __GAME_SENSOR__: any };
  const page = Object.assign(new EventTarget(), { hidden: false, body: {}, getElementById: () => null });
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal('window', browser); vi.stubGlobal('document', page);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  const app = await import('../../src/main');
  const { eventBus } = await import('../../src/core/eventBus');
  const sensor = browser.__GAME_SENSOR__;
  const events: { name: string; payload: unknown }[] = [];
  const listeners = ['PLAYER_ACTION', 'COIN_COLLECTED', 'POWERUP_ACTIVATED', 'COLLISION'].map(name => {
    const handler = (payload: unknown) => events.push({ name, payload });
    eventBus.on(name, handler); return () => eventBus.off(name, handler);
  });
  function frame(time: number) {
    const ready = [...frames.values()]; frames.clear(); ready.forEach(callback => callback(time));
  }
  try {
    expect(sensor.getSimulationSnapshot().generation).toMatchObject({ runId: 'podium', cursor: 0 });
    eventBus.emit('START_GAME'); frame(0); frame(1000 / 60);
    const first = sensor.getSimulationSnapshot();
    expect(first.generation).toMatchObject({ runId: first.runId, seed: first.seed, lastTick: first.tick });
    expect(first.generation.cursor).toBeGreaterThan(0);
    expect(first.contentRevision).toBe('pao13-track-v1');
    expect(sensor.getSimulation().generation).toEqual(first.generation);
    expect(first.context.coinEntities.every((coin: any) => coin.id.startsWith(first.runId + '/'))).toBe(true);
    expect(events, 'offline physical witnesses must not publish synthetic gameplay facts during generation').toEqual([]);
    const normalize = (snapshot: any) => JSON.stringify(snapshot.context.coinEntities).replaceAll(snapshot.runId + '/', 'RUN/');
    eventBus.emit('GO_MENU');
    const menu = sensor.getSimulationSnapshot();
    expect(menu.context.state).toBe('MENU');
    expect(menu.generation).toMatchObject({ runId: menu.runId, seed: menu.seed, cursor: 0 });
    expect(menu.context.obstacles).toEqual([]); expect(menu.context.coinEntities).toEqual([]);
    eventBus.emit('START_GAME'); frame(100); frame(100 + 1000 / 60);
    const second = sensor.getSimulationSnapshot();
    expect(second.runId).not.toBe(first.runId);
    expect(second.generation).toMatchObject({ runId: second.runId, seed: second.seed, lastTick: second.tick });
    expect(normalize(second)).toEqual(normalize(first));
    expect(second.context.coinEntities.every((coin: any) => coin.id.startsWith(second.runId + '/'))).toBe(true);
    eventBus.emit('OPEN_SHOP');
    const shop = sensor.getSimulationSnapshot();
    expect(shop.context.state).toBe('SHOP');
    expect(shop.generation).toMatchObject({ runId: shop.runId, seed: shop.seed, cursor: 0 });
    expect(shop.context.obstacles).toEqual([]); expect(shop.context.coinEntities).toEqual([]);
  } finally {
    listeners.forEach(unsubscribe => unsubscribe()); app.disposeGame(); vi.unstubAllGlobals();
  }
});
