export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'PAUSED' | 'SHOP';

export type Lane = 0 | 1 | 2; 

export type PlayerState = 'RUNNING' | 'JUMPING' | 'ROLLING';

export interface PlayerBuffs {
  magnetTimer: number;
  shield: boolean;
  doubleScoreTimer: number;
  jetpackTimer: number;
  hoverboardTimer: number;
  superSneakersTimer: number;
  hoverboardCount: number;
}

export interface Player {
  lane: Lane;
  y: number; 
  z: number; 
  velocityZ: number;
  state: PlayerState;
  stateTimer: number;
  buffs: PlayerBuffs;
  skinColor: string;
  lastLane: Lane;
  lastLaneChangeTime: number;
  stumbleCount: number;
  lastStumbleTime: number;
}

export type EntityType = 'OBSTACLE' | 'COIN' | 'MAGNET_ITEM' | 'SHIELD_ITEM' | 'DOUBLE_SCORE_ITEM' | 'JETPACK_ITEM' | 'MOVING_TRAIN' | 'STATIC_TRAIN' | 'RAMP' | 'LOW_OBSTACLE' | 'HIGH_OBSTACLE' | 'SUPER_SNEAKERS_ITEM' | 'HOVERBOARD_ITEM' | 'GROUND';

export interface GameEntity {
  id: string;
  type: EntityType;
  lane: Lane;
  y: number; 
  width: number;
  length: number; 
  height: number; 
  z?: number;
  isCollected?: boolean; 
}

export interface GlobalSaveData {
  highScore: number;
  totalCoins: number;
  unlockedSkins: string[];
}

export interface GameContext {
  state: GameState;
  score: number;
  time: number;
  speed: number;
  
  player: Player;
  entities: GameEntity[];
  
  saveData: GlobalSaveData;
}
