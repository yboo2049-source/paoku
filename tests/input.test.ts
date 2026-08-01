import { expect, test, describe } from 'vitest';
import { handleInput } from '../src/systems/input';
import type { GameContext, Lane } from '../src/types';

function createMockContext(lane: Lane, state: 'RUNNING'|'JUMPING'|'ROLLING' = 'RUNNING'): GameContext {
  return {
    state: 'PLAYING',
    score: 0,
    time: 0,
    speed: 10,
    player: {
      lane,
      y: 0,
      z: 0,
      state,
      stateTimer: 0,
      buffs: { magnetTimer: 0, shield: false, doubleScoreTimer: 0 },
      skinColor: 'blue'
    },
    entities: [],
    saveData: { highScore: 0, totalCoins: 0, unlockedSkins: [] }
  };
}

describe('Input System', () => {
  test('正常切道', () => {
    const ctx = createMockContext(1);
    handleInput(ctx, 'LEFT');
    expect(ctx.player.lane).toBe(0);
  });

  test('越界防御 (边界保护)', () => {
    const ctxLeft = createMockContext(0);
    handleInput(ctxLeft, 'LEFT');
    expect(ctxLeft.player.lane).toBe(0);

    const ctxRight = createMockContext(2);
    handleInput(ctxRight, 'RIGHT');
    expect(ctxRight.player.lane).toBe(2);
  });

  test('动作冲突', () => {
    const ctx = createMockContext(1, 'JUMPING');
    handleInput(ctx, 'DOWN');
    expect(ctx.player.state).toBe('ROLLING');
  });
});
