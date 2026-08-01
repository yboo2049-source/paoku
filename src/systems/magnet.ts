import type { GameContext, Lane } from '../types';

export function updateMagnet(context: GameContext, deltaTime: number): void {
  const { player, entities } = context;
  if (player.buffs.magnetTimer <= 0) return;

  for (const entity of entities) {
    if (entity.type === 'COIN' && !entity.isCollected) {
      if (entity.lane < player.lane) {
        entity.lane = (entity.lane + 1) as Lane;
      } else if (entity.lane > player.lane) {
        entity.lane = (entity.lane - 1) as Lane;
      }
      
      const pullSpeed = 300 * deltaTime;
      if (entity.y > player.y) {
        entity.y = Math.max(player.y, entity.y - pullSpeed);
      } else if (entity.y < player.y) {
        entity.y = Math.min(player.y, entity.y + pullSpeed);
      }
      
      const targetZ = player.z + 5;
      const coinZ = entity.z || 5;
      if (coinZ > targetZ) {
        entity.z = Math.max(targetZ, coinZ - pullSpeed);
      } else if (coinZ < targetZ) {
        entity.z = Math.min(targetZ, coinZ + pullSpeed);
      }
    }
  }
}
