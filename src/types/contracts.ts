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
  context: DeepReadonly<GameContext>;
}
