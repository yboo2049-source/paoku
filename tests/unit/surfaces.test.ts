import { obstacleSurface, sampleSurface, SURFACE_EPSILON } from '../../src/systems/surfaces';
import { eventBus } from '../../src/core/eventBus';
import { describe, it, expect } from 'vitest';
import { checkObstacleCollision, updatePhysics } from '../../src/systems/physics';
import type { PlayerEntity, ObstacleEntity } from '../../src/types';
const p = (v: Partial<PlayerEntity> = {}): PlayerEntity => ({ lane: 1, x: 0, targetX: 0, y: 0, z: 0, vy: 0, isJumping: false, isRolling: false, rollTimer: 0, hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0, activePowerUps: new Map(), ...v });
const ramp = (y = 5): ObstacleEntity => ({ id: 'ramp', type: 'RAMP', lane: 1, x: 0, y, z: 100, width: 2.4, height: 3, depth: 12 });
const roof = (v: Partial<ObstacleEntity> = {}): ObstacleEntity => ({ id: 'train', type: 'STATIC_TRAIN', lane: 1, x: 0, y: 5, z: 115, width: 2.4, height: 3, depth: 18, ...v });
describe('PAO-11 real updatePhysics surfaces', () => {
    it('includes nonzero ramp base and connects roof', () => { const a = p({ y: 5, z: 94 }); const o = [ramp(), roof()]; updatePhysics(a, 0, o); expect(a.y).toBe(5); a.z = 100; updatePhysics(a, 0, o); expect(a.y).toBe(6.5); a.z = 106; updatePhysics(a, 0, o); expect(a.y).toBe(8); a.z = 107; updatePhysics(a, 0, o); expect(a.y).toBe(8); expect(a.supportSurfaceId).toBe('train:roof'); });
    it.each([{ x: 1.21, z: 100 }, { x: 0, z: 106.01 }])('does not clamp ramp outside %o', v => { const a = p({ y: 8, ...v, targetX: v.x }); updatePhysics(a, .01, [ramp()]); expect(a.y).toBeLessThan(8); expect(a.supportSurfaceId).toBeNull(); });
    it('does not lift from below ramp', () => { const a = p({ y: 0, z: 100 }); updatePhysics(a, .01, [ramp()]); expect(a.y).toBe(0); });
    it('does not snap a side hit to roof', () => { const a = p({ y: 7.9, z: 110 }); updatePhysics(a, .01, [roof()]); expect(a.y).toBeLessThan(7.9); expect(a.supportSurfaceId).toBeNull(); });
    it('detaches on jump and lands from above', () => {
        const a = p({ y: 8, z: 110 });
        updatePhysics(a, 0, [roof()]);
        a.vy = 13.5;
        a.isJumping = true;
        updatePhysics(a, 1 / 60, [roof()]);
        expect(a.y).toBeGreaterThan(8);
        expect(a.supportSurfaceId).toBeNull();
        for (let i = 0; i < 80; i++)
            updatePhysics(a, 1 / 60, [roof()]);
        expect(a.y).toBe(8);
        expect(a.supportSurfaceId).toBe('train:roof');
    });
    it('leaves laterally and clears recycled support', () => { const a = p({ y: 8, z: 110 }); updatePhysics(a, 0, [roof()]); a.x = 1.21; a.targetX = 1.21; updatePhysics(a, .01, [roof()]); expect(a.y).toBeLessThan(8); expect(a.supportSurfaceId).toBeNull(); a.x = 0; a.targetX = 0; a.y = 8; a.vy = 0; updatePhysics(a, 0, [roof()]); updatePhysics(a, .01, []); expect(a.supportSurfaceId).toBeNull(); expect(a.y).toBeLessThan(8); });
    it.each([-4, 4])('carries once using speedZ %s', speedZ => { const a = p({ y: 8, z: 110 }); const o = roof({ type: 'MOVING_TRAIN', speedZ }); updatePhysics(a, 0, [o]); updatePhysics(a, .1, [o]); expect(a.z).toBeCloseTo(110 + speedZ * .1, 10); expect(o.z).toBeCloseTo(115 + speedZ * .1, 10); updatePhysics(a, .1, [o]); expect(a.z).toBeCloseTo(110 + speedZ * .2, 10); });
    it('does not carry newly landed player for elapsed movement', () => { const a = p({ y: 8.1, z: 110, vy: -2, isJumping: true }); const o = roof({ type: 'MOVING_TRAIN', speedZ: 4 }); updatePhysics(a, .1, [o]); expect(a.y).toBe(8); expect(a.z).toBe(110); });
});
it.each([18, 45])('continuous fixed ticks at %s m/s do not die at ramp/roof seam', speed => {
    const a = p({ z: 93 });
    const o = [ramp(0), roof({ y: 0 })];
    updatePhysics(a, 1 / 60, o);
    for (let i = 0; i < 120; i++) {
        a.z += speed / 60;
        updatePhysics(a, 1 / 60, o);
        for (const obs of o)
            expect(checkObstacleCollision(a, obs)).toBe(false);
        if (a.z >= 106 && a.z <= 124)
            expect(a.y).toBe(3);
        if (a.z > 125)
            break;
    }
    expect(a.z).toBeGreaterThan(124);
});
it('uses numerical endpoint epsilon without extending gameplay support', () => {
    const s = obstacleSurface(ramp())!;
    expect(sampleSurface(s, 1.2, 106)).toBe(8);
    expect(sampleSurface(s, 1.2 + SURFACE_EPSILON / 2, 106)).not.toBeNull();
    expect(sampleSurface(s, 1.2 + 2 * SURFACE_EPSILON, 106)).toBeNull();
    expect(sampleSurface(s, 0, 106 + 2 * SURFACE_EPSILON)).toBeNull();
});
it('emits landing exactly once from above', () => {
    let count = 0;
    const listener = () => count++;
    eventBus.on('PLAYER_LANDED', listener);
    const a = p({ y: 8.1, z: 110, vy: -4, isJumping: true });
    for (let i = 0; i < 20; i++)
        updatePhysics(a, 1 / 60, [roof()]);
    expect(count).toBe(1);
    eventBus.off('PLAYER_LANDED', listener);
});
it('lands on a rising ramp by relative crossing while descending', () => { const a = p({ y: 6.6, z: 100, vy: -1, isJumping: true }); updatePhysics(a, 0, [ramp()]); a.z = 101; updatePhysics(a, .02, [ramp()]); expect(a.y).toBe(6.75); });
it('selects overlapping equal surfaces stably', () => { const a = p({ y: 8, z: 110 }), b = p({ y: 8, z: 110 }); const o = [roof({ id: 'z' }), roof({ id: 'a' })]; updatePhysics(a, 0, o); updatePhysics(b, 0, [...o].reverse()); expect(a.supportSurfaceId).toBe(b.supportSurfaceId); });
it('does not carry on the tick lateral interpolation exits', () => { const a = p({ y: 8, z: 110, x: 1.19, targetX: 1.19 }); const o = roof({ type: 'MOVING_TRAIN', speedZ: 4 }); updatePhysics(a, 0, [o]); a.targetX = 3; updatePhysics(a, .1, [o]); expect(a.z).toBe(110); expect(a.supportSurfaceId).toBeNull(); });
it('clears departure after separation and collides on reentry', () => { const a = p({ y: 8, z: 123.9 }); const o = roof(); updatePhysics(a, 0, [o]); a.z = 124.1; updatePhysics(a, .02, [o]); expect(checkObstacleCollision(a, o)).toBe(false); a.z = 125; updatePhysics(a, .02, [o]); expect(a.supportDeparture).toBeNull(); a.z = 123.9; a.y = 7.9; expect(checkObstacleCollision(a, o)).toBe(true); });
it('uses relative normal motion when world vy is upward but ramp overtakes feet', () => { const a = p({ y: 6.6, z: 100, vy: 1, isJumping: true }); updatePhysics(a, 0, [ramp()]); a.z = 101; updatePhysics(a, .02, [ramp()]); expect(a.y).toBe(6.75); expect(a.contact).toBe('SUPPORTED'); });
it('rejects stale sample after external placement below roof', () => { const a = p({ y: 8, z: 110 }); updatePhysics(a, 0, [roof()]); a.y = 7.9; updatePhysics(a, .01, [roof()]); expect(a.y).toBeLessThan(7.9); expect(a.supportSurfaceId).toBeNull(); });
it('does not emit landing while continuously crossing ground ramp roof', () => {
    let count = 0;
    const listener = () => count++;
    eventBus.on('PLAYER_LANDED', listener);
    try {
        const a = p({ z: 93 });
        const o = [ramp(0), roof({ y: 0 })];
        updatePhysics(a, 1 / 60, o);
        for (let i = 0; i < 60; i++) {
            a.z += 0.3;
            updatePhysics(a, 1 / 60, o);
        }
        expect(a.supportSurfaceId).toBe('train:roof');
        expect(count).toBe(0);
    }
    finally {
        eventBus.off('PLAYER_LANDED', listener);
    }
});
it('revokes departure when its owner is recycled', () => {
    const a = p({ y: 8, z: 123.9 });
    updatePhysics(a, 0, [roof()]);
    a.z = 124.1;
    updatePhysics(a, .02, [roof()]);
    expect(a.supportDeparture?.ownerEntityId).toBe('train');
    updatePhysics(a, .02, []);
    expect(a.supportSurfaceId).toBeNull();
    expect(a.supportDeparture).toBeNull();
});
it('keeps an upward departure on a zero-time physics update', () => {
  const a = p({ y: 8, z: 110 });
  updatePhysics(a, 0, [roof()]);
  a.vy = 13.5;
  a.isJumping = true;
  updatePhysics(a, 0, [roof()]);
  expect(a.isJumping).toBe(true);
  expect(a.vy).toBe(13.5);
  expect(a.supportSurfaceId).toBeNull();
});
