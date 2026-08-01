import type { GameContext, Lane } from '../types';

export type InputCommand = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'DOUBLE_TAP';

export function handleInput(context: GameContext, command: InputCommand): void {
  const { player } = context;

  switch (command) {
    case 'LEFT':
      if (player.lane > 0) player.lane = (player.lane - 1) as Lane;
      break;
    case 'RIGHT':
      if (player.lane < 2) player.lane = (player.lane + 1) as Lane;
      break;
    case 'UP':
      if (player.state === 'RUNNING') {
        player.state = 'JUMPING';
        player.velocityZ = (player.buffs.superSneakersTimer > 0) ? 130 : 80;
      }
      break;
    case 'DOWN':
      if (player.z > 0) {
        // Fast fall
        player.velocityZ = -150;
      } else {
        // Roll
        player.state = 'ROLLING';
        player.stateTimer = 0.5; // 0.5 秒翻滚时间
      }
      break;
    case 'DOUBLE_TAP':
      // Check and consume hoverboard
      if (player.buffs.hoverboardCount > 0) {
        player.buffs.hoverboardCount -= 1;
        player.buffs.hoverboardTimer = 10;
      }
      break;
  }
}

export function bindTouchControls(element: HTMLElement, callback: (cmd: InputCommand) => void): void {
  let startX = 0;
  let startY = 0;
  let lastTapTime = 0;
  let lastKey = '';

  element.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  element.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - startX;
    const diffY = endY - startY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 30) {
        if (diffX > 0) {
          callback('RIGHT');
        } else {
          callback('LEFT');
        }
      }
    } else {
      if (Math.abs(diffY) > 30) {
        if (diffY > 0) {
          callback('DOWN');
        } else {
          callback('UP');
        }
      } else if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
        // Detect touch double tap
        const now = Date.now();
        if (now - lastTapTime < 300) {
          callback('DOUBLE_TAP');
          lastTapTime = 0;
        } else {
          lastTapTime = now;
        }
      }
    }
  }, { passive: true });

  // Add keyboard double-tap detection for Up arrow and Spacebar
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
      const now = Date.now();
      if (now - lastTapTime < 300 && lastKey === e.key) {
        callback('DOUBLE_TAP');
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastKey = e.key;
      }
    } else {
      lastKey = '';
    }
  });
}
