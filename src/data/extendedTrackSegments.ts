import type { TrackObstacle, TrackPort, TrackReward, TrackSegmentDefinition, TrackStage } from './trackSegments';
import { TRACK_SEGMENTS } from './trackSegments';

export const EXTENDED_TRACK_CONTENT_REVISION = 'pao23-extended-track-v1';
export const THEME_ZONE_SPAN_M = 360;

export type ThemeZoneId = 'STATION_PLATFORM' | 'STREET_RAIL' | 'MAINTENANCE_YARD';

export interface ThemeZoneDescriptor {
  readonly id: ThemeZoneId;
  readonly labelZh: string;
  readonly spanMeters: number;
  readonly platformHex: string;
  readonly accentHex: string;
  readonly skyHex: string;
  readonly trackHex: string;
}

export interface ActiveThemeZone extends ThemeZoneDescriptor {
  readonly zoneIndex: number;
  readonly localProgress: number;
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const groundPort = (): TrackPort => ({ lane: 1, height: 0, surface: 'GROUND' });

const coinLine = (positions: readonly number[], y = 0.8, prefix = 'coin'): TrackReward[] =>
  positions.map((z, i) => ({
    localId: `${prefix}-${i}`,
    kind: 'COIN',
    lane: 1,
    y,
    z,
    routeId: 'main',
  }));

const segmentBase = (
  definitionId: string,
  stages: readonly TrackStage[],
): TrackSegmentDefinition => ({
  definitionId,
  revision: 1,
  length: 160,
  entry: groundPort(),
  exit: groundPort(),
  minSpeed: 18,
  maxSpeed: 45,
  stages,
  obstacles: [],
  rewards: [],
  routes: [{ id: 'main', commands: [] }],
});

const trainObstacle = (
  localId: string,
  lane: number,
  z: number,
  speedZ?: number,
): TrackObstacle => ({
  localId,
  definitionId: 'carriage',
  type: speedZ === undefined ? 'STATIC_TRAIN' : 'MOVING_TRAIN',
  lane,
  y: 0,
  z,
  width: 2.4,
  height: 3,
  depth: 12,
  ...(speedZ === undefined ? {} : { speedZ }),
});

const extendedDefinitions: TrackSegmentDefinition[] = [
  {
    ...segmentBase('station-weave', ['INTRO', 'BUILD']),
    obstacles: [
      trainObstacle('outer-left', 0, 65),
      trainObstacle('outer-right', 2, 105),
    ],
    rewards: coinLine([25, 45, 65, 85, 105, 125, 145]),
  },
  {
    ...segmentBase('canyon-sprint', ['BUILD', 'CHALLENGE']),
    obstacles: [
      trainObstacle('canyon-left-a', 0, 60),
      trainObstacle('canyon-right-a', 2, 60),
      {
        localId: 'canyon-low',
        definitionId: 'low-barrier',
        type: 'LOW_OBSTACLE',
        lane: 1,
        y: 0,
        z: 70,
        width: 2.2,
        height: 1,
        depth: 0.5,
      },
      trainObstacle('canyon-left-b', 0, 110),
      trainObstacle('canyon-right-b', 2, 110),
    ],
    rewards: coinLine([30, 45, 135, 145]),
    routes: [{ id: 'main', commands: [{ atZ: 70, action: 'JUMP', leadSec: 0.3 }] }],
  },
  {
    ...segmentBase('high-low-combo', ['BUILD', 'CHALLENGE']),
    obstacles: [
      {
        localId: 'combo-high',
        definitionId: 'high-barrier',
        type: 'HIGH_OBSTACLE',
        lane: 1,
        y: 1.2,
        z: 50,
        width: 2.2,
        height: 1.8,
        depth: 0.5,
      },
      {
        localId: 'combo-low',
        definitionId: 'low-barrier',
        type: 'LOW_OBSTACLE',
        lane: 1,
        y: 0,
        z: 78,
        width: 2.2,
        height: 1,
        depth: 0.5,
      },
    ],
    rewards: coinLine([25, 34, 130, 145]),
    routes: [
      {
        id: 'main',
        commands: [
          { atZ: 50, action: 'ROLL', leadSec: 0.3 },
          { atZ: 78, action: 'JUMP', leadSec: 0.3 },
        ],
      },
    ],
  },
  {
    ...segmentBase('maintenance-ramp', ['BUILD', 'CHALLENGE']),
    obstacles: [
      {
        localId: 'maint-ramp',
        definitionId: 'ramp-truck',
        type: 'RAMP',
        lane: 1,
        y: 0,
        z: 60,
        width: 2.4,
        height: 3,
        depth: 6,
        combinationId: 'maint-truck',
      },
      {
        ...trainObstacle('maint-roof', 1, 69),
        definitionId: 'ramp-truck',
        combinationId: 'maint-truck',
      },
      {
        localId: 'maint-high',
        definitionId: 'high-barrier',
        type: 'HIGH_OBSTACLE',
        lane: 1,
        y: 1.2,
        z: 120,
        width: 2.2,
        height: 1.8,
        depth: 0.5,
      },
    ],
    rewards: [
      ...coinLine([25, 40, 102, 138, 148]),
      ...coinLine([65, 69, 73], 3.8, 'maint-roof-coin'),
    ],
    routes: [{ id: 'main', commands: [{ atZ: 120, action: 'ROLL', leadSec: 0.3 }] }],
  },
  {
    ...segmentBase('oncoming-express', ['CHALLENGE']),
    obstacles: [
      {
        localId: 'express-low',
        definitionId: 'low-barrier',
        type: 'LOW_OBSTACLE',
        lane: 1,
        y: 0,
        z: 70,
        width: 2.2,
        height: 1,
        depth: 0.5,
      },
      trainObstacle('express-left', 0, 115, -10),
      trainObstacle('express-right', 2, 125, -12),
    ],
    rewards: coinLine([30, 45, 135, 148]),
    routes: [{ id: 'main', commands: [{ atZ: 70, action: 'JUMP', leadSec: 0.3 }] }],
  },
  {
    ...segmentBase('recovery-promenade', ['RECOVERY']),
    obstacles: [
      trainObstacle('promenade-left', 0, 80),
      trainObstacle('promenade-right', 2, 80),
    ],
    rewards: coinLine([25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145]),
  },
];

export const EXTENDED_TRACK_SEGMENTS: readonly TrackSegmentDefinition[] = freezeDeep(extendedDefinitions);

export const ALL_TRACK_SEGMENTS: readonly TrackSegmentDefinition[] = Object.freeze([
  ...TRACK_SEGMENTS,
  ...EXTENDED_TRACK_SEGMENTS,
]);

export const THEME_ZONES: readonly ThemeZoneDescriptor[] = freezeDeep([
  {
    id: 'STATION_PLATFORM',
    labelZh: '城市站台区',
    spanMeters: THEME_ZONE_SPAN_M,
    platformHex: '#F0E7D5',
    accentHex: '#E8B74F',
    skyHex: '#BEDFF4',
    trackHex: '#657A88',
  },
  {
    id: 'STREET_RAIL',
    labelZh: '阳光街轨区',
    spanMeters: THEME_ZONE_SPAN_M,
    platformHex: '#DCE6EE',
    accentHex: '#4EA8DE',
    skyHex: '#C8E7FA',
    trackHex: '#5C7285',
  },
  {
    id: 'MAINTENANCE_YARD',
    labelZh: '检修编组区',
    spanMeters: THEME_ZONE_SPAN_M,
    platformHex: '#E5DEC9',
    accentHex: '#E07A5F',
    skyHex: '#D4E8F2',
    trackHex: '#6D7A74',
  },
]);

export function resolveThemeZone(playerZ: number): ActiveThemeZone {
  const safeZ = Number.isFinite(playerZ) ? Math.max(0, playerZ) : 0;
  const rawZoneIndex = Math.floor(safeZ / THEME_ZONE_SPAN_M);
  const zoneIndex = ((rawZoneIndex % THEME_ZONES.length) + THEME_ZONES.length) % THEME_ZONES.length;
  const localProgress = (safeZ % THEME_ZONE_SPAN_M) / THEME_ZONE_SPAN_M;
  const descriptor = THEME_ZONES[zoneIndex];
  return {
    ...descriptor,
    zoneIndex,
    localProgress,
  };
}
