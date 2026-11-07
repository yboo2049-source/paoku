import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const evidenceDir = resolve(
  process.env.PAO26_EVIDENCE_DIR || 'D:/worker/paoku-diagnostics/pao20-26-final-delivery-20261107'
);

test.beforeEach(async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  await page.addInitScript(() => {
    (window as any).__QA_MODE__ = true;
  });
});

test('PAO-20/22/23/24/25/26 desktop 1440x900 full integration: audio R-08, 3D power-ups, oncoming train, theme zones, shop/missions, and quality R-09', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__GAME_SENSOR__));

  // 1. Verify PAO-24 loading, shop catalog, and Chinese mission metadata in MENU & SHOP
  const menuProgression = await page.evaluate(() =>
    (window as any).__GAME_SENSOR__.getProgressionDiagnostics()
  );
  expect(menuProgression.loading.interactiveReady).toBe(true);
  expect(menuProgression.shopCatalog).toHaveLength(5);
  expect(menuProgression.shopCatalog[0].statusLabelZh).toBe('已装备');
  expect(menuProgression.missions).toHaveLength(4);
  for (const m of menuProgression.missions) {
    expect(m.titleZh.length).toBeGreaterThan(0);
    expect(m.descriptionZh.length).toBeGreaterThan(0);
  }

  await page.click('#open-shop-btn');
  await expect(page.locator('#shop-screen')).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDir, 'desktop-1440x900-shop.png') });
  await page.click('#close-shop-btn');
  await expect(page.locator('#menu-screen')).toBeVisible();

  // 2. Start run and verify PAO-20 audio lifecycle & PAO-25 desktop Q2 quality tier
  await page.click('#start-btn');
  await expect(page.locator('#hud-pause-btn')).toBeVisible();

  const initialPlaying = await page.evaluate(() => {
    const s = (window as any).__GAME_SENSOR__;
    s.freezeSpawner(true);
    s.clearWorld();
    return {
      audio: s.getAudioDiagnostics(),
      perf: s.getPerformanceMetrics(),
      zone: s.getThemeZone(),
      speed: s.getSpeedCurve(),
    };
  });

  expect(initialPlaying.audio.isBgmPlaying).toBe(true);
  expect(initialPlaying.audio.lifecycleState).toBe('PLAYING');
  expect(initialPlaying.perf.quality.activeTier).toBe('Q2');
  expect(initialPlaying.perf.resources.withinBudget).toBe(true);
  expect(initialPlaying.zone.id).toBe('STATION_PLATFORM');
  expect(initialPlaying.speed.speedMps).toBeGreaterThanOrEqual(18);

  // 3. PAO-22: Spawn all 4 power-up types and verify 3D multi-part silhouettes
  const powerUpVisuals = await page.evaluate(() => {
    const s = (window as any).__GAME_SENSOR__;
    s.spawnPowerUpForQa('MAGNET', 14, 0);
    s.spawnPowerUpForQa('DOUBLE_SCORE', 18, 1);
    s.spawnPowerUpForQa('SUPER_SNEAKERS', 22, 2);
    s.spawnPowerUpForQa('HOVERBOARD', 26, 0);
    s.driveMotionForQa([[]], true);
    return s.getPowerUpVisuals();
  });

  expect(powerUpVisuals.activeMeshes).toHaveLength(4);
  const silhouetteKinds = powerUpVisuals.activeMeshes.map((m: any) => m.silhouetteKind).sort();
  expect(silhouetteKinds).toEqual([
    'HORSESHOE_MAGNET',
    'STAR_MULTIPLIER',
    'THRUSTER_BOARD',
    'WINGED_BOOT',
  ]);
  for (const meshDiag of powerUpVisuals.activeMeshes) {
    expect(meshDiag.meshCount).toBeGreaterThanOrEqual(3);
  }

  await page.screenshot({ path: resolve(evidenceDir, 'desktop-1440x900-playing.png') });

  // 4. PAO-20: Spawn oncoming MOVING_TRAIN in adjacent lane and verify warning & pass feedback
  const trainFeedback = await page.evaluate(() => {
    const s = (window as any).__GAME_SENSOR__;
    s.clearWorld();
    s.setPlayerLane(1);
    s.spawnMovingTrainForQa(36, 0, -18);
    // Step 120 ticks (2 seconds) so the train enters warning range and passes the player
    const commands = Array.from({ length: 120 }, () => []);
    s.driveMotionForQa(commands, true);
    return {
      feedback: s.getFeedbackDiagnostics(),
      audio: s.getAudioDiagnostics(),
    };
  });

  expect(trainFeedback.feedback.warnedTrainCount).toBeGreaterThanOrEqual(1);
  expect(trainFeedback.feedback.passedTrainCount).toBeGreaterThanOrEqual(1);
  expect(trainFeedback.audio.cueCounts.trainHorn).toBeGreaterThanOrEqual(1);
  expect(trainFeedback.audio.cueCounts.trainPass).toBeGreaterThanOrEqual(1);

  // 5. PAO-23: Verify deterministic theme zones across distance milestones
  const zones = await page.evaluate(() => {
    const s = (window as any).__GAME_SENSOR__;
    s.setPlayerPos(0, 0, 50);
    const z0 = s.getThemeZone();
    s.setPlayerPos(0, 0, 420);
    const z1 = s.getThemeZone();
    s.setPlayerPos(0, 0, 800);
    const z2 = s.getThemeZone();
    s.setPlayerPos(0, 0, 10);
    return [z0.id, z1.id, z2.id];
  });
  expect(zones).toEqual(['STATION_PLATFORM', 'STREET_RAIL', 'MAINTENANCE_YARD']);

  // 6. PAO-20 & R-08: Verify pause -> resume -> pause -> menu audio lifecycle zero residue
  await page.click('#hud-pause-btn');
  await expect(page.locator('#paused-screen')).toBeVisible();
  const pausedAudio = await page.evaluate(() =>
    (window as any).__GAME_SENSOR__.getAudioDiagnostics()
  );
  expect(pausedAudio.isBgmPlaying).toBe(false);
  expect(pausedAudio.isChasing).toBe(false);
  expect(pausedAudio.lifecycleState).toBe('PAUSED');

  await page.click('#resume-btn');
  await expect(page.locator('#hud-pause-btn')).toBeVisible();
  const resumedAudio = await page.evaluate(() =>
    (window as any).__GAME_SENSOR__.getAudioDiagnostics()
  );
  expect(resumedAudio.isBgmPlaying).toBe(true);
  expect(resumedAudio.lifecycleState).toBe('PLAYING');

  await page.click('#hud-pause-btn');
  await expect(page.locator('#paused-screen')).toBeVisible();
  await page.click('#pause-menu-btn');
  await expect(page.locator('#menu-screen')).toBeVisible();
  const menuAudio = await page.evaluate(() =>
    (window as any).__GAME_SENSOR__.getAudioDiagnostics()
  );
  expect(menuAudio.isBgmPlaying).toBe(false);
  expect(menuAudio.isChasing).toBe(false);
  expect(menuAudio.lifecycleState).toBe('STOPPED');

  expect(errors).toEqual([]);
  await writeFile(
    resolve(evidenceDir, 'desktop-1440x900-report.json'),
    JSON.stringify(
      {
        menuProgression,
        initialPlaying,
        powerUpVisuals,
        trainFeedback,
        zones,
        pausedAudio,
        resumedAudio,
        menuAudio,
      },
      null,
      2
    )
  );
});

test('PAO-21/25/26 mobile 390x844 Q1 quality baseline, vertical slice witness, and gameover settlement', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__GAME_SENSOR__));

  await page.click('#start-btn');
  await expect(page.locator('#hud-pause-btn')).toBeVisible();

  const mobileDiagnostics = await page.evaluate(() => {
    const s = (window as any).__GAME_SENSOR__;
    s.driveMotionForQa([['JUMP'], [], [], []], true);
    return {
      perf: s.getPerformanceMetrics(),
      slice: s.runVerticalSliceForQa({ durationSec: 65, includeTerminalCollision: true }),
      viewportOverflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  // Mobile (<768px) AUTO quality selects Q1 baseline
  expect(mobileDiagnostics.perf.quality.activeTier).toBe('Q1');
  expect(mobileDiagnostics.perf.resources.withinBudget).toBe(true);
  expect(mobileDiagnostics.viewportOverflow).toBeLessThanOrEqual(0);

  // PAO-21 65s M2 vertical slice witness
  expect(mobileDiagnostics.slice).not.toBeNull();
  expect(mobileDiagnostics.slice.ok).toBe(true);
  expect(mobileDiagnostics.slice.simulatedDurationSec).toBeGreaterThanOrEqual(60);
  expect(mobileDiagnostics.slice.phasesCompleted).toEqual([
    'START_AND_LANE_CHANGE',
    'JUMP_LOW_AND_ROLL_HIGH',
    'RAMP_ROOF_TRAVERSAL_AND_DROP',
    'ONCOMING_TRAIN_DODGE',
    'POWERUP_PICKUP_ACTIVE_AND_EXPIRY',
    'TERMINAL_COLLISION_SETTLEMENT_AND_RESTART',
  ]);
  expect(mobileDiagnostics.slice.settlementCommitted).toBe(true);
  expect(mobileDiagnostics.slice.restartSucceeded).toBe(true);

  await page.screenshot({ path: resolve(evidenceDir, 'mobile-390x844-playing.png') });

  expect(errors).toEqual([]);
  await writeFile(
    resolve(evidenceDir, 'mobile-390x844-report.json'),
    JSON.stringify(mobileDiagnostics, null, 2)
  );
});

