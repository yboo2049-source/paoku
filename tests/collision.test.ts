import { expect, test, describe } from 'vitest';
import { checkCollisions } from '../src/systems/collision';
import type { GameContext } from '../src/types';

function createMockContext(): GameContext {
  return {
    state: 'PLAYING',
    score: 0,
    time: 0,
    speed: 10,
    player: {
      lane: 1,
      y: 100,
      z: 0,
      state: 'RUNNING',
      stateTimer: 0,
      buffs: { magnetTimer: 0, shield: false, doubleScoreTimer: 0 },
      skinColor: 'blue'
    },
    entities: [],
    saveData: { highScore: 0, totalCoins: 0, unlockedSkins: [] }
  };
}

describe('Collision System', () => {
  test('完美碰撞触发 GameOver', () => {
    const ctx = createMockContext();
    ctx.entities.push({
      id: 'obs1',
      type: 'OBSTACLE',
      lane: 1,
      y: 100,
      width: 10,
      length: 10,
      height: 10
    });
    
    checkCollisions(ctx);
    expect(ctx.state).toBe('GAMEOVER');
  });

  test('高度规避 (跳跃/下蹲)', () => {
    const ctx = createMockContext();
    ctx.player.state = 'JUMPING';
    ctx.player.z = 15;
    
    ctx.entities.push({
      id: 'obs_low',
      type: 'OBSTACLE',
      lane: 1,
      y: 100,
      width: 10,
      length: 10,
      height: 10
    });
    
    checkCollisions(ctx);
    expect(ctx.state).toBe('PLAYING');
  });

  test('金币收集', () => {
    const ctx = createMockContext();
    ctx.entities.push({
      id: 'coin1',
      type: 'COIN',
      lane: 1,
      y: 100,
      width: 5,
      length: 5,
      height: 5,
      isCollected: false
    });
    
    checkCollisions(ctx);
    expect(ctx.score).toBe(10);
    expect(ctx.entities[0].isCollected).toBe(true);
  });

  test('获取护盾道具', () => {
    const ctx = createMockContext();
    ctx.entities.push({
      id: 'shield1', type: 'SHIELD_ITEM', lane: 1, y: 100, width: 5, length: 5, height: 5, isCollected: false
    });
    checkCollisions(ctx);
    expect(ctx.player.buffs.shield).toBe(true);
    expect(ctx.entities[0].isCollected).toBe(true);
  });

  test('带护盾撞击障碍物', () => {
    const ctx = createMockContext();
    ctx.player.buffs.shield = true;
    ctx.entities.push({
      id: 'obs1', type: 'OBSTACLE', lane: 1, y: 100, width: 10, length: 10, height: 10, isCollected: false
    });
    checkCollisions(ctx);
    expect(ctx.state).toBe('PLAYING');
    expect(ctx.player.buffs.shield).toBe(false);
    expect(ctx.entities[0].isCollected).toBe(true);
  });

  test('获取双倍分数道具', () => {
    const ctx = createMockContext();
    ctx.entities.push({
      id: 'ds1', type: 'DOUBLE_SCORE_ITEM', lane: 1, y: 100, width: 5, length: 5, height: 5, isCollected: false
    });
    checkCollisions(ctx);
    expect(ctx.player.buffs.doubleScoreTimer).toBe(10);
    expect(ctx.entities[0].isCollected).toBe(true);
  });

  test('双倍分数期间收集金币', () => {
    const ctx = createMockContext();
    ctx.player.buffs.doubleScoreTimer = 5;
    ctx.entities.push({
      id: 'coin1', type: 'COIN', lane: 1, y: 100, width: 5, length: 5, height: 5, isCollected: false
    });
    checkCollisions(ctx);
    expect(ctx.score).toBe(20);
    expect(ctx.entities[0].isCollected).toBe(true);
  });

  test('获取磁铁道具', () => {
    const ctx = createMockContext();
    ctx.entities.push({
      id: 'mag1', type: 'MAGNET_ITEM', lane: 1, y: 100, width: 5, length: 5, height: 5, isCollected: false
    });
    checkCollisions(ctx);
    expect(ctx.player.buffs.magnetTimer).toBe(10);
    expect(ctx.entities[0].isCollected).toBe(true);
  });
});
