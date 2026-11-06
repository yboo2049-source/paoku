import type { GameContext } from '../types';
import { CONSTANTS } from '../types';
import type { TrackGenerationFrame, TrackGenerationState } from '../types';
import type { PhysicsStepStart } from '../types';
import type { RunPhase, SimSnapshot, VersionedRng } from '../types/contracts';
import type { AppliedAction, MotionBatch, MotionCursor, MotionDraft, MotionFact, MotionRead, MotionSink, MotionStamp } from '../types/contracts';
import { InputQueue } from './inputQueue';
import { immutableCopy, interpolateSnapshots } from './snapshot';
import type { CommittedSnapshot } from './snapshot';
import { applyInputAction } from '../systems/input';
import { accumulateScore } from '../systems/scoring';
import { awardMissionReward, initializeRunLedger } from '../systems/runSettlement';

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
  physics?: (ctx: GameContext, dt: number, stepStart?: PhysicsStepStart, motion?: MotionSink) => void;
  motionMode?: 'legacy' | 'committed-motion-v1';
  onAppliedAction?: (ctx: GameContext, action: AppliedAction) => void;
  onMotionDraft?: (draft: MotionDraft, ordinal: number) => void;
  afterStep?: (ctx: GameContext, dt: number, rng: VersionedRng, frame: TrackGenerationFrame) => void;
  generation?: {
    reset(runId: string, seed: number): void;
    snapshot(): TrackGenerationState | undefined;
  };
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
  private abandoned = false;
  private currentTick = 0;
  private lastSequence = 0;
  private previous: CommittedSnapshot | null = null;
  private current!: CommittedSnapshot;
  private stepping = false;
  private streamEpoch = 1;
  private eventSequence = 0;
  private journal: readonly MotionBatch[] = [];
  private floorSequence = 0;
  private floorTick = 0;
  private faultTick: number | null = null;
  private legacyRewardSequence = 0;
  private inputLog: { tick: number; sequence: number; action: string; source: string }[] = [];
  constructor(context: GameContext, options: SimulationOptions) {
    this.context = structuredClone(context); this.options = options;
    initializeRunLedger(this.context);
    this.stepSec = options.stepSec ?? 1 / 60;
    if (!Number.isFinite(this.stepSec) || this.stepSec <= 0 || !options.runId || !Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) throw new Error('Invalid simulation configuration');
    this.seed = options.seed; this.runId = options.runId;
    this.rng = options.rng ?? createSeededRng(this.seed); this.queue = new InputQueue(this.runId);
    this.options.generation?.reset(this.runId, this.seed);
    this.syncPhase(); this.commit(true);
  }
  get tick(): number { return this.currentTick; }
  get snapshot(): CommittedSnapshot { return this.current; }
  get acceptedInputs() { return immutableCopy(this.inputLog); }
  get committedMotion(): boolean { return this.options.motionMode === 'committed-motion-v1'; }
  get faulted(): boolean { return this.faultTick !== null; }
  get motionDiagnostics() { return immutableCopy({ batches: this.journal.length,
    events: this.journal.reduce((n, b) => n + b.events.length, 0), floorSequence: this.floorSequence,
    floorTick: this.floorTick, faultTick: this.faultTick }); }
  motionCursor(): MotionCursor {
    return Object.freeze({ runId: this.current.runId, ...this.current.motionStamp! });
  }
  readMotionFacts(after: MotionCursor | null, stamp: MotionStamp): MotionRead {
    const through = this.motionCursor();
    if (this.faulted) return immutableCopy({ status: 'FAULT', through, failedTick: this.faultTick! });
    if (!after) return immutableCopy({ status: 'REBASE', through, reason: 'BASELINE' });
    if (after.runId !== through.runId || after.streamEpoch !== through.streamEpoch || stamp.streamEpoch !== through.streamEpoch)
      return immutableCopy({ status: 'REBASE', through, reason: 'WORLD_BOUNDARY' });
    const end = stamp.throughTick === through.throughTick ? through : this.journal.find(b => b.tick === stamp.throughTick);
    const endSequence = end?.throughSequence;
    const validNumbers = [after.throughTick, after.throughSequence, stamp.throughTick, stamp.throughSequence].every(n => Number.isSafeInteger(n) && n >= 0);
    if (!validNumbers || !end || endSequence !== stamp.throughSequence || after.throughTick > stamp.throughTick || after.throughSequence > stamp.throughSequence ||
      after.throughSequence > through.throughSequence || after.throughTick > through.throughTick)
      return immutableCopy({ status: 'REBASE', through, reason: 'INVALID_CURSOR' });
    if (after.throughSequence < this.floorSequence) return immutableCopy({ status: 'GAP', through,
      fromSequence: after.throughSequence + 1, toSequence: this.floorSequence,
      lostCount: this.floorSequence - after.throughSequence, floorTick: this.floorTick });
    const startBatch = this.journal.find(b => b.tick === after.throughTick);
    if (startBatch && startBatch.throughSequence !== after.throughSequence ||
      !startBatch && after.throughSequence !== this.floorSequence && after.throughSequence !== through.throughSequence)
      return immutableCopy({ status: 'REBASE', through, reason: 'INVALID_CURSOR' });
    return immutableCopy({ status: 'OK', through: { runId: through.runId, ...stamp },
      batches: this.journal.filter(b => b.tick > after.throughTick && b.tick <= stamp.throughTick) });
  }
  private boundary(): void {
    if (!this.committedMotion) return;
    if (!Number.isSafeInteger(this.streamEpoch + 1)) throw new Error('Motion epoch exhausted');
    this.streamEpoch++; this.journal = []; this.floorSequence = this.eventSequence; this.floorTick = this.tick;
  }
  private assertOwnerBoundary(): void {
    if (this.committedMotion && (this.stepping || this.faulted)) throw new Error('Motion world is stepping or faulted');
  }
  private syncPhase(): void {
    this.phase = this.abandoned ? 'ABANDONED' : this.context.state === 'PLAYING' ? 'RUNNING' : this.context.state === 'PAUSED' ? 'PAUSED' : this.context.state === 'GAMEOVER' ? 'ENDED' : 'ABANDONED';
    this.queue.setAccepting(this.phase === 'RUNNING');
  }
  private commit(discontinuity = false, drafts?: readonly MotionDraft[], count = 0): void {
    const nextSequence = this.eventSequence + count;
    if (!Number.isSafeInteger(nextSequence)) throw new Error('Motion sequence exhausted');
    const batch: MotionBatch | undefined = drafts && count <= 64 ? immutableCopy({
      profile: 'pao18-motion-v1', contractVersion: 1, runId: this.runId, streamEpoch: this.streamEpoch,
      tick: this.tick, timeSec: this.tick * this.stepSec, stepSec: this.stepSec, previousSequence: this.eventSequence,
      throughSequence: nextSequence, complete: true,
      events: drafts.map((draft, i): MotionFact => ({ ...draft, profile: 'pao18-motion-v1', contractVersion: 1,
        runId: this.runId, tick: this.tick, sequence: this.eventSequence + i + 1,
        eventId: `${this.runId}:${this.tick}:${this.eventSequence + i + 1}`, timeSec: this.tick * this.stepSec })),
    }) : undefined;
    const generation = this.options.generation?.snapshot();
    const snapshot: SimSnapshot = {
      contractVersion: 1, runId: this.runId, tick: this.tick, timeSec: this.tick * this.stepSec, stepSec: this.stepSec,
      phase: this.phase, seed: this.seed, rngState: this.rng.state, rngAlgorithmVersion: this.rng.algorithmVersion,
      simulationVersion: 'pao10-fixed-v1', configId: 'legacy-18-45-v1',
      contentRevision: generation?.contentRevision ?? 'legacy-unseeded-spawner',
      ...(generation ? { generation } : {}),
      lastInputSequence: this.lastSequence, discontinuity, context: this.context,
      ...(this.committedMotion ? { motionStamp: { streamEpoch: this.streamEpoch, throughTick: this.tick, throughSequence: nextSequence } } : {}),
    };
    const next = immutableCopy(snapshot);
    // No callbacks between preparing immutable values and publishing both sides.
    this.previous = discontinuity ? null : this.current ?? null;
    if (drafts && this.committedMotion) {
      if (count > 64) { this.journal = []; this.floorSequence = nextSequence; this.floorTick = this.tick; }
      else if (batch) {
        const journal = [...this.journal, batch];
        let events = journal.reduce((n, b) => n + b.events.length, 0);
        while (journal.length > 256 || events > 1024) {
          const removed = journal.shift()!; events -= removed.events.length;
          this.floorSequence = removed.throughSequence; this.floorTick = removed.tick;
        }
        this.journal = journal;
      }
    }
    this.eventSequence = nextSequence; this.current = next;
  }
  /** Application lifecycle/QA boundary; never pass this capability to presentation. */
  change(change: (ctx: GameContext) => void, discontinuity = true): void {
    this.assertOwnerBoundary();
    // Compatibility for existing privileged owner/QA callers only. The actual
    // context and every published snapshot keep coins as the derived read view.
    // A legacy positive increment is explicitly a reward, never a pickup fact.
    const ownerView = new Proxy(this.context, { set: (ctx, key, value) => {
      if (key !== 'coins') return Reflect.set(ctx, key, value);
      const delta = typeof value === 'number' ? value - ctx.coins : Number.NaN;
      if (!Number.isSafeInteger(value) || !Number.isSafeInteger(delta) || delta <= 0) {
        throw new Error('Legacy owner coin mutations must be positive safe integer rewards');
      }
      awardMissionReward(ctx, `legacy-owner:${++this.legacyRewardSequence}`, delta);
      return true;
    } });
    change(ownerView);
    // Synchronous legacy action listeners borrow the owner inside this tick;
    // they must not expose a half-integrated snapshot.
    if (!this.stepping) { if (discontinuity) this.boundary(); this.syncPhase(); this.commit(discontinuity); }
  }
  setPhase(phase: RunPhase): void {
    this.change(ctx => { ctx.state = phase === 'RUNNING' ? 'PLAYING' : phase === 'PAUSED' ? 'PAUSED' : phase === 'ENDED' ? 'GAMEOVER' : 'MENU'; }, !this.committedMotion);
  }
  /** Quit lifecycle boundary: preserve final world/accounting for save retries. */
  abandon(): void {
    this.assertOwnerBoundary(); this.boundary();
    this.abandoned = true;
    this.context.state = 'GAMEOVER';
    this.syncPhase();
    this.commit(true);
  }
  restart(runId: string, seed: number, context?: GameContext): void {
    if (this.committedMotion && this.stepping) throw new Error('Cannot restart inside step');
    if (this.faulted && !context) throw new Error('Fault recovery requires fresh context');
    if (!runId || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid run identity/seed');
    if (context) this.context = structuredClone(context);
    this.faultTick = null;
    this.currentTick = 0; // The new epoch's retention floor belongs to the new run.
    this.boundary();
    initializeRunLedger(this.context);
    this.abandoned = false;
    this.runId = runId; this.seed = seed; this.rng = createSeededRng(seed);
    this.lastSequence = 0; this.inputLog = []; this.legacyRewardSequence = 0;
    this.options.generation?.reset(this.runId, this.seed);
    this.queue.reset(runId); this.syncPhase(); this.commit(true);
  }
  step(): void {
    if (this.committedMotion && this.stepping) throw new Error('Nested simulation step');
    if (this.faulted) return;
    if (this.phase !== 'RUNNING') return;
    this.stepping = true;
    const drafts: MotionDraft[] = []; let count = 0; let live = true;
    const record = (draft: MotionDraft) => {
      if (!live || !this.stepping) throw new Error('Expired motion producer');
      const copy = immutableCopy(draft); count++;
      if (count <= 64) drafts.push(copy);
      this.options.onMotionDraft?.(copy, count);
    };
    try {
    if (this.committedMotion && !Number.isSafeInteger(this.currentTick + 1)) throw new Error('Motion tick exhausted');
    this.currentTick++;
    for (const command of this.queue.consume(this.tick)) {
      applyInputAction(this.context.player, command.action, this.committedMotion ? action => {
        record({ type: 'ACTION_STARTED', payload: { ...action, inputTick: command.tick,
          inputSequence: command.sequence, source: command.source,
          actionInstanceId: `${this.runId}/${this.streamEpoch}/action/${command.tick}/${command.sequence}` } });
        this.options.onAppliedAction?.(this.context, action);
      } : undefined);
      this.lastSequence = command.sequence; this.inputLog.push({ ...command });
    }
    const ctx = this.context, dt = this.stepSec;
    // A value local to this tick: QA changes/restarts cannot leave a stale sweep origin.
    const stepStart: PhysicsStepStart = { x: ctx.player.x, y: ctx.player.y, z: ctx.player.z };
    ctx.speed = Math.min(ctx.speed + CONSTANTS.ACCELERATION * dt, CONSTANTS.MAX_SPEED);
    const deltaDistanceM = ctx.speed * dt;
    ctx.player.z += deltaDistanceM; ctx.distance += deltaDistanceM;
    ctx.score = accumulateScore(ctx.score, ctx.speed, dt, ctx.player.activePowerUps);
    this.options.physics?.(ctx, dt, stepStart, this.committedMotion ? { landed: payload => record({ type: 'PLAYER_LANDED', payload }) } : undefined);
    this.options.afterStep?.(ctx, dt, this.rng, {
      runId: this.runId, seed: this.seed, rng: this.rng, tick: this.tick, speed: ctx.speed,
    });
    this.syncPhase(); this.commit(false, this.committedMotion ? drafts : undefined, count);
    } catch (error) {
      if (this.committedMotion) { this.faultTick = this.currentTick; this.queue.setAccepting(false); }
      throw error;
    } finally { live = false; this.stepping = false; }
  }
  presentation(alpha: number): CommittedSnapshot {
    return interpolateSnapshots(this.previous, this.current, alpha);
  }
}
