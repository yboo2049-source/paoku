import { describe, it, expect } from 'vitest';
import { updatePhysics } from '../../src/systems/physics';
import { computeJumpVelocity, InputSystem } from '../../src/systems/input';
import { computeScoreMultiplier, accumulateScore } from '../../src/systems/scoring';
import { CONSTANTS } from '../../src/types';
import type { GameContext, PlayerEntity, PowerUpType } from '../../src/types';

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

function createCtx(overrides: Partial<GameContext> = {}): GameContext {
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

describe('AC-PRD-04 (MAGNET)', () => {
  it('should attract coins within radius toward player', () => {
    const ctx = createCtx();
    ctx.player.activePowerUps.set('MAGNET', 10);
    ctx.coinEntities = [{ id: 'c1', lane: 1, x: 5, y: 0, z: 0, collected: false }];

    updatePhysics(ctx, 0.1);
    expect(ctx.coinEntities[0].x).toBeLessThan(5); // 向玩家(0)靠近
  });

  it('should not attract coins beyond radius (15 units)', () => {
    const ctx = createCtx();
    ctx.player.activePowerUps.set('MAGNET', 10);
    ctx.coinEntities = [{ id: 'c1', lane: 1, x: 20, y: 0, z: 0, collected: false }];

    updatePhysics(ctx, 0.1);
    expect(ctx.coinEntities[0].x).toBe(20); // 距离 20 > 15，不动
  });

  it('should not attract coins when MAGNET expired (0)', () => {
    const ctx = createCtx();
    ctx.player.activePowerUps.set('MAGNET', 0);
    ctx.coinEntities = [{ id: 'c1', lane: 1, x: 5, y: 0, z: 0, collected: false }];

    updatePhysics(ctx, 0.1);
    expect(ctx.coinEntities[0].x).toBe(5); // 未激活，不动
  });

  it('should eventually collect coin via magnet and credit ctx.coins', () => {
    const ctx = createCtx();
    ctx.player.activePowerUps.set('MAGNET', 10);
    ctx.coinEntities = [{ id: 'c1', lane: 1, x: 5, y: 0, z: 0, collected: false }];

    for (let i = 0; i < 20; i++) updatePhysics(ctx, 1 / 60);
    expect(ctx.coinEntities[0].collected).toBe(true);
    expect(ctx.coins).toBe(1);
  });

  it('should expire MAGNET timer to 0 after duration elapses', () => {
    const ctx = createCtx();
    ctx.player.activePowerUps.set('MAGNET', 10);
    updatePhysics(ctx, 10.1);
    expect(ctx.player.activePowerUps.get('MAGNET')).toBe(0);
  });
});

describe('AC-PRD-05 (SUPER_SNEAKERS)', () => {
  it('should give base jump velocity without SUPER_SNEAKERS', () => {
    expect(computeJumpVelocity(new Map<PowerUpType, number>())).toBe(CONSTANTS.JUMP_VELOCITY);
  });

  it('should give 1.5x jump velocity when SUPER_SNEAKERS active', () => {
    const m = new Map<PowerUpType, number>();
    m.set('SUPER_SNEAKERS', 10);
    expect(computeJumpVelocity(m)).toBe(CONSTANTS.SUPER_JUMP_VELOCITY);
  });

  it('should revert to base jump velocity when SUPER_SNEAKERS expired (0)', () => {
    const m = new Map<PowerUpType, number>();
    m.set('SUPER_SNEAKERS', 0);
    expect(computeJumpVelocity(m)).toBe(CONSTANTS.JUMP_VELOCITY);
  });

  it('should verify SUPER_JUMP_VELOCITY === 1.5x JUMP_VELOCITY', () => {
    expect(CONSTANTS.SUPER_JUMP_VELOCITY).toBeCloseTo(CONSTANTS.JUMP_VELOCITY * 1.5);
  });

  it('should set SUPER_SNEAKERS for 10s on pickup and expire to 0', () => {
    const ctx = createCtx();
    ctx.powerUpEntities = [{ id: 'p1', type: 'SUPER_SNEAKERS', lane: 1, x: 0, y: 0, z: 0, collected: false }];

    updatePhysics(ctx, 0.1); // 拾取
    expect(ctx.powerUpEntities[0].collected).toBe(true);
    expect(ctx.player.activePowerUps.get('SUPER_SNEAKERS')).toBeCloseTo(10);

    updatePhysics(ctx, 10.1); // 过期归零
    expect(ctx.player.activePowerUps.get('SUPER_SNEAKERS')).toBe(0);
  });
});

describe('AC-PRD-06 (DOUBLE_SCORE)', () => {
  it('should use 1.0 multiplier without DOUBLE_SCORE', () => {
    expect(computeScoreMultiplier(new Map<PowerUpType, number>())).toBe(1.0);
  });

  it('should use 2.0 multiplier when DOUBLE_SCORE active', () => {
    const m = new Map<PowerUpType, number>();
    m.set('DOUBLE_SCORE', 10);
    expect(computeScoreMultiplier(m)).toBe(2.0);
  });

  it('should revert to 1.0 when DOUBLE_SCORE expired (0)', () => {
    const m = new Map<PowerUpType, number>();
    m.set('DOUBLE_SCORE', 0);
    expect(computeScoreMultiplier(m)).toBe(1.0);
  });

  it('should accumulate 2x score over time when DOUBLE_SCORE active', () => {
    const base = accumulateScore(0, 18, 1.0, new Map<PowerUpType, number>());
    const doubled = accumulateScore(0, 18, 1.0, new Map<PowerUpType, number>([['DOUBLE_SCORE', 10]]));
    expect(doubled).toBeCloseTo(base * 2);
  });

  it('should set DOUBLE_SCORE for 10s on pickup and expire to 0', () => {
    const ctx = createCtx();
    ctx.powerUpEntities = [{ id: 'p2', type: 'DOUBLE_SCORE', lane: 1, x: 0, y: 0, z: 0, collected: false }];

    updatePhysics(ctx, 0.1);
    expect(ctx.powerUpEntities[0].collected).toBe(true);
    expect(ctx.player.activePowerUps.get('DOUBLE_SCORE')).toBeCloseTo(10);

    updatePhysics(ctx, 10.1);
    expect(ctx.player.activePowerUps.get('DOUBLE_SCORE')).toBe(0);
  });
});

describe('AC-PRD-07 (HOVERBOARD 护盾)', () => {
  it('should activate hoverboard on pickup', () => {
    const ctx = createCtx();
    ctx.powerUpEntities = [{ id: 'p3', type: 'HOVERBOARD', lane: 1, x: 0, y: 0, z: 0, collected: false }];

    updatePhysics(ctx, 0.1);
    expect(ctx.player.hasHoverboard).toBe(true);
    expect(ctx.player.hoverboardActive).toBe(true);
  });

  it('should consume hoverboard on fatal collision and stay alive (1.2s invulnerability)', () => {
    const ctx = createCtx();
    ctx.player.hasHoverboard = true;
    ctx.player.hoverboardActive = true;
    ctx.obstacles = [{ id: 'o1', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: 0, width: 2.2, height: 1.0, depth: 0.5 }];

    updatePhysics(ctx, 0.1);
    expect(ctx.state).toBe('PLAYING'); // 未 GameOver
    expect(ctx.player.hoverboardActive).toBe(false);
    expect(ctx.player.hasHoverboard).toBe(false);
    expect(ctx.player.invulnerableTimer).toBeCloseTo(1.2);
  });

  it('should block a second fatal collision during post-shield invulnerability', () => {
    const ctx = createCtx();
    ctx.player.hasHoverboard = true;
    ctx.player.hoverboardActive = true;
    ctx.obstacles = [{ id: 'o1', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: 0, width: 2.2, height: 1.0, depth: 0.5 }];

    updatePhysics(ctx, 0.1); // 消耗滑板，无敌 1.2s
    expect(ctx.state).toBe('PLAYING');
    expect(ctx.player.invulnerableTimer).toBeCloseTo(1.2);

    updatePhysics(ctx, 0.1); // invulnerableTimer 1.2 -> 1.1，仍 > 0
    expect(ctx.state).toBe('PLAYING');
  });

  it('should GAMEOVER on fatal collision WITHOUT hoverboard', () => {
    const ctx = createCtx();
    ctx.obstacles = [{ id: 'o2', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: 0, width: 2.2, height: 1.0, depth: 0.5 }];

    updatePhysics(ctx, 0.1);
    expect(ctx.state).toBe('GAMEOVER');
  });
});

describe('InputSystem (Deterministic Guards & Controls)', () => {
  it('should ignore key actions when canAct returns false (PAUSED / MENU / GAMEOVER)', () => {
    const listeners: Record<string, (e: any) => void> = {};
    (globalThis as any).window = {
      addEventListener: (type: string, fn: (e: any) => void) => {
        listeners[type] = fn;
      },
      removeEventListener: () => {},
    };

    const input = new InputSystem();
    const player = createPlayer();
    let isPlaying = false;
    input.init(player, () => isPlaying);

    // 在非 PLAYING 状态下按按键
    listeners['keydown']({ key: 'ArrowLeft' });
    expect(player.lane).toBe(1); // 车道不应被改变

    listeners['keydown']({ key: ' ' });
    expect(player.isJumping).toBe(false); // 不应起跳

    listeners['keydown']({ key: 's' });
    expect(player.isRolling).toBe(false); // 不应翻滚

    // 切入 PLAYING 状态后应正常响应
    isPlaying = true;
    listeners['keydown']({ key: 'a' });
    expect(player.lane).toBe(0);
    expect(player.targetX).toBe(CONSTANTS.LANE_X[0]);

    listeners['keydown']({ key: 'w' });
    expect(player.isJumping).toBe(true);
  });

  it('should clamp lane changes within [0, 2]', () => {
    const listeners: Record<string, (e: any) => void> = {};
    (globalThis as any).window = {
      addEventListener: (type: string, fn: (e: any) => void) => {
        listeners[type] = fn;
      },
      removeEventListener: () => {},
    };

    const input = new InputSystem();
    const player = createPlayer({ lane: 0, targetX: CONSTANTS.LANE_X[0] });
    input.init(player, () => true);

    listeners['keydown']({ key: 'ArrowLeft' });
    expect(player.lane).toBe(0);

    listeners['keydown']({ key: 'd' });
    expect(player.lane).toBe(1);
    listeners['keydown']({ key: 'd' });
    expect(player.lane).toBe(2);

    listeners['keydown']({ key: 'ArrowRight' });
    expect(player.lane).toBe(2);
  });

  it('should trigger fast descent when rolling mid-air', () => {
    const listeners: Record<string, (e: any) => void> = {};
    (globalThis as any).window = {
      addEventListener: (type: string, fn: (e: any) => void) => {
        listeners[type] = fn;
      },
      removeEventListener: () => {},
    };

    const input = new InputSystem();
    const player = createPlayer({ isJumping: true, vy: 10 });
    input.init(player, () => true);

    listeners['keydown']({ key: 'ArrowDown' });
    expect(player.isRolling).toBe(true);
    expect(player.rollTimer).toBe(CONSTANTS.ROLL_DURATION);
    expect(player.vy).toBeLessThan(0);
  });
});
