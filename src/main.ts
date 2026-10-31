import { Vector3 } from '@babylonjs/core';
import type { GameContext } from './types';
import { CONSTANTS } from './types';
import { eventBus } from './core/eventBus';
import { GameLoop } from './core/gameLoop';
import { updatePhysics } from './systems/physics';
import { Simulation } from './core/simulation';
import { immutableCopy } from './core/snapshot';
import { inputSystem } from './systems/input';
import { spawnerSystem } from './systems/spawner';
import { audioEngine } from './systems/audio';
import { missionSystem } from './systems/mission';
import { BabylonRenderEngine } from './render/babylon';
import { UIManager } from './ui/dom';

const appEl = document.getElementById('game-container') || document.body;

// 1. 初始化 GameContext 状态单例
const initialContext: GameContext = {
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
const simulation = new Simulation(initialContext, {
  runId: 'podium', seed: 0x50414f10, physics: updatePhysics,
  afterStep: ctx => updateLegacySystems(ctx),
});
inputSystem.initQueue(simulation.queue, () => simulation.tick);
let runSequence = 0;

function resetToPodium(ctx: GameContext): void {
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
const subscriptions: (() => void)[] = [];
function on(event: string, handler: Parameters<typeof eventBus.on>[1]): void {
  eventBus.on(event, handler);
  subscriptions.push(() => eventBus.off(event, handler));
}

on('START_GAME', () => {
  simulation.change(ctx => {
    resetToPodium(ctx);
    ctx.state = 'PLAYING';
    ctx.score = 0;
    ctx.coins = 0;
    ctx.speed = CONSTANTS.BASE_SPEED;

    missionSystem.resetMissions(ctx.missions);
    audioEngine.startBGM();
  });
  simulation.restart(`run-${++runSequence}`, 0x50414f10);
  inputSystem.clear();
  gameLoop.setPaused(simulation.snapshot.phase !== 'RUNNING');
});

on('RESTART', () => {
  eventBus.emit('START_GAME');
});

on('GO_MENU', () => {
  simulation.change(ctx => {
    ctx.state = 'MENU';
    resetToPodium(ctx);
  });
  inputSystem.clear();
  gameLoop.setPaused(simulation.snapshot.phase !== 'RUNNING');
});

on('OPEN_SHOP', () => {
  simulation.change(ctx => {
    ctx.state = 'SHOP';
    resetToPodium(ctx);
  });
  inputSystem.clear();
  gameLoop.setPaused(simulation.snapshot.phase !== 'RUNNING');
});

on('TOGGLE_PAUSE', () => {
  simulation.change(ctx => {
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
  inputSystem.clear();
  gameLoop.setPaused(simulation.snapshot.phase !== 'RUNNING');
});

on('TOGGLE_AUDIO', () => {
  audioEngine.toggleMute();
});

on('PLAYER_ACTION', (payload: any) => {
  simulation.change(ctx => {
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
  }, false);
});

on('PLAYER_LANDED', () => {
  audioEngine.playLanding();
});

on('COIN_COLLECTED', () => {
  audioEngine.playCoin();
});

on('POWERUP_ACTIVATED', () => {
  audioEngine.playPowerUp();
});

on('HOVERBOARD_SHIELD_SHATTER', (payload: any) => {
  audioEngine.playShieldBreak();
  if (payload?.position) {
    renderEngine.triggerShatterFX(
      new Vector3(payload.position.x, payload.position.y, payload.position.z)
    );
  }
});

on('COLLISION', () => {
  audioEngine.playCrash();
  audioEngine.stopBGM();
  audioEngine.stopChase();
});

// 4. 主逻辑更新
// QA 传感器可冻结生成器，构造确定性无碰撞环境
let spawnerFrozen = false;

function updateLegacySystems(ctx: GameContext): void {
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

// Frozen snapshots are the only presentation input. The old UI's known assignments
// are acknowledged without changing state; commands already enter via the bus.
function legacyView(context: typeof simulation.snapshot.context): GameContext {
  const view = {};
  for (const key of Object.keys(context) as (keyof GameContext)[]) {
    Object.defineProperty(view, key, {
      enumerable: true, get: () => context[key],
      ...(key === 'state' || key === 'highScore' || key === 'totalCoins' ? { set: () => {} } : {}),
    });
  }
  return view as GameContext;
}

const gameLoop = new GameLoop(() => simulation.step(), {
  stepSec: simulation.stepSec,
  render: alpha => {
    renderEngine.render(legacyView(simulation.presentation(alpha).context));
    uiManager.update(legacyView(simulation.snapshot.context));
  },
});
gameLoop.setPaused(true);
gameLoop.start();

function suspend(): void {
  inputSystem.clear();
  if (simulation.snapshot.phase === 'RUNNING') eventBus.emit('TOGGLE_PAUSE');
  gameLoop.resetClock();
}
function visibilityChanged(): void { if (document.hidden) suspend(); else gameLoop.resetClock(); }
window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', visibilityChanged);
export function disposeGame(): void {
  gameLoop.dispose(); inputSystem.dispose();
  subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
  window.removeEventListener('blur', suspend);
  document.removeEventListener('visibilitychange', visibilityChanged);
}
if (import.meta.hot) import.meta.hot.dispose(disposeGame);


// 6. 挂载 Superpowers 机械化传感器
const isQaMode = () => (window as any).__QA_MODE__ === true;

(window as any).__GAME_SENSOR__ = {
  // —— 只读（生产与测试均可用，无害）——
  getSimulationSnapshot: () => simulation.snapshot,
  getSimulationDiagnostics: () => immutableCopy({ scheduler: gameLoop.diagnostics, input: simulation.queue.diagnostics }),
  getInputLog: () => simulation.acceptedInputs,
  getGameState: () => simulation.snapshot.context.state,
  getPlayerPos: () => ({ x: simulation.snapshot.context.player.x, y: simulation.snapshot.context.player.y, z: simulation.snapshot.context.player.z }),
  getScore: () => simulation.snapshot.context.score,
  getCoins: () => simulation.snapshot.context.coins,
  getSpeed: () => simulation.snapshot.context.speed,
  getPlayerState: () => ({
    lane: simulation.snapshot.context.player.lane,
    isJumping: simulation.snapshot.context.player.isJumping,
    isRolling: simulation.snapshot.context.player.isRolling,
    invulnerableTimer: simulation.snapshot.context.player.invulnerableTimer,
  }),
  getActiveObstaclesCount: () => simulation.snapshot.context.obstacles.length,
  getMissions: () =>
    simulation.snapshot.context.missions.map((m) => ({
      type: m.type,
      current: m.current,
      target: m.target,
      completed: m.completed,
    })),
  getChaseState: () => ({ ...simulation.snapshot.context.chase }),
  getSimulation: () => ({
    runId: simulation.snapshot.runId, tick: simulation.tick, timeSec: simulation.snapshot.timeSec,
    stepSec: simulation.stepSec, phase: simulation.snapshot.phase,
    simulationVersion: simulation.snapshot.simulationVersion, configId: simulation.snapshot.configId,
    seed: simulation.snapshot.seed, rngAlgorithmVersion: simulation.snapshot.rngAlgorithmVersion,
    contentRevision: simulation.snapshot.contentRevision,
    scheduler: { ...gameLoop.diagnostics }, input: { ...simulation.queue.diagnostics },
    inputs: simulation.acceptedInputs,
  }),

  // —— 写控制面（仅 __QA_MODE__ 门控，避免污染生产暴露面）——
  setPlayerPos: (x: number, y: number, z: number) => {
    if (!isQaMode()) return;
    simulation.change(ctx => {
      ctx.player.x = x;
      ctx.player.targetX = x;
      ctx.player.y = y;
      ctx.player.z = z;
      ctx.player.vy = 0;
      ctx.player.isJumping = false;
      ctx.player.isRolling = false;
    });
  },
  setPlayerLane: (lane: number) => {
    if (!isQaMode()) return;
    simulation.change(ctx => {
      const l = Math.max(0, Math.min(2, lane));
      ctx.player.lane = l;
      ctx.player.targetX = CONSTANTS.LANE_X[l];
      ctx.player.x = CONSTANTS.LANE_X[l];
    });
  },
  clearWorld: () => {
    if (!isQaMode()) return;
    simulation.change(ctx => {
      ctx.obstacles.length = 0;
      ctx.coinEntities.length = 0;
      ctx.powerUpEntities.length = 0;
    });
  },
  grantInvulnerable: (sec: number) => {
    if (!isQaMode()) return;
    simulation.change(ctx => {
      ctx.player.invulnerableTimer = sec;
    });
  },
  setGodMode: (god: boolean) => {
    if (!isQaMode()) return;
    simulation.change(ctx => {
      (ctx.player as any).godMode = god;
    });
  },
  freezeSpawner: (frozen: boolean) => {
    if (!isQaMode()) return;
    simulation.change(() => {
    spawnerFrozen = frozen;
    });
  },
};
