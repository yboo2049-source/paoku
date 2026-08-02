import type { GameContext, EntityType, Lane, GameEntity } from '../types';
import { logEvent } from '../core/telemetry';

interface TrackSegment {
  name: string;
  length: number;
  spawn: (startY: number, entities: GameEntity[], safeLane: Lane) => void;
}

const segments: TrackSegment[] = [
  {
    name: 'Pattern_ZigZag_Trains',
    length: 840,
    spawn: (startY, entities, safeLane) => {
      const trainLanes = [0, 1, 2].filter(l => l !== safeLane) as Lane[];
      trainLanes.forEach(lane => {
        entities.push(createEntity('RAMP', lane, startY));
        entities.push(createEntity('STATIC_TRAIN', lane, startY + 420));
      });
      // Zig-zag line of 40 coins bouncing between the two train roofs
      for (let i = 0; i < 40; i++) {
        const coinLane = trainLanes[i % 2];
        entities.push(createEntity('COIN', coinLane, startY + 30 + i * 20, 25));
      }
      // The third lane has a low obstacle and some coins
      entities.push(createEntity('LOW_OBSTACLE', safeLane, startY + 50));
      entities.push(createEntity('HIGH_OBSTACLE', safeLane, startY + 350));
      entities.push(createEntity('LOW_OBSTACLE', safeLane, startY + 650));
      for (let i = 0; i < 5; i++) {
        entities.push(createEntity('COIN', safeLane, startY + 150 + i * 40));
      }
    }
  },
  {
    name: 'Pattern_Under_Over',
    length: 500,
    spawn: (startY, entities, safeLane) => {
      const allLanes = [0, 1, 2] as Lane[];
      for (let i = 0; i < 5; i++) {
        const lane = allLanes[i % 3];
        const isHigh = i % 2 === 0;
        entities.push(createEntity(isHigh ? 'HIGH_OBSTACLE' : 'LOW_OBSTACLE', lane, startY + i * 100, isHigh ? 10 : 0));
        // Coins guide the player
        if (isHigh) {
            // Coins underneath
            entities.push(createEntity('COIN', lane, startY + i * 100, 0));
        } else {
            // Coins above
            entities.push(createEntity('COIN', lane, startY + i * 100, 20));
        }
      }
      // random powerup in safelane
      if (Math.random() < 0.3) {
          entities.push(createEntity(getRandomPowerup(), safeLane, startY + 400));
      }
    }
  },
  {
    name: 'Pattern_Moving_Rush',
    length: 1000,
    spawn: (startY, entities, safeLane) => {
      const trainLanes = [0, 1, 2].filter(l => l !== safeLane) as Lane[];
      // 50% chance to only have 1 moving train instead of 2
      if (Math.random() < 0.5) {
        trainLanes.pop();
      }
      trainLanes.forEach(lane => {
        entities.push(createEntity('MOVING_TRAIN', lane, startY + 400));
        entities.push(createEntity('LOW_OBSTACLE', lane, startY + 850));
      });
      // safe lane is filled with a perfect line of coins and powerups
      for (let i = 0; i < 20; i++) {
        const type = (i === 10 && Math.random() < 0.5) ? getRandomPowerup() : 'COIN';
        entities.push(createEntity(type, safeLane, startY + i * 50));
      }
      entities.push(createEntity('HIGH_OBSTACLE', safeLane, startY + 850));
    }
  },
  {
    name: 'Pattern_Slalom',
    length: 600,
    spawn: (startY, entities, _safeLane) => {
      [0, 1, 2].forEach((lane, i) => {
        entities.push(createEntity('LOW_OBSTACLE', lane as Lane, startY + i * 150));
        entities.push(createEntity('HIGH_OBSTACLE', lane as Lane, startY + 450 - i * 150));
      });
      // coins leading between them diagonally
      for (let i = 0; i < 12; i++) {
         const progress = i / 11;
         const lane = Math.round(progress * 2) as Lane;
         entities.push(createEntity('COIN', lane, startY + i * 50));
      }
    }
  },
  {
    name: 'Pattern_Train_Tunnel',
    length: 840,
    spawn: (startY, entities, safeLane) => {
      const trainLanes = [0, 1, 2].filter(l => l !== safeLane) as Lane[];
      trainLanes.forEach(lane => {
        entities.push(createEntity('STATIC_TRAIN', lane, startY + 420));
      });
      for (let i = 0; i < 16; i++) {
        entities.push(createEntity('COIN', safeLane, startY + i * 50));
      }
      if (Math.random() < 0.5) {
          entities.push(createEntity(getRandomPowerup(), safeLane, startY + 400));
      }
      entities.push(createEntity('LOW_OBSTACLE', safeLane, startY + 200));
      entities.push(createEntity('HIGH_OBSTACLE', safeLane, startY + 600));
    }
  },
  {
    name: 'Pattern_Single_Train',
    length: 840,
    spawn: (startY, entities, safeLane) => {
      // Pick exactly one lane for the train
      const trainLane = safeLane > 0 ? (safeLane - 1) as Lane : 2;
      entities.push(createEntity('RAMP', trainLane, startY));
      entities.push(createEntity('STATIC_TRAIN', trainLane, startY + 420));
      
      // Coins on top of the train
      for (let i = 0; i < 15; i++) {
        entities.push(createEntity('COIN', trainLane, startY + 100 + i * 40, 25));
      }
      
      // Hurdles on the ground in the other lanes to force jumping
      const allLanes = [0, 1, 2] as Lane[];
      allLanes.forEach(lane => {
        if (lane !== trainLane) {
          entities.push(createEntity('LOW_OBSTACLE', lane, startY + 200));
          entities.push(createEntity('HIGH_OBSTACLE', lane, startY + 400));
          entities.push(createEntity('LOW_OBSTACLE', lane, startY + 600));
          for (let i = 0; i < 5; i++) {
            entities.push(createEntity('COIN', lane, startY + 300 + i * 40));
          }
        }
      });
    }
  }
];

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
    // Stick closely to the last spawned Y to avoid massive empty gaps.
    let startY = lastSpawnY + 20; // very small padding between segments
    // Ensure we don't spawn behind the player if they somehow outran the queue
    if (startY < player.y + 200) startY = player.y + 200;

    if (isJetpackActive) {
      for (let i = 0; i < 5; i++) {
        entities.push(createEntity('COIN', currentSafeLane, startY + i * 50, 50));
      }
      lastSpawnY = startY + 4 * 50;
    } else {
      chunksSinceLaneChange++;

      if (chunksSinceLaneChange > 2 && Math.random() < 0.5) {
         const possibleLanes: Lane[] = [];
         if (currentSafeLane > 0) possibleLanes.push((currentSafeLane - 1) as Lane);
         if (currentSafeLane < 2) possibleLanes.push((currentSafeLane + 1) as Lane);
         currentSafeLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
         chunksSinceLaneChange = 0;
         
         const blockedLanes = [0, 1, 2].filter(l => l !== currentSafeLane) as Lane[];
         blockedLanes.forEach(lane => {
           entities.push(createEntity('STATIC_TRAIN', lane, startY + 420));
         });
         
         for (let i = 0; i < 16; i++) {
           entities.push(createEntity('COIN', currentSafeLane, startY + i * 50));
         }
         lastSpawnY = startY + 840;
         return; 
      }

      const segment = segments[Math.floor(Math.random() * segments.length)];
      segment.spawn(startY, entities, currentSafeLane);
      logEvent('spawn_segment', { name: segment.name, startY });
      lastSpawnY = startY + segment.length;
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
  else if (type === 'MOVING_TRAIN') { width = 10; length = 800; height = 20; }
  else if (type === 'STATIC_TRAIN') { width = 10; length = 800; height = 20; }
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
