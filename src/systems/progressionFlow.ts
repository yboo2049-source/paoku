import type { Mission, RunLedger } from '../types';
import type { DeepReadonly } from '../types/contracts';
import type { AppSnapshot, ErrorCode } from '../application/types';
import { frozenCopy } from '../application/types';
import { SKINS } from '../application/skinCatalog';
import type { SaveStorage } from '../application/saveRepository';
import type { QualityMode } from '../render/qualityManager';

export type RunRewardLedger = RunLedger;

export interface MissionLocalizationEntry {
  readonly titleZh: string;
  readonly descriptionZh: string;
  readonly iconKey: string;
}

export const MISSION_LOCALIZATION: Readonly<Record<string, MissionLocalizationEntry>> = frozenCopy({
  m1: {
    titleZh: '金币收集者',
    descriptionZh: '单局拾取 30 枚金币',
    iconKey: 'coin',
  },
  m2: {
    titleZh: '高空跳跃者',
    descriptionZh: '单局完成 10 次有效起跳',
    iconKey: 'jump',
  },
  m3: {
    titleZh: '滑铲达人',
    descriptionZh: '单局完成 8 次有效翻滚滑铲',
    iconKey: 'roll',
  },
  m4: {
    titleZh: '高分冲刺者',
    descriptionZh: '单局得分达到 500 分',
    iconKey: 'score',
  },
});

const FALLBACK_LOCALIZATION_BY_TYPE: Readonly<Record<Mission['type'], MissionLocalizationEntry>> = frozenCopy({
  COLLECT_COINS: MISSION_LOCALIZATION.m1,
  JUMP_TIMES: MISSION_LOCALIZATION.m2,
  ROLL_TIMES: MISSION_LOCALIZATION.m3,
  SCORE_REACH: MISSION_LOCALIZATION.m4,
});

export interface LocalizedMissionView {
  readonly id: string;
  readonly type: Mission['type'];
  readonly title: string;
  readonly titleZh: string;
  readonly description: string;
  readonly descriptionZh: string;
  readonly iconKey: string;
  readonly current: number;
  readonly target: number;
  readonly progressRatio: number;
  readonly rewardCoins: number;
  readonly completed: boolean;
}

export function formatMissionSummary(
  missions: readonly Mission[],
  ledger?: DeepReadonly<RunRewardLedger> | null
): ReadonlyArray<LocalizedMissionView> {
  if (!missions || !Array.isArray(missions)) {
    return Object.freeze([]);
  }

  const views = (missions as readonly Mission[]).map((mission: Mission) => {
    const loc =
      MISSION_LOCALIZATION[mission.id] ??
      FALLBACK_LOCALIZATION_BY_TYPE[mission.type] ?? {
        titleZh: mission.title,
        descriptionZh: mission.description,
        iconKey: 'mission',
      };

    const rawCurrent =
      mission.type === 'COLLECT_COINS' && ledger && typeof ledger.pickupCount === 'number'
        ? Math.max(mission.current, ledger.pickupCount)
        : mission.current;
    const safeCurrent = Number.isFinite(rawCurrent) ? Math.max(0, rawCurrent) : 0;
    const safeTarget = Number.isFinite(mission.target) && mission.target > 0 ? mission.target : 1;
    const rewardedInLedger = Boolean(ledger?.rewardedMissionIds?.includes(mission.id));
    const completed = Boolean(mission.completed || rewardedInLedger || safeCurrent >= safeTarget);
    const progressRatio = completed ? 1 : Math.min(1, Math.max(0, safeCurrent / safeTarget));

    return Object.freeze({
      id: mission.id,
      type: mission.type,
      title: mission.title,
      titleZh: loc.titleZh,
      description: mission.description,
      descriptionZh: loc.descriptionZh,
      iconKey: loc.iconKey,
      current: safeCurrent,
      target: mission.target,
      progressRatio,
      rewardCoins: mission.rewardCoins,
      completed,
    });
  });

  return Object.freeze(views);
}

export type LoadingPhase = 'LOADING' | 'READY' | 'DEGRADED';
export type PlayerAssetLoadState = 'PENDING' | 'READY' | 'FALLBACK';

export interface LoadingStateSnapshot {
  readonly phase: LoadingPhase;
  readonly interactiveReady: boolean;
  readonly saveInitialized: boolean;
  readonly fontsReady: boolean;
  readonly playerAssetState: PlayerAssetLoadState;
  readonly elapsedMs: number;
  readonly errorCode: ErrorCode | null;
}

export class LoadingStateController {
  private readonly nowProvider: () => number;
  private readonly startedAtMs: number;
  private saveSettled = false;
  private saveInitialized = false;
  private fontsReady = false;
  private fontsDegraded = false;
  private playerAssetState: PlayerAssetLoadState = 'PENDING';
  private errorCode: ErrorCode | null = null;

  constructor(nowProvider: () => number = () => Date.now()) {
    this.nowProvider = nowProvider;
    this.startedAtMs = this.nowProvider();
  }

  public markSaveInitialized(ok: boolean, errorCode: ErrorCode | null = null): void {
    this.saveSettled = true;
    this.saveInitialized = Boolean(ok);
    this.errorCode = ok ? null : (errorCode ?? 'STORAGE_UNAVAILABLE');
  }

  public markFontsReady(ok = true): void {
    this.fontsReady = true;
    this.fontsDegraded = !ok;
  }

  public markPlayerAsset(state: 'READY' | 'FALLBACK'): void {
    if (state === 'READY' || state === 'FALLBACK') {
      this.playerAssetState = state;
    }
  }

  public getSnapshot(): Readonly<LoadingStateSnapshot> {
    const elapsedMs = Math.max(0, this.nowProvider() - this.startedAtMs);
    const interactiveReady = this.saveSettled;

    let phase: LoadingPhase = 'LOADING';
    if (this.saveSettled) {
      if (!this.saveInitialized || this.errorCode !== null || this.playerAssetState === 'FALLBACK' || this.fontsDegraded) {
        phase = 'DEGRADED';
      } else if (this.fontsReady && this.playerAssetState === 'READY') {
        phase = 'READY';
      } else {
        phase = 'LOADING';
      }
    }

    return Object.freeze({
      phase,
      interactiveReady,
      saveInitialized: this.saveInitialized,
      fontsReady: this.fontsReady,
      playerAssetState: this.playerAssetState,
      elapsedMs,
      errorCode: this.errorCode,
    });
  }
}

export type ShopItemStatusZh = '已装备' | '可装备' | '可购买' | '余额不足';

export interface ShopCatalogItemView {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly color: string;
  readonly secondaryColor: string;
  readonly description: string;
  readonly owned: boolean;
  readonly equipped: boolean;
  readonly affordable: boolean;
  readonly statusLabelZh: ShopItemStatusZh;
}

export function getShopCatalogView(
  app: Pick<AppSnapshot, 'walletCoins' | 'ownedSkinIds' | 'selectedSkinId'>
): ReadonlyArray<ShopCatalogItemView> {
  const ownedSet = new Set(app.ownedSkinIds ?? []);
  const walletCoins = Number.isFinite(app.walletCoins) ? Math.max(0, app.walletCoins) : 0;

  const catalog = SKINS.map((skin) => {
    const owned = ownedSet.has(skin.id);
    const equipped = owned && app.selectedSkinId === skin.id;
    const affordable = walletCoins >= skin.price;

    let statusLabelZh: ShopItemStatusZh;
    if (equipped) {
      statusLabelZh = '已装备';
    } else if (owned) {
      statusLabelZh = '可装备';
    } else if (affordable) {
      statusLabelZh = '可购买';
    } else {
      statusLabelZh = '余额不足';
    }

    return Object.freeze({
      id: skin.id,
      name: skin.name,
      price: skin.price,
      color: skin.color,
      secondaryColor: skin.secondaryColor,
      description: skin.description,
      owned,
      equipped,
      affordable,
      statusLabelZh,
    });
  });

  return Object.freeze(catalog);
}

export const PRESENTATION_PREFS_KEY = 'paoku_presentation_prefs_v1';

export interface PresentationPreferences {
  readonly reducedMotion: boolean;
  readonly qualityMode: QualityMode;
}

export const DEFAULT_PRESENTATION_PREFS: Readonly<PresentationPreferences> = Object.freeze({
  reducedMotion: false,
  qualityMode: 'AUTO',
});

function isValidQualityMode(value: unknown): value is QualityMode {
  return value === 'AUTO' || value === 'Q2' || value === 'Q1' || value === 'Q0';
}

export class ProgressionFlowController {
  private readonly storage: SaveStorage | null;
  private readonly loadingController: LoadingStateController;
  private preferences: PresentationPreferences;

  constructor(options?: {
    storage?: SaveStorage | null;
    nowProvider?: () => number;
  }) {
    this.storage =
      options?.storage !== undefined
        ? options.storage
        : typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : null;
    this.loadingController = new LoadingStateController(options?.nowProvider);
    this.preferences = this.loadPreferencesFromStorage();
  }

  private loadPreferencesFromStorage(): PresentationPreferences {
    if (!this.storage) {
      return { ...DEFAULT_PRESENTATION_PREFS };
    }
    try {
      const raw = this.storage.getItem(PRESENTATION_PREFS_KEY);
      if (!raw) {
        return { ...DEFAULT_PRESENTATION_PREFS };
      }
      const parsed = JSON.parse(raw) as Partial<PresentationPreferences>;
      return {
        reducedMotion: typeof parsed?.reducedMotion === 'boolean' ? parsed.reducedMotion : false,
        qualityMode: isValidQualityMode(parsed?.qualityMode) ? parsed.qualityMode : 'AUTO',
      };
    } catch {
      return { ...DEFAULT_PRESENTATION_PREFS };
    }
  }

  private persistPreferences(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(PRESENTATION_PREFS_KEY, JSON.stringify(this.preferences));
    } catch {
      // Presentation preferences are non-authoritative client hints; ignore quota/access errors.
    }
  }

  public get loading(): LoadingStateController {
    return this.loadingController;
  }

  public getLoadingSnapshot(): Readonly<LoadingStateSnapshot> {
    return this.loadingController.getSnapshot();
  }

  public getPreferences(): Readonly<PresentationPreferences> {
    return Object.freeze({ ...this.preferences });
  }

  public setReducedMotion(reducedMotion: boolean): Readonly<PresentationPreferences> {
    this.preferences = {
      ...this.preferences,
      reducedMotion: Boolean(reducedMotion),
    };
    this.persistPreferences();
    return this.getPreferences();
  }

  public setQualityMode(qualityMode: QualityMode): Readonly<PresentationPreferences> {
    if (!isValidQualityMode(qualityMode)) {
      return this.getPreferences();
    }
    this.preferences = {
      ...this.preferences,
      qualityMode,
    };
    this.persistPreferences();
    return this.getPreferences();
  }

  public updatePreferences(patch: Partial<PresentationPreferences>): Readonly<PresentationPreferences> {
    const nextReducedMotion =
      typeof patch.reducedMotion === 'boolean' ? patch.reducedMotion : this.preferences.reducedMotion;
    const nextQualityMode = isValidQualityMode(patch.qualityMode)
      ? patch.qualityMode
      : this.preferences.qualityMode;

    this.preferences = {
      reducedMotion: nextReducedMotion,
      qualityMode: nextQualityMode,
    };
    this.persistPreferences();
    return this.getPreferences();
  }

  public getShopCatalogView(
    app: Pick<AppSnapshot, 'walletCoins' | 'ownedSkinIds' | 'selectedSkinId'>
  ): ReadonlyArray<ShopCatalogItemView> {
    return getShopCatalogView(app);
  }

  public getMissionSummary(
    missions: readonly Mission[],
    ledger?: DeepReadonly<RunRewardLedger> | null
  ): ReadonlyArray<LocalizedMissionView> {
    return formatMissionSummary(missions, ledger);
  }
}
