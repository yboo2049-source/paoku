import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoop } from '../../src/core/gameLoop';
import { EventBus } from '../../src/core/eventBus';
import { checkObstacleCollision } from '../../src/systems/physics';
import { InputSystem } from '../../src/systems/input';
import { PlayerEntity, ObstacleEntity, CONSTANTS } from '../../src/types';

describe('Red Team Fixes Verification Suite', () => {
  let listeners: Record<string, (e: any) => void>;

  beforeEach(() => {
    listeners = {};
    const cancelFn = vi.fn();
    const reqFn = vi.fn((cb: FrameRequestCallback) => 123);
    (globalThis as any).requestAnimationFrame = reqFn;
    (globalThis as any).cancelAnimationFrame = cancelFn;
    (globalThis as any).window = {
      addEventListener: (type: string, fn: (e: any) => void) => {
        listeners[type] = fn;
      },
      removeEventListener: vi.fn(),
      requestAnimationFrame: reqFn,
      cancelAnimationFrame: cancelFn,
    };
  });

  describe('GameLoop lifecycle and clock robustness', () => {
    it('cancels pending animationFrame on stop and ignores negative dt', () => {
      const cancelSpy = (globalThis as any).window.cancelAnimationFrame;
      let capturedDt = 0;
      const loop = new GameLoop((dt) => {
        capturedDt = dt;
      });

      loop.start();
      loop.stop();
      expect(cancelSpy).toHaveBeenCalledWith(123);
    });
  });

  describe('EventBus reentrant safety', () => {
    it('does not skip or corrupt callbacks when callback unsubscribes during emit', () => {
      const bus = new EventBus();
      let callCountA = 0;
      let callCountB = 0;

      const callbackA = () => {
        callCountA++;
        bus.off('TEST_EVENT', callbackA); // Unsubscribes itself during iteration
      };

      bus.on('TEST_EVENT', callbackA);
      bus.on('TEST_EVENT', () => {
        callCountB++;
      });

      bus.emit('TEST_EVENT', null);

      expect(callCountA).toBe(1);
      expect(callCountB).toBe(1);

      // Second emit: A should not be called, B should be called
      bus.emit('TEST_EVENT', null);
      expect(callCountA).toBe(1);
      expect(callCountB).toBe(2);
    });
  });

  describe('InputSystem Jump-Roll mutual exclusivity and lifecycle', () => {
    let player: PlayerEntity;

    beforeEach(() => {
      player = {
        lane: 1,
        targetX: 0,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        isJumping: false,
        isRolling: false,
        rollTimer: 0,
        hasHoverboard: false,
        hoverboardActive: false,
        invulnerableTimer: 0,
      };
    });

    it('cancels rolling when jumping', () => {
      const input = new InputSystem();
      input.init(player);

      // Start roll
      input.roll(player);
      expect(player.isRolling).toBe(true);
      expect(player.rollTimer).toBe(CONSTANTS.ROLL_DURATION);

      // Jump immediately while rolling
      input.jump(player);
      expect(player.isJumping).toBe(true);
      expect(player.isRolling).toBe(false);
      expect(player.rollTimer).toBe(0);

      input.dispose();
    });

    it('removes event listeners upon dispose()', () => {
      const removeSpy = (globalThis as any).window.removeEventListener;
      const input = new InputSystem();
      input.init(player);
      input.dispose();

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    });
  });

  describe('Physics: RAMP and Train top collision exemption', () => {
    it('exempts player from collision when running on top of a train from a ramp', () => {
      const player: PlayerEntity = {
        lane: 1,
        targetX: 0,
        x: 0,
        y: 3.5, // Player has run up the ramp to train top height
        z: 50,
        vx: 0,
        vy: 0,
        isJumping: false,
        isRolling: false,
        rollTimer: 0,
        hasHoverboard: false,
        hoverboardActive: false,
        invulnerableTimer: 0,
      };

      const train: ObstacleEntity = {
        id: 'train_1',
        type: 'STATIC_TRAIN',
        lane: 1,
        x: 0,
        y: 0,
        z: 50,
        width: 2.2,
        height: 3.5,
        depth: 25,
      };

      // Player y is equal to or slightly above train top - should not trigger fatal collision
      const collided = checkObstacleCollision(player, train);
      expect(collided).toBe(false);
    });
  });
});
