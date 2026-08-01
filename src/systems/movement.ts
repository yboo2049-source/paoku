import type { GameContext } from '../types';

export function updateMovement(context: GameContext, deltaTime: number): void {
  const { player, entities } = context;
  
  player.y += context.speed * deltaTime;

  if (player.buffs.magnetTimer > 0) player.buffs.magnetTimer -= deltaTime;
  if (player.buffs.doubleScoreTimer > 0) player.buffs.doubleScoreTimer -= deltaTime;
  if (player.buffs.jetpackTimer > 0) player.buffs.jetpackTimer -= deltaTime;
  if (player.buffs.hoverboardTimer > 0) player.buffs.hoverboardTimer -= deltaTime;
  if (player.buffs.superSneakersTimer > 0) player.buffs.superSneakersTimer -= deltaTime;

  for (const entity of entities) {
    if (entity.type === 'MOVING_TRAIN') {
      entity.y -= context.speed * 0.5 * deltaTime;
    }
  }

  if (player.state === 'ROLLING') {
    player.stateTimer -= deltaTime;
    if (player.stateTimer <= 0) {
      player.state = 'RUNNING';
      player.stateTimer = 0;
    }
  }

  let onRamp = false;
  let rampZ = 0;
  for (const entity of entities) {
    if (entity.type === 'RAMP' && entity.lane === player.lane) {
      if (Math.abs(player.y - entity.y) < entity.length / 2 + 5) {
        onRamp = true;
        const progress = (player.y - (entity.y - entity.length / 2)) / entity.length;
        rampZ = progress * entity.height;
        if (rampZ < 0) rampZ = 0;
        if (rampZ > entity.height) rampZ = entity.height;
      }
    }
  }

  if (player.buffs.jetpackTimer > 0) {
    player.z = 50;
    player.velocityZ = 0;
    if (player.state === 'JUMPING') player.state = 'RUNNING';
  } else {
    const GRAVITY = 250;
    player.velocityZ -= GRAVITY * deltaTime;
    player.z += player.velocityZ * deltaTime;

    let floorZ = onRamp ? rampZ : 0;
    
    if (!onRamp) {
      for (const entity of entities) {
        if ((entity.type === 'MOVING_TRAIN' || entity.type === 'STATIC_TRAIN' || entity.type === 'OBSTACLE' || entity.type === 'LOW_OBSTACLE' || entity.type === 'HIGH_OBSTACLE') && entity.lane === player.lane) {
          const eLength = entity.length || 10;
          if (Math.abs(player.y - entity.y) < eLength / 2 + 5) {
            const entityTop = (entity.z || 0) + entity.height;
            // Lenient check: if player is near or above the top surface
            if (player.z >= entityTop - 8) {
               if (entityTop > floorZ) {
                 floorZ = entityTop;
               }
            }
          }
        }
      }
    }
    
    if (player.z <= floorZ) {
      player.z = floorZ;
      if (player.velocityZ < 0) {
         player.velocityZ = 0;
      }
      
      if (player.state === 'JUMPING') {
        player.state = 'RUNNING';
      }
    } else {
      if (player.state === 'RUNNING' && !onRamp && player.z > floorZ + 0.1) {
         player.state = 'JUMPING';
      }
    }
  }
}
