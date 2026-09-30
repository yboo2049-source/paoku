import { Vector3 } from '@babylonjs/core';
import type { GameContext } from './types';
import { CONSTANTS } from './types';
import { eventBus } from './core/eventBus';
import { GameLoop } from './core/gameLoop';
import { updatePhysics } from './systems/physics';
import { accumulateScore } from './systems/scoring';
import { inputSystem } from './systems/input';
import { spawnerSystem } from './systems/spawner';
import { audioEngine } from './systems/audio';
import { missionSystem } from './systems/mission';
import { BabylonRenderEngine } from './render/babylon';
import { UIManager } from './ui/dom';

const appEl = document.getElementById('game-container') || document.body;

// 1. 初始化 GameContext 状态单例
const ctx: GameContext = {
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

// 2. 实例化子系统
const renderEngine = new BabylonRenderEngine(appEl);
const uiManager = new UIManager(appEl);
inputSystem.init(ctx.player, () => ctx.state === 'PLAYING');

function resetToPodium(): void {
  ctx.player.z = 0;
  ctx.player.x = 0;
  ctx.player.targetX = 0;
  ctx.player.lane = 1;
  ctx.player.y = 0;
  ctx.player.vy = 0;
  ctx.player.isJumping = false;
  ctx.player.isRolling = false;
  ctx.player.hasHoverboard = false;
  ctx.player.hoverboardActive = false;
  ctx.player.invulnerableTimer = 0;
  ctx.player.activePowerUps.clear();
  ctx.obstacles = [];
  ctx.coinEntities = [];
  ctx.powerUpEntities = [];
  ctx.distance = 0;
  ctx.chase = { distance: 2.8, isNear: false };

  spawnerSystem.reset();
  renderEngine.reset();
  audioEngine.stopBGM();
  audioEngine.stopChase();
}

// 3. 事件总线监听 (整合音效与任务系统)
eventBus.on('START_GAME', () => {
  resetToPodium();
  ctx.state = 'PLAYING';
  ctx.score = 0;
  ctx.coins = 0;
  ctx.speed = CONSTANTS.BASE_SPEED;

  missionSystem.resetMissions(ctx.missions);
  audioEngine.startBGM();
});

eventBus.on('RESTART', () => {
  eventBus.emit('START_GAME');
});

eventBus.on('GO_MENU', () => {
  ctx.state = 'MENU';
  resetToPodium();
});

eventBus.on('OPEN_SHOP', () => {
  ctx.state = 'SHOP';
  resetToPodium();
});

eventBus.on('TOGGLE_PAUSE', () => {
  if (ctx.state === 'PLAYING') {
    ctx.state = 'PAUSED';
    audioEngine.stopBGM();
    audioEngine.stopChase();
  } else if (ctx.state === 'PAUSED') {
    ctx.state = 'PLAYING';
    audioEngine.startBGM();
    if (ctx.chase.isNear) {
      audioEngine.setChaseState(ctx.chase.distance, true);
    }
  }
});

eventBus.on('TOGGLE_AUDIO', () => {
  audioEngine.toggleMute();
});

eventBus.on('PLAYER_ACTION', (payload: any) => {
  if (ctx.state !== 'PLAYING') return;

  if (payload?.action === 'JUMP') {
    audioEngine.playJump();
    missionSystem.trackAction(ctx.missions, 'JUMP');
  } else if (payload?.action === 'ROLL') {
    audioEngine.playRoll();
    missionSystem.trackAction(ctx.missions, 'ROLL');
  } else if (payload?.action === 'CHANGE_LANE') {
    audioEngine.playLaneChange(payload?.direction === 1 ? 1 : -1);
  }
});

eventBus.on('PLAYER_LANDED', () => {
  audioEngine.playLanding();
});

eventBus.on('COIN_COLLECTED', () => {
  audioEngine.playCoin();
});

eventBus.on('POWERUP_ACTIVATED', () => {
  audioEngine.playPowerUp();
});

eventBus.on('HOVERBOARD_SHIELD_SHATTER', (payload: any) => {
  audioEngine.playShieldBreak();
  if (payload?.position) {
    renderEngine.triggerShatterFX(
      new Vector3(payload.position.x, payload.position.y, payload.position.z)
    );
  }
});

eventBus.on('COLLISION', () => {
  audioEngine.playCrash();
  audioEngine.stopBGM();
  audioEngine.stopChase();
});

// 4. 主逻辑更新
// QA 传感器可冻结生成器，构造确定性无碰撞环境
let spawnerFrozen = false;

const update = (dt: number) => {
  dt = Math.min(dt, 0.05);
  if (ctx.state === 'PLAYING') {
    // 匀加速上升
    ctx.speed = Math.min(
      ctx.speed + CONSTANTS.ACCELERATION * dt,
      CONSTANTS.MAX_SPEED
    );

    const deltaDist = ctx.speed * dt;
    ctx.player.z += deltaDist;
    ctx.distance += deltaDist;

    // AC-PRD-06: DOUBLE_SCORE 逻辑（纯函数抽取至 scoring.ts，便于单测）
    ctx.score = accumulateScore(ctx.score, ctx.speed, dt, ctx.player.activePowerUps);

    updatePhysics(ctx, dt);
    if (!spawnerFrozen) {
      spawnerSystem.update(
        ctx.player.z,
        ctx.obstacles,
        ctx.coinEntities,
        ctx.powerUpEntities
      );
    }
    missionSystem.update(ctx);

    // 追逐状态：护盾破裂后警员短暂逼近，供渲染层与音频层（警笛距离衰减）共用
    const isChasingNear = ctx.player.invulnerableTimer > 0;
    const chaseDistance = isChasingNear ? 1.5 : 2.8;
    if (ctx.chase.isNear !== isChasingNear) {
      ctx.chase.isNear = isChasingNear;
      ctx.chase.distance = chaseDistance;
      eventBus.emit('CHASE_STATE_CHANGED', { distance: chaseDistance, isNear: isChasingNear });
    } else {
      ctx.chase.distance = chaseDistance;
    }
  }

  renderEngine.render(ctx);
  uiManager.update(ctx);
};

// 5. 启动 GameLoop
const gameLoop = new GameLoop(update);
gameLoop.start();

// 6. 挂载 Superpowers 机械化传感器
const isQaMode = () => (window as any).__QA_MODE__ === true;

(window as any).__GAME_SENSOR__ = {
  // —— 只读（生产与测试均可用，无害）——
  getGameState: () => ctx.state,
  getPlayerPos: () => ({ x: ctx.player.x, y: ctx.player.y, z: ctx.player.z }),
  getScore: () => ctx.score,
  getCoins: () => ctx.coins,
  getSpeed: () => ctx.speed,
  getPlayerState: () => ({
    lane: ctx.player.lane,
    isJumping: ctx.player.isJumping,
    isRolling: ctx.player.isRolling,
    invulnerableTimer: ctx.player.invulnerableTimer,
  }),
  getActiveObstaclesCount: () => ctx.obstacles.length,
  getMissions: () =>
    ctx.missions.map((m) => ({
      type: m.type,
      current: m.current,
      target: m.target,
      completed: m.completed,
    })),
  getChaseState: () => ({ ...ctx.chase }),

  // —— 写控制面（仅 __QA_MODE__ 门控，避免污染生产暴露面）——
  setPlayerPos: (x: number, y: number, z: number) => {
    if (!isQaMode()) return;
    ctx.player.x = x;
    ctx.player.targetX = x;
    ctx.player.y = y;
    ctx.player.z = z;
    ctx.player.vy = 0;
    ctx.player.isJumping = false;
    ctx.player.isRolling = false;
  },
  setPlayerLane: (lane: number) => {
    if (!isQaMode()) return;
    const l = Math.max(0, Math.min(2, lane));
    ctx.player.lane = l;
    ctx.player.targetX = CONSTANTS.LANE_X[l];
    ctx.player.x = CONSTANTS.LANE_X[l];
  },
  clearWorld: () => {
    if (!isQaMode()) return;
    ctx.obstacles.length = 0;
    ctx.coinEntities.length = 0;
    ctx.powerUpEntities.length = 0;
  },
  grantInvulnerable: (sec: number) => {
    if (!isQaMode()) return;
    ctx.player.invulnerableTimer = sec;
  },
  setGodMode: (god: boolean) => {
    if (!isQaMode()) return;
    (ctx.player as any).godMode = god;
  },
  freezeSpawner: (frozen: boolean) => {
    if (!isQaMode()) return;
    spawnerFrozen = frozen;
  },
};
