import type { GameContext } from '../types';
import { logEvent } from '../core/telemetry';

export function checkCollisions(context: GameContext): void {
  const { player, entities } = context;
  
  if (player.z < -20 && context.state === 'PLAYING') {
    logEvent('player_fall', { distance: player.y });
    context.state = 'GAMEOVER';
    return;
  }
  
  const playerLength = 10;
  const playerHeight = player.state === 'ROLLING' ? 5 : 15; 
  
  for (const entity of entities) {
    if (entity.isCollected) continue;
    if (entity.lane !== player.lane) continue;
    
    const overlapY = Math.abs(player.y - entity.y) < (playerLength / 2 + entity.length / 2);
    
    const playerTop = player.z + playerHeight;
    const playerBottom = player.z;
    const entityBottom = entity.z || 0;
    const entityTop = entityBottom + entity.height; 
    
    const overlapZ = (playerBottom < entityTop) && (playerTop > entityBottom);
    
    if (overlapY && overlapZ) {
      if (entity.type === 'COIN') {
        entity.isCollected = true;
        context.score += player.buffs.doubleScoreTimer > 0 ? 20 : 10;
      } else if (entity.type === 'MAGNET_ITEM') {
        entity.isCollected = true;
        player.buffs.magnetTimer = 10;
      } else if (entity.type === 'SHIELD_ITEM') {
        entity.isCollected = true;
        player.buffs.shield = true;
      } else if (entity.type === 'DOUBLE_SCORE_ITEM') {
        entity.isCollected = true;
        player.buffs.doubleScoreTimer = 10;
      } else if (entity.type === 'JETPACK_ITEM') {
        entity.isCollected = true;
        player.buffs.jetpackTimer = 5;
      } else if (entity.type === 'SUPER_SNEAKERS_ITEM') {
        entity.isCollected = true;
        player.buffs.superSneakersTimer = 15;
      } else if (entity.type === 'HOVERBOARD_ITEM') {
        entity.isCollected = true;
        player.buffs.hoverboardCount++;
      } else if (entity.type === 'OBSTACLE' || entity.type === 'MOVING_TRAIN' || entity.type === 'STATIC_TRAIN' || entity.type === 'LOW_OBSTACLE' || entity.type === 'HIGH_OBSTACLE') {
        
        let crash = false;
        let entityTop = (entity.z || 0) + entity.height;
        let entityBottom = entity.z || 0;
        let playerBottom = player.z;
        let playerTop = player.z + (player.state === 'ROLLING' ? 5 : 15);
        
        if (entity.type === 'LOW_OBSTACLE') {
           if (playerBottom < entityTop - 2) crash = true;
        } else if (entity.type === 'HIGH_OBSTACLE') {
           if (playerTop >= entityBottom) crash = true; 
        } else {
           if (playerBottom >= entityTop - 4) {
             // On top of the entity, safe
           } else {
             crash = true;
           }
        }

        if (crash) {
          const isSideCollision = (context.time - player.lastLaneChangeTime) < 0.2;
          
          if (isSideCollision) {
            player.lane = player.lastLane;
            player.stumbleCount = (player.stumbleCount || 0) + 1;
            player.lastStumbleTime = context.time;
            logEvent('player_stumble', { obstacle: entity.type, lane: entity.lane, count: player.stumbleCount });
            crash = (player.stumbleCount >= 3);
          }

          if (crash) {
            if (player.buffs.shield) {
              player.buffs.shield = false;
              entity.isCollected = true;
              logEvent('shield_broken', { obstacle: entity.type });
            } else if (player.buffs.hoverboardTimer > 0) {
              player.buffs.hoverboardTimer = 0;
              entity.isCollected = true;
              logEvent('hoverboard_broken', { obstacle: entity.type });
            } else {
              logEvent('player_crash', { obstacle: entity.type, distance: player.y });
              context.state = 'GAMEOVER';
            }
          }
        }
      }
    }
  }
}
