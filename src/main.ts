import { Vector3 } from '@babylonjs/core';
import type { GameContext } from './types';
import type { TrackGenerationFrame } from './types';
import { CONSTANTS } from './types';
import { eventBus } from './core/eventBus';
import { GameLoop } from './core/gameLoop';
import { resetPhysicsContacts, updatePhysics } from './systems/physics';
import { Simulation } from './core/simulation';
import { immutableCopy } from './core/snapshot';
import { inputSystem } from './systems/input';
import { spawnerSystem } from './systems/spawner';
import { audioEngine } from './systems/audio';
import { missionSystem } from './systems/mission';
import { BabylonRenderEngine } from './render/babylon';
import { UIManager } from './ui/dom';
import { AppService } from './application/appService';
import { createBrowserSaveRepository } from './application/saveRepository';
import { SKINS } from './application/skinCatalog';
import type { AppCommand, CommandResult } from './application/types';
import { createRunSummary } from './systems/runSettlement';

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
const application = new AppService(createBrowserSaveRepository());
const uiManager = new UIManager(appEl, () => application.snapshot);
const simulation = new Simulation(initialContext, {
  runId: 'podium', seed: 0x50414f10,
  physics: (ctx, dt, stepStart) => updatePhysics(ctx, dt, undefined, stepStart),
  afterStep: (ctx, _dt, _rng, frame) => updateLegacySystems(ctx, frame),
  generation: {
    reset: (runId, seed) => spawnerSystem.reset(runId, seed),
    snapshot: () => spawnerSystem.generationState,
  },
});
inputSystem.initQueue(simulation.queue, () => simulation.tick);
let commandSequence = 0;
let appliedRunId: string | null = null;
let appliedState: GameContext['state'] = 'MENU';
let appliedSkinId: string | null = null;
let observedTerminalRunId: string | null = null;
let disposed = false;
let inSimulationStep = false;
let pendingPauseIntents = 0;

function resetToPodium(ctx: GameContext): void {
  resetPhysicsContacts(ctx.player);
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

  spawnerSystem.reset(simulation.snapshot.runId, simulation.snapshot.seed);
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

/** Application success is the only authority for simulation lifecycle changes. */
function syncApplicationProjection(): void {
  if (disposed) return;
  const app = application.snapshot;
  if (app.activeRunId && app.activeRunId !== appliedRunId) {
    simulation.change(ctx => {
      resetToPodium(ctx);
      ctx.state = 'PLAYING';
      ctx.score = 0;
      ctx.speed = CONSTANTS.BASE_SPEED;
      missionSystem.resetMissions(ctx.missions);
    });
    simulation.restart(app.activeRunId, 0x50414f10);
    appliedRunId = app.activeRunId;
    observedTerminalRunId = null;
    inputSystem.clear();
  } else if (!app.activeRunId && (appliedRunId !== null || app.appState !== appliedState)) {
    simulation.change(ctx => {
      resetToPodium(ctx);
      ctx.state = app.appState;
    });
    appliedRunId = null;
    inputSystem.clear();
  } else if (app.activeRunId && (app.appState === 'PAUSED' || app.appState === 'PLAYING') && app.appState !== appliedState) {
    simulation.setPhase(app.appState === 'PLAYING' ? 'RUNNING' : 'PAUSED');
    inputSystem.clear();
  }
  if (app.appState !== appliedState) {
    if (app.appState === 'PLAYING') {
      audioEngine.startBGM();
      const chase = simulation.snapshot.context.chase;
      if (chase.isNear) audioEngine.setChaseState(chase.distance, true);
    } else {
      audioEngine.stopBGM();
      audioEngine.stopChase();
    }
    appliedState = app.appState;
  }
  audioEngine.applySettings(app.audio);
  if (appliedSkinId !== app.selectedSkinId) {
    appliedSkinId = app.selectedSkinId;
    eventBus.emit('SKIN_CHANGED', SKINS.find(s => s.id === app.selectedSkinId) || SKINS[0]);
  }
  const accepting = simulation.snapshot.phase === 'RUNNING' && app.appState === 'PLAYING' && pendingPauseIntents === 0;
  simulation.queue.setAccepting(accepting);
  gameLoop.setPaused(!accepting);
}

function reportResult(result: CommandResult): void {
  if (disposed) return;
  syncApplicationProjection();
  if (!result.ok) uiManager.showToast?.('ACTION FAILED: ' + result.errorCode + '. Retry the action.');
}

function dispatchIntent(type: AppCommand['type'], payload?: Record<string, unknown>): void {
  const app = application.snapshot;
  const hasRunId = payload != null && Object.prototype.hasOwnProperty.call(payload, 'runId');
  const command: AppCommand = {
    commandId: typeof payload?.commandId === 'string' ? payload.commandId : 'ui-' + (++commandSequence),
    type,
    ...(type === 'START_RUN' || type === 'BUY_SKIN' || type === 'EQUIP_SKIN' || type === 'SET_AUDIO' ? {} : { runId: hasRunId ? payload!.runId as string | null : app.activeRunId }),
    ...(typeof payload?.skinId === 'string' ? { skinId: payload.skinId } : {}),
    ...(type === 'SET_AUDIO' ? { audio: payload as unknown as AppCommand['audio'] } : {}),
  };
  const terminalCommand = type === 'RESTART_RUN' || type === 'GO_MENU' || type === 'OPEN_SHOP';
  if (terminalCommand && inSimulationStep) {
    // A synchronous legacy fact listener can submit an intent mid-tick. Keep its
    // original identity, but seal only after the whole tick and collision observer.
    const captured = immutableCopy({ ...payload, commandId: command.commandId, runId: command.runId });
    queueMicrotask(() => { if (!disposed) dispatchIntent(type, captured); });
    return;
  }
  const isolatePause = type === 'PAUSE_RUN' && app.appState === 'PLAYING' && app.activeRunId !== null && command.runId === app.activeRunId;
  let pauseBarrier = isolatePause;
  if (isolatePause) {
    // Input isolation begins with the intent, even while a save lock delays the
    // service command. No application or world state is published prematurely.
    pendingPauseIntents++;
    inputSystem.clear();
    simulation.queue.setAccepting(false);
    gameLoop.setPaused(true);
  }
  const allowedTerminal = type === 'GO_MENU' || (type === 'RESTART_RUN' && (app.appState === 'PAUSED' || app.appState === 'GAMEOVER')) || (type === 'OPEN_SHOP' && app.appState === 'GAMEOVER');
  if (terminalCommand && allowedTerminal && app.activeRunId && command.runId === app.activeRunId) {
    // Seal before changing phase, clearing the world or resetting any mission.
    command.summary = app.summary ?? createRunSummary(simulation.snapshot, simulation.snapshot.phase === 'ENDED' ? 'COLLISION' : 'QUIT');
    inputSystem.clear();
    gameLoop.setPaused(true);
    if (command.summary.endReason === 'QUIT') simulation.abandon();
  }
  const result = application.dispatch(command);
  if (pauseBarrier && application.snapshot.appState === 'PAUSED' && application.snapshot.activeRunId === command.runId) {
    pendingPauseIntents--;
    pauseBarrier = false;
  }
  // Non-persistent start/pause/resume publish synchronously, preserving input isolation.
  if (type === 'START_RUN' || type === 'PAUSE_RUN' || type === 'RESUME_RUN') syncApplicationProjection();
  void result.then(result => {
    if (pauseBarrier) pendingPauseIntents--;
    reportResult(result);
  });
}

on('START_GAME', payload => dispatchIntent('START_RUN', payload));
on('RESTART', payload => dispatchIntent('RESTART_RUN', payload));
on('GO_MENU', payload => dispatchIntent('GO_MENU', payload));
on('OPEN_SHOP', payload => dispatchIntent('OPEN_SHOP', payload));
on('BUY_SKIN', payload => dispatchIntent('BUY_SKIN', payload));
on('EQUIP_SKIN', payload => dispatchIntent('EQUIP_SKIN', payload));
on('SET_AUDIO', payload => dispatchIntent('SET_AUDIO', payload));
on('TOGGLE_PAUSE', payload => {
  const state = application.snapshot.appState;
  dispatchIntent(state === 'PAUSED' ? 'RESUME_RUN' : 'PAUSE_RUN', payload);
});
on('TOGGLE_AUDIO', () => {
  const audio = application.snapshot.audio;
  dispatchIntent('SET_AUDIO', { ...audio, masterMuted: !audio.masterMuted });
});

/** Observe only complete committed ticks; DOM update and render never settle. */
function observeTerminalTick(): void {
  const snapshot = simulation.snapshot;
  if (snapshot.phase !== 'ENDED' || snapshot.runId === observedTerminalRunId) return;
  observedTerminalRunId = snapshot.runId;
  const summary = createRunSummary(snapshot, 'COLLISION');
  const isNewRecord = summary.scoreInt > application.snapshot.highScore;
  inputSystem.clear();
  gameLoop.setPaused(true);
  void application.finish(summary).then(result => {
    if (result.ok && isNewRecord && !disposed) {
      uiManager.markNewRecord?.(summary.runId);
      audioEngine.playNewRecord();
    }
    reportResult(result);
  });
}

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

function updateLegacySystems(ctx: GameContext, generationFrame: TrackGenerationFrame): void {
  if (!spawnerFrozen) {
    spawnerSystem.update(
      ctx.player.z,
      ctx.obstacles,
      ctx.coinEntities,
      ctx.powerUpEntities,
      generationFrame,
    );
  }
  missionSystem.update(ctx, true);

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

// Read-only legacy presentation bridge; app fields are projections, never simulation writes.
// No-op legacy setters retain compatibility with external presentation adapters.
function legacyView(context: typeof simulation.snapshot.context): GameContext {
  const app = application.snapshot;
  const view = {};
  for (const key of Object.keys(context) as (keyof GameContext)[]) {
    Object.defineProperty(view, key, {
      enumerable: true, get: () => key === 'state' ? app.appState : key === 'highScore' ? app.highScore : key === 'totalCoins' ? app.walletCoins : context[key],
      ...(key === 'state' || key === 'highScore' || key === 'totalCoins' ? { set: () => {} } : {}),
    });
  }
  return view as GameContext;
}

const gameLoop = new GameLoop(() => {
  inSimulationStep = true;
  try { simulation.step(); } finally { inSimulationStep = false; }
  observeTerminalTick();
}, {
  stepSec: simulation.stepSec,
  render: alpha => {
    renderEngine.render(legacyView(simulation.presentation(alpha).context));
    uiManager.update(legacyView(simulation.snapshot.context));
  },
});
gameLoop.setPaused(true);
gameLoop.start();
void application.initialize().then(reportResult);

function suspend(): void {
  inputSystem.clear();
  if (simulation.snapshot.phase === 'RUNNING') eventBus.emit('TOGGLE_PAUSE');
  gameLoop.resetClock();
}
function visibilityChanged(): void { if (document.hidden) suspend(); else gameLoop.resetClock(); }
window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', visibilityChanged);
export function disposeGame(): void {
  disposed = true;
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
  getAppSnapshot: () => application.snapshot,
  getSimulationSnapshot: () => simulation.snapshot,
  getSimulationDiagnostics: () => immutableCopy({ scheduler: gameLoop.diagnostics, input: simulation.queue.diagnostics }),
  getInputLog: () => simulation.acceptedInputs,
  getGameState: () => application.snapshot.appState,
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
    generation: simulation.snapshot.generation,
    scheduler: { ...gameLoop.diagnostics }, input: { ...simulation.queue.diagnostics },
    inputs: simulation.acceptedInputs,
  }),

  // —— 写控制面（仅 __QA_MODE__ 门控，避免污染生产暴露面）——
  setPlayerPos: (x: number, y: number, z: number) => {
    if (!isQaMode()) return;
    simulation.change(ctx => {
      resetPhysicsContacts(ctx.player);
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
      resetPhysicsContacts(ctx.player);
      const l = Math.max(0, Math.min(2, lane));
      ctx.player.lane = l;
      ctx.player.targetX = CONSTANTS.LANE_X[l];
      ctx.player.x = CONSTANTS.LANE_X[l];
    });
  },
  clearWorld: () => {
    if (!isQaMode()) return;
    simulation.change(ctx => {
      resetPhysicsContacts(ctx.player);
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
