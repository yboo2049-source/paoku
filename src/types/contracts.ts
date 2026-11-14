import type { GameContext } from './index';
export type RunPhase = 'RUNNING' | 'PAUSED' | 'ENDED' | 'ABANDONED';
import type { TrackGenerationState } from './index';
export type InputAction = 'LEFT' | 'RIGHT' | 'JUMP' | 'ROLL';
export type InputSource = 'KEYBOARD' | 'TOUCH' | 'REPLAY' | 'QA';
export interface InputCommand { runId: string; tick: number; sequence: number; action: InputAction; source: InputSource }
export type DeepReadonly<T> = T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> : T extends readonly (infer V)[] ? readonly DeepReadonly<V>[] : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export interface VersionedRng { readonly algorithmVersion: string; readonly state: number; next(): number }
/** Transitional PAO-9 subset; legacy context is a read-only value, never a second authority. */
export interface SimSnapshot {
  contractVersion: 1; runId: string; tick: number; timeSec: number; stepSec: number; phase: RunPhase;
  seed: number; rngState: number; rngAlgorithmVersion: string;
  simulationVersion: string; configId: string; contentRevision: string;
  generation?: DeepReadonly<TrackGenerationState>;
  lastInputSequence: number; discontinuity: boolean;
  motionStamp?: MotionStamp;
  context: DeepReadonly<GameContext>;
}

export interface MotionStamp { readonly streamEpoch: number; readonly throughTick: number; readonly throughSequence: number }
export interface MotionCursor extends MotionStamp { readonly runId: string }
export interface AppliedAction {
  readonly action: 'JUMP' | 'ROLL' | 'CHANGE_LANE';
  readonly fromLane: number; readonly toLane: number;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
}
export interface LandedPayload {
  readonly surfaceId: string | null; readonly surfaceKind: 'GROUND' | 'RAMP' | 'ROOF' | null;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly relativeImpactSpeedMps: null; readonly impactStatus: 'NOT_EXPOSED_BY_CURRENT_SOLVER';
  readonly supportStatus: 'KNOWN' | 'MISSING';
}
export type MotionDraft = { readonly type: 'ACTION_STARTED'; readonly payload: AppliedAction & {
  readonly actionInstanceId: string; readonly inputTick: number; readonly inputSequence: number; readonly source: InputSource;
} } | { readonly type: 'PLAYER_LANDED'; readonly payload: LandedPayload };
export type MotionFact = MotionDraft & { readonly profile: 'pao18-motion-v1'; readonly contractVersion: 1;
  readonly eventId: string; readonly runId: string; readonly tick: number; readonly sequence: number; readonly timeSec: number };
export interface MotionBatch {
  readonly profile: 'pao18-motion-v1'; readonly contractVersion: 1; readonly runId: string;
  readonly streamEpoch: number; readonly tick: number; readonly timeSec: number; readonly stepSec: number;
  readonly previousSequence: number; readonly throughSequence: number; readonly complete: true;
  readonly events: readonly MotionFact[];
}
export type MotionRead =
  | { readonly status: 'OK'; readonly batches: readonly MotionBatch[]; readonly through: MotionCursor }
  | { readonly status: 'GAP'; readonly through: MotionCursor; readonly fromSequence: number; readonly toSequence: number; readonly lostCount: number; readonly floorTick: number }
  | { readonly status: 'REBASE'; readonly through: MotionCursor; readonly reason: 'BASELINE' | 'WORLD_BOUNDARY' | 'INVALID_CURSOR' }
  | { readonly status: 'FAULT'; readonly through: MotionCursor; readonly failedTick: number };
export interface MotionReceipt {
  readonly status: 'COMPLETE' | 'DEFERRED' | 'REJECTED'; readonly through: MotionCursor;
  readonly items: readonly { readonly eventId: string; readonly outcome: 'handled' | 'suppressed' | 'attempt-failed'; readonly reason?: string }[];
}
/** A step-local synchronous capability. It is invalid once its owning step exits. */
export interface MotionSink { landed(payload: LandedPayload): void }
