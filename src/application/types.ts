export type { RunSummary } from '../types';
import type { RunSummary, GameState } from '../types';
export interface AudioSettings { masterMuted: boolean; bgmEnabled: boolean; sfxEnabled: boolean; bgmVolume: number; sfxVolume: number }
export type AudioOperation =
  | { kind: 'TOGGLE'; field: 'masterMuted' | 'bgmEnabled' | 'sfxEnabled' }
  | { kind: 'SET_VOLUME'; field: 'bgmVolume' | 'sfxVolume'; value: number };
export interface SaveData {
  schemaVersion: 1; revision: number; walletCoins: number; highScore: number;
  ownedSkinIds: string[]; selectedSkinId: string; audio: AudioSettings; settledRunIds: string[];
}
export type ErrorCode = 'STORAGE_UNAVAILABLE' | 'SAVE_FAILED' | 'FUTURE_SCHEMA' | 'CORRUPT_SAVE' | 'CONFLICT' | 'LOCK_UNAVAILABLE' | 'INVALID_STATE' | 'STALE_RUN' | 'INVALID_SUMMARY' | 'UNKNOWN_SKIN' | 'INSUFFICIENT_FUNDS' | 'NOT_OWNED' | 'INVALID_AUDIO' | 'INVALID_COMMAND' | 'OVERFLOW';
export interface CommandResult { ok: boolean; commandId: string; errorCode?: ErrorCode; runId?: string; idempotent?: boolean }
export interface RepositoryResult { ok: boolean; errorCode?: ErrorCode }
export interface AppCommand {
  commandId: string; type: 'START_RUN' | 'RESTART_RUN' | 'GO_MENU' | 'OPEN_SHOP' | 'PAUSE_RUN' | 'RESUME_RUN' | 'BUY_SKIN' | 'EQUIP_SKIN' | 'SET_AUDIO' | 'UPDATE_AUDIO';
  runId?: string | null; skinId?: string; audio?: AudioSettings; audioOperation?: AudioOperation; summary?: RunSummary;
}
export interface AppSnapshot {
  readonly appState: GameState; readonly activeRunId: string | null;
  readonly walletCoins: number; readonly highScore: number; readonly revision: number;
  readonly ownedSkinIds: readonly string[]; readonly selectedSkinId: string; readonly audio: Readonly<AudioSettings>;
  readonly summary: Readonly<RunSummary> | null;
  readonly settlementStatus: 'NONE' | 'PENDING' | 'COMMITTED' | 'FAILED'; readonly errorCode: ErrorCode | null;
}
export function frozenCopy<T>(value: T): T {
  const copy = structuredClone(value);
  function freeze(v: unknown): void { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } }
  freeze(copy); return copy;
}
