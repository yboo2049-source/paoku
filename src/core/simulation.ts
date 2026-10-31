import type { GameContext } from '../types';
import { CONSTANTS } from '../types';
import type { PhysicsStepStart } from '../types';
import type { RunPhase, SimSnapshot, VersionedRng } from '../types/contracts';
import { InputQueue } from './inputQueue';
import { immutableCopy, interpolateSnapshots } from './snapshot';
import type { CommittedSnapshot } from './snapshot';
import { applyInputAction } from '../systems/input';
import { accumulateScore } from '../systems/scoring';

export function createSeededRng(seed: number): VersionedRng {
  let state = seed >>> 0;
  return {
    algorithmVersion: 'mulberry32-v1',
    get state() { return state; },
    next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
interface SimulationOptions {
  runId: string; seed: number; stepSec?: number; rng?: VersionedRng;
  physics?: (ctx: GameContext, dt: number, stepStart?: PhysicsStepStart) => void;
  afterStep?: (ctx: GameContext, dt: number, rng: VersionedRng) => void;
}

/** Exclusive mutable Context owner. Legacy systems borrow it only during a tick/change. */
export class Simulation {
  readonly queue: InputQueue;
  readonly stepSec: number;
  private context: GameContext;
  private options: SimulationOptions;
  private rng: VersionedRng;
  private runId: string;
  private seed: number;
  private phase: RunPhase = 'RUNNING';
  private currentTick = 0;
  private lastSequence = 0;
  private previous: CommittedSnapshot | null = null;
  private current!: CommittedSnapshot;
  private stepping = false;
  private inputLog: { tick: number; sequence: number; action: string; source: string }[] = [];
  constructor(context: GameContext, options: SimulationOptions) {
    this.context = structuredClone(context); this.options = options;
    this.stepSec = options.stepSec ?? 1 / 60;
    if (!Number.isFinite(this.stepSec) || this.stepSec <= 0 || !options.runId || !Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) throw new Error('Invalid simulation configuration');
    this.seed = options.seed; this.runId = options.runId;
    this.rng = options.rng ?? createSeededRng(this.seed); this.queue = new InputQueue(this.runId);
    this.syncPhase(); this.commit(true);
  }
  get tick(): number { return this.currentTick; }
  get snapshot(): CommittedSnapshot { return this.current; }
  get acceptedInputs() { return immutableCopy(this.inputLog); }
  private syncPhase(): void {
    this.phase = this.context.state === 'PLAYING' ? 'RUNNING' : this.context.state === 'PAUSED' ? 'PAUSED' : this.context.state === 'GAMEOVER' ? 'ENDED' : 'ABANDONED';
    this.queue.setAccepting(this.phase === 'RUNNING');
  }
  private commit(discontinuity = false): void {
    this.previous = discontinuity ? null : this.current ?? null;
    const snapshot: SimSnapshot = {
      contractVersion: 1, runId: this.runId, tick: this.tick, timeSec: this.tick * this.stepSec, stepSec: this.stepSec,
      phase: this.phase, seed: this.seed, rngState: this.rng.state, rngAlgorithmVersion: this.rng.algorithmVersion,
      simulationVersion: 'pao10-fixed-v1', configId: 'legacy-18-45-v1', contentRevision: 'legacy-unseeded-spawner',
      lastInputSequence: this.lastSequence, discontinuity, context: this.context,
    };
    this.current = immutableCopy(snapshot);
  }
  /** Application lifecycle/QA boundary; never pass this capability to presentation. */
  change(change: (ctx: GameContext) => void, discontinuity = true): void {
    change(this.context);
    // Synchronous legacy action listeners borrow the owner inside this tick;
    // they must not expose a half-integrated snapshot.
    if (!this.stepping) { this.syncPhase(); this.commit(discontinuity); }
  }
  setPhase(phase: RunPhase): void {
    this.change(ctx => { ctx.state = phase === 'RUNNING' ? 'PLAYING' : phase === 'PAUSED' ? 'PAUSED' : phase === 'ENDED' ? 'GAMEOVER' : 'MENU'; });
  }
  restart(runId: string, seed: number, context?: GameContext): void {
    if (!runId || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid run identity/seed');
    if (context) this.context = structuredClone(context);
    this.runId = runId; this.seed = seed; this.rng = createSeededRng(seed);
    this.currentTick = 0; this.lastSequence = 0; this.inputLog = [];
    this.queue.reset(runId); this.syncPhase(); this.commit(true);
  }
  step(): void {
    if (this.phase !== 'RUNNING') return;
    this.stepping = true;
    try {
    this.currentTick++;
    for (const command of this.queue.consume(this.tick)) {
      applyInputAction(this.context.player, command.action);
      this.lastSequence = command.sequence; this.inputLog.push({ ...command });
    }
    const ctx = this.context, dt = this.stepSec;
    // A value local to this tick: QA changes/restarts cannot leave a stale sweep origin.
    const stepStart: PhysicsStepStart = { x: ctx.player.x, y: ctx.player.y, z: ctx.player.z };
    ctx.speed = Math.min(ctx.speed + CONSTANTS.ACCELERATION * dt, CONSTANTS.MAX_SPEED);
    const deltaDistanceM = ctx.speed * dt;
    ctx.player.z += deltaDistanceM; ctx.distance += deltaDistanceM;
    ctx.score = accumulateScore(ctx.score, ctx.speed, dt, ctx.player.activePowerUps);
    this.options.physics?.(ctx, dt, stepStart);
    this.options.afterStep?.(ctx, dt, this.rng);
    } finally { this.stepping = false; }
    this.syncPhase(); this.commit();
  }
  presentation(alpha: number): CommittedSnapshot {
    return interpolateSnapshots(this.previous, this.current, alpha);
  }
}
