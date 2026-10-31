import type { InputAction } from '../types/contracts';
import { InputQueue } from '../core/inputQueue';
import type { PlayerEntity, PowerUpType } from '../types';
import { CONSTANTS } from '../types';
import { eventBus } from '../core/eventBus';

/**
 * AC-PRD-05: SUPER_SNEAKERS 超级跑鞋
 * 纯函数抽取：根据是否激活 SUPER_SNEAKERS 返回起跳初速度。
 * 激活时为 1.5x JUMP_VELOCITY（20.25），否则为基础 JUMP_VELOCITY（13.5）。
 */
export function computeJumpVelocity(activePowerUps: Map<PowerUpType, number> | undefined): number {
  const isSuperSneakers = (activePowerUps?.get('SUPER_SNEAKERS') || 0) > 0;
  return isSuperSneakers ? CONSTANTS.SUPER_JUMP_VELOCITY : CONSTANTS.JUMP_VELOCITY;
}

export class InputSystem {
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isTouching: boolean = false;
  private queue?: InputQueue;
  private currentTick: () => number = () => 0;
  private boundBlur?: () => void;
  private canAct?: () => boolean;
  private boundKeyDown?: (e: KeyboardEvent) => void;
  private boundTouchStart?: (e: TouchEvent) => void;
  private boundTouchEnd?: (e: TouchEvent) => void;

  init(player: PlayerEntity | undefined, canAct?: () => boolean): void {
    this.dispose();
    this.queue = undefined;
    this.canAct = canAct;
    this.boundKeyDown = (e) => this.handleKeyDown(e, player);
    this.boundTouchStart = (e) => this.handleTouchStart(e);
    this.boundTouchEnd = (e) => this.handleTouchEnd(e, player);

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('touchstart', this.boundTouchStart);
    window.addEventListener('touchend', this.boundTouchEnd);
    this.boundBlur = () => { this.isTouching = false; this.queue?.clear(); };
    window.addEventListener('blur', this.boundBlur);
    window.addEventListener('touchcancel', this.boundBlur);
  }

  /** Production path: capture intents only. Legacy init remains for isolated old consumers. */
  initQueue(queue: InputQueue, currentTick: () => number): void {
    this.init(undefined);
    this.queue = queue; this.currentTick = currentTick;
  }

  clear(): void { this.isTouching = false; this.queue?.clear(); }

  private dispatch(player: PlayerEntity | undefined, action: InputAction, source: 'KEYBOARD' | 'TOUCH'): void {
    if (this.queue) { this.queue.collect(action, source, this.currentTick()); return; }
    if (player) { if (action === 'JUMP') this.jump(player); else if (action === 'ROLL') this.roll(player); else applyInputAction(player, action); }
  }

  dispose(): void {
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundTouchStart) window.removeEventListener('touchstart', this.boundTouchStart);
    if (this.boundTouchEnd) window.removeEventListener('touchend', this.boundTouchEnd);
    if (this.boundBlur) { window.removeEventListener('blur', this.boundBlur); window.removeEventListener('touchcancel', this.boundBlur); }
    this.boundKeyDown = undefined; this.boundTouchStart = undefined; this.boundTouchEnd = undefined; this.boundBlur = undefined;
    this.isTouching = false; this.queue = undefined;
  }

  private handleKeyDown(e: KeyboardEvent, player: PlayerEntity | undefined): void {
    if (e.repeat || (this.canAct && !this.canAct())) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault?.();
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.dispatch(player, 'LEFT', 'KEYBOARD');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.dispatch(player, 'RIGHT', 'KEYBOARD');
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        this.dispatch(player, 'JUMP', 'KEYBOARD');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.dispatch(player, 'ROLL', 'KEYBOARD');
        break;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.isTouching = true;
    }
  }

  private handleTouchEnd(e: TouchEvent, player: PlayerEntity | undefined): void {
    if (this.canAct && !this.canAct()) return;
    if (!this.isTouching || e.changedTouches.length === 0) return;
    this.isTouching = false;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        this.dispatch(player, dx > 0 ? 'RIGHT' : 'LEFT', 'TOUCH');
      }
    } else {
      if (Math.abs(dy) > 30) {
        if (dy < 0) this.dispatch(player, 'JUMP', 'TOUCH');
        else this.dispatch(player, 'ROLL', 'TOUCH');
      }
    }
  }

  private jump(player: PlayerEntity): void { applyInputAction(player, 'JUMP'); }
  private roll(player: PlayerEntity): void { applyInputAction(player, 'ROLL'); }
}

/** Called only by the simulation tick in production. One legacy fact per accepted action. */
export function applyInputAction(player: PlayerEntity, action: InputAction): void {
  if (action === 'LEFT' || action === 'RIGHT') {
    const direction = action === 'LEFT' ? -1 : 1;
    const newLane = Math.max(0, Math.min(2, player.lane + direction));
    if (newLane !== player.lane) {
      player.lane = newLane; player.targetX = CONSTANTS.LANE_X[newLane];
      eventBus.emit('PLAYER_ACTION', { action: 'CHANGE_LANE', lane: newLane, direction });
    }
  } else if (action === 'JUMP' && !player.isJumping) {
    player.isJumping = true; player.isRolling = false; player.rollTimer = 0;
    player.vy = computeJumpVelocity(player.activePowerUps);
    eventBus.emit('PLAYER_ACTION', { action: 'JUMP' });
  } else if (action === 'ROLL' && !player.isRolling) {
    player.isRolling = true; player.rollTimer = CONSTANTS.ROLL_DURATION;
    if (player.isJumping) player.vy = -CONSTANTS.JUMP_VELOCITY * 1.5;
    eventBus.emit('PLAYER_ACTION', { action: 'ROLL' });
  }
}

export const inputSystem = new InputSystem();
