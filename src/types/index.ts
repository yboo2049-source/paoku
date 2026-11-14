export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'SHOP';

export type ObstacleType = 'LOW_OBSTACLE' | 'HIGH_OBSTACLE' | 'STATIC_TRAIN' | 'MOVING_TRAIN' | 'RAMP';

export type PowerUpType = 'MAGNET' | 'DOUBLE_SCORE' | 'SUPER_SNEAKERS' | 'HOVERBOARD';

/** Tick-local foot position captured after input, before forward integration. */
export interface PhysicsStepStart {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  rewardCoins: number;
  completed: boolean;
  type: 'COLLECT_COINS' | 'JUMP_TIMES' | 'ROLL_TIMES' | 'SCORE_REACH';
}

export interface PlayerEntity {
  /** Standalone physics callers' terminal notification latch; reset at run/QA boundaries. */
  collisionEnded?: boolean;
  /** Transitional support state owned by physics, included in simulation snapshots. */
  supportSurfaceId?: string | null;
  contact?: 'SUPPORTED' | 'AIRBORNE';
  supportSample?: { x: number; y: number; z: number };
  supportDeparture?: { ownerEntityId: string; side: 'REAR' | 'LEFT' | 'RIGHT'; y: number } | null;
  supportRampExit?: { xMin: number; xMax: number; z: number; y: number } | null;
  lane: number;          // 0: 左, 1: 中, 2: 右
  x: number;             // X 世界坐标
  targetX: number;       // 目标 X 坐标
  y: number;             // Y 世界坐标 (高度)
  z: number;             // Z 世界坐标 (奔跑深度)
  vy: number;            // 垂直方向速度
  isJumping: boolean;
  isRolling: boolean;
  rollTimer: number;
  hasHoverboard: boolean;
  hoverboardActive: boolean;
  invulnerableTimer: number; // 护盾抵扣后的短暂停顿无敌保护帧
  activePowerUps: Map<PowerUpType, number>;
}

export interface ObstacleEntity {
  /** PAO-13 data-only presentation ownership; ignored by the legacy renderer. */
  definitionId?: string;
  segmentInstanceId?: string;
  combinationId?: string;
  visualRootId?: string;
  id: string;
  type: ObstacleType;
  lane: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  speedZ?: number;
}

export interface CoinEntity {
  segmentInstanceId?: string;
  routeId?: string;
  id: string;
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export interface PowerUpEntity {
  segmentInstanceId?: string;
  routeId?: string;
  id: string;
  type: PowerUpType;
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export interface ChaseState {
  /** 警员与玩家之间的 Z 向追逐距离（近：1.5 / 常规：2.8） */
  distance: number;
  /** 警员是否贴近玩家（护盾破裂后的短暂逼近） */
  isNear: boolean;
}

export interface GameContext {
  /** Present on authoritative Simulation runs; absent only for legacy standalone callers. */
  runLedger?: RunLedger;
  state: GameState;
  score: number;
  highScore: number;
  coins: number;
  totalCoins: number;
  speed: number;
  distance: number;
  player: PlayerEntity;
  obstacles: ObstacleEntity[];
  coinEntities: CoinEntity[];
  powerUpEntities: PowerUpEntity[];
  missions: Mission[];
  /** 追逐状态（由逻辑层计算，供渲染层与音频层共用，避免跨层读渲染状态） */
  chase: ChaseState;
}

export interface RunLedger {
  pickupCount: number;
  pickupCoins: number;
  rewardCoins: number;
  rewardedMissionIds: string[];
}

export interface RunSummary {
  readonly runId: string;
  readonly scoreInt: number;
  readonly pickupCount: number;
  readonly pickupCoins: number;
  readonly rewardCoins: number;
  readonly earnedCoins: number;
  readonly endReason: 'COLLISION' | 'QUIT';
}

export const CONSTANTS = {
  LANE_WIDTH: 3.0,
  LANE_X: [-3.0, 0.0, 3.0],
  GRAVITY: -38.0,
  JUMP_VELOCITY: 13.5,
  SUPER_JUMP_VELOCITY: 20.25,
  ROLL_DURATION: 0.8,
  BASE_SPEED: 18.0,
  ACCELERATION: 0.25,
  MAX_SPEED: 45.0,
  PLAYER_HEIGHT: 1.8,
  PLAYER_WIDTH: 0.8,
  PLAYER_DEPTH: 0.8,
  MAGNET_RADIUS: 15.0,
  MAGNET_SPEED: 25.0,
};

/** Fixed-tick authoritative generator input, never populated from presentation. */
export interface TrackGenerationFrame {
  runId: string; seed: number; rng: import('./contracts').VersionedRng; tick: number; speed: number;
}
export interface TrackGenerationState {
  runId: string; seed: number; contentRevision: string;
  rngAlgorithmVersion: string; rngState: number; cursor: number; nextZ: number; lastTick: number;
  stage: string; lastSegmentId: string | null; fallbackCount: number;
}
