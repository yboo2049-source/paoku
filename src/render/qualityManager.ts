import { frozenCopy } from '../application/types';

export type QualityTier = 'Q2' | 'Q1' | 'Q0';
export type QualityMode = 'AUTO' | QualityTier;

export interface QualityPreset {
  readonly tier: QualityTier;
  readonly labelZh: string;
  readonly targetFps: number;
  readonly p95BudgetMs: number;
  readonly p99BudgetMs: number;
  readonly maxDpr: number;
  readonly hardwareScalingLevel: number;
  readonly shadowMapSize: number;
  readonly shadowRange: number;
  readonly glowEnabled: boolean;
  readonly glowIntensity: number;
  readonly fxaaEnabled: boolean;
  readonly particleScale: number;
  readonly maxActiveParticles: number;
  readonly maxDrawCallsBudget: number;
  readonly maxTrianglesBudget: number;
}

export const QUALITY_PRESETS: Readonly<Record<QualityTier, QualityPreset>> = frozenCopy({
  Q2: {
    tier: 'Q2',
    labelZh: '高画质 (桌面)',
    targetFps: 60,
    p95BudgetMs: 18,
    p99BudgetMs: 33.3,
    maxDpr: 1.5,
    hardwareScalingLevel: 1.0,
    shadowMapSize: 1024,
    shadowRange: 80,
    glowEnabled: true,
    glowIntensity: 0.15,
    fxaaEnabled: true,
    particleScale: 1.0,
    maxActiveParticles: 400,
    maxDrawCallsBudget: 150,
    maxTrianglesBudget: 250000,
  },
  Q1: {
    tier: 'Q1',
    labelZh: '均衡画质 (移动基线)',
    targetFps: 60,
    p95BudgetMs: 20,
    p99BudgetMs: 33.3,
    maxDpr: 1.25,
    hardwareScalingLevel: 1.25,
    shadowMapSize: 512,
    shadowRange: 50,
    glowEnabled: true,
    glowIntensity: 0.10,
    fxaaEnabled: true,
    particleScale: 0.5,
    maxActiveParticles: 200,
    maxDrawCallsBudget: 100,
    maxTrianglesBudget: 150000,
  },
  Q0: {
    tier: 'Q0',
    labelZh: '流畅兼容 (低配)',
    targetFps: 30,
    p95BudgetMs: 36,
    p99BudgetMs: 50.0,
    maxDpr: 1.0,
    hardwareScalingLevel: 1.5,
    shadowMapSize: 256,
    shadowRange: 30,
    glowEnabled: false,
    glowIntensity: 0,
    fxaaEnabled: false,
    particleScale: 0.2,
    maxActiveParticles: 80,
    maxDrawCallsBudget: 60,
    maxTrianglesBudget: 80000,
  },
});

export interface FramePercentiles {
  readonly sampleCount: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  readonly over50MsRatio: number;
  readonly estimatedFps: number;
}

export interface SceneResourceReport {
  readonly meshCount: number;
  readonly materialCount: number;
  readonly textureCount: number;
  readonly particleSystemCount: number;
  readonly activeParticlesEstimate: number;
  readonly withinBudget: boolean;
}

export interface QualityDiagnostics {
  readonly mode: QualityMode;
  readonly activeTier: QualityTier;
  readonly manualLock: boolean;
  readonly preset: Readonly<QualityPreset>;
  readonly percentiles: Readonly<FramePercentiles>;
  readonly consecutiveOverBudgetWindows: number;
  readonly consecutiveHeadroomWindows: number;
  readonly downgradeCount: number;
  readonly upgradeCount: number;
  readonly lastTierChangeMs: number | null;
  readonly cooldownRemainingMs: number;
}

export interface QualityManagerOptions {
  readonly initialMode?: QualityMode;
  readonly viewportWidth?: number;
  readonly maxSamples?: number;
  readonly windowDurationMs?: number;
  readonly cooldownMs?: number;
}

function computePercentileFromSorted(sorted: readonly number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil(percentile * sorted.length) - 1;
  const index = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[index];
}

function selectInitialTierForViewport(viewportWidth: number): QualityTier {
  return viewportWidth < 768 ? 'Q1' : 'Q2';
}

function stepTierDown(tier: QualityTier): QualityTier {
  if (tier === 'Q2') return 'Q1';
  return 'Q0';
}

function stepTierUp(tier: QualityTier): QualityTier {
  if (tier === 'Q0') return 'Q1';
  return 'Q2';
}

export class QualityManager {
  private mode: QualityMode;
  private activeTier: QualityTier;
  private manualLock: boolean;
  private viewportWidth: number;
  private readonly maxSamples: number;
  private readonly windowDurationMs: number;
  private readonly cooldownMs: number;

  private readonly samples: number[] = [];
  private windowSamples: number[] = [];
  private windowStartMs: number | null = null;
  private syntheticNowMs = 0;
  private lastObservedNowMs = 0;
  private lastTierChangeMs: number | null = null;

  private consecutiveOverBudgetWindows = 0;
  private consecutiveHeadroomWindows = 0;
  private downgradeCount = 0;
  private upgradeCount = 0;

  constructor(options?: QualityManagerOptions) {
    const defaultWidth = typeof window !== 'undefined' && Number.isFinite(window.innerWidth) ? window.innerWidth : 1280;
    this.viewportWidth =
      options?.viewportWidth !== undefined && Number.isFinite(options.viewportWidth)
        ? options.viewportWidth
        : defaultWidth;
    this.maxSamples = options?.maxSamples ?? 360;
    this.windowDurationMs = options?.windowDurationMs ?? 5000;
    this.cooldownMs = options?.cooldownMs ?? 30000;

    const initialMode = options?.initialMode ?? 'AUTO';
    this.mode = initialMode;
    if (initialMode === 'AUTO') {
      this.manualLock = false;
      this.activeTier = selectInitialTierForViewport(this.viewportWidth);
    } else {
      this.manualLock = true;
      this.activeTier = initialMode;
    }
  }

  public getMode(): QualityMode {
    return this.mode;
  }

  public getActiveTier(): QualityTier {
    return this.activeTier;
  }

  public getActivePreset(): Readonly<QualityPreset> {
    return QUALITY_PRESETS[this.activeTier];
  }

  public isManualLock(): boolean {
    return this.manualLock;
  }

  public setMode(mode: QualityMode, viewportWidth?: number): Readonly<QualityPreset> {
    if (viewportWidth !== undefined && Number.isFinite(viewportWidth)) {
      this.viewportWidth = viewportWidth;
    }

    this.mode = mode;
    this.consecutiveOverBudgetWindows = 0;
    this.consecutiveHeadroomWindows = 0;
    this.windowSamples = [];
    this.windowStartMs = null;

    if (mode === 'AUTO') {
      this.manualLock = false;
      this.activeTier = selectInitialTierForViewport(this.viewportWidth);
    } else {
      this.manualLock = true;
      this.activeTier = mode;
    }

    return this.getActivePreset();
  }

  public recordFrame(frameIntervalMs: number, nowMs?: number): void {
    if (!Number.isFinite(frameIntervalMs) || frameIntervalMs <= 0 || frameIntervalMs > 1000) {
      return;
    }

    let currentTimestampMs: number;
    if (nowMs !== undefined && Number.isFinite(nowMs)) {
      currentTimestampMs = nowMs;
      this.syntheticNowMs = nowMs;
    } else {
      this.syntheticNowMs += frameIntervalMs;
      currentTimestampMs = this.syntheticNowMs;
    }
    this.lastObservedNowMs = currentTimestampMs;

    if (this.windowStartMs === null) {
      this.windowStartMs = currentTimestampMs - frameIntervalMs;
    }

    this.samples.push(frameIntervalMs);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    this.windowSamples.push(frameIntervalMs);

    const windowElapsed = currentTimestampMs - this.windowStartMs;
    if (windowElapsed >= this.windowDurationMs && this.windowSamples.length > 0) {
      this.evaluateWindow(currentTimestampMs);
      this.windowSamples = [];
      this.windowStartMs = currentTimestampMs;
    }
  }

  private evaluateWindow(currentTimestampMs: number): void {
    if (this.manualLock || this.mode !== 'AUTO') {
      this.consecutiveOverBudgetWindows = 0;
      this.consecutiveHeadroomWindows = 0;
      return;
    }

    const sortedWindow = [...this.windowSamples].sort((a, b) => a - b);
    const windowP95 = computePercentileFromSorted(sortedWindow, 0.95);
    const activePreset = QUALITY_PRESETS[this.activeTier];
    const cooldownElapsed =
      this.lastTierChangeMs === null || currentTimestampMs - this.lastTierChangeMs >= this.cooldownMs;

    if (windowP95 > activePreset.p95BudgetMs) {
      this.consecutiveOverBudgetWindows += 1;
      this.consecutiveHeadroomWindows = 0;

      if (this.consecutiveOverBudgetWindows >= 3 && cooldownElapsed && this.activeTier !== 'Q0') {
        this.activeTier = stepTierDown(this.activeTier);
        this.downgradeCount += 1;
        this.lastTierChangeMs = currentTimestampMs;
        this.consecutiveOverBudgetWindows = 0;
        this.consecutiveHeadroomWindows = 0;
      }
    } else if (windowP95 <= activePreset.p95BudgetMs * 0.8) {
      this.consecutiveHeadroomWindows += 1;
      this.consecutiveOverBudgetWindows = 0;

      if (this.consecutiveHeadroomWindows >= 12 && cooldownElapsed && this.activeTier !== 'Q2') {
        this.activeTier = stepTierUp(this.activeTier);
        this.upgradeCount += 1;
        this.lastTierChangeMs = currentTimestampMs;
        this.consecutiveHeadroomWindows = 0;
        this.consecutiveOverBudgetWindows = 0;
      }
    } else {
      this.consecutiveOverBudgetWindows = 0;
      this.consecutiveHeadroomWindows = 0;
    }
  }

  public computePercentiles(): Readonly<FramePercentiles> {
    const sampleCount = this.samples.length;
    if (sampleCount === 0) {
      return Object.freeze({
        sampleCount: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        over50MsRatio: 0,
        estimatedFps: 0,
      });
    }

    const sorted = [...this.samples].sort((a, b) => a - b);
    const p50Ms = computePercentileFromSorted(sorted, 0.5);
    const p95Ms = computePercentileFromSorted(sorted, 0.95);
    const p99Ms = computePercentileFromSorted(sorted, 0.99);

    let over50Count = 0;
    let sumMs = 0;
    for (const s of this.samples) {
      sumMs += s;
      if (s > 50) {
        over50Count += 1;
      }
    }

    const avgMs = sumMs / sampleCount;
    const estimatedFps = avgMs > 0 ? Number((1000 / avgMs).toFixed(2)) : 0;

    return Object.freeze({
      sampleCount,
      p50Ms,
      p95Ms,
      p99Ms,
      over50MsRatio: over50Count / sampleCount,
      estimatedFps,
    });
  }

  public inspectSceneResources(
    scene?: {
      meshes?: readonly any[];
      materials?: readonly any[];
      textures?: readonly any[];
      particleSystems?: readonly any[];
    } | null
  ): Readonly<SceneResourceReport> {
    const rawMeshes = Array.isArray(scene?.meshes) ? scene.meshes : [];
    const meshCount = rawMeshes.filter(
      (m) =>
        m &&
        m.isVisible !== false &&
        (typeof m.isEnabled !== 'function' || m.isEnabled()) &&
        (typeof m.getTotalVertices !== 'function' || m.getTotalVertices() > 0)
    ).length;
    const materialCount = Array.isArray(scene?.materials) ? scene.materials.length : 0;
    const textureCount = Array.isArray(scene?.textures) ? scene.textures.length : 0;
    const particleSystems = Array.isArray(scene?.particleSystems) ? scene.particleSystems : [];
    const particleSystemCount = particleSystems.length;

    const preset = QUALITY_PRESETS[this.activeTier];
    let activeParticlesEstimate = 0;
    for (const ps of particleSystems) {
      if (ps && typeof ps.getActiveCount === 'function') {
        const count = Number(ps.getActiveCount());
        if (Number.isFinite(count) && count > 0) activeParticlesEstimate += count;
      } else if (ps && typeof ps.activeCount === 'number' && Number.isFinite(ps.activeCount)) {
        activeParticlesEstimate += Math.max(0, ps.activeCount);
      } else if (ps && typeof ps.getCapacity === 'function') {
        const cap = Number(ps.getCapacity());
        if (Number.isFinite(cap) && cap > 0) activeParticlesEstimate += Math.round(cap * preset.particleScale);
      } else if (ps && typeof ps.capacity === 'number' && Number.isFinite(ps.capacity)) {
        activeParticlesEstimate += Math.max(0, Math.round(ps.capacity * preset.particleScale));
      }
    }

    const withinBudget =
      meshCount <= preset.maxDrawCallsBudget && activeParticlesEstimate <= preset.maxActiveParticles;

    return Object.freeze({
      meshCount,
      materialCount,
      textureCount,
      particleSystemCount,
      activeParticlesEstimate,
      withinBudget,
    });
  }

  public getDiagnostics(): Readonly<QualityDiagnostics> {
    const cooldownRemainingMs =
      this.lastTierChangeMs === null
        ? 0
        : Math.max(0, this.cooldownMs - Math.max(0, this.lastObservedNowMs - this.lastTierChangeMs));

    return Object.freeze({
      mode: this.mode,
      activeTier: this.activeTier,
      manualLock: this.manualLock,
      preset: QUALITY_PRESETS[this.activeTier],
      percentiles: this.computePercentiles(),
      consecutiveOverBudgetWindows: this.consecutiveOverBudgetWindows,
      consecutiveHeadroomWindows: this.consecutiveHeadroomWindows,
      downgradeCount: this.downgradeCount,
      upgradeCount: this.upgradeCount,
      lastTierChangeMs: this.lastTierChangeMs,
      cooldownRemainingMs,
    });
  }
}
