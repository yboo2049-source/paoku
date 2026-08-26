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

  init(player: PlayerEntity): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e, player));
    window.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    window.addEventListener('touchend', (e) => this.handleTouchEnd(e, player));
  }

  private handleKeyDown(e: KeyboardEvent, player: PlayerEntity): void {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.moveLane(player, -1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.moveLane(player, 1);
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        this.jump(player);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.roll(player);
        break;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  private handleTouchEnd(e: TouchEvent, player: PlayerEntity): void {
    if (e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        this.moveLane(player, dx > 0 ? 1 : -1);
      }
    } else {
      if (Math.abs(dy) > 30) {
        if (dy < 0) this.jump(player);
        else this.roll(player);
      }
    }
  }

  private moveLane(player: PlayerEntity, direction: number): void {
    const newLane = Math.max(0, Math.min(2, player.lane + direction));
    if (newLane !== player.lane) {
      player.lane = newLane;
      player.targetX = CONSTANTS.LANE_X[newLane];
      eventBus.emit('PLAYER_ACTION', { action: 'CHANGE_LANE', lane: newLane, direction });
    }
  }

  private jump(player: PlayerEntity): void {
    if (!player.isJumping) {
      player.isJumping = true;
      player.vy = computeJumpVelocity(player.activePowerUps);
      eventBus.emit('PLAYER_ACTION', { action: 'JUMP' });
    }
  }

  private roll(player: PlayerEntity): void {
    if (!player.isRolling) {
      player.isRolling = true;
      player.rollTimer = CONSTANTS.ROLL_DURATION;
      if (player.isJumping) {
        player.vy = -CONSTANTS.JUMP_VELOCITY * 1.5;
      }
      eventBus.emit('PLAYER_ACTION', { action: 'ROLL' });
    }
  }
}

export const inputSystem = new InputSystem();
