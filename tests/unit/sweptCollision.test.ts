import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/core/simulation';
import type { GameContext } from '../../src/types';
import type { ObstacleEntity } from '../../src/types';
import { checkObstacleCollision, updatePhysics } from '../../src/systems/physics';
import { eventBus } from '../../src/core/eventBus';
import * as physicsModule from '../../src/systems/physics';
import { sweepAABB, compareContacts } from '../../src/systems/contacts';

const obstacle = (v: Partial<ObstacleEntity> = {}): ObstacleEntity => ({
  id: 'solid', type: 'LOW_OBSTACLE', lane: 1, x: 0, y: 0, z: 2,
  width: 2.2, height: 1.2, depth: 0.05, ...v,
});
function events(type: string, run: (received: unknown[]) => void): void {
  const received: unknown[] = [];
  const listener = (data: unknown) => received.push(data);
  eventBus.on(type, listener);
  try { run(received); } finally { eventBus.off(type, listener); }
}
function advance(ctx: GameContext, dt: number, from = { x: ctx.player.x, y: ctx.player.y, z: ctx.player.z }): void {
  // This optional fourth argument is the agreed tick-local caller contract.
  Reflect.apply(updatePhysics, null, [ctx, dt, undefined, from]);
}

describe('PAO-12 swept damage regressions', () => {
  it('clears terminal and support state at an explicit run or QA boundary', () => {
    const p = coreContext().player;
    Object.assign(p, { collisionEnded: true, supportSurfaceId: 'old:roof', contact: 'SUPPORTED',
      supportSample: { x: 0, y: 3, z: 0 }, supportDeparture: { ownerEntityId: 'old', side: 'REAR', y: 3 },
      supportRampExit: { xMin: -1, xMax: 1, z: 0, y: 3 } });
    const reset = Reflect.get(physicsModule, 'resetPhysicsContacts');
    expect(typeof reset).toBe('function');
    reset(p);
    expect(p).toMatchObject({ collisionEnded: false, supportSurfaceId: null, contact: 'AIRBORNE',
      supportDeparture: null, supportRampExit: null });
    expect(p.supportSample).toBeUndefined();
  });
  it('does not tunnel through a thin obstacle on a dropped-frame 45m/s step', () => {
    const ctx = coreContext(); ctx.obstacles = [obstacle()];
    ctx.player.z = 9;
    advance(ctx, .2, { x: 0, y: 0, z: 0 });
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('uses relative head-on train motion when neither endpoint overlaps', () => {
    const ctx = coreContext();
    ctx.obstacles = [obstacle({ type: 'MOVING_TRAIN', height: 3, speedZ: -1800, z: 12 })];
    ctx.player.z = .75;
    advance(ctx, 1 / 60, { x: 0, y: 0, z: 0 });
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('does not exempt an airborne rolling body that intersects a high obstacle', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { y: 1.3, isRolling: true, rollTimer: .8, isJumping: true });
    expect(checkObstacleCollision(ctx.player, obstacle({ type: 'HIGH_OBSTACLE', y: 1.4, z: 0 }))).toBe(true);
  });
  it('uses actual low-obstacle height rather than a hard-coded foot threshold', () => {
    const ctx = coreContext(); ctx.player.y = 1.3;
    expect(checkObstacleCollision(ctx.player, obstacle({ height: 1.5, z: 0 }))).toBe(true);
  });
  it('notifies a terminal collision once across repeated calls on an ended context', () => events('COLLISION', received => {
    const ctx = coreContext(); ctx.obstacles = [obstacle({ z: 0 })];
    advance(ctx, 0); advance(ctx, 0); advance(ctx, 0);
    expect(received).toHaveLength(1);
  }));
  it('notifies a terminal collision once for standalone players without blocking later motion', () => events('COLLISION', received => {
    const ctx = coreContext(); const p = ctx.player; const o = [obstacle({ z: 0 })];
    updatePhysics(p, 0, o); updatePhysics(p, 0, o);
    p.vy = 13.5; p.isJumping = true;
    updatePhysics(p, 1 / 60, o);
    expect(received).toHaveLength(1);
    expect(p.y).toBeGreaterThan(0);
  }));
  it('chooses the earliest obstacle independently of array order', () => {
    function hit(reverse: boolean): unknown {
      const ctx = coreContext();
      const solids = [obstacle({ id: 'later', z: 4, type: 'HIGH_OBSTACLE' }), obstacle({ id: 'first', z: 2 })];
      ctx.obstacles = reverse ? solids.reverse() : solids; ctx.player.z = 5;
      let result: unknown;
      events('COLLISION', received => { advance(ctx, .2, { x: 0, y: 0, z: 0 }); result = received[0]; });
      return result;
    }
    expect(hit(false)).toMatchObject({ targetType: 'LOW_OBSTACLE' });
    expect(hit(true)).toEqual(hit(false));
  });
});

describe('PAO-12 pure relative contact geometry', () => {
  const box = (v: Partial<ReturnType<typeof physicsModule.getPlayerBoundingBox>> = {}) => ({
    x: 0, y: 0, z: 0, width: .8, height: 1.8, depth: .8, ...v,
  });
  it.each([1, -1])('returns earliest TOI and outward normal for travel sign %s', direction => {
    const a = box({ z: direction * -2 }), b = box({ z: direction * 2 }), o = box({ depth: .2 });
    const contact = sweepAABB(a, b, o, o, 'thin')!;
    expect(contact.time).toBeCloseTo(.375, 12);
    expect(contact.normal).toEqual({ x: 0, y: 0, z: -direction });
    expect(contact.initialOverlap).toBe(false);
  });
  it('subtracts obstacle displacement for a head-on sweep', () => {
    const a = box({ z: -2 }), b = box({ z: 2 });
    const o0 = box({ z: 2 }), o1 = box({ z: -2 });
    expect(sweepAABB(a, b, o0, o1, 'train')!.time).toBeCloseTo(.4);
  });
  it('has no contact for zero relative velocity separated boxes', () => {
    expect(sweepAABB(box(), box({ z: 4 }), box({ z: 2 }), box({ z: 6 }), 'parallel')).toBeNull();
  });
  it('reports zero-time initial overlap and a deterministic minimum-penetration normal', () => {
    const a = box(), o = box({ x: .7 });
    expect(sweepAABB(a, a, o, o, 'initial')).toEqual({
      entityId: 'initial', time: 0, initialOverlap: true, normal: { x: -1, y: 0, z: 0 },
    });
  });
  it('ignores parallel grazing along an exact side boundary', () => {
    const o = box({ x: .8 });
    expect(sweepAABB(box({ z: -2 }), box({ z: 2 }), o, o, 'graze')).toBeNull();
  });
  it('ignores touching while separating but detects touching while entering', () => {
    const o = box({ z: .8 });
    expect(sweepAABB(box(), box({ z: -1 }), o, o, 'out')).toBeNull();
    expect(sweepAABB(box(), box({ z: 1 }), o, o, 'in')!.time).toBe(0);
  });
  it('uses a stable axis normal for a simultaneous corner entry', () => {
    const o = box();
    expect(sweepAABB(box({ x: -2, z: -2 }), box({ x: 2, z: 2 }), o, o, 'corner')!.normal)
      .toEqual({ x: -1, y: 0, z: 0 });
  });
  it('sorts equal-time contacts by stable ID independent of input order', () => {
    const o = box(), a = box({ z: -2 }), b = box({ z: 2 });
    const c = ['z', 'a'].map(id => sweepAABB(a, b, o, o, id)!);
    expect(c.sort(compareContacts).map(x => x.entityId)).toEqual(['a', 'z']);
  });
});

describe('PAO-12 stance, damage and support matrix', () => {
  it.each(['REAR', 'LEFT', 'RIGHT'] as const)('keeps real descending %s top-edge departure continuous across the next tick', side => {
    const ctx = coreContext();
    const from = { x: side === 'LEFT' ? -1.275625 : side === 'RIGHT' ? 1.275625 : 0,
      y: 3.136666666666672, z: side === 'REAR' ? 42.07562499999995 : 33 };
    const to = { x: side === 'LEFT' ? -1.58534722222217 : side === 'RIGHT' ? 1.58534722222217 : 0,
      y: from.y, z: side === 'REAR' ? 42.38534722222217 : 33 };
    Object.assign(ctx.player, to, { targetX: to.x, vy: -12.46666666666663, isJumping: true });
    ctx.obstacles = [obstacle({ id: 'STATIC_TRAIN33', type: 'STATIC_TRAIN', z: 33, width: 2.4, height: 3, depth: 18 })];
    advance(ctx, 1 / 60, from);
    expect(ctx.state).toBe('PLAYING');
    expect(ctx.player.y).toBeCloseTo(2.9183333333333388);
    const nextFrom = { x: ctx.player.x, y: ctx.player.y, z: ctx.player.z };
    if (side === 'REAR') ctx.player.z = 42.6951388888888;
    else { ctx.player.x += side === 'LEFT' ? -.30979166666663 : .30979166666663; ctx.player.targetX = ctx.player.x; }
    advance(ctx, 1 / 60, nextFrom);
    expect(ctx.state).toBe('PLAYING');
    expect(ctx.player.supportDeparture).toBeNull();
  });
  it('does not turn a descending top-edge departure into immunity on inward reentry', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { y: 3.136666666666672, z: 42.38534722222217, vy: -12.46666666666663, isJumping: true });
    ctx.obstacles = [obstacle({ id: 'roof', type: 'STATIC_TRAIN', z: 33, width: 2.4, height: 3, depth: 18 })];
    advance(ctx, 1 / 60, { x: 0, y: 3.136666666666672, z: 42.07562499999995 });
    expect(ctx.state).toBe('PLAYING');
    const from = { x: 0, y: ctx.player.y, z: ctx.player.z };
    ctx.player.z = 42.1;
    advance(ctx, 1 / 60, from);
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('does not turn a proven top-edge departure into immunity when its moving owner catches up', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { y: 3.136666666666672, z: 42.38534722222217, vy: -12.46666666666663, isJumping: true });
    ctx.obstacles = [obstacle({ id: 'roof', type: 'STATIC_TRAIN', z: 33, width: 2.4, height: 3, depth: 18 })];
    advance(ctx, 1 / 60, { x: 0, y: 3.136666666666672, z: 42.07562499999995 });
    expect(ctx.player.supportDeparture?.ownerEntityId).toBe('roof');
    Object.assign(ctx.obstacles[0], { type: 'MOVING_TRAIN', speedZ: 4 });
    advance(ctx, .1);
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('does not exempt an unknown initial rear overlap merely because this tick moves outward', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { y: 2.9183333333333388, z: 42.6951388888888, vy: -13.1, isJumping: true });
    ctx.obstacles = [obstacle({ id: 'roof', type: 'STATIC_TRAIN', z: 33, width: 2.4, height: 3, depth: 18 })];
    advance(ctx, 1 / 60, { x: 0, y: 2.9183333333333388, z: 42.38534722222217 });
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('chooses a single top-edge departure owner stably when equivalent roofs overlap', () => {
    const ids: unknown[] = [];
    for (const reverse of [false, true]) {
      const ctx = coreContext();
      Object.assign(ctx.player, { y: 3.136666666666672, z: 42.38534722222217, vy: -12.46666666666663, isJumping: true });
      const roofs = ['z-roof', 'a-roof'].map(id => obstacle({ id, type: 'STATIC_TRAIN', z: 33, width: 2.4, height: 3, depth: 18 }));
      ctx.obstacles = reverse ? roofs.reverse() : roofs;
      advance(ctx, 1 / 60, { x: 0, y: 3.136666666666672, z: 42.07562499999995 });
      expect(ctx.state).toBe('PLAYING');
      ids.push(ctx.player.supportDeparture?.ownerEntityId);
    }
    expect(ids).toEqual(['a-roof', 'a-roof']);
  });
  it('passes a high obstacle using the grounded rolling box and a low obstacle using elevated feet', () => {
    const rolling = coreContext();
    Object.assign(rolling.player, { z: 3, isRolling: true, rollTimer: .8 });
    rolling.obstacles = [obstacle({ type: 'HIGH_OBSTACLE', y: 1.2, z: 1.5 })];
    advance(rolling, .05, { x: 0, y: 0, z: 0 });
    expect(rolling.state).toBe('PLAYING');
    const jumping = coreContext();
    Object.assign(jumping.player, { y: 1.5, z: 3, isJumping: true, vy: 1 });
    jumping.obstacles = [obstacle({ z: 1.5 })];
    advance(jumping, .05, { x: 0, y: 1.5, z: 0 });
    expect(jumping.state).toBe('PLAYING');
  });
  it('retains equal-velocity separation and catches a full reverse crossing', () => {
    const parallel = coreContext(); parallel.player.z = 9;
    parallel.obstacles = [obstacle({ type: 'MOVING_TRAIN', z: 5, height: 3, speedZ: 45 })];
    advance(parallel, .2, { x: 0, y: 0, z: 0 });
    expect(parallel.state).toBe('PLAYING');
    const reverse = coreContext();
    reverse.obstacles = [obstacle({ z: 5 })];
    advance(reverse, .2, { x: 0, y: 0, z: 9 });
    expect(reverse.state).toBe('GAMEOVER');
  });
  it('chooses same-time fatal contacts by entity ID in either array order', () => {
    for (const order of [false, true]) events('COLLISION', received => {
      const ctx = coreContext();
      const solids = [obstacle({ id: 'z', z: 0 }), obstacle({ id: 'a', z: 0 })];
      ctx.obstacles = order ? solids.reverse() : solids;
      advance(ctx, 0);
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({ obstacleId: 'a', time: 0 });
    });
  });
  it.each(['LEFT', 'RIGHT', 'REAR'] as const)('keeps %s roof departures harmless while separating', side => {
    const ctx = coreContext();
    Object.assign(ctx.player, { y: 3, x: side === 'LEFT' ? -1.19 : side === 'RIGHT' ? 1.19 : 0,
      targetX: side === 'LEFT' ? -1.19 : side === 'RIGHT' ? 1.19 : 0, z: side === 'REAR' ? 4.99 : 0 });
    ctx.obstacles = [obstacle({ type: 'STATIC_TRAIN', id: 'roof', z: 0, width: 2.4, height: 3, depth: 10 })];
    advance(ctx, 0);
    if (side !== 'REAR') ctx.player.targetX = side === 'LEFT' ? -3 : 3;
    for (let i = 0; i < 8; i++) {
      const start = { x: ctx.player.x, y: ctx.player.y, z: ctx.player.z };
      if (side === 'REAR') ctx.player.z += .2;
      advance(ctx, 1 / 60, start);
      expect(ctx.state).toBe('PLAYING');
    }
    expect(ctx.player.y).toBeLessThan(3);
  });
  it('keeps the rolling box before a within-tick expiry, then uses standing height', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { z: 4, isRolling: true, rollTimer: .15 });
    ctx.obstacles = [obstacle({ type: 'HIGH_OBSTACLE', y: 1.2, z: 1 })];
    advance(ctx, .2, { x: 0, y: 0, z: 0 });
    expect(ctx.state).toBe('PLAYING');
    expect(ctx.player.isRolling).toBe(false);
    const next = coreContext();
    Object.assign(next.player, { z: 4, isRolling: true, rollTimer: .05 });
    next.obstacles = [obstacle({ type: 'HIGH_OBSTACLE', y: 1.2, z: 3 })];
    advance(next, .2, { x: 0, y: 0, z: 0 });
    expect(next.state).toBe('GAMEOVER');
  });
  it('uses standing height at a zero-duration expired roll boundary', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { isRolling: true, rollTimer: 0 });
    ctx.obstacles = [obstacle({ type: 'HIGH_OBSTACLE', y: 1.2, z: 0 })];
    advance(ctx, 0);
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('checks the standing box at the exact tick-end roll expiry', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { isRolling: true, rollTimer: .2 });
    ctx.obstacles = [obstacle({ type: 'HIGH_OBSTACLE', y: 1.2, z: 0 })];
    advance(ctx, .2);
    expect(ctx.player.isRolling).toBe(false);
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('detects actual side entry irrespective of target lane', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { x: -3, targetX: 3, lane: 2 });
    ctx.obstacles = [obstacle({ z: 0 })];
    advance(ctx, .2);
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('does not forgive an earlier train-front hit because the final feet are above its roof', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { y: 2.5, z: 3, vy: 15, isJumping: true });
    ctx.obstacles = [obstacle({ type: 'STATIC_TRAIN', z: 2, height: 3, depth: 1 })];
    advance(ctx, .1, { x: 0, y: 2.5, z: 0 });
    expect(ctx.player.y).toBeGreaterThan(3);
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('consumes a same-tick pickup shield once for many contacts and remains protected on the next tick', () => events('HOVERBOARD_SHIELD_SHATTER', received => {
    const ctx = coreContext();
    ctx.obstacles = [obstacle({ z: 0, id: 'z' }), obstacle({ z: 0, id: 'a' })];
    ctx.powerUpEntities = [{ id: 'board', type: 'HOVERBOARD', x: 0, y: 0, z: 0, lane: 1, collected: false }];
    advance(ctx, 0); advance(ctx, 1 / 60);
    expect(ctx.state).toBe('PLAYING');
    expect(received).toHaveLength(1);
    expect(ctx.player.hasHoverboard).toBe(false);
    expect(ctx.player.hoverboardActive).toBe(false);
    expect(ctx.player.invulnerableTimer).toBeCloseTo(1.2 - 1 / 60);
    expect(ctx.powerUpEntities[0].collected).toBe(true);
  }));
  it('emits only one terminal event after shield grace expires during continuing overlap', () => events('COLLISION', received => {
    const ctx = coreContext(); ctx.player.hasHoverboard = true;
    ctx.obstacles = [obstacle({ z: 0 })];
    advance(ctx, 0); advance(ctx, 1.3); advance(ctx, 0);
    expect(ctx.state).toBe('GAMEOVER'); expect(received).toHaveLength(1);
  }));
  it('commits terminal state before synchronous listeners can reenter physics', () => {
    const ctx = coreContext(); ctx.obstacles = [obstacle({ z: 0 })];
    let calls = 0;
    const listener = () => { calls++; if (calls < 4) advance(ctx, 0); };
    eventBus.on('COLLISION', listener);
    try { advance(ctx, 0); expect(calls).toBe(1); } finally { eventBus.off('COLLISION', listener); }
  });
  it('preserves deterministic pickup order and a single coin consumption', () => events('POWERUP_ACTIVATED', received => {
    const ctx = coreContext();
    ctx.powerUpEntities = [
      { id: 'z', type: 'DOUBLE_SCORE', x: 0, y: 0, z: 0, lane: 1, collected: false },
      { id: 'a', type: 'MAGNET', x: 0, y: 0, z: 0, lane: 1, collected: false },
    ];
    ctx.coinEntities = [{ id: 'coin', x: 0, y: 0, z: 0, lane: 1, collected: false }];
    advance(ctx, 0); advance(ctx, 0);
    expect(received).toEqual([{ type: 'MAGNET', duration: 10 }, { type: 'DOUBLE_SCORE', duration: 10 }]);
    expect(ctx.coins).toBe(1);
  }));
  it.each([18, 45])('retains ramp/roof, jumping and ground landing with explicit %sm/s sweeps', speed => {
    const ctx = coreContext(); ctx.player.z = 93;
    ctx.obstacles = [obstacle({ id: 'ramp', type: 'RAMP', z: 100, width: 2.4, depth: 12, height: 3 }),
      obstacle({ id: 'roof', type: 'STATIC_TRAIN', z: 115, width: 2.4, depth: 18, height: 3 })];
    advance(ctx, 0);
    for (let i = 0; i < 120 && ctx.player.z < 112; i++) {
      const start = { x: ctx.player.x, y: ctx.player.y, z: ctx.player.z };
      ctx.player.z += speed / 60; advance(ctx, 1 / 60, start);
      expect(ctx.state).toBe('PLAYING');
    }
    expect(ctx.player.y).toBe(3);
    ctx.player.vy = 13.5; ctx.player.isJumping = true;
    for (let i = 0; i < 120; i++) {
      const start = { x: ctx.player.x, y: ctx.player.y, z: ctx.player.z };
      ctx.player.z += speed / 60; advance(ctx, 1 / 60, start);
      expect(ctx.state).toBe('PLAYING');
    }
    expect(ctx.player.y).toBe(0);
  });
  it('cannot carry a stale sweep history across external relocation or replacement entities', () => {
    const ctx = coreContext(); ctx.obstacles = [obstacle({ z: 10 })];
    advance(ctx, 0);
    ctx.player.z = 20; ctx.obstacles = [obstacle({ z: 10 })];
    advance(ctx, 0);
    expect(ctx.state).toBe('PLAYING');
  });
  it('does not exempt inward reentry merely because departure still names that roof', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { x: -1.3, targetX: 0, y: 2.9, z: 0,
      supportDeparture: { ownerEntityId: 'roof', side: 'LEFT', y: 3 } });
    ctx.obstacles = [obstacle({ id: 'roof', type: 'STATIC_TRAIN', z: 0, width: 2.4, depth: 10, height: 3 })];
    advance(ctx, .1);
    expect(ctx.state).toBe('GAMEOVER');
  });
  it('honours legacy standalone callers without an explicit invulnerability timer', () => events('COLLISION', received => {
    const p = coreContext().player;
    Reflect.deleteProperty(p, 'invulnerableTimer');
    updatePhysics(p, 0, [obstacle({ z: 0 })]);
    expect(received).toHaveLength(1);
  }));
  it('does not duplicate terminal notification when a synchronous pickup listener reenters', () => events('COLLISION', received => {
    const ctx = coreContext(); ctx.obstacles = [obstacle({ z: 0 })];
    ctx.powerUpEntities = [{ id: 'magnet', type: 'MAGNET', x: 0, y: 0, z: 0, lane: 1, collected: false }];
    const listener = () => advance(ctx, 0);
    eventBus.on('POWERUP_ACTIVATED', listener);
    try { advance(ctx, 0); expect(received).toHaveLength(1); }
    finally { eventBus.off('POWERUP_ACTIVATED', listener); }
  }));
  it('does not exempt rear reentry when a moving former support catches the player', () => {
    const ctx = coreContext();
    Object.assign(ctx.player, { y: 2.9, z: 5.2,
      supportDeparture: { ownerEntityId: 'roof', side: 'REAR', y: 3 } });
    ctx.obstacles = [obstacle({ id: 'roof', type: 'MOVING_TRAIN', z: 0, width: 2.4, depth: 10, height: 3, speedZ: 4 })];
    advance(ctx, .1);
    expect(ctx.state).toBe('GAMEOVER');
  });
});

function coreContext(): GameContext {
  return {
    state: 'PLAYING', score: 0, highScore: 0, coins: 0, totalCoins: 0,
    speed: 45, distance: 0,
    player: {
      lane: 1, x: 0, targetX: 0, y: 0, z: 0, vy: 0,
      isJumping: false, isRolling: false, rollTimer: 0,
      hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0,
      activePowerUps: new Map(),
    },
    obstacles: [], coinEntities: [], powerUpEntities: [], missions: [],
    chase: { distance: 2.8, isNear: false },
  };
}

describe('PAO-12 tick-local motion origin', () => {
  it('passes the current tick origin after input and before forward integration', () => {
    const starts: unknown[] = [];
    const observed: { z: number; rolling: boolean }[] = [];
    const sim = new Simulation(coreContext(), {
      runId: 'origin', seed: 12,
      physics: (ctx, _dt, ...args: unknown[]) => {
        starts.push(args[0]);
        observed.push({ z: ctx.player.z, rolling: ctx.player.isRolling });
      },
    });
    sim.queue.collect('ROLL', 'REPLAY', sim.tick);
    sim.step();
    expect(starts[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(observed[0]).toEqual({ z: 0.75, rolling: true });
    sim.step();
    expect(starts[1]).toEqual({ x: 0, y: 0, z: 0.75 });
    expect(starts[0]).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('uses a fresh origin following a QA discontinuity and world replacement', () => {
    const starts: unknown[] = [];
    const sim = new Simulation(coreContext(), {
      runId: 'qa', seed: 12,
      physics: (_ctx, _dt, ...args: unknown[]) => { starts.push(args[0]); },
    });
    sim.step();
    sim.change(ctx => {
      ctx.player.x = 3; ctx.player.targetX = 3;
      ctx.player.y = 8; ctx.player.z = 500;
      ctx.obstacles = [];
    });
    sim.step();
    expect(starts[1]).toEqual({ x: 3, y: 8, z: 500 });
  });

  it('does not reuse an origin from the previous run when restarted', () => {
    const starts: unknown[] = [];
    const sim = new Simulation(coreContext(), {
      runId: 'first', seed: 12,
      physics: (_ctx, _dt, ...args: unknown[]) => { starts.push(args[0]); },
    });
    sim.step(); sim.step();
    const next = coreContext();
    next.player.z = 900;
    sim.restart('second', 13, next);
    sim.step();
    expect(starts[2]).toEqual({ x: 0, y: 0, z: 900 });
    expect(sim.snapshot.runId).toBe('second');
    expect(sim.tick).toBe(1);
  });
});
