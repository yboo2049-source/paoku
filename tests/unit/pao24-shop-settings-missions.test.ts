import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRESENTATION_PREFS,
  LoadingStateController,
  MISSION_LOCALIZATION,
  PRESENTATION_PREFS_KEY,
  ProgressionFlowController,
  formatMissionSummary,
  getShopCatalogView,
} from '../../src/systems/progressionFlow';
import { MissionSystem } from '../../src/systems/mission';
import { initializeRunLedger, recordCoinPickup } from '../../src/systems/runSettlement';
import { AppService } from '../../src/application/appService';
import { SAVE_KEY, SaveRepository } from '../../src/application/saveRepository';
import type { GameContext, Mission, PlayerEntity } from '../../src/types';

class MemoryStorage {
  public readonly data = new Map<string, string>();
  public failWrites = false;
  public failReads = false;

  public getItem(key: string): string | null {
    if (this.failReads) throw new Error('storage read denied');
    return this.data.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('storage quota exceeded');
    this.data.set(key, value);
  }
}

const immediateLock = async <T>(work: () => Promise<T>): Promise<T> => work();

function createPlayer(): PlayerEntity {
  return {
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
  };
}

function createGameContext(missions: Mission[]): GameContext {
  const ctx: GameContext = {
    state: 'PLAYING',
    score: 0,
    highScore: 0,
    coins: 0,
    totalCoins: 0,
    speed: 18,
    distance: 0,
    player: createPlayer(),
    obstacles: [],
    coinEntities: [],
    powerUpEntities: [],
    missions,
    chase: { distance: 2.8, isNear: false },
  };
  initializeRunLedger(ctx);
  return ctx;
}

describe('PAO-24 Shop, Settings, Loading & Mission Achievement Flow', () => {
  it('provides frozen Chinese localization entries for all 4 core mission types', () => {
    expect(Object.isFrozen(MISSION_LOCALIZATION)).toBe(true);
    expect(MISSION_LOCALIZATION.m1).toEqual({
      titleZh: '金币收集者',
      descriptionZh: '单局拾取 30 枚金币',
      iconKey: 'coin',
    });
    expect(MISSION_LOCALIZATION.m2).toEqual({
      titleZh: '高空跳跃者',
      descriptionZh: '单局完成 10 次有效起跳',
      iconKey: 'jump',
    });
    expect(MISSION_LOCALIZATION.m3).toEqual({
      titleZh: '滑铲达人',
      descriptionZh: '单局完成 8 次有效翻滚滑铲',
      iconKey: 'roll',
    });
    expect(MISSION_LOCALIZATION.m4).toEqual({
      titleZh: '高分冲刺者',
      descriptionZh: '单局得分达到 500 分',
      iconKey: 'score',
    });
  });

  it('formats mission progress summaries with clamped ratios and ledger synchronization', () => {
    const ms = new MissionSystem();
    const missions = ms.initMissions();
    missions[1].current = 5; // JUMP_TIMES: 5 / 10 -> 0.5
    missions[2].current = 12; // ROLL_TIMES: 12 / 8 -> clamped to 1
    missions[2].completed = true;

    const summary = formatMissionSummary(missions, {
      pickupCount: 15,
      pickupCoins: 15,
      rewardCoins: 40,
      rewardedMissionIds: ['m3'],
    });

    expect(Object.isFrozen(summary)).toBe(true);
    expect(summary).toHaveLength(4);
    expect(Object.isFrozen(summary[0])).toBe(true);

    expect(summary[0]).toMatchObject({
      id: 'm1',
      type: 'COLLECT_COINS',
      titleZh: '金币收集者',
      current: 15,
      target: 30,
      progressRatio: 0.5,
      rewardCoins: 50,
      completed: false,
    });
    expect(summary[1]).toMatchObject({
      id: 'm2',
      type: 'JUMP_TIMES',
      titleZh: '高空跳跃者',
      current: 5,
      target: 10,
      progressRatio: 0.5,
      rewardCoins: 40,
      completed: false,
    });
    expect(summary[2]).toMatchObject({
      id: 'm3',
      type: 'ROLL_TIMES',
      titleZh: '滑铲达人',
      current: 12,
      target: 8,
      progressRatio: 1,
      rewardCoins: 40,
      completed: true,
    });
  });

  it('unblocks interactiveReady as soon as saveInitialized settles even while player.glb is PENDING or FALLBACK', () => {
    let now = 1000;
    const loading = new LoadingStateController(() => now);

    const initial = loading.getSnapshot();
    expect(Object.isFrozen(initial)).toBe(true);
    expect(initial).toEqual({
      phase: 'LOADING',
      interactiveReady: false,
      saveInitialized: false,
      fontsReady: false,
      playerAssetState: 'PENDING',
      elapsedMs: 0,
      errorCode: null,
    });

    // Save settles at +45ms while fonts and player.glb are still loading:
    now = 1045;
    loading.markSaveInitialized(true);
    const afterSave = loading.getSnapshot();
    expect(afterSave.interactiveReady).toBe(true);
    expect(afterSave.saveInitialized).toBe(true);
    expect(afterSave.phase).toBe('LOADING');
    expect(afterSave.elapsedMs).toBe(45);

    // Fonts settle and player.glb finishes loading at +120ms:
    now = 1120;
    loading.markFontsReady(true);
    loading.markPlayerAsset('READY');
    const readySnap = loading.getSnapshot();
    expect(readySnap).toEqual({
      phase: 'READY',
      interactiveReady: true,
      saveInitialized: true,
      fontsReady: true,
      playerAssetState: 'READY',
      elapsedMs: 120,
      errorCode: null,
    });
  });

  it('enters DEGRADED phase with interactiveReady=true when player.glb falls back or storage fails', () => {
    let now = 500;
    const assetFallbackLoader = new LoadingStateController(() => now);
    assetFallbackLoader.markSaveInitialized(true);
    assetFallbackLoader.markFontsReady(true);
    now = 650;
    assetFallbackLoader.markPlayerAsset('FALLBACK');

    expect(assetFallbackLoader.getSnapshot()).toEqual({
      phase: 'DEGRADED',
      interactiveReady: true,
      saveInitialized: true,
      fontsReady: true,
      playerAssetState: 'FALLBACK',
      elapsedMs: 150,
      errorCode: null,
    });

    const storageErrorLoader = new LoadingStateController(() => now);
    storageErrorLoader.markSaveInitialized(false, 'STORAGE_UNAVAILABLE');
    expect(storageErrorLoader.getSnapshot()).toMatchObject({
      phase: 'DEGRADED',
      interactiveReady: true,
      saveInitialized: false,
      errorCode: 'STORAGE_UNAVAILABLE',
    });
  });

  it('projects all 5 skins with accurate statusLabelZh across wallet balances and ownership states', () => {
    const view = getShopCatalogView({
      walletCoins: 160,
      ownedSkinIds: ['cyan', 'pink'],
      selectedSkinId: 'pink',
    });

    expect(Object.isFrozen(view)).toBe(true);
    expect(view.map((item) => item.id)).toEqual(['cyan', 'pink', 'gold', 'green', 'purple']);

    const byId = Object.fromEntries(view.map((item) => [item.id, item]));
    expect(byId.cyan).toMatchObject({
      owned: true,
      equipped: false,
      affordable: true,
      statusLabelZh: '可装备',
    });
    expect(byId.pink).toMatchObject({
      owned: true,
      equipped: true,
      affordable: true,
      statusLabelZh: '已装备',
    });
    expect(byId.gold).toMatchObject({
      price: 150,
      owned: false,
      equipped: false,
      affordable: true,
      statusLabelZh: '可购买',
    });
    expect(byId.green).toMatchObject({
      price: 300,
      owned: false,
      equipped: false,
      affordable: false,
      statusLabelZh: '余额不足',
    });
    expect(byId.purple).toMatchObject({
      price: 500,
      owned: false,
      equipped: false,
      affordable: false,
      statusLabelZh: '余额不足',
    });
  });

  it('persists presentation preferences independently of paoku_save_v1 and survives storage errors', () => {
    const storage = new MemoryStorage();
    const controller = new ProgressionFlowController({ storage });

    expect(controller.getPreferences()).toEqual(DEFAULT_PRESENTATION_PREFS);

    controller.setReducedMotion(true);
    controller.setQualityMode('Q1');
    expect(controller.getPreferences()).toEqual({
      reducedMotion: true,
      qualityMode: 'Q1',
    });
    expect(storage.data.has(SAVE_KEY)).toBe(false);
    expect(JSON.parse(storage.data.get(PRESENTATION_PREFS_KEY)!)).toEqual({
      reducedMotion: true,
      qualityMode: 'Q1',
    });

    // Reload from same storage:
    const reloaded = new ProgressionFlowController({ storage });
    expect(reloaded.getPreferences()).toEqual({
      reducedMotion: true,
      qualityMode: 'Q1',
    });

    // Survives corrupt JSON and write failures gracefully:
    storage.data.set(PRESENTATION_PREFS_KEY, '{corrupt-json');
    const recovered = new ProgressionFlowController({ storage });
    expect(recovered.getPreferences()).toEqual(DEFAULT_PRESENTATION_PREFS);

    storage.failWrites = true;
    expect(() => recovered.updatePreferences({ reducedMotion: true, qualityMode: 'Q0' })).not.toThrow();
    expect(recovered.getPreferences()).toEqual({
      reducedMotion: true,
      qualityMode: 'Q0',
    });
  });

  it('completes end-to-end mission settlement, wallet credit, shop skin purchase/equip, and audio settings', async () => {
    const storage = new MemoryStorage();
    const repo = new SaveRepository(storage, immediateLock);
    let runSeq = 0;
    const app = new AppService(repo, () => `run-${++runSeq}`);
    const flow = new ProgressionFlowController({ storage });

    const initRes = await app.initialize();
    flow.loading.markSaveInitialized(initRes.ok, initRes.errorCode ?? null);
    flow.loading.markFontsReady(true);
    flow.loading.markPlayerAsset('READY');
    expect(flow.getLoadingSnapshot().phase).toBe('READY');

    // Start run 1 and complete COLLECT_COINS (30 coins -> +50 reward) + JUMP_TIMES (10 jumps -> +40 reward)
    await app.dispatch({ commandId: 'cmd-start-1', type: 'START_RUN' });
    const ms = new MissionSystem();
    const missions = ms.initMissions();
    const ctx = createGameContext(missions);

    for (let i = 0; i < 30; i++) {
      recordCoinPickup(ctx);
    }
    for (let i = 0; i < 10; i++) {
      ms.trackAction(missions, 'JUMP');
    }
    ctx.score = 520; // Completes SCORE_REACH (500 -> +100 reward)
    ms.update(ctx);

    const missionSummary = flow.getMissionSummary(missions, ctx.runLedger);
    expect(missionSummary.filter((m) => m.completed).map((m) => m.id)).toEqual(['m1', 'm2', 'm4']);
    expect(ctx.runLedger?.pickupCoins).toBe(30);
    expect(ctx.runLedger?.rewardCoins).toBe(50 + 40 + 100);
    expect(ctx.coins).toBe(220);

    // Settle run into AppService:
    const finishRes = await app.finish({
      runId: 'run-1',
      scoreInt: 520,
      pickupCount: ctx.runLedger!.pickupCount,
      pickupCoins: ctx.runLedger!.pickupCoins,
      rewardCoins: ctx.runLedger!.rewardCoins,
      earnedCoins: ctx.coins,
      endReason: 'COLLISION',
    });
    expect(finishRes.ok).toBe(true);
    expect(app.snapshot.walletCoins).toBe(220);
    expect(app.snapshot.highScore).toBe(520);

    // Open shop from GAMEOVER, buy 'gold' (150 coins), and verify catalog:
    expect((await app.dispatch({ commandId: 'cmd-open-shop', type: 'OPEN_SHOP', runId: 'run-1' })).ok).toBe(true);
    expect((await app.dispatch({ commandId: 'cmd-buy-gold', type: 'BUY_SKIN', skinId: 'gold' })).ok).toBe(true);
    expect(app.snapshot.walletCoins).toBe(70);
    expect(app.snapshot.selectedSkinId).toBe('gold');

    const catalogAfterBuy = flow.getShopCatalogView(app.snapshot);
    expect(catalogAfterBuy.find((s) => s.id === 'gold')?.statusLabelZh).toBe('已装备');
    expect(catalogAfterBuy.find((s) => s.id === 'cyan')?.statusLabelZh).toBe('可装备');
    expect(catalogAfterBuy.find((s) => s.id === 'pink')?.statusLabelZh).toBe('可购买'); // 70 >= 50

    // Update audio settings and equip cyan:
    expect(
      (
        await app.dispatch({
          commandId: 'cmd-audio-1',
          type: 'UPDATE_AUDIO',
          audioOperation: { kind: 'SET_VOLUME', field: 'bgmVolume', value: 0.35 },
        })
      ).ok
    ).toBe(true);
    expect((await app.dispatch({ commandId: 'cmd-equip-cyan', type: 'EQUIP_SKIN', skinId: 'cyan' })).ok).toBe(true);
    expect(app.snapshot.selectedSkinId).toBe('cyan');
    expect(app.snapshot.audio.bgmVolume).toBe(0.35);
  });

  it('ignores unknown quality mode mutations while preserving existing preferences', () => {
    const storage = new MemoryStorage();
    const flow = new ProgressionFlowController({ storage });
    flow.setQualityMode('Q2');
    // Force an invalid runtime value to verify defensive guard:
    flow.setQualityMode('INVALID_TIER' as unknown as 'AUTO');
    expect(flow.getPreferences().qualityMode).toBe('Q2');
  });
});
