import { describe, it, expect } from 'vitest';
import {
  checkAABBCollision,
  getPlayerBoundingBox,
  checkObstacleCollision,
  updatePhysics,
} from '../../src/systems/physics';
import { SpawnerSystem } from '../../src/systems/spawner';
import { PlayerEntity, ObstacleEntity, CoinEntity, PowerUpEntity, CONSTANTS } from '../../src/types';

function createTestPlayer(overrides: Partial<PlayerEntity> = {}): PlayerEntity {
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
    activePowerUps: new Map(),
    ...overrides,
  };
}

describe('Physics System (AABB & Gravity)', () => {
  it('should detect collision between overlapping boxes', () => {
    const boxA = { x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 };
    const boxB = { x: 0.5, y: 0, z: 0, width: 1, height: 1, depth: 1 };
    expect(checkAABBCollision(boxA, boxB)).toBe(true);
  });

  it('should not detect collision for separated boxes', () => {
    const boxA = { x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 };
    const boxB = { x: 5, y: 0, z: 0, width: 1, height: 1, depth: 1 };
    expect(checkAABBCollision(boxA, boxB)).toBe(false);
  });

  it('should adjust bounding box height when rolling', () => {
    const standingPlayer = createTestPlayer({ isRolling: false });
    const rollingPlayer = createTestPlayer({ isRolling: true });

    expect(getPlayerBoundingBox(standingPlayer).height).toBe(CONSTANTS.PLAYER_HEIGHT);
    expect(getPlayerBoundingBox(rollingPlayer).height).toBe(CONSTANTS.PLAYER_HEIGHT / 2);
  });

  it('should apply gravity during jump', () => {
    const player = createTestPlayer({ y: 2, vy: 10, isJumping: true });
    updatePhysics(player, 0.1);
    expect(player.vy).toBeLessThan(10); // 重力减速
  });

  // AC-PRD-01: 低矮障碍
  describe('AC-PRD-01 (Low Obstacle)', () => {
    const lowObstacle: ObstacleEntity = {
      id: 'low_1',
      type: 'LOW_OBSTACLE',
      lane: 1,
      x: 0,
      y: 0,
      z: 0,
      width: 2.2,
      height: 1.0,
      depth: 0.5,
    };

    it('should collide with LOW_OBSTACLE when standing or rolling', () => {
      const standing = createTestPlayer({ x: 0, y: 0, z: 0 });
      const rolling = createTestPlayer({ x: 0, y: 0, z: 0, isRolling: true });

      expect(checkObstacleCollision(standing, lowObstacle)).toBe(true);
      expect(checkObstacleCollision(rolling, lowObstacle)).toBe(true);
    });

    it('should pass LOW_OBSTACLE when jumping high enough (y > 1.2)', () => {
      const jumpingHigh = createTestPlayer({ x: 0, y: 1.5, z: 0, isJumping: true });
      expect(checkObstacleCollision(jumpingHigh, lowObstacle)).toBe(false);
    });
  });

  // AC-PRD-02: 高空障碍
  describe('AC-PRD-02 (High Obstacle)', () => {
    const highObstacle: ObstacleEntity = {
      id: 'high_1',
      type: 'HIGH_OBSTACLE',
      lane: 1,
      x: 0,
      y: 1.2,
      z: 0,
      width: 2.2,
      height: 1.8,
      depth: 0.5,
    };

    it('should collide with HIGH_OBSTACLE when standing or jumping', () => {
      const standing = createTestPlayer({ x: 0, y: 0, z: 0 });
      const jumping = createTestPlayer({ x: 0, y: 1.0, z: 0, isJumping: true });

      expect(checkObstacleCollision(standing, highObstacle)).toBe(true);
      expect(checkObstacleCollision(jumping, highObstacle)).toBe(true);
    });

    it('should pass HIGH_OBSTACLE when rolling (isRolling === true)', () => {
      const rolling = createTestPlayer({ x: 0, y: 0, z: 0, isRolling: true });
      expect(checkObstacleCollision(rolling, highObstacle)).toBe(false);
    });
  });

  // AC-PRD-03: 斜坡与车顶
  describe('AC-PRD-03 (Ramp & Train Tops)', () => {
    it('should climb RAMP smoothly to reach y = 3.0', () => {
      const player = createTestPlayer({ x: 0, y: 0, z: 0 });
      const ramp: ObstacleEntity = {
        id: 'ramp_1',
        type: 'RAMP',
        lane: 1,
        x: 0,
        y: 0,
        z: 3,
        width: 2.4,
        height: 3.0,
        depth: 6.0, // z from 0 to 6
      };

      // 刚进入斜坡起点 (z = 0)
      updatePhysics(player, 0, [ramp]);
      expect(player.y).toBeCloseTo(0, 1);

      // 斜坡中点 (z = 3)
      player.z = 3;
      updatePhysics(player, 0, [ramp]);
      expect(player.y).toBeCloseTo(1.5, 1);

      // 斜坡终点 (z = 6)
      player.z = 6;
      updatePhysics(player, 0, [ramp]);
      expect(player.y).toBeCloseTo(3.0, 1);
    });

    it('should maintain y = 3.0 gravity plane on top of STATIC_TRAIN', () => {
      const player = createTestPlayer({ x: 0, y: 3.0, z: 10 });
      const train: ObstacleEntity = {
        id: 'train_1',
        type: 'STATIC_TRAIN',
        lane: 1,
        x: 0,
        y: 0,
        z: 10,
        width: 2.4,
        height: 3.0,
        depth: 12.0,
      };

      // 在车顶行走时，重力降落面保持在 y = 3.0
      updatePhysics(player, 0.1, [train]);
      expect(player.y).toBe(3.0);

      // 从车顶跳起后再落下，也落在 y = 3.0
      player.vy = 5;
      player.isJumping = true;
      updatePhysics(player, 0.1, [train]); // vy 减小, y > 3.0
      expect(player.y).toBeGreaterThan(3.0);

      // 掉落回车顶
      player.y = 3.05;
      player.vy = -10;
      updatePhysics(player, 0.1, [train]);
      expect(player.y).toBe(3.0);
    });
  });
});

describe('Physics Edge Cases (Invulnerability, Roll Timer, Jump Arc)', () => {
  // AC-PRD-03: 无敌保护帧 (invulnerableTimer) 应使所有障碍物碰撞失效
  it('should ignore obstacle collision while invulnerableTimer > 0', () => {
    const player = createTestPlayer({ x: 0, y: 0, z: 0, invulnerableTimer: 1.0 });
    const low: ObstacleEntity = {
      id: 'low_inv', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: 0,
      width: 2.2, height: 1.0, depth: 0.5,
    };
    const high: ObstacleEntity = {
      id: 'high_inv', type: 'HIGH_OBSTACLE', lane: 1, x: 0, y: 1.2, z: 0,
      width: 2.2, height: 1.8, depth: 0.5,
    };

    expect(checkObstacleCollision(player, low)).toBe(false);
    expect(checkObstacleCollision(player, high)).toBe(false);
  });

  // AC-PRD-03 衍生: 翻滚状态在 rollTimer 耗尽后应自动解除
  it('should expire roll state after rollTimer elapses', () => {
    const player = createTestPlayer({ isRolling: true, rollTimer: 0.1 });
    updatePhysics(player, 0.2, []);
    expect(player.isRolling).toBe(false);
    expect(player.rollTimer).toBe(0);
  });

  // AC-PRD-03 衍生: 完整跳跃抛物线后必须回到地面 (y=0, isJumping=false, vy=0)
  it('should return player to ground after a full jump arc', () => {
    const player = createTestPlayer({ y: 0, vy: CONSTANTS.JUMP_VELOCITY, isJumping: true });
    for (let i = 0; i < 240; i++) {
      updatePhysics(player, 1 / 60, []);
    }
    expect(player.y).toBeCloseTo(0, 1);
    expect(player.isJumping).toBe(false);
    expect(player.vy).toBe(0);
  });
});

describe('Spawner System (Pattern-based PCG)', () => {
  it('should generate predefined pattern segments', () => {
    const spawner = new SpawnerSystem();
    const obstacles: ObstacleEntity[] = [];
    const coins: CoinEntity[] = [];
    const powerUps: PowerUpEntity[] = [];

    // 测试 ZigZag_Trains
    spawner.spawnPattern(100, obstacles, coins, powerUps, 'ZigZag_Trains');
    expect(obstacles.some((o) => o.type === 'RAMP')).toBe(true);
    expect(obstacles.some((o) => o.type === 'STATIC_TRAIN')).toBe(true);

    // 清空重试 Under_Over
    obstacles.length = 0;
    coins.length = 0;
    spawner.spawnPattern(200, obstacles, coins, powerUps, 'Under_Over');
    expect(obstacles.some((o) => o.type === 'HIGH_OBSTACLE')).toBe(true);
    expect(obstacles.some((o) => o.type === 'LOW_OBSTACLE')).toBe(true);

    // 清空重试 Moving_Rush
    obstacles.length = 0;
    coins.length = 0;
    spawner.spawnPattern(300, obstacles, coins, powerUps, 'Moving_Rush');
    expect(obstacles.some((o) => o.type === 'MOVING_TRAIN')).toBe(true);

    // 清空重试 Coin_Frenzy
    obstacles.length = 0;
    coins.length = 0;
    spawner.spawnPattern(400, obstacles, coins, powerUps, 'Coin_Frenzy');
    expect(coins.length).toBeGreaterThanOrEqual(15);
  });
});
