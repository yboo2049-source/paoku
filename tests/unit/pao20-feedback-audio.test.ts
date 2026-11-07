import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventBus } from '../../src/core/eventBus';
import { AudioEngine } from '../../src/systems/audio';
import { FeedbackLifecycleController } from '../../src/systems/feedbackLifecycle';
import type { GameContext } from '../../src/types';
import { CONSTANTS } from '../../src/types';

class MockParam {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class MockNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillator extends MockNode {
  type = 'sine';
  frequency = new MockParam();
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

class MockGain extends MockNode {
  gain = new MockParam();
}

class MockFilter extends MockNode {
  type = 'lowpass';
  Q = new MockParam();
  frequency = new MockParam();
}

class MockCompressor extends MockNode {
  threshold = new MockParam();
  knee = new MockParam();
  ratio = new MockParam();
  attack = new MockParam();
  release = new MockParam();
}

class MockPanner extends MockNode {
  pan = new MockParam();
}

class MockBufferSource extends MockNode {
  buffer: unknown = null;
  playbackRate = new MockParam();
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

const ctxInstances: MockAudioContext[] = [];

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createGain = vi.fn(() => new MockGain());
  createOscillator = vi.fn(() => new MockOscillator());
  createBiquadFilter = vi.fn(() => new MockFilter());
  createDynamicsCompressor = vi.fn(() => new MockCompressor());
  createStereoPanner = vi.fn(() => new MockPanner());
  createBufferSource = vi.fn(() => new MockBufferSource());
  createBuffer = vi.fn((_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  }));
  resume = vi.fn(() => Promise.resolve());

  constructor() {
    ctxInstances.push(this);
  }
}

function createTestContext(): GameContext {
  return {
    state: 'PLAYING',
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
    missions: [],
    chase: { distance: 2.8, isNear: false },
  };
}

beforeEach(() => {
  ctxInstances.length = 0;
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  (globalThis as any).window = { AudioContext: MockAudioContext };
});

describe('PAO-20 Unified Action, Power-Up, Oncoming Train Feedback & Audio Lifecycle', () => {
  it('synthesizes new power-up refresh/expire and oncoming train horn/pass cues and tracks cueCounts', () => {
    const engine = new AudioEngine(false);
    expect(engine.getDiagnostics().initialized).toBe(false);
    expect(engine.getDiagnostics().lifecycleState).toBe('IDLE');

    engine.playPowerUpRefresh();
    engine.playPowerUpExpire();
    engine.playTrainHorn(-0.5);
    engine.playTrainPass(0.6);

    const diag = engine.getDiagnostics();
    expect(diag.initialized).toBe(true);
    expect(Object.isFrozen(diag)).toBe(true);
    expect(Object.isFrozen(diag.cueCounts)).toBe(true);
    expect(diag.cueCounts.powerUpRefresh).toBe(1);
    expect(diag.cueCounts.powerUpExpire).toBe(1);
    expect(diag.cueCounts.trainHorn).toBe(1);
    expect(diag.cueCounts.trainPass).toBe(1);
    expect(ctxInstances[0].createStereoPanner).toHaveBeenCalled();
  });

  it('tracks all core action, pickup, shield, and crash cueCounts accurately', () => {
    const engine = new AudioEngine(false);
    engine.playJump();
    engine.playRoll();
    engine.playLaneChange(-1);
    engine.playLanding();
    engine.playCoin();
    engine.playPowerUp();
    engine.playMissionComplete();
    engine.playNewRecord();
    engine.playShieldBreak();
    engine.playCrash();

    const { cueCounts } = engine.getDiagnostics();
    expect(cueCounts).toMatchObject({
      jump: 1,
      roll: 1,
      laneChange: 1,
      landing: 1,
      coin: 1,
      powerUp: 1,
      missionComplete: 1,
      newRecord: 1,
      shieldBreak: 1,
      crash: 1,
    });
  });

  it('suppresses SFX synthesis and cueCount increments when muted or sfxEnabled is false', () => {
    const engine = new AudioEngine(false);
    engine.toggleMute();
    engine.playJump();
    engine.playPowerUpRefresh();
    engine.playTrainHorn(0);
    expect(engine.getDiagnostics().cueCounts.jump).toBe(0);
    expect(engine.getDiagnostics().cueCounts.powerUpRefresh).toBe(0);
    expect(engine.getDiagnostics().cueCounts.trainHorn).toBe(0);

    engine.toggleMute(); // unmute
    engine.setSfxEnabled(false);
    engine.playPowerUpExpire();
    engine.playTrainPass(0);
    expect(engine.getDiagnostics().cueCounts.powerUpExpire).toBe(0);
    expect(engine.getDiagnostics().cueCounts.trainPass).toBe(0);

    engine.setSfxEnabled(true);
    engine.playPowerUpExpire();
    expect(engine.getDiagnostics().cueCounts.powerUpExpire).toBe(1);
  });

  it('manages pauseAll and resumeAll lifecycle transitions without leaked chase timers', () => {
    const engine = new AudioEngine(false);
    engine.startBGM();
    engine.setChaseState(1.5, true);

    expect(engine.getDiagnostics()).toMatchObject({
      lifecycleState: 'PLAYING',
      isBgmPlaying: true,
      hasBgmScheduler: true,
      isChasing: true,
      hasBarkTimer: true,
    });

    engine.pauseAll();
    expect(engine.getDiagnostics()).toMatchObject({
      lifecycleState: 'PAUSED',
      isBgmPlaying: true,
      hasBgmScheduler: false,
      isChasing: false,
      hasBarkTimer: false,
    });

    engine.resumeAll();
    expect(engine.getDiagnostics()).toMatchObject({
      lifecycleState: 'PLAYING',
      isBgmPlaying: true,
      hasBgmScheduler: true,
    });

    engine.resetLifecycle();
  });

  it('guarantees zero residual BGM sources, schedulers, or chase timers on resetLifecycle and dispose (R-08)', () => {
    const engine = new AudioEngine(false);
    engine.startBGM();
    engine.setChaseState(1.4, true);

    engine.resetLifecycle();
    expect(engine.getDiagnostics()).toMatchObject({
      lifecycleState: 'STOPPED',
      isBgmPlaying: false,
      hasBgmScheduler: false,
      activeBgmSourceCount: 0,
      isChasing: false,
      hasBarkTimer: false,
    });

    // Idempotent dispose
    engine.dispose();
    engine.dispose();
    expect(engine.getDiagnostics().lifecycleState).toBe('DISPOSED');

    // Calls after dispose are no-ops
    engine.playJump();
    engine.startBGM();
    expect(engine.getDiagnostics().cueCounts.jump).toBe(0);
    expect(engine.getDiagnostics().isBgmPlaying).toBe(false);
  });

  it('detects power-up refresh and expiry transitions in FeedbackLifecycleController', () => {
    const engine = new AudioEngine(false);
    const controller = new FeedbackLifecycleController();
    const ctx = createTestContext();

    const refreshedEvents: any[] = [];
    const expiredEvents: any[] = [];
    const onRefreshed = (p: any) => refreshedEvents.push(p);
    const onExpired = (p: any) => expiredEvents.push(p);
    eventBus.on('POWERUP_REFRESHED', onRefreshed);
    eventBus.on('POWERUP_EXPIRED', onExpired);

    try {
      // Activate MAGNET at 10s
      ctx.player.activePowerUps.set('MAGNET', 10.0);
      controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
      expect(controller.getDiagnostics().activePowerUpCount).toBe(1);

      // Tick down to 6.0s -> no refresh or expiry
      ctx.player.activePowerUps.set('MAGNET', 6.0);
      controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
      expect(engine.getDiagnostics().cueCounts.powerUpRefresh).toBe(0);

      // Re-pickup MAGNET back to 10.0s -> triggers POWERUP_REFRESHED
      ctx.player.activePowerUps.set('MAGNET', 10.0);
      const refreshSnap = controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
      expect(refreshSnap.frameEvents).toHaveLength(1);
      expect(refreshSnap.frameEvents[0]).toMatchObject({
        type: 'POWERUP_REFRESHED',
        powerUpType: 'MAGNET',
        remainingSec: 10.0,
      });
      expect(engine.getDiagnostics().cueCounts.powerUpRefresh).toBe(1);
      expect(refreshedEvents).toHaveLength(1);

      // Expire MAGNET to 0s -> triggers POWERUP_EXPIRED
      ctx.player.activePowerUps.set('MAGNET', 0);
      const expireSnap = controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
      expect(expireSnap.frameEvents).toHaveLength(1);
      expect(expireSnap.frameEvents[0]).toMatchObject({
        type: 'POWERUP_EXPIRED',
        powerUpType: 'MAGNET',
      });
      expect(engine.getDiagnostics().cueCounts.powerUpExpire).toBe(1);
      expect(expiredEvents).toHaveLength(1);
      expect(controller.getDiagnostics().activePowerUpCount).toBe(0);
    } finally {
      eventBus.off('POWERUP_REFRESHED', onRefreshed);
      eventBus.off('POWERUP_EXPIRED', onExpired);
      engine.dispose();
    }
  });

  it('fires TRAIN_WARNING and TRAIN_PASSED exactly once per oncoming MOVING_TRAIN obstacle ID', () => {
    const engine = new AudioEngine(false);
    const controller = new FeedbackLifecycleController();
    const ctx = createTestContext();
    ctx.player.lane = 1;
    ctx.player.z = 100;

    ctx.obstacles.push({
      id: 'train-alpha',
      type: 'MOVING_TRAIN',
      lane: 2,
      x: CONSTANTS.LANE_X[2],
      y: 0,
      z: 140, // front at 140 - 6 = 134 -> relZ = 34 <= 42
      width: 2.4,
      height: 3.0,
      depth: 12.0,
      speedZ: -12,
    });

    // First frame inside warning zone -> fires TRAIN_WARNING
    const snap1 = controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
    expect(snap1.frameEvents).toHaveLength(1);
    expect(snap1.frameEvents[0]).toMatchObject({
      type: 'TRAIN_WARNING',
      obstacleId: 'train-alpha',
      lane: 2,
      distanceZ: 34,
      pan: 0.45,
    });
    expect(engine.getDiagnostics().cueCounts.trainHorn).toBe(1);

    // Second frame still in warning zone -> must NOT fire duplicate warning
    ctx.obstacles[0].z = 125;
    const snap2 = controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
    expect(snap2.frameEvents).toHaveLength(0);
    expect(engine.getDiagnostics().cueCounts.trainHorn).toBe(1);

    // Train front reaches/passes player (z = 104 -> front at 98 -> relZ = -2)
    ctx.obstacles[0].z = 104;
    const snap3 = controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
    expect(snap3.frameEvents).toHaveLength(1);
    expect(snap3.frameEvents[0]).toMatchObject({
      type: 'TRAIN_PASSED',
      obstacleId: 'train-alpha',
      lane: 2,
      pan: 0.45,
    });
    expect(engine.getDiagnostics().cueCounts.trainPass).toBe(1);

    // Subsequent frame in pass window -> must NOT fire duplicate pass
    ctx.obstacles[0].z = 98;
    const snap4 = controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
    expect(snap4.frameEvents).toHaveLength(0);
    expect(engine.getDiagnostics().cueCounts.trainPass).toBe(1);

    engine.dispose();
  });

  it('ignores non-MOVING_TRAIN obstacles for train warning/pass cues', () => {
    const engine = new AudioEngine(false);
    const controller = new FeedbackLifecycleController();
    const ctx = createTestContext();
    ctx.obstacles.push({
      id: 'static-train-1',
      type: 'STATIC_TRAIN',
      lane: 1,
      x: 0,
      y: 0,
      z: 25,
      width: 2.4,
      height: 3.0,
      depth: 12.0,
    });

    const snap = controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
    expect(snap.frameEvents).toHaveLength(0);
    expect(engine.getDiagnostics().cueCounts.trainHorn).toBe(0);
    expect(engine.getDiagnostics().cueCounts.trainPass).toBe(0);
    engine.dispose();
  });

  it('coordinates pause, resume, menu/shop transition, and runId switch with AudioEngine lifecycle', () => {
    const engine = new AudioEngine(false);
    const controller = new FeedbackLifecycleController();
    const ctx = createTestContext();

    engine.startBGM();
    ctx.player.activePowerUps.set('DOUBLE_SCORE', 8.0);
    controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
    expect(controller.getDiagnostics().activePowerUpCount).toBe(1);

    // Transition PLAYING -> PAUSED calls pauseAll()
    controller.syncFrame(ctx, 'run-1', 'PAUSED', engine);
    expect(engine.getDiagnostics().lifecycleState).toBe('PAUSED');
    expect(engine.getDiagnostics().hasBgmScheduler).toBe(false);

    // Transition PAUSED -> PLAYING calls resumeAll()
    controller.syncFrame(ctx, 'run-1', 'PLAYING', engine);
    expect(engine.getDiagnostics().lifecycleState).toBe('PLAYING');
    expect(engine.getDiagnostics().hasBgmScheduler).toBe(true);

    // Transition PLAYING -> MENU clears state and calls resetLifecycle()
    controller.syncFrame(ctx, null, 'MENU', engine);
    expect(engine.getDiagnostics().lifecycleState).toBe('STOPPED');
    expect(controller.getDiagnostics().activePowerUpCount).toBe(0);
    expect(controller.getDiagnostics().warnedTrainCount).toBe(0);

    engine.dispose();
  });

  it('bounds recentEvents history to 128 entries and freezes diagnostics snapshots', () => {
    const controller = new FeedbackLifecycleController();
    const ctx = createTestContext();

    for (let i = 0; i < 150; i++) {
      ctx.obstacles = [
        {
          id: `train-${i}`,
          type: 'MOVING_TRAIN',
          lane: 0,
          x: CONSTANTS.LANE_X[0],
          y: 0,
          z: 20,
          width: 2.4,
          height: 3.0,
          depth: 12.0,
          speedZ: -10,
        },
      ];
      controller.syncFrame(ctx, 'run-bound', 'PLAYING');
    }

    const diag = controller.getDiagnostics();
    expect(Object.isFrozen(diag)).toBe(true);
    expect(Object.isFrozen(diag.recentEvents)).toBe(true);
    expect(diag.recentEvents.length).toBe(128);
    expect(diag.recentEvents[0].obstacleId).toBe('train-22');
    expect(diag.recentEvents[127].obstacleId).toBe('train-149');
  });
});
