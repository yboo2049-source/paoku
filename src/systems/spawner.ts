import type { GameContext, EntityType, Lane, GameEntity } from '../types';

let lastSpawnY = 0;
let currentSafeLane: Lane = 1;
let chunksSinceLaneChange = 0;

export function updateSpawner(context: GameContext): void {
  const { player, entities } = context;
  const renderDistance = 1000;
  
  if (entities.length === 0 && player.y < 100) {
    lastSpawnY = player.y;
    currentSafeLane = 1;
    chunksSinceLaneChange = 0;
  }
  
  let maxY = player.y;
  for (const e of entities) {
    if (e.y > maxY) maxY = e.y;
  }
  
  if (lastSpawnY < player.y) {
    lastSpawnY = player.y;
  }
  if (maxY > lastSpawnY) {
    lastSpawnY = maxY;
  }

  const isJetpackActive = context.player.buffs.jetpackTimer > 0;

  if (lastSpawnY < player.y + renderDistance - 100) {
    let startY = lastSpawnY + 100;
    if (startY < player.y + 500) startY = player.y + 500;

    if (isJetpackActive) {
      for (let i = 0; i < 5; i++) {
        entities.push(createEntity('COIN', currentSafeLane, startY + i * 50, 50));
      }
      lastSpawnY = startY + 4 * 50;
    } else {
      chunksSinceLaneChange++;

      if (chunksSinceLaneChange > 3 && Math.random() < 0.3) {
         const possibleLanes: Lane[] = [];
         if (currentSafeLane > 0) possibleLanes.push((currentSafeLane - 1) as Lane);
         if (currentSafeLane < 2) possibleLanes.push((currentSafeLane + 1) as Lane);
         currentSafeLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
         chunksSinceLaneChange = 0;
         
         for (let i = 0; i < 3; i++) {
           entities.push(createEntity('COIN', currentSafeLane, startY + i * 40));
         }
         lastSpawnY = startY + 120;
         return; 
      }

      const availableLanes = [0, 1, 2].filter(l => l !== currentSafeLane) as Lane[];
      const chunkType = Math.random();
      
      if (chunkType < 0.25) {
        // Put the RAMP + STATIC_TRAIN combo IN the safe lane!
        // This guarantees no MOVING_TRAIN will ever sweep backward over it.
        const lane = currentSafeLane;
        entities.push(createEntity('RAMP', lane, startY));
        
        // Train length is 300. Ramp ends at startY + 20. 
        // Train starts at startY + 20, ends at startY + 320. Center is startY + 170.
        entities.push(createEntity('STATIC_TRAIN', lane, startY + 170));
        
        // Coins on the train
        for (let i = 0; i < 16; i++) {
           entities.push(createEntity('COIN', lane, startY + 30 + i * 18, 25));
        }
        
        // 50% chance to spawn an adjacent parallel train for roof-jumping
        if (Math.random() < 0.5) {
           const adjacentLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
           entities.push(createEntity('STATIC_TRAIN', adjacentLane, startY + 170));
           for (let i = 0; i < 16; i++) {
               entities.push(createEntity('COIN', adjacentLane, startY + 30 + i * 18, 25));
           }
        }
        
        // Add a minor distraction in one of the dangerous lanes
        entities.push(createEntity('LOW_OBSTACLE', availableLanes[0], startY + 20));
        lastSpawnY = startY + 340;
      } else if (chunkType < 0.50) {
        const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        entities.push(createEntity('LOW_OBSTACLE', lane, startY + 20));
        entities.push(createEntity('COIN', lane, startY - 10, 5));
        entities.push(createEntity('COIN', lane, startY + 20, 20));
        entities.push(createEntity('COIN', lane, startY + 50, 5));
        
        entities.push(createEntity('COIN', currentSafeLane, startY + 20));
        lastSpawnY = startY + 80;
      } else if (chunkType < 0.75 || chunksSinceLaneChange < 3) {
        const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        entities.push(createEntity('HIGH_OBSTACLE', lane, startY, 10));
        
        const type = Math.random() < 0.2 ? getRandomPowerup() : 'COIN';
        entities.push(createEntity(type, currentSafeLane, startY));
        lastSpawnY = startY + 50;
      } else {
        entities.push(createEntity('MOVING_TRAIN', availableLanes[0], startY));
        entities.push(createEntity('MOVING_TRAIN', availableLanes[1], startY));
        
        const type = Math.random() < 0.2 ? getRandomPowerup() : 'COIN';
        entities.push(createEntity(type, currentSafeLane, startY));
        lastSpawnY = startY + 320;
      }
    }
  }

  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    if (player.y - entity.y > 200 || entity.isCollected) {
      entities.splice(i, 1);
    }
  }
}

function getRandomPowerup(): EntityType {
  const r = Math.random();
  if (r < 0.2) return 'MAGNET_ITEM';
  if (r < 0.4) return 'SHIELD_ITEM';
  if (r < 0.6) return 'DOUBLE_SCORE_ITEM';
  if (r < 0.8) return 'JETPACK_ITEM';
  return 'SUPER_SNEAKERS_ITEM';
}

function createEntity(type: EntityType | string, lane: Lane, y: number, z: number = 0): GameEntity {
  let width = 5, length = 5, height = 5;
  if (type === 'OBSTACLE') { width = 10; length = 10; height = 20; }
  else if (type === 'HIGH_OBSTACLE') { width = 10; length = 10; height = 5; }
  else if (type === 'LOW_OBSTACLE') { width = 10; length = 10; height = 5; }
  else if (type === 'MOVING_TRAIN') { width = 10; length = 300; height = 20; }
  else if (type === 'STATIC_TRAIN') { width = 10; length = 300; height = 20; }
  else if (type === 'RAMP') { width = 10; length = 40; height = 20; }
  else if (type === 'COIN') { width = 5; length = 5; height = 5; }
  else { width = 8; length = 8; height = 8; }

  const entity: any = {
    id: `ent_${Date.now()}_${Math.random()}`,
    type: type as EntityType,
    lane,
    y,
    width,
    length,
    height,
    isCollected: false
  };
  
  if (z !== 0) {
    entity.z = z;
  }
  
  return entity as GameEntity;
}
