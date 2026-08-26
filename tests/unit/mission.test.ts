import { describe, it, expect, beforeEach } from 'vitest';
import { MissionSystem } from '../../src/systems/mission';
import type { Mission, GameContext, PlayerEntity } from '../../src/types';

function createTestPlayer(): PlayerEntity {
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

function createTestCtx(missions: Mission[], overrides: Partial<GameContext> = {}): GameContext {
  return {
    state: 'PLAYING',
    score: 0,
    highScore: 0,
    coins: 0,
    totalCoins: 0,
    speed: 18,
    distance: 0,
    player: createTestPlayer(),
    obstacles: [],
    coinEntities: [],
    powerUpEntities: [],
    missions,
    chase: { distance: 2.8, isNear: false },
    ...overrides,
  };
}

describe('MissionSystem (AC-PRD-09)', () => {
  let ms: MissionSystem;

  beforeEach(() => {
    ms = new MissionSystem();
  });

  it('initMissions should return 4 independent (deep-copied) missions', () => {
    const missions = ms.initMissions();
    expect(missions).toHaveLength(4);

    // 修改副本不应污染模板
    missions[0].current = 99;
    missions[0].completed = true;
    const fresh = ms.initMissions();
    expect(fresh[0].current).toBe(0);
    expect(fresh[0].completed).toBe(false);
  });

  it('resetMissions should zero current and clear completed', () => {
    const missions = ms.initMissions();
    missions.forEach((m) => {
      m.current = 5;
      m.completed = true;
    });

    ms.resetMissions(missions);
    missions.forEach((m) => {
      expect(m.current).toBe(0);
      expect(m.completed).toBe(false);
    });
  });

  it('update should complete COLLECT_COINS and credit reward to ctx.coins', () => {
    const missions = ms.initMissions(); // m1: COLLECT_COINS target 30 reward 50
    const ctx = createTestCtx(missions, { coins: 30 });

    ms.update(ctx);

    const coinMission = missions.find((m) => m.type === 'COLLECT_COINS')!;
    expect(coinMission.completed).toBe(true);
    expect(ctx.coins).toBe(30 + 50); // 奖励入账
  });

  it('trackAction should increment JUMP_TIMES then update completes it', () => {
    const missions = ms.initMissions(); // m2: JUMP_TIMES target 10 reward 40
    const ctx = createTestCtx(missions);

    for (let i = 0; i < 10; i++) {
      ms.trackAction(missions, 'JUMP');
    }
    ms.update(ctx);

    const jumpMission = missions.find((m) => m.type === 'JUMP_TIMES')!;
    expect(jumpMission.completed).toBe(true);
    expect(ctx.coins).toBe(40); // 仅 JUMP_TIMES 奖励入账（其余未达成）
  });

  it('trackAction should increment ROLL_TIMES', () => {
    const missions = ms.initMissions(); // m3: ROLL_TIMES target 8
    for (let i = 0; i < 8; i++) {
      ms.trackAction(missions, 'ROLL');
    }
    const rollMission = missions.find((m) => m.type === 'ROLL_TIMES')!;
    expect(rollMission.current).toBe(8);
  });

  it('completed missions must not be re-credited (idempotent)', () => {
    const missions = ms.initMissions();
    const ctx = createTestCtx(missions, { coins: 30 });

    ms.update(ctx); // 完成 COLLECT_COINS，ctx.coins -> 80
    const afterFirst = ctx.coins;
    ms.update(ctx); // 再次结算，已完成的任务应跳过
    expect(ctx.coins).toBe(afterFirst);
  });

  it('update should early-return when state is not PLAYING', () => {
    const missions = ms.initMissions();
    const ctx = createTestCtx(missions, { state: 'MENU', coins: 30 });

    ms.update(ctx);

    const coinMission = missions.find((m) => m.type === 'COLLECT_COINS')!;
    expect(coinMission.completed).toBe(false); // 未在非游戏中结算
    expect(ctx.coins).toBe(30); // 无奖励入账
  });

  it('trackAction should not count toward a completed mission', () => {
    const missions = ms.initMissions();
    const ctx = createTestCtx(missions, { coins: 30 });
    ms.update(ctx); // 完成 COLLECT_COINS（current=30）

    ms.trackAction(missions, 'JUMP'); // 不应影响已完成的 COLLECT_COINS
    const coinMission = missions.find((m) => m.type === 'COLLECT_COINS')!;
    expect(coinMission.current).toBe(30);
  });
});
