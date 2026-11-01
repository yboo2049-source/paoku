import type { ObstacleType, PowerUpType } from '../types';
import type { InputAction } from '../types/contracts';

export const TRACK_CONTENT_REVISION = 'pao13-track-v1';
export const TRACK_SPEEDS = [18, 30, 45] as const;
export type TrackStage = 'INTRO' | 'BUILD' | 'CHALLENGE' | 'RECOVERY';
export interface TrackPort { lane: number; height: number; surface: 'GROUND' | 'ROOF' }
export interface TrackObstacle {
  localId: string; definitionId: string; type: ObstacleType; lane: number;
  y: number; z: number; width: number; height: number; depth: number; speedZ?: number; combinationId?: string;
}
export interface TrackReward { localId: string; kind: 'COIN' | PowerUpType; lane: number; y: number; z: number; routeId: string }
export interface TrackCommand { atZ: number; action: InputAction; leadSec: number }
export interface TrackRoute { id: string; commands: readonly TrackCommand[] }
export interface TrackSegmentDefinition {
  definitionId: string; revision: 1; length: number; entry: TrackPort; exit: TrackPort;
  minSpeed: number; maxSpeed: number; stages: readonly TrackStage[];
  obstacles: readonly TrackObstacle[]; rewards: readonly TrackReward[]; routes: readonly TrackRoute[];
}
const ground = (): TrackPort => ({ lane: 1, height: 0, surface: 'GROUND' });
const rewards = (positions: readonly number[], y = 0.8): TrackReward[] => positions.map((z, i) => ({ localId: `coin-${i}`, kind: 'COIN', lane: 1, y, z, routeId: 'main' }));
const base = (definitionId: string, stages: readonly TrackStage[]): TrackSegmentDefinition => ({ definitionId, revision: 1, length: 160, entry: ground(), exit: ground(), minSpeed: 18, maxSpeed: 45, stages, obstacles: [], rewards: [], routes: [{ id: 'main', commands: [] }] });
const train = (localId: string, lane: number, z: number, speedZ?: number): TrackObstacle => ({ localId, definitionId: 'carriage', type: speedZ === undefined ? 'STATIC_TRAIN' : 'MOVING_TRAIN', lane, y: 0, z, width: 2.4, height: 3, depth: 12, ...(speedZ === undefined ? {} : { speedZ }) });

/** Finite, reviewed logical dimensions. Model raw bounds are deliberately absent. */
const definitions: TrackSegmentDefinition[] = [
  { ...base('calm', ['INTRO', 'RECOVERY']), rewards: rewards([25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 140, 145, 150]) },
  { ...base('under-over', ['BUILD', 'CHALLENGE']),
    obstacles: [
      { localId: 'low', definitionId: 'low-barrier', type: 'LOW_OBSTACLE', lane: 1, y: 0, z: 70, width: 2.2, height: 1, depth: 0.5 },
      { localId: 'high', definitionId: 'high-barrier', type: 'HIGH_OBSTACLE', lane: 1, y: 1.2, z: 115, width: 2.2, height: 1.8, depth: 0.5 },
    ], rewards: rewards([30, 45, 135, 145]),
    routes: [{ id: 'main', commands: [{ atZ: 70, action: 'JUMP', leadSec: 0.3 }, { atZ: 115, action: 'ROLL', leadSec: 0.3 }] }] },
  { ...base('ramp-truck', ['BUILD', 'CHALLENGE']),
    obstacles: [
      { localId: 'ramp', definitionId: 'ramp-truck', type: 'RAMP', lane: 1, y: 0, z: 70, width: 2.4, height: 3, depth: 6, combinationId: 'truck' },
      { ...train('roof', 1, 79), definitionId: 'ramp-truck', combinationId: 'truck' },
    ], rewards: [...rewards([30, 45, 110, 135, 145]), ...rewards([75, 79, 83], 3.8).map((r, i) => ({ ...r, localId: `roof-coin-${i}` }))] },
  { ...base('moving-rush', ['CHALLENGE']),
    obstacles: [train('incoming-left', 0, 120, -10), train('incoming-right', 2, 130, -12)],
    rewards: rewards([30, 45, 60, 75, 90, 105, 125, 140, 150]) },
];

function freezeContent<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeContent); Object.freeze(value); }
  return value;
}
export const TRACK_SEGMENTS: readonly TrackSegmentDefinition[] = freezeContent(definitions);

export const SUPPORTED_POWER_UPS: readonly PowerUpType[] = Object.freeze(['MAGNET', 'DOUBLE_SCORE', 'SUPER_SNEAKERS', 'HOVERBOARD']);
export function stageForCursor(cursor: number): TrackStage {
  if (cursor < 2) return 'INTRO';
  return (['BUILD', 'CHALLENGE', 'CHALLENGE', 'RECOVERY'] as const)[(cursor - 2) % 4];
}
