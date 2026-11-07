import { describe, expect, it } from 'vitest';
import {
  QUALITY_PRESETS,
  QualityManager,
  type QualityTier,
} from '../../src/render/qualityManager';

function feedWindow(
  manager: QualityManager,
  intervalMs: number,
  startNowMs: number,
  durationMs = 5000
): number {
  const steps = Math.ceil(durationMs / intervalMs);
  let now = startNowMs;
  for (let i = 0; i < steps; i++) {
    now += intervalMs;
    manager.recordFrame(intervalMs, now);
  }
  return now;
}

describe('PAO-25 Device Performance Telemetry, Quality Tiers & Auto-Scaling', () => {
  it('exposes deep-frozen QUALITY_PRESETS matching PAO-8 §4 tier specifications', () => {
    expect(Object.isFrozen(QUALITY_PRESETS)).toBe(true);
    expect(Object.isFrozen(QUALITY_PRESETS.Q2)).toBe(true);
    expect(Object.isFrozen(QUALITY_PRESETS.Q1)).toBe(true);
    expect(Object.isFrozen(QUALITY_PRESETS.Q0)).toBe(true);

    expect(QUALITY_PRESETS.Q2).toMatchObject({
      tier: 'Q2',
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
    });

    expect(QUALITY_PRESETS.Q1).toMatchObject({
      tier: 'Q1',
      targetFps: 60,
      p95BudgetMs: 20,
      p99BudgetMs: 33.3,
      maxDpr: 1.25,
      hardwareScalingLevel: 1.25,
      shadowMapSize: 512,
      shadowRange: 50,
      glowEnabled: true,
      glowIntensity: 0.1,
      fxaaEnabled: true,
      particleScale: 0.5,
      maxActiveParticles: 200,
      maxDrawCallsBudget: 100,
      maxTrianglesBudget: 150000,
    });

    expect(QUALITY_PRESETS.Q0).toMatchObject({
      tier: 'Q0',
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
    });
  });

  it('selects initial tier based on viewport width in AUTO mode and honors explicit manual modes', () => {
    const desktopAuto = new QualityManager({ initialMode: 'AUTO', viewportWidth: 1440 });
    expect(desktopAuto.getActiveTier()).toBe('Q2');
    expect(desktopAuto.isManualLock()).toBe(false);

    const mobileAuto = new QualityManager({ initialMode: 'AUTO', viewportWidth: 390 });
    expect(mobileAuto.getActiveTier()).toBe('Q1');
    expect(mobileAuto.isManualLock()).toBe(false);

    const manualLow = new QualityManager({ initialMode: 'Q0', viewportWidth: 1920 });
    expect(manualLow.getActiveTier()).toBe('Q0');
    expect(manualLow.isManualLock()).toBe(true);
  });

  it('calculates p50, p95, p99, over50MsRatio, and filters invalid or background-suspended intervals', () => {
    const manager = new QualityManager({ initialMode: 'Q2', maxSamples: 100 });

    // Invalid intervals must be ignored:
    manager.recordFrame(0);
    manager.recordFrame(-16);
    manager.recordFrame(Number.NaN);
    manager.recordFrame(Number.POSITIVE_INFINITY);
    manager.recordFrame(1001); // >1000ms background tab suspension
    expect(manager.computePercentiles().sampleCount).toBe(0);

    // Record 100 valid samples: 1..100ms
    for (let i = 1; i <= 100; i++) {
      manager.recordFrame(i, i * 10);
    }

    const stats = manager.computePercentiles();
    expect(Object.isFrozen(stats)).toBe(true);
    expect(stats.sampleCount).toBe(100);
    expect(stats.p50Ms).toBe(50);
    expect(stats.p95Ms).toBe(95);
    expect(stats.p99Ms).toBe(99);
    expect(stats.over50MsRatio).toBe(0.5); // 51..100 -> 50 samples
    expect(stats.estimatedFps).toBeGreaterThan(0);

    // Verify rolling buffer cap at 100 samples:
    manager.recordFrame(20, 1100);
    expect(manager.computePercentiles().sampleCount).toBe(100);
  });

  it('downgrades Q2 -> Q1 after 3 consecutive 5s over-budget windows and resets on healthy window', () => {
    const manager = new QualityManager({ initialMode: 'AUTO', viewportWidth: 1280 });
    expect(manager.getActiveTier()).toBe('Q2');

    let now = 0;
    // 2 over-budget windows (22ms > 18ms Q2 budget), then 1 healthy window (16ms <= 18ms):
    now = feedWindow(manager, 22, now, 5000);
    now = feedWindow(manager, 22, now, 5000);
    expect(manager.getDiagnostics().consecutiveOverBudgetWindows).toBe(2);
    expect(manager.getActiveTier()).toBe('Q2');

    now = feedWindow(manager, 16, now, 5000);
    expect(manager.getDiagnostics().consecutiveOverBudgetWindows).toBe(0);
    expect(manager.getActiveTier()).toBe('Q2');

    // Now 3 consecutive 5s windows over 18ms budget -> downgrades Q2 -> Q1:
    now = feedWindow(manager, 22, now, 5000);
    now = feedWindow(manager, 22, now, 5000);
    now = feedWindow(manager, 22, now, 5000);

    const diag = manager.getDiagnostics();
    expect(diag.activeTier).toBe('Q1');
    expect(diag.downgradeCount).toBe(1);
    expect(diag.consecutiveOverBudgetWindows).toBe(0);
  });

  it('enforces 30s cooldown between consecutive tier downgrades (Q2 -> Q1 -> Q0)', () => {
    const manager = new QualityManager({ initialMode: 'AUTO', viewportWidth: 1280 });
    let now = 0;

    // First downgrade Q2 -> Q1 at ~15s:
    now = feedWindow(manager, 25, now, 5000);
    now = feedWindow(manager, 25, now, 5000);
    now = feedWindow(manager, 25, now, 5000);
    expect(manager.getActiveTier()).toBe('Q1');
    const firstChangeTime = manager.getDiagnostics().lastTierChangeMs!;
    expect(firstChangeTime).toBeGreaterThanOrEqual(15000);

    // Feed 3 more over-budget windows (15s elapsed since downgrade < 30s cooldown):
    now = feedWindow(manager, 25, now, 5000);
    now = feedWindow(manager, 25, now, 5000);
    now = feedWindow(manager, 25, now, 5000);
    // Must still be Q1 because 30s cooldown has not elapsed yet!
    expect(manager.getActiveTier()).toBe('Q1');
    expect(manager.getDiagnostics().cooldownRemainingMs).toBeGreaterThan(0);

    // Feed another 15s (total >= 30s since firstChangeTime) of 25ms (> 20ms Q1 budget):
    now = feedWindow(manager, 25, now, 5000);
    now = feedWindow(manager, 25, now, 5000);
    now = feedWindow(manager, 25, now, 5000);
    expect(manager.getActiveTier()).toBe('Q0');
    expect(manager.getDiagnostics().downgradeCount).toBe(2);
  });

  it('upgrades Q0 -> Q1 -> Q2 after 12 consecutive 5s windows (60s) with >= 20% headroom', () => {
    const manager = new QualityManager({ initialMode: 'AUTO', viewportWidth: 600 }); // starts at Q1
    let now = 0;

    // Downgrade Q1 -> Q0 first (3 windows of 25ms > 20ms):
    for (let i = 0; i < 3; i++) {
      now = feedWindow(manager, 25, now, 5000);
    }
    expect(manager.getActiveTier()).toBe('Q0');

    // In Q0, p95BudgetMs is 36ms, so 20% headroom threshold is 28.8ms.
    // Feed 11 windows (55s) of 12ms frames -> not yet upgraded:
    for (let i = 0; i < 11; i++) {
      now = feedWindow(manager, 12, now, 5000);
    }
    expect(manager.getActiveTier()).toBe('Q0');
    expect(manager.getDiagnostics().consecutiveHeadroomWindows).toBe(11);

    // 12th window (60s total, > 30s cooldown) -> upgrades Q0 -> Q1!
    now = feedWindow(manager, 12, now, 5000);
    expect(manager.getActiveTier()).toBe('Q1');
    expect(manager.getDiagnostics().upgradeCount).toBe(1);

    // 12 more windows (60s) of 12ms (<= 20 * 0.8 = 16ms) -> upgrades Q1 -> Q2!
    for (let i = 0; i < 12; i++) {
      now = feedWindow(manager, 12, now, 5000);
    }
    expect(manager.getActiveTier()).toBe('Q2');
    expect(manager.getDiagnostics().upgradeCount).toBe(2);
  });

  it('respects manual lock priority and prevents auto-downgrade or auto-upgrade', () => {
    const manager = new QualityManager({ initialMode: 'AUTO', viewportWidth: 1280 });
    manager.setMode('Q2');
    expect(manager.isManualLock()).toBe(true);
    expect(manager.getMode()).toBe('Q2');

    let now = 0;
    for (let i = 0; i < 6; i++) {
      now = feedWindow(manager, 30, now, 5000);
    }
    expect(manager.getActiveTier()).toBe('Q2');
    expect(manager.getDiagnostics().downgradeCount).toBe(0);

    // Switching to manual Q0 locks Q0 immediately:
    const preset = manager.setMode('Q0');
    expect(preset.tier).toBe('Q0');
    expect(manager.getActiveTier()).toBe('Q0');
    for (let i = 0; i < 15; i++) {
      now = feedWindow(manager, 10, now, 5000);
    }
    expect(manager.getActiveTier()).toBe('Q0');
    expect(manager.getDiagnostics().upgradeCount).toBe(0);
  });

  it('inspects scene resources and evaluates draw-call and particle budgets per tier', () => {
    const manager = new QualityManager({ initialMode: 'Q1' }); // Q1 budget: 100 meshes, 200 active particles

    const withinBudgetScene = {
      meshes: new Array(85).fill({}),
      materials: new Array(12).fill({}),
      textures: new Array(6).fill({}),
      particleSystems: [{ getActiveCount: () => 120 }, { activeCount: 50 }],
    };
    const reportOk = manager.inspectSceneResources(withinBudgetScene);
    expect(Object.isFrozen(reportOk)).toBe(true);
    expect(reportOk).toEqual({
      meshCount: 85,
      materialCount: 12,
      textureCount: 6,
      particleSystemCount: 2,
      activeParticlesEstimate: 170,
      withinBudget: true,
    });

    // Switching to Q0 (budget: 60 meshes, 80 particles) makes the same scene exceed budget:
    manager.setMode('Q0' as QualityTier);
    const reportOver = manager.inspectSceneResources(withinBudgetScene);
    expect(reportOver.withinBudget).toBe(false);
    expect(manager.inspectSceneResources(null)).toEqual({
      meshCount: 0,
      materialCount: 0,
      textureCount: 0,
      particleSystemCount: 0,
      activeParticlesEstimate: 0,
      withinBudget: true,
    });
  });
});
