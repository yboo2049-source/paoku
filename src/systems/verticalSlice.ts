import { AppService } from '../application/appService';
import { SaveRepository, type SaveStorage } from '../application/saveRepository';
import { eventBus } from '../core/eventBus';
import { Simulation } from '../core/simulation';
import type { GameContext, PowerUpType } from '../types';
import { CONSTANTS } from '../types';
import { AudioEngine, type AudioDiagnostics } from './audio';
import { FeedbackLifecycleController } from './feedbackLifecycle';
import { missionSystem } from './mission';
import { resetPhysicsContacts, updatePhysics } from './physics';
import { createRunSummary } from './runSettlement';
import { spawnerSystem } from './spawner';

export const VERTICAL_SLICE_ID = 'pao21-m2-vertical-slice-v1' as const;

export type VerticalSlicePhase =
  | 'START_AND_LANE_CHANGE'
  | 'JUMP_LOW_AND_ROLL_HIGH'
  | 'RAMP_ROOF_TRAVERSAL_AND_DROP'
  | 'ONCOMING_TRAIN_DODGE'
  | 'POWERUP_PICKUP_ACTIVE_AND_EXPIRY'
  | 'TERMINAL_COLLISION_SETTLEMENT_AND_RESTART';

export interface VerticalSliceOptions {
  readonly seed?: number;
  readonly durationSec?: number;
  readonly includeTerminalCollision?: boolean;
}

export interface VerticalSliceReport {
  readonly version: typeof VERTICAL_SLICE_ID;
  readonly ok: boolean;
  readonly totalTicks: number;
  readonly simulatedDurationSec: number;
  readonly phasesCompleted: readonly string[];
  readonly maxHeightY: number;
  readonly roofTicks: number;
  readonly coinsCollected: number;
  readonly missionRewards: number;
  readonly powerUpsActivated: readonly PowerUpType[];
  readonly powerUpsExpired: readonly PowerUpType[];
  readonly shieldShattered: boolean;
  readonly oncomingTrainsDodged: number;
  readonly motionFactsCount: number;
  readonly settlementCommitted: boolean;
  readonly restartSucceeded: boolean;
  readonly audioDiagnosticsAfterReset: AudioDiagnostics;
}

class MemorySaveStorage implements SaveStorage {
  private readonly store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function createInitialContext(): GameContext {
  return {
    state: 'MENU',
    score: 0,
    highScore: 0,
    coins: 0,
    totalCoins: 0,
    speed: CONSTANTS.BASE_SPEED,
    distance: 0,
    player: {
      lane: 1,
      x: 0,
      targetX: 0,
      y: 0,
      z: 0,
      vy: 0,
      isJumping: false,
      isRolling: false,
      rollTimer: 0,
      hasHoverboard: false,
      hoverboardActive: false,
      invulnerableTimer: 0,
      activePowerUps: new Map(),
    },
    obstacles: [],
    coinEntities: [],
    powerUpEntities: [],
    missions: missionSystem.initMissions(),
    chase: { distance: 2.8, isNear: false },
  };
}

function ensureHeadlessAudioContext(): () => void {
  const g = globalThis as any;
  const hadWindow = typeof g.window !== 'undefined';
  const prevWindow = g.window;
  if (hadWindow && (g.window.AudioContext || g.window.webkitAudioContext)) {
    return () => {};
  }

  class HeadlessParam {
    value = 0;
    setValueAtTime(): void {}
    exponentialRampToValueAtTime(): void {}
    setTargetAtTime(): void {}
    cancelScheduledValues(): void {}
  }

  class HeadlessNode {
    connect(): void {}
    disconnect(): void {}
  }

  class HeadlessOscillator extends HeadlessNode {
    type = 'sine';
    frequency = new HeadlessParam();
    onended: (() => void) | null = null;
    start(): void {}
    stop(): void {}
  }

  class HeadlessGain extends HeadlessNode {
    gain = new HeadlessParam();
  }

  class HeadlessFilter extends HeadlessNode {
    type = 'lowpass';
    Q = new HeadlessParam();
    frequency = new HeadlessParam();
  }

  class HeadlessCompressor extends HeadlessNode {
    threshold = new HeadlessParam();
    knee = new HeadlessParam();
    ratio = new HeadlessParam();
    attack = new HeadlessParam();
    release = new HeadlessParam();
  }

  class HeadlessPanner extends HeadlessNode {
    pan = new HeadlessParam();
  }

  class HeadlessBufferSource extends HeadlessNode {
    buffer: unknown = null;
    playbackRate = new HeadlessParam();
    onended: (() => void) | null = null;
    start(): void {}
    stop(): void {}
  }

  class HeadlessAudioContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 44100;
    destination = {};
    createGain = () => new HeadlessGain();
    createOscillator = () => new HeadlessOscillator();
    createBiquadFilter = () => new HeadlessFilter();
    createDynamicsCompressor = () => new HeadlessCompressor();
    createStereoPanner = () => new HeadlessPanner();
    createBufferSource = () => new HeadlessBufferSource();
    createBuffer = (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    });
    resume = () => Promise.resolve();
  }

  if (!hadWindow) {
    g.window = { AudioContext: HeadlessAudioContext };
    return () => {
      g.window = prevWindow;
    };
  }
  const prevAudioContext = g.window.AudioContext;
  g.window.AudioContext = HeadlessAudioContext;
  return () => {
    g.window.AudioContext = prevAudioContext;
  };
}

/**
 * PAO-21: Complete 60-90s playable vertical slice witness across all 6 M2 gameplay phases.
 */
export function runVerticalSliceWitness(options?: VerticalSliceOptions): VerticalSliceReport {
  const restoreAudioCtx = ensureHeadlessAudioContext();
  const seed = options?.seed ?? 0x50414f21;
  const durationSec = options?.durationSec ?? 65;
  const includeTerminalCollision = options?.includeTerminalCollision !== false;
  const stepSec = 1 / 60;
  const targetTicks = Math.max(1500, Math.round(durationSec / stepSec));

  const storage = new MemorySaveStorage();
  const repository = new SaveRepository(storage, async (work) => work());
  let runSeq = 0;
  const appService = new AppService(repository, () => `vs-run-${++runSeq}`);
  const initPromise = appService.initialize();

  // START_RUN executes synchronously when no storage transaction is pending
  let firstRunId = 'vs-run-1';
  void appService.dispatch({ commandId: 'vs-start', type: 'START_RUN' });
  if (appService.snapshot.activeRunId) {
    firstRunId = appService.snapshot.activeRunId;
  }

  const audio = new AudioEngine(false);
  const feedback = new FeedbackLifecycleController();

  const phasesCompleted: VerticalSlicePhase[] = [];
  const powerUpsActivated: PowerUpType[] = [];
  const powerUpsExpired: PowerUpType[] = [];

  let maxHeightY = 0;
  let roofTicks = 0;
  let shieldShattered = false;
  let oncomingTrainsDodged = 0;
  let motionFactsCount = 0;
  let actionStartedCount = 0;
  let landedGroundAfterRoof = false;
  let sawRampAscent = false;
  let clearedLowJump = false;
  let clearedHighRoll = false;
  let sawTrainWarning = false;
  let sawTrainPassed = false;
  let dodgedOncoming = false;

  const unsubscribeCoin = () => eventBus.off('COIN_COLLECTED', onCoin);
  const unsubscribePowerUp = () => eventBus.off('POWERUP_ACTIVATED', onPowerUp);
  const unsubscribeShatter = () => eventBus.off('HOVERBOARD_SHIELD_SHATTER', onShatter);
  const unsubscribeMission = () => eventBus.off('MISSION_COMPLETED', onMission);
  const unsubscribeCollision = () => eventBus.off('COLLISION', onCollision);

  function onCoin(): void {
    audio.playCoin();
  }
  function onPowerUp(payload: { type: PowerUpType }): void {
    if (payload?.type && !powerUpsActivated.includes(payload.type)) {
      powerUpsActivated.push(payload.type);
    }
    audio.playPowerUp();
  }
  function onShatter(): void {
    shieldShattered = true;
    audio.playShieldBreak();
  }
  function onMission(): void {
    audio.playMissionComplete();
  }
  function onCollision(): void {
    audio.playCrash();
  }

  eventBus.on('COIN_COLLECTED', onCoin);
  eventBus.on('POWERUP_ACTIVATED', onPowerUp);
  eventBus.on('HOVERBOARD_SHIELD_SHATTER', onShatter);
  eventBus.on('MISSION_COMPLETED', onMission);
  eventBus.on('COLLISION', onCollision);

  const initialContext = createInitialContext();
  initialContext.state = 'PLAYING';

  const sim = new Simulation(initialContext, {
    runId: firstRunId,
    seed,
    stepSec,
    motionMode: 'committed-motion-v1',
    physics: (ctx, dt, stepStart, motion) => updatePhysics(ctx, dt, undefined, stepStart, motion),
    onAppliedAction: (ctx, action) => {
      if (action.action === 'JUMP' || action.action === 'ROLL') {
        missionSystem.trackAction(ctx.missions, action.action);
      }
      if (action.action === 'JUMP') audio.playJump();
      else if (action.action === 'ROLL') audio.playRoll();
      else if (action.action === 'CHANGE_LANE') {
        audio.playLaneChange(action.toLane > action.fromLane ? 1 : -1);
      }
    },
    onMotionDraft: (draft) => {
      motionFactsCount++;
      if (draft.type === 'ACTION_STARTED') {
        actionStartedCount++;
      } else if (draft.type === 'PLAYER_LANDED') {
        if (roofTicks > 0 && draft.payload.surfaceKind === 'GROUND') {
          landedGroundAfterRoof = true;
        }
        audio.playLanding();
      }
    },
    afterStep: (ctx) => {
      for (let i = ctx.obstacles.length - 1; i >= 0; i--) {
        if (ctx.obstacles[i].z + ctx.obstacles[i].depth / 2 < ctx.player.z - 25) {
          ctx.obstacles.splice(i, 1);
        }
      }
      for (let i = ctx.coinEntities.length - 1; i >= 0; i--) {
        if (ctx.coinEntities[i].z < ctx.player.z - 15) {
          ctx.coinEntities.splice(i, 1);
        }
      }
      for (let i = ctx.powerUpEntities.length - 1; i >= 0; i--) {
        if (ctx.powerUpEntities[i].z < ctx.player.z - 15) {
          ctx.powerUpEntities.splice(i, 1);
        }
      }
      missionSystem.update(ctx, true);

      const isChasingNear = ctx.player.invulnerableTimer > 0;
      const chaseDistance = isChasingNear ? 1.5 : 2.8;
      if (ctx.chase.isNear !== isChasingNear) {
        ctx.chase.isNear = isChasingNear;
        ctx.chase.distance = chaseDistance;
        eventBus.emit('CHASE_STATE_CHANGED', { distance: chaseDistance, isNear: isChasingNear });
      } else {
        ctx.chase.distance = chaseDistance;
      }
    },
    generation: {
      reset: (id, s) => spawnerSystem.reset(id, s),
      snapshot: () => spawnerSystem.generationState,
    },
  });

  audio.startBGM();

  try {
    for (let nextTick = 1; nextTick <= targetTicks; nextTick++) {
      // === Phase 1: START_AND_LANE_CHANGE (ticks 1..60) ===
      if (nextTick === 5) {
        sim.queue.collect('LEFT', 'QA', sim.tick);
      } else if (nextTick === 30) {
        sim.queue.collect('RIGHT', 'QA', sim.tick);
      } else if (nextTick === 55) {
        if (sim.snapshot.context.player.lane === 1 && actionStartedCount >= 2) {
          phasesCompleted.push('START_AND_LANE_CHANGE');
        }
      }

      // === Phase 2: JUMP_LOW_AND_ROLL_HIGH (ticks 61..210) ===
      if (nextTick === 70) {
        sim.change((ctx) => {
          ctx.obstacles.push({
            id: 'vs-low-1',
            type: 'LOW_OBSTACLE',
            lane: 1,
            x: CONSTANTS.LANE_X[1],
            y: 0,
            z: ctx.player.z + ctx.speed * 0.28,
            width: 2.2,
            height: 1.0,
            depth: 0.5,
          });
        }, false);
        sim.queue.collect('JUMP', 'QA', sim.tick);
      } else if (nextTick === 140) {
        sim.change((ctx) => {
          ctx.obstacles.push({
            id: 'vs-high-1',
            type: 'HIGH_OBSTACLE',
            lane: 1,
            x: CONSTANTS.LANE_X[1],
            y: 1.2,
            z: ctx.player.z + ctx.speed * 0.25,
            width: 2.2,
            height: 1.8,
            depth: 0.5,
          });
        }, false);
        sim.queue.collect('ROLL', 'QA', sim.tick);
      } else if (nextTick === 205) {
        if (clearedLowJump && clearedHighRoll && sim.snapshot.phase === 'RUNNING') {
          phasesCompleted.push('JUMP_LOW_AND_ROLL_HIGH');
        }
      }

      // === Phase 3: RAMP_ROOF_TRAVERSAL_AND_DROP (ticks 220..375) ===
      if (nextTick === 220) {
        sim.change((ctx) => {
          spawnerSystem.spawnPattern(
            ctx.player.z - 55,
            ctx.obstacles,
            ctx.coinEntities,
            ctx.powerUpEntities,
            'ZigZag_Trains'
          );
        }, false);
      } else if (nextTick === 375) {
        if (sawRampAscent && roofTicks > 0 && landedGroundAfterRoof) {
          phasesCompleted.push('RAMP_ROOF_TRAVERSAL_AND_DROP');
        }
      }

      // === Phase 4: ONCOMING_TRAIN_DODGE (ticks 385..545) ===
      if (nextTick === 385) {
        sim.change((ctx) => {
          ctx.obstacles.push({
            id: 'vs-oncoming-train-1',
            type: 'MOVING_TRAIN',
            lane: 1,
            x: CONSTANTS.LANE_X[1],
            y: 0,
            z: ctx.player.z + 65,
            width: 2.4,
            height: 3.0,
            depth: 12.0,
            speedZ: -12,
          });
        }, false);
      } else if (nextTick === 520) {
        if (sim.snapshot.context.player.lane !== 1) {
          sim.queue.collect('RIGHT', 'QA', sim.tick);
        }
      } else if (nextTick === 545) {
        if (sawTrainWarning && sawTrainPassed && oncomingTrainsDodged >= 1) {
          phasesCompleted.push('ONCOMING_TRAIN_DODGE');
        }
      }

      // === Phase 5: POWERUP_PICKUP_ACTIVE_AND_EXPIRY (ticks 560..1450) ===
      if (nextTick === 560) {
        sim.change((ctx) => {
          const baseZ = ctx.player.z;
          const types: PowerUpType[] = ['MAGNET', 'DOUBLE_SCORE', 'SUPER_SNEAKERS', 'HOVERBOARD'];
          types.forEach((type, idx) => {
            ctx.powerUpEntities.push({
              id: `vs-pu-${type}-${idx}`,
              type,
              lane: 1,
              x: CONSTANTS.LANE_X[1],
              y: 0.8,
              z: baseZ + 2.5 + idx * 3.0,
              collected: false,
            });
          });
          // Off-lane coins attracted by MAGNET
          for (let i = 0; i < 34; i++) {
            const lane = i % 2 === 0 ? 0 : 2;
            ctx.coinEntities.push({
              id: `vs-mag-coin-${i}`,
              lane,
              x: CONSTANTS.LANE_X[lane],
              y: 0.8,
              z: baseZ + 8 + i * 2.2,
              collected: false,
            });
          }
        }, false);
      } else if (nextTick === 640) {
        // Refresh MAGNET while active to trigger POWERUP_REFRESHED
        sim.change((ctx) => {
          ctx.powerUpEntities.push({
            id: 'vs-pu-magnet-refresh',
            type: 'MAGNET',
            lane: 1,
            x: CONSTANTS.LANE_X[1],
            y: 0.8,
            z: ctx.player.z + 2.0,
            collected: false,
          });
        }, false);
      } else if (nextTick === 660) {
        // Super jump with SUPER_SNEAKERS (1.5x jump velocity)
        sim.queue.collect('JUMP', 'QA', sim.tick);
      } else if (nextTick === 750) {
        // Unjumped obstacle while HOVERBOARD is active -> shield shatter & 1.2s invulnerability
        sim.change((ctx) => {
          ctx.obstacles.push({
            id: 'vs-shield-test-obs',
            type: 'LOW_OBSTACLE',
            lane: 1,
            x: CONSTANTS.LANE_X[1],
            y: 0,
            z: ctx.player.z + 2.5,
            width: 2.2,
            height: 1.0,
            depth: 0.5,
          });
        }, false);
      } else if (nextTick === 1450) {
        if (
          powerUpsActivated.length === 4 &&
          powerUpsExpired.length >= 3 &&
          shieldShattered &&
          sim.snapshot.phase === 'RUNNING'
        ) {
          phasesCompleted.push('POWERUP_PICKUP_ACTIVE_AND_EXPIRY');
        }
      }

      // Additional jumps & rolls on clear track to complete JUMP_TIMES (10) & ROLL_TIMES (8) missions
      if (nextTick >= 1500 && nextTick <= 2200 && nextTick % 80 === 0) {
        sim.queue.collect('JUMP', 'QA', sim.tick);
      } else if (nextTick >= 1540 && nextTick <= 2200 && nextTick % 80 === 40) {
        sim.queue.collect('ROLL', 'QA', sim.tick);
      }

      // === Phase 6: Final tick terminal collision ===
      if (includeTerminalCollision && nextTick === targetTicks) {
        sim.change((ctx) => {
          ctx.player.hoverboardActive = false;
          ctx.player.hasHoverboard = false;
          ctx.player.invulnerableTimer = 0;
          ctx.obstacles.push({
            id: 'vs-terminal-train',
            type: 'STATIC_TRAIN',
            lane: ctx.player.lane,
            x: ctx.player.x,
            y: 0,
            z: ctx.player.z + ctx.speed * stepSec * 0.5,
            width: 2.4,
            height: 3.0,
            depth: 12.0,
          });
        }, false);
      }

      sim.step();

      const snap = sim.snapshot;
      const p = snap.context.player;
      if (p.y > maxHeightY) {
        maxHeightY = p.y;
      }
      if (nextTick >= 70 && nextTick <= 120 && p.y > 1.2) {
        clearedLowJump = true;
      }
      if (nextTick >= 140 && nextTick <= 190 && p.isRolling) {
        clearedHighRoll = true;
      }
      if (nextTick >= 220 && nextTick <= 375) {
        if (p.y > 0.2 && p.y < 2.8 && p.contact === 'SUPPORTED') {
          sawRampAscent = true;
        }
        if (Math.abs(p.y - 3.0) <= 0.05 && p.contact === 'SUPPORTED') {
          roofTicks++;
        }
      }

      const fbSnap = feedback.syncFrame(snap.context, snap.runId, 'PLAYING', audio);
      for (const ev of fbSnap.frameEvents) {
        if (ev.type === 'TRAIN_WARNING' && ev.obstacleId === 'vs-oncoming-train-1') {
          sawTrainWarning = true;
          if (!dodgedOncoming) {
            dodgedOncoming = true;
            sim.queue.collect('LEFT', 'QA', sim.tick);
          }
        } else if (ev.type === 'TRAIN_PASSED' && ev.obstacleId === 'vs-oncoming-train-1') {
          sawTrainPassed = true;
          oncomingTrainsDodged++;
        } else if (ev.type === 'POWERUP_EXPIRED' && ev.powerUpType) {
          if (!powerUpsExpired.includes(ev.powerUpType)) {
            powerUpsExpired.push(ev.powerUpType);
          }
        }
      }
    }

    const terminalSnapshot = sim.snapshot;
    const coinsCollected = terminalSnapshot.context.runLedger?.pickupCount ?? 0;
    const missionRewards = terminalSnapshot.context.runLedger?.rewardCoins ?? 0;

    let settlementCommitted = false;
    let restartSucceeded = false;
    let asyncChain: Promise<VerticalSliceReport> | null = null;

    if (includeTerminalCollision && terminalSnapshot.phase === 'ENDED') {
      const summary = createRunSummary(terminalSnapshot, 'COLLISION');

      // Kick off real AppService settlement, duplicate idempotent finish, and RESTART_RUN
      const pFinish1 = appService.finish(summary);
      const pFinish2 = appService.finish(summary);
      const pRestart = appService.dispatch({
        commandId: 'vs-restart',
        type: 'RESTART_RUN',
        runId: firstRunId,
        summary,
      });

      const freshContext = createInitialContext();
      resetPhysicsContacts(freshContext.player);
      freshContext.state = 'PLAYING';
      missionSystem.resetMissions(freshContext.missions);

      const nextRunId = 'vs-run-2';
      sim.restart(nextRunId, seed, freshContext);
      feedback.reset(audio);
      audio.resetLifecycle();

      settlementCommitted = summary.earnedCoins === coinsCollected + missionRewards && summary.scoreInt > 0;
      restartSucceeded =
        sim.snapshot.runId === nextRunId &&
        sim.snapshot.phase === 'RUNNING' &&
        sim.snapshot.context.score === 0 &&
        sim.snapshot.context.coins === 0 &&
        audio.getDiagnostics().lifecycleState === 'STOPPED' &&
        !audio.getDiagnostics().isBgmPlaying &&
        !audio.getDiagnostics().hasBgmScheduler &&
        audio.getDiagnostics().activeBgmSourceCount === 0 &&
        !audio.getDiagnostics().isChasing &&
        !audio.getDiagnostics().hasBarkTimer;

      if (settlementCommitted && restartSucceeded) {
        phasesCompleted.push('TERMINAL_COLLISION_SETTLEMENT_AND_RESTART');
      }

      asyncChain = Promise.all([initPromise, pFinish1, pFinish2, pRestart]).then(
        ([, f1, f2, rRestart]) => {
          const committedInRepo =
            f1.ok &&
            f2.ok &&
            f2.idempotent === true &&
            repository.snapshot.settledRunIds.includes(firstRunId) &&
            repository.snapshot.walletCoins === summary.earnedCoins;
          const restartedInApp =
            rRestart.ok &&
            appService.snapshot.appState === 'PLAYING' &&
            appService.snapshot.activeRunId === nextRunId;
          return Object.freeze({
            ...syncReport,
            settlementCommitted: settlementCommitted && committedInRepo,
            restartSucceeded: restartSucceeded && restartedInApp,
            ok: syncReport.ok && committedInRepo && restartedInApp,
          });
        }
      );
    } else {
      feedback.reset(audio);
      audio.resetLifecycle();
    }

    const expectedPhaseCount = includeTerminalCollision ? 6 : 5;
    const audioDiagnosticsAfterReset = audio.getDiagnostics();
    const ok =
      phasesCompleted.length === expectedPhaseCount &&
      maxHeightY > 1.2 &&
      roofTicks > 0 &&
      coinsCollected >= 30 &&
      missionRewards > 0 &&
      powerUpsActivated.length === 4 &&
      powerUpsExpired.length >= 3 &&
      shieldShattered &&
      oncomingTrainsDodged >= 1 &&
      motionFactsCount > 0 &&
      (includeTerminalCollision ? settlementCommitted && restartSucceeded : true) &&
      !audioDiagnosticsAfterReset.isBgmPlaying &&
      !audioDiagnosticsAfterReset.hasBgmScheduler &&
      !audioDiagnosticsAfterReset.isChasing &&
      !audioDiagnosticsAfterReset.hasBarkTimer;

    const syncReport: VerticalSliceReport = Object.freeze({
      version: VERTICAL_SLICE_ID,
      ok,
      totalTicks: targetTicks,
      simulatedDurationSec: Number((targetTicks * stepSec).toFixed(4)),
      phasesCompleted: Object.freeze([...phasesCompleted]),
      maxHeightY,
      roofTicks,
      coinsCollected,
      missionRewards,
      powerUpsActivated: Object.freeze([...powerUpsActivated]),
      powerUpsExpired: Object.freeze([...powerUpsExpired]),
      shieldShattered,
      oncomingTrainsDodged,
      motionFactsCount,
      settlementCommitted,
      restartSucceeded,
      audioDiagnosticsAfterReset,
    });

    if (asyncChain) {
      Object.assign(asyncChain, syncReport);
      return Object.freeze(asyncChain) as unknown as VerticalSliceReport;
    }

    return syncReport;
  } finally {
    unsubscribeCoin();
    unsubscribePowerUp();
    unsubscribeShatter();
    unsubscribeMission();
    unsubscribeCollision();
    restoreAudioCtx();
  }
}
