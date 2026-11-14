import { eventBus } from '../core/eventBus';
import type { GameContext, GameState, PowerUpType } from '../types';
import type { DeepReadonly } from '../types/contracts';
import type { AudioEngine } from './audio';

const TIMED_POWER_UPS: readonly PowerUpType[] = ['MAGNET', 'DOUBLE_SCORE', 'SUPER_SNEAKERS'];
const MAX_RECENT_EVENTS = 128;
const TRAIN_WARNING_MAX_DISTANCE_Z = 42;
const TRAIN_PASS_MIN_DISTANCE_Z_OFFSET = 6;
const POWERUP_REFRESH_DELTA_SEC = 0.5;

export type FeedbackEventType =
  | 'POWERUP_REFRESHED'
  | 'POWERUP_EXPIRED'
  | 'TRAIN_WARNING'
  | 'TRAIN_PASSED';

export interface FeedbackEvent {
  readonly type: FeedbackEventType;
  readonly runId: string | null;
  readonly powerUpType?: PowerUpType;
  readonly remainingSec?: number;
  readonly obstacleId?: string;
  readonly lane?: number;
  readonly distanceZ?: number;
  readonly pan?: number;
}

export type FeedbackAudioPort = Pick<
  AudioEngine,
  | 'playPowerUpRefresh'
  | 'playPowerUpExpire'
  | 'playTrainHorn'
  | 'playTrainPass'
  | 'pauseAll'
  | 'resumeAll'
  | 'resetLifecycle'
>;

export interface FeedbackDiagnostics {
  readonly runId: string | null;
  readonly appState: GameState;
  readonly activePowerUpCount: number;
  readonly warnedTrainCount: number;
  readonly passedTrainCount: number;
  readonly recentEvents: readonly FeedbackEvent[];
}

export interface FeedbackSnapshot extends FeedbackDiagnostics {
  readonly frameEvents: readonly FeedbackEvent[];
}

/**
 * PAO-20: Unified controller for power-up refresh/expiry transitions,
 * oncoming MOVING_TRAIN warning/pass single-fire cues, and R-08 audio lifecycle alignment.
 */
export class FeedbackLifecycleController {
  private runId: string | null = null;
  private appState: GameState = 'MENU';
  private previousPowerUps = new Map<PowerUpType, number>();
  private warnedTrainIds = new Set<string>();
  private passedTrainIds = new Set<string>();
  private events: FeedbackEvent[] = [];
  private disposed = false;

  public syncFrame(
    ctx: DeepReadonly<GameContext>,
    runId: string | null,
    appState: GameState,
    audio?: FeedbackAudioPort
  ): FeedbackSnapshot {
    if (this.disposed) {
      return Object.freeze({
        ...this.getDiagnostics(),
        frameEvents: Object.freeze([]),
      });
    }

    const previousState = this.appState;
    const previousRunId = this.runId;
    const frameEvents: FeedbackEvent[] = [];

    if (runId !== previousRunId || appState === 'MENU' || appState === 'SHOP') {
      this.previousPowerUps.clear();
      this.warnedTrainIds.clear();
      this.passedTrainIds.clear();
      if (
        (previousState === 'PLAYING' || previousState === 'PAUSED' || previousState === 'GAMEOVER') &&
        (appState === 'MENU' || appState === 'SHOP')
      ) {
        audio?.resetLifecycle();
      }
    }

    if (appState === 'PAUSED' && previousState === 'PLAYING') {
      audio?.pauseAll();
    } else if (appState === 'PLAYING' && previousState === 'PAUSED') {
      audio?.resumeAll();
    }

    this.runId = runId;
    this.appState = appState;

    if (appState === 'PLAYING') {
      for (const type of TIMED_POWER_UPS) {
        const previousTimer = this.previousPowerUps.get(type) ?? 0;
        const newTimer = ctx.player.activePowerUps?.get(type) ?? 0;

        if (previousTimer > 0 && newTimer > previousTimer + POWERUP_REFRESH_DELTA_SEC) {
          this.recordEvent(
            {
              type: 'POWERUP_REFRESHED',
              runId,
              powerUpType: type,
              remainingSec: newTimer,
            },
            frameEvents
          );
          eventBus.emit('POWERUP_REFRESHED', { type, remainingSec: newTimer });
          audio?.playPowerUpRefresh();
        } else if (previousTimer > 0 && newTimer <= 0) {
          this.recordEvent(
            {
              type: 'POWERUP_EXPIRED',
              runId,
              powerUpType: type,
            },
            frameEvents
          );
          eventBus.emit('POWERUP_EXPIRED', { type });
          audio?.playPowerUpExpire();
        }

        if (newTimer > 0) {
          this.previousPowerUps.set(type, newTimer);
        } else {
          this.previousPowerUps.delete(type);
        }
      }

      for (const obs of ctx.obstacles) {
        if (obs.type !== 'MOVING_TRAIN') continue;

        const relZ = obs.z - obs.depth / 2 - ctx.player.z;
        const pan = Math.max(-0.8, Math.min(0.8, (obs.lane - ctx.player.lane) * 0.45));

        if (relZ > 0 && relZ <= TRAIN_WARNING_MAX_DISTANCE_Z && !this.warnedTrainIds.has(obs.id)) {
          this.warnedTrainIds.add(obs.id);
          this.recordEvent(
            {
              type: 'TRAIN_WARNING',
              runId,
              obstacleId: obs.id,
              lane: obs.lane,
              distanceZ: relZ,
              pan,
            },
            frameEvents
          );
          eventBus.emit('TRAIN_WARNING', {
            obstacleId: obs.id,
            lane: obs.lane,
            distanceZ: relZ,
            pan,
          });
          audio?.playTrainHorn(pan);
        } else if (
          relZ <= 0 &&
          relZ >= -obs.depth - TRAIN_PASS_MIN_DISTANCE_Z_OFFSET &&
          !this.passedTrainIds.has(obs.id)
        ) {
          this.passedTrainIds.add(obs.id);
          this.recordEvent(
            {
              type: 'TRAIN_PASSED',
              runId,
              obstacleId: obs.id,
              lane: obs.lane,
              pan,
            },
            frameEvents
          );
          eventBus.emit('TRAIN_PASSED', {
            obstacleId: obs.id,
            lane: obs.lane,
            pan,
          });
          audio?.playTrainPass(pan);
        }
      }
    }

    return Object.freeze({
      runId: this.runId,
      appState: this.appState,
      activePowerUpCount: this.previousPowerUps.size,
      warnedTrainCount: this.warnedTrainIds.size,
      passedTrainCount: this.passedTrainIds.size,
      frameEvents: Object.freeze(frameEvents),
      recentEvents: Object.freeze([...this.events]),
    });
  }

  private recordEvent(event: FeedbackEvent, frameEvents: FeedbackEvent[]): void {
    const frozen = Object.freeze({ ...event });
    frameEvents.push(frozen);
    this.events.push(frozen);
    if (this.events.length > MAX_RECENT_EVENTS) {
      this.events.shift();
    }
  }

  public reset(audio?: Pick<AudioEngine, 'resetLifecycle'>): void {
    this.runId = null;
    this.appState = 'MENU';
    this.previousPowerUps.clear();
    this.warnedTrainIds.clear();
    this.passedTrainIds.clear();
    this.events = [];
    audio?.resetLifecycle();
  }

  public dispose(audio?: Pick<AudioEngine, 'resetLifecycle' | 'dispose'>): void {
    this.reset(audio);
    this.disposed = true;
    audio?.dispose?.();
  }

  public getDiagnostics(): FeedbackDiagnostics {
    return Object.freeze({
      runId: this.runId,
      appState: this.appState,
      activePowerUpCount: this.previousPowerUps.size,
      warnedTrainCount: this.warnedTrainIds.size,
      passedTrainCount: this.passedTrainIds.size,
      recentEvents: Object.freeze([...this.events]),
    });
  }
}

export const feedbackLifecycle = new FeedbackLifecycleController();
