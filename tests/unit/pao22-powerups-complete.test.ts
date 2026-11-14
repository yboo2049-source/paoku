import { afterEach, describe, expect, it } from 'vitest';
import { DirectionalLight, NullEngine, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import {
  POWERUP_CATALOG,
  SUPPORTED_POWERUP_TYPES,
  resolvePowerUpPickupState,
} from '../../src/systems/powerupCatalog';
import { EntityViews } from '../../src/render/entityViews';
import { SharedMaterials } from '../../src/render/assets';
import { immutableCopy } from '../../src/core/snapshot';
import { updatePhysics } from '../../src/systems/physics';
import { computeJumpVelocity } from '../../src/systems/input';
import { accumulateScore, computeScoreMultiplier } from '../../src/systems/scoring';
import { eventBus } from '../../src/core/eventBus';
import { CONSTANTS } from '../../src/types';
import type { GameContext, PlayerEntity, PowerUpType } from '../../src/types';

const engines: NullEngine[] = [];
afterEach(() => {
  engines.splice(0).forEach((e) => e.dispose());
});

function createPlayer(overrides: Partial<PlayerEntity> = {}): PlayerEntity {
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
    ...overrides,
  };
}

function createContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    state: 'PLAYING',
    score: 0,
    highScore: 0,
    coins: 0,
    totalCoins: 0,
    speed: CONSTANTS.BASE_SPEED,
    distance: 0,
    player: createPlayer(),
    obstacles: [],
    coinEntities: [],
    powerUpEntities: [],
    missions: [],
    chase: { distance: 2.8, isNear: false },
    ...overrides,
  };
}

describe('PAO-22 Power-Up Catalog & 3D Silhouettes', () => {
  it('locks the 4 supported power-ups and freezes all catalog descriptors', () => {
    expect(SUPPORTED_POWERUP_TYPES).toEqual([
      'MAGNET',
      'DOUBLE_SCORE',
      'SUPER_SNEAKERS',
      'HOVERBOARD',
    ]);
    expect(Object.keys(POWERUP_CATALOG).sort()).toEqual(
      [...SUPPORTED_POWERUP_TYPES].sort(),
    );
    expect('JETPACK' in POWERUP_CATALOG).toBe(false);
    expect('SHIELD' in POWERUP_CATALOG).toBe(false);
    expect('MYSTERY_BOX' in POWERUP_CATALOG).toBe(false);

    expect(Object.isFrozen(POWERUP_CATALOG)).toBe(true);
    for (const type of SUPPORTED_POWERUP_TYPES) {
      const desc = POWERUP_CATALOG[type];
      expect(Object.isFrozen(desc)).toBe(true);
      expect(Object.isFrozen(desc.partNames)).toBe(true);
      expect(desc.partNames.length).toBeGreaterThanOrEqual(3);
    }

    expect(POWERUP_CATALOG.MAGNET.silhouetteKind).toBe('HORSESHOE_MAGNET');
    expect(POWERUP_CATALOG.DOUBLE_SCORE.silhouetteKind).toBe('STAR_MULTIPLIER');
    expect(POWERUP_CATALOG.SUPER_SNEAKERS.silhouetteKind).toBe('WINGED_BOOT');
    expect(POWERUP_CATALOG.HOVERBOARD.silhouetteKind).toBe('THRUSTER_BOARD');
  });

  it('distinguishes first-time activation from active duration/shield refresh', () => {
    const player = createPlayer();
    expect(resolvePowerUpPickupState(player, 'MAGNET')).toEqual({
      change: 'ACTIVATED',
      remainingSec: 10,
      charges: 0,
    });

    player.activePowerUps.set('MAGNET', 4.2);
    expect(resolvePowerUpPickupState(player, 'MAGNET')).toEqual({
      change: 'REFRESHED',
      remainingSec: 10,
      charges: 0,
    });

    expect(resolvePowerUpPickupState(player, 'HOVERBOARD')).toEqual({
      change: 'ACTIVATED',
      remainingSec: null,
      charges: 1,
    });

    player.hasHoverboard = true;
    player.hoverboardActive = true;
    expect(resolvePowerUpPickupState(player, 'HOVERBOARD')).toEqual({
      change: 'REFRESHED',
      remainingSec: null,
      charges: 1,
    });
  });

  it('builds distinct multi-part 3D silhouettes for all 4 power-ups and releases cleanly without leaks', () => {
    const engine = new NullEngine();
    engines.push(engine);
    const scene = new Scene(engine);
    const shadow = new ShadowGenerator(
      128,
      new DirectionalLight('sun', new Vector3(0, -1, 0), scene),
    );
    const materials = new SharedMaterials(scene);
    const views = new EntityViews(scene, shadow, materials);

    const ctx = createContext({
      powerUpEntities: [
        { id: 'pu-magnet', type: 'MAGNET', lane: 0, x: -3, y: 0.8, z: 10, collected: false },
        { id: 'pu-double', type: 'DOUBLE_SCORE', lane: 1, x: 0, y: 0.8, z: 20, collected: false },
        { id: 'pu-sneakers', type: 'SUPER_SNEAKERS', lane: 2, x: 3, y: 0.8, z: 30, collected: false },
        { id: 'pu-board', type: 'HOVERBOARD', lane: 1, x: 0, y: 0.8, z: 40, collected: false },
      ],
    });

    views.sync(immutableCopy(ctx), 0.5, 1 / 60);

    const diagnostics = views.getPowerUpVisualDiagnostics();
    expect(diagnostics).toHaveLength(4);

    const byType = new Map<PowerUpType, (typeof diagnostics)[number]>(
      diagnostics.map((d) => [d.type, d]),
    );
    for (const type of SUPPORTED_POWERUP_TYPES) {
      const diag = byType.get(type)!;
      const catalogEntry = POWERUP_CATALOG[type];
      expect(diag).toBeDefined();
      expect(diag.silhouetteKind).toBe(catalogEntry.silhouetteKind);
      expect(diag.meshCount).toBe(catalogEntry.partNames.length);
      expect(diag.partNames).toEqual(catalogEntry.partNames);
    }

    // Total child meshes = 5 (MAGNET) + 3 (DOUBLE_SCORE) + 4 (SUPER_SNEAKERS) + 4 (HOVERBOARD) = 16
    expect(scene.meshes.length).toBe(16);

    // Collecting all power-ups disposes all 16 child meshes while preserving cached materials
    for (const pu of ctx.powerUpEntities) {
      pu.collected = true;
    }
    views.sync(immutableCopy(ctx), 1.0, 1 / 60);
    expect(views.getPowerUpVisualDiagnostics()).toHaveLength(0);
    expect(scene.meshes.length).toBe(0);
    expect(scene.materials.length).toBeGreaterThanOrEqual(8);

    views.dispose();
    materials.dispose();
    expect(scene.materials.length).toBe(0);
  });

  it('executes full pickup, timer refresh, score/jump/magnet effects, and hoverboard shatter recovery', () => {
    const ctx = createContext({
      powerUpEntities: [
        { id: 'p-mag-1', type: 'MAGNET', lane: 1, x: 0, y: 0, z: 0, collected: false },
        { id: 'p-dbl-1', type: 'DOUBLE_SCORE', lane: 1, x: 0, y: 0, z: 0, collected: false },
        { id: 'p-snk-1', type: 'SUPER_SNEAKERS', lane: 1, x: 0, y: 0, z: 0, collected: false },
        { id: 'p-hvb-1', type: 'HOVERBOARD', lane: 1, x: 0, y: 0, z: 0, collected: false },
      ],
      coinEntities: [
        { id: 'c-near', lane: 0, x: -3, y: 0.8, z: 4, collected: false },
      ],
    });

    updatePhysics(ctx, 0.1);
    expect(ctx.player.activePowerUps.get('MAGNET')).toBeCloseTo(10);
    expect(ctx.player.activePowerUps.get('DOUBLE_SCORE')).toBeCloseTo(10);
    expect(ctx.player.activePowerUps.get('SUPER_SNEAKERS')).toBeCloseTo(10);
    expect(ctx.player.hasHoverboard).toBe(true);
    expect(ctx.player.hoverboardActive).toBe(true);

    // Advance 4 seconds and verify timers decay and magnet pulls coin closer
    const initialCoinX = ctx.coinEntities[0].x;
    updatePhysics(ctx, 4.0);
    expect(ctx.player.activePowerUps.get('MAGNET')).toBeCloseTo(6.0);
    expect(ctx.coinEntities[0].x).toBeGreaterThan(initialCoinX);
    expect(computeJumpVelocity(ctx.player.activePowerUps)).toBeCloseTo(CONSTANTS.SUPER_JUMP_VELOCITY);
    expect(computeScoreMultiplier(ctx.player.activePowerUps)).toBe(2.0);
    expect(accumulateScore(100, 20, 1.0, ctx.player.activePowerUps)).toBeCloseTo(104);

    // Re-pickup MAGNET while active refreshes timer back to 10s
    ctx.powerUpEntities.push({
      id: 'p-mag-refresh',
      type: 'MAGNET',
      lane: 1,
      x: 0,
      y: 0,
      z: ctx.player.z,
      collected: false,
    });
    expect(resolvePowerUpPickupState(ctx.player, 'MAGNET').change).toBe('REFRESHED');
    updatePhysics(ctx, 0.1);
    expect(ctx.player.activePowerUps.get('MAGNET')).toBeCloseTo(10.0);

    // Trigger fatal collision with HOVERBOARD active -> absorbs hit and emits HOVERBOARD_SHIELD_SHATTER
    const shatterEvents: unknown[] = [];
    const onShatter = (payload: unknown) => shatterEvents.push(payload);
    eventBus.on('HOVERBOARD_SHIELD_SHATTER', onShatter);
    try {
      ctx.obstacles = [
        {
          id: 'obs-hit',
          type: 'LOW_OBSTACLE',
          lane: 1,
          x: 0,
          y: 0,
          z: ctx.player.z,
          width: 2.2,
          height: 1.0,
          depth: 0.5,
        },
      ];
      updatePhysics(ctx, 1 / 60);
      expect(ctx.state).toBe('PLAYING');
      expect(ctx.player.hasHoverboard).toBe(false);
      expect(ctx.player.hoverboardActive).toBe(false);
      expect(ctx.player.invulnerableTimer).toBeCloseTo(1.2);
      expect(shatterEvents).toHaveLength(1);
    } finally {
      eventBus.off('HOVERBOARD_SHIELD_SHATTER', onShatter);
    }
  });
});
