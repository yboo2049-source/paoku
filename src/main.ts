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
import { BabylonRenderEngine, type RenderFrameIdentity } from './render/babylon';
import { UIManager } from './ui/dom';
import { AppService } from './application/appService';
import { createBrowserSaveRepository } from './application/saveRepository';
import { SKINS } from './application/skinCatalog';
import type { AppCommand, AppSnapshot, CommandResult } from './application/types';
import { normalizeOcclusion, toBufferGeometry } from './presentation/hudSafeArea';
import type { HudCameraFrame } from './presentation/hudCameraInput';
import { createRunSummary } from './systems/runSettlement';
import type { InputAction, MotionCursor, MotionDraft, MotionReceipt } from './types/contracts';

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
let frameApp: AppSnapshot | null = null;
const uiManager = new UIManager(appEl, () => frameApp ?? application.snapshot);
const hasLayoutProducer = typeof uiManager.measureOcclusion === 'function';
const simulation = new Simulation(initialContext, {
  runId: 'podium', seed: 0x50414f10,
  motionMode: 'committed-motion-v1',
  physics: (ctx, dt, stepStart, motion) => updatePhysics(ctx, dt, undefined, stepStart, motion),
  onAppliedAction: (ctx, action) => {
    if (action.action === 'JUMP' || action.action === 'ROLL') missionSystem.trackAction(ctx.missions, action.action);
  },
  onMotionDraft: (draft, ordinal) => stageAudio(() => deliverMotion(draft), { draft, ordinal }),
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
let inDelivery = false;
let deliveryGeneration = 0;
let renderCursor = simulation.motionCursor();
let audioCursor = simulation.motionCursor();
const commandAttempts = new Map<string, { signature: string; command: AppCommand; pending: boolean }>();
let layoutFrameId = 0;
let layoutGeneration = 0;
let layoutInvalidation = 0;
const layoutCleanup: (() => void)[] = [];
const layoutStats = { measurements: 0, failures: 0, invalidations: 0, resets: 0, listeners: 0, observers: 0, subscriptions: 0 };
function invalidateHostLayout(reason = 'DIRTY'): void {
  if (!hasLayoutProducer || disposed) return;
  uiManager.invalidateLayout(reason);
}
function resetHostLayout(): void {
  if (!hasLayoutProducer || disposed) return;
  layoutGeneration++; layoutStats.resets++; uiManager.resetLayout();
}
function setupHostLayout(): void {
  if (!hasLayoutProducer) return;
  const off = uiManager.subscribeLayoutInvalidation(() => { layoutInvalidation++; layoutStats.invalidations++; });
  layoutStats.subscriptions++;
  layoutCleanup.push(() => { off(); layoutStats.subscriptions--; });
  const listen = (target: EventTarget, event: string) => {
    const dirty = () => invalidateHostLayout();
    target.addEventListener(event, dirty); layoutStats.listeners++;
    layoutCleanup.push(() => { target.removeEventListener(event, dirty); layoutStats.listeners--; });
  };
  listen(window, 'resize'); listen(window, 'scroll');
  if (window.visualViewport) { listen(window.visualViewport, 'resize'); listen(window.visualViewport, 'scroll'); }
  const canvas = appEl.querySelector?.('canvas');
  if (typeof ResizeObserver !== 'undefined' && canvas) {
    const observer = new ResizeObserver(() => invalidateHostLayout());
    observer.observe(appEl); observer.observe(canvas); layoutStats.observers++;
    layoutCleanup.push(() => { observer.disconnect(); layoutStats.observers--; });
  }
}
type Cue = { call: () => void; motion?: { draft: MotionDraft; ordinal: number } };
let stepAudio: Cue[] = [];
let audioDropped = 0;
let audioFailures = 0;
let observerFailures = 0;
let renderFailures = 0;
let audioFactGaps = 0;
const audioItems: { eventId: string; type: MotionDraft['type']; outcome: string }[] = [];
const renderItems: MotionReceipt['items'][number][] = [];
const committedItems: { eventId: string; type: string }[] = [];
const motionErrors: string[] = [];
function keepRecent<T>(items: T[], value: T): void { items.push(value); if (items.length > 256) items.shift(); }
function stageAudio(call: () => void, motion?: Cue['motion']): void {
  if (!inSimulationStep) { call(); return; }
  if (stepAudio.length >= 256) { audioDropped++; return; }
  stepAudio.push({ call, motion });
}
// AudioEngine has two legacy bus listeners of its own. Keep their calls in the
// same main-owned step buffer without changing the audio module or bus protocol.
const originalStopChase = audioEngine.stopChase;
const originalSetChaseState = audioEngine.setChaseState;
audioEngine.stopChase = () => stageAudio(() => originalStopChase.call(audioEngine));
audioEngine.setChaseState = (distance, near) => stageAudio(() => originalSetChaseState.call(audioEngine, distance, near));
function deliverMotion(draft: MotionDraft): void {
  try {
    if (draft.type === 'PLAYER_LANDED') audioEngine.playLanding();
    else if (draft.payload.action === 'JUMP') audioEngine.playJump();
    else if (draft.payload.action === 'ROLL') audioEngine.playRoll();
    else audioEngine.playLaneChange(draft.payload.toLane > draft.payload.fromLane ? 1 : -1);
  } finally {
    try {
      if (draft.type === 'PLAYER_LANDED') eventBus.emit('PLAYER_LANDED', { y: draft.payload.position.y });
      else eventBus.emit('PLAYER_ACTION', { action: draft.payload.action, ...(draft.payload.action === 'CHANGE_LANE' ? {
        lane: draft.payload.toLane, direction: draft.payload.toLane > draft.payload.fromLane ? 1 : -1,
      } : {}) });
    } catch { observerFailures++; }
  }
}
function rebaseDelivery(): void {
  deliveryGeneration++; stepAudio = [];
  audioCursor = simulation.motionCursor(); renderCursor = simulation.motionCursor();
}
function flushStepAudio(before: MotionCursor): void {
  const generation = deliveryGeneration, through = simulation.motionCursor();
  const read = simulation.readMotionFacts(before, simulation.snapshot.motionStamp!);
  const facts = read.status === 'OK' ? read.batches.flatMap(batch => batch.events) : [];
  if (read.status === 'OK') for (const batch of read.batches) for (const fact of batch.events)
    keepRecent(committedItems, { eventId: fact.eventId, type: fact.type });
  inDelivery = true;
  const pending = stepAudio; stepAudio = [];
  try {
    for (const cue of pending) {
      if (disposed || generation !== deliveryGeneration || through.runId !== simulation.snapshot.runId || through.streamEpoch !== simulation.snapshot.motionStamp!.streamEpoch) break;
      const fact = cue.motion && facts.find(value => value.sequence === before.throughSequence + cue.motion!.ordinal);
      // Identity comes from the committed producer envelope. GAP audio cues can
      // still attempt the original API, but cannot invent a published fact ID.
      if (cue.motion && !fact) audioFactGaps++;
      const item = fact ? { eventId: fact.eventId, type: fact.type, outcome: 'attempted' } : null;
      if (item) keepRecent(audioItems, item); // mark before side effects; never retry.
      try { cue.call(); if (item) item.outcome = 'handled'; }
      catch { audioFailures++; if (item) item.outcome = 'attempt-failed'; }
    }
    if (!disposed && generation === deliveryGeneration) audioCursor = through;
  } finally { inDelivery = false; }
}

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
    const fresh = structuredClone(initialContext);
    resetToPodium(fresh); fresh.state = 'PLAYING'; fresh.score = 0; fresh.speed = CONSTANTS.BASE_SPEED;
    missionSystem.resetMissions(fresh.missions);
    simulation.restart(app.activeRunId, 0x50414f10, fresh);
    rebaseDelivery();
    appliedRunId = app.activeRunId;
    resetHostLayout();
    observedTerminalRunId = null;
    inputSystem.clear();
  } else if (!app.activeRunId && (appliedRunId !== null || app.appState !== appliedState)) {
    if (simulation.faulted) {
      const fresh = structuredClone(initialContext); resetToPodium(fresh); fresh.state = app.appState;
      simulation.restart('podium', 0x50414f10, fresh);
    } else simulation.change(ctx => { resetToPodium(ctx); ctx.state = app.appState; });
    rebaseDelivery();
    appliedRunId = null;
    inputSystem.clear();
  } else if (app.activeRunId && (app.appState === 'PAUSED' || app.appState === 'PLAYING') && app.appState !== appliedState) {
    if (!simulation.faulted) simulation.setPhase(app.appState === 'PLAYING' ? 'RUNNING' : 'PAUSED');
    inputSystem.clear();
  }
  if (app.appState !== appliedState) {
    invalidateHostLayout('STALE_LAYOUT');
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
  const accepting = !simulation.faulted && simulation.snapshot.phase === 'RUNNING' && app.appState === 'PLAYING' && pendingPauseIntents === 0;
  simulation.queue.setAccepting(accepting);
  gameLoop.setPaused(!accepting);
}

function reportResult(result: CommandResult): void {
  if (disposed) return;
  syncApplicationProjection();
  if (uiManager.notifyCommandResult) uiManager.notifyCommandResult(result);
  else if (!result.ok) uiManager.showToast?.('ACTION FAILED: ' + result.errorCode + '. Retry the action.');
}

function dispatchIntent(type: AppCommand['type'], payload?: Record<string, unknown>): void {
  const app = application.snapshot;
  const hasRunId = payload != null && Object.prototype.hasOwnProperty.call(payload, 'runId');
  let command: AppCommand = {
    commandId: typeof payload?.commandId === 'string' ? payload.commandId : 'ui-' + (++commandSequence),
    type,
    ...(type === 'START_RUN' || type === 'BUY_SKIN' || type === 'EQUIP_SKIN' || type === 'SET_AUDIO' || type === 'UPDATE_AUDIO' ? {} : { runId: hasRunId ? payload!.runId as string | null : app.activeRunId }),
    ...(typeof payload?.skinId === 'string' ? { skinId: payload.skinId } : {}),
    ...(type === 'SET_AUDIO' ? { audio: payload as unknown as AppCommand['audio'] } : {}),
    ...(type === 'UPDATE_AUDIO' ? { audioOperation: payload as unknown as AppCommand['audioOperation'] } : {}),
  };
  const terminalCommand = type === 'RESTART_RUN' || type === 'GO_MENU' || type === 'OPEN_SHOP';
  if ((inDelivery || inSimulationStep) && (terminalCommand || type === 'PAUSE_RUN' || type === 'RESUME_RUN' || type === 'START_RUN')) {
    // A synchronous legacy fact listener can submit an intent mid-tick. Keep its
    // original identity, but seal only after the whole tick and collision observer.
    const captured = immutableCopy({ ...payload, commandId: command.commandId, runId: command.runId });
    const epoch = simulation.snapshot.motionStamp!.streamEpoch;
    if (type === 'PAUSE_RUN') { inputSystem.clear(); simulation.queue.setAccepting(false); gameLoop.setPaused(true); }
    queueMicrotask(() => { if (!disposed && epoch === simulation.snapshot.motionStamp!.streamEpoch) dispatchIntent(type, captured); });
    return;
  }
  const signature = JSON.stringify(command);
  const previous = commandAttempts.get(command.commandId);
  if (previous?.signature === signature) {
    if (previous.pending) return;
    command = { ...previous.command };
  }
  if (type === 'RESUME_RUN' && simulation.faulted) {
    uiManager.notifyCommandPending?.({ commandId: command.commandId, type, runId: command.runId ?? app.activeRunId });
    if (uiManager.notifyCommandResult) uiManager.notifyCommandResult({ commandId: command.commandId, ok: false, errorCode: 'INVALID_STATE' });
    else uiManager.showToast?.('RUN FAULTED. Restart to recover.');
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
    command.summary = command.summary ?? app.summary ?? createRunSummary(simulation.snapshot, simulation.snapshot.phase === 'ENDED' ? 'COLLISION' : 'QUIT');
    inputSystem.clear();
    gameLoop.setPaused(true);
    if (command.summary.endReason === 'QUIT' && !simulation.faulted) simulation.abandon();
  }
  const attempt = { signature, command: immutableCopy(command) as AppCommand, pending: true };
  commandAttempts.set(command.commandId, attempt);
  uiManager.notifyCommandPending?.({ commandId: command.commandId, type: command.type, runId: command.runId ?? app.activeRunId });
  const result = application.dispatch(command);
  if (pauseBarrier && application.snapshot.appState === 'PAUSED' && application.snapshot.activeRunId === command.runId) {
    pendingPauseIntents--;
    pauseBarrier = false;
  }
  // Non-persistent start/pause/resume publish synchronously, preserving input isolation.
  if (type === 'START_RUN' || type === 'PAUSE_RUN' || type === 'RESUME_RUN') syncApplicationProjection();
  void result.then(result => {
    if (pauseBarrier) pendingPauseIntents--;
    attempt.pending = false;
    if (result.ok && commandAttempts.get(command.commandId) === attempt) commandAttempts.delete(command.commandId);
    reportResult(result);
  });
}

let lastRestartIntentAt = -Infinity;
on('START_GAME', payload => dispatchIntent('START_RUN', payload));
on('RESTART', payload => { lastRestartIntentAt = performance.now(); dispatchIntent('RESTART_RUN', payload); });
for (const [id, expectedState] of [['pause-restart-btn', 'PAUSED'], ['restart-btn', 'GAMEOVER']] as const) {
  const btn = document.getElementById?.(id) as HTMLButtonElement | null;
  if (!btn?.addEventListener) continue;
  const onRestartClick = () => {
    if (!disposed && !btn.disabled && application.snapshot.appState === expectedState && performance.now() - lastRestartIntentAt >= 300) {
      lastRestartIntentAt = performance.now();
      if (typeof (uiManager as any).intent === 'function') (uiManager as any).intent('RESTART');
      else dispatchIntent('RESTART_RUN');
    }
  };
  btn.addEventListener('click', onRestartClick);
  subscriptions.push(() => btn.removeEventListener('click', onRestartClick));
}
on('GO_MENU', payload => dispatchIntent('GO_MENU', payload));
on('OPEN_SHOP', payload => dispatchIntent('OPEN_SHOP', payload));
on('BUY_SKIN', payload => dispatchIntent('BUY_SKIN', payload));
on('EQUIP_SKIN', payload => dispatchIntent('EQUIP_SKIN', payload));
on('SET_AUDIO', payload => dispatchIntent('SET_AUDIO', payload));
on('UPDATE_AUDIO', payload => dispatchIntent('UPDATE_AUDIO', payload));
on('TOGGLE_PAUSE', payload => {
  const state = application.snapshot.appState;
  dispatchIntent(state === 'PAUSED' ? 'RESUME_RUN' : 'PAUSE_RUN', payload);
});
on('TOGGLE_AUDIO', payload => {
  dispatchIntent('UPDATE_AUDIO', { ...payload, kind: 'TOGGLE', field: 'masterMuted' });
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

// Motion business side effects are exclusively delivered after commit above.

on('COIN_COLLECTED', () => {
  stageAudio(() => audioEngine.playCoin());
});

on('POWERUP_ACTIVATED', () => {
  stageAudio(() => audioEngine.playPowerUp());
});

on('HOVERBOARD_SHIELD_SHATTER', (payload: any) => {
  stageAudio(() => audioEngine.playShieldBreak());
  if (payload?.position) {
    renderEngine.triggerShatterFX(
      new Vector3(payload.position.x, payload.position.y, payload.position.z)
    );
  }
});

on('COLLISION', () => {
  stageAudio(() => { audioEngine.playCrash(); audioEngine.stopBGM(); audioEngine.stopChase(); });
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
function legacyView(context: typeof simulation.snapshot.context, app = application.snapshot): GameContext {
  const view = {};
  for (const key of Object.keys(context) as (keyof GameContext)[]) {
    Object.defineProperty(view, key, {
      enumerable: true, get: () => key === 'state' ? app.appState : key === 'highScore' ? app.highScore : key === 'totalCoins' ? app.walletCoins : context[key],
      ...(key === 'state' || key === 'highScore' || key === 'totalCoins' ? { set: () => {} } : {}),
    });
  }
  return view as GameContext;
}

function stepSimulation(): void {
  const stamp = simulation.snapshot.motionStamp!;
  if (renderCursor.streamEpoch !== stamp.streamEpoch || audioCursor.streamEpoch !== stamp.streamEpoch) rebaseDelivery();
  const before = simulation.motionCursor();
  inSimulationStep = true; stepAudio = [];
  try { simulation.step(); }
  catch (error) {
    stepAudio = []; keepRecent(motionErrors, String(error)); inputSystem.clear(); gameLoop.setPaused(true);
    queueMicrotask(() => { if (!disposed && application.snapshot.appState === 'PLAYING') dispatchIntent('PAUSE_RUN'); });
    return;
  } finally { inSimulationStep = false; }
  flushStepAudio(before);
  observeTerminalTick();
}
function renderPresentation(alpha: number): void {
  if (disposed) return;
  const presentation = simulation.presentation(alpha);
  const app = application.snapshot;
  // A legacy adapter may provide only the original identity. Never combine its
  // context with journal metadata from a different sample.
  const candidate = presentation.motionStamp?.throughTick === presentation.tick &&
    Math.abs(presentation.timeSec - presentation.tick * presentation.stepSec) < 1e-8
    ? simulation.readMotionFacts(renderCursor, presentation.motionStamp) : undefined;
  const motion = candidate?.through.runId === presentation.runId && candidate.through.throughTick === presentation.tick ? candidate : undefined;
  const identity: RenderFrameIdentity = Object.freeze({
    runId: presentation.runId, tick: presentation.tick,
    discontinuity: presentation.discontinuity, appState: app.appState,
    ...(motion ? { timeSec: presentation.timeSec, stepSec: presentation.stepSec, motion } : {}),
  });
  const generation = deliveryGeneration;
  const view = legacyView(presentation.context, app);
  let hud: HudCameraFrame | undefined;
  const frameId = ++layoutFrameId;
  frameApp = app;
  inDelivery = true;
  try {
    uiManager.update(view);
    if (hasLayoutProducer) {
      hud = { frameId, consumerGeneration: layoutGeneration, page: app.appState, runId: app.activeRunId, geometry: null, unavailableReason: document.hidden ? 'HIDDEN' : 'NOT_MOUNTED' };
      const canvas = appEl.querySelector?.('canvas');
      if (canvas && !document.hidden) {
        const rect = canvas.getBoundingClientRect(), style = getComputedStyle(canvas), viewport = window.visualViewport;
        const edge = (value: string) => Number.parseFloat(value) || 0;
        const left = edge(style.borderLeftWidth) + edge(style.paddingLeft), right = edge(style.borderRightWidth) + edge(style.paddingRight);
        const top = edge(style.borderTopWidth) + edge(style.paddingTop), bottom = edge(style.borderBottomWidth) + edge(style.paddingBottom);
        // Current host has no canvas border/padding. Reject unsupported content-box transforms rather than mixing spaces.
        const contentBoxValid = left === 0 && right === 0 && top === 0 && bottom === 0;
        layoutStats.measurements++;
        const sample = uiManager.measureOcclusion({ sampleFrame: frameId, page: app.appState, runId: app.activeRunId,
          canvasRect: { x: rect.x + left, y: rect.y + top, width: rect.width - left - right, height: rect.height - top - bottom },
          canvasTransform: contentBoxValid ? style.transform : 'unsupported-content-box',
          viewport: { layoutWidth: document.documentElement.clientWidth, layoutHeight: document.documentElement.clientHeight,
            visual: { x: viewport?.offsetLeft ?? 0, y: viewport?.offsetTop ?? 0, width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight }, visualScale: viewport?.scale ?? 1 } });
        const invalidation = layoutInvalidation;
        const size = renderEngine.getPresentationSize();
        const geometry = toBufferGeometry(normalizeOcclusion(sample), size.width, size.height);
        const current = uiManager.readOcclusion();
        const valid = invalidation === layoutInvalidation && current === sample && sample.page === app.appState && sample.runId === app.activeRunId;
        hud = { ...hud, geometry: valid ? geometry : null, unavailableReason: valid ? geometry.reason : 'DIRTY' };
      }
    }
  } catch {
    layoutStats.failures++;
    invalidateHostLayout('HOST_MEASUREMENT_FAILED');
    hud = { frameId, consumerGeneration: layoutGeneration, page: app.appState, runId: app.activeRunId, geometry: null, unavailableReason: 'HOST_MEASUREMENT_FAILED' };
  }
  try {
    if (disposed || generation !== deliveryGeneration) return;
    const receipt = renderEngine.render(view, identity, hud);
    if (receipt?.status === 'COMPLETE' && generation === deliveryGeneration && receipt.through.runId === presentation.runId && receipt.through.streamEpoch === presentation.motionStamp!.streamEpoch) {
      renderCursor = receipt.through; receipt.items.forEach(item => keepRecent(renderItems, item));
    }
    if (receipt?.status === 'REJECTED') { renderFailures++; keepRecent(motionErrors, 'Rejected motion delivery'); }
  } catch (error) {
    renderFailures++; keepRecent(motionErrors, String(error));
    // An attempted consumer side effect cannot be rolled back or replayed
    // safely. Account for every ID in this attempt, independently of audio.
    if (motion?.status === 'OK' && generation === deliveryGeneration && !disposed) {
      for (const batch of motion.batches) for (const fact of batch.events)
        keepRecent(renderItems, { eventId: fact.eventId, outcome: 'attempt-failed', reason: 'RENDER_EXCEPTION' });
      renderCursor = motion.through;
    }
  }
  finally { inDelivery = false; frameApp = null; }
}
const gameLoop = new GameLoop(stepSimulation, {
  stepSec: simulation.stepSec,
  render: renderPresentation,
});
setupHostLayout();
gameLoop.setPaused(true);
gameLoop.start();
void application.initialize().then(reportResult);

function suspend(): void {
  inputSystem.clear();
  if (simulation.snapshot.phase === 'RUNNING') eventBus.emit('TOGGLE_PAUSE');
  gameLoop.resetClock();
}
function visibilityChanged(): void { invalidateHostLayout('DIRTY'); if (document.hidden) suspend(); else gameLoop.resetClock(); }
window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', visibilityChanged);
export function disposeGame(): void {
  if (disposed) return;
  disposed = true;
  layoutGeneration++;
  layoutCleanup.splice(0).forEach(cleanup => cleanup());
  uiManager.disposeLayout?.();
  commandAttempts.clear(); frameApp = null;
  deliveryGeneration++; stepAudio = [];
  audioEngine.stopChase = originalStopChase; audioEngine.setChaseState = originalSetChaseState;
  gameLoop.dispose(); inputSystem.dispose();
  subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
  window.removeEventListener('blur', suspend);
  document.removeEventListener('visibilitychange', visibilityChanged);
  renderEngine.dispose?.();
}
if (import.meta.hot) import.meta.hot.dispose(disposeGame);


// 6. 挂载 Superpowers 机械化传感器
const isQaMode = () => (window as any).__QA_MODE__ === true;

(window as any).__GAME_SENSOR__ = {
  getHudBridge: () => immutableCopy({ layout: uiManager.readOcclusion?.() ?? null, renderer: renderEngine.hudDiagnostics ?? null, host: { ...layoutStats, frameId: layoutFrameId, consumerGeneration: layoutGeneration, disposed } }),
  // —— 只读（生产与测试均可用，无害）——
  getAppSnapshot: () => application.snapshot,
  getMotionBridge: () => immutableCopy({ mode: 'committed-motion-v1', faulted: simulation.faulted,
    journal: simulation.motionDiagnostics, stamp: simulation.snapshot.motionStamp,
    audio: { cursor: audioCursor, items: audioItems, dropped: audioDropped, factGaps: audioFactGaps, failures: audioFailures, observerFailures },
    render: { cursor: renderCursor, items: renderItems, failures: renderFailures, ...renderEngine.motionDiagnostics },
    committedItems, errors: motionErrors }),
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
  driveMotionForQa: (commands: readonly (readonly InputAction[])[], draw = true) => {
    if (!isQaMode() || disposed || inDelivery || inSimulationStep) return;
    gameLoop.setPaused(true);
    for (const actions of commands) {
      if (simulation.faulted || application.snapshot.appState !== 'PLAYING') break;
      for (const action of actions) simulation.queue.collect(action, 'QA', simulation.tick);
      stepSimulation();
    }
    if (draw) renderPresentation(1);
    return (window as any).__GAME_SENSOR__.getMotionBridge();
  },
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
