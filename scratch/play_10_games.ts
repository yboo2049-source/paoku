import { handleInput } from '../src/systems/input';
import { updateMovement } from '../src/systems/movement';
import { updateSpawner } from '../src/systems/spawner';
import { checkCollisions } from '../src/systems/collision';
import type { GameContext } from '../src/types';

function createInitialState(): GameContext {
  return {
    state: 'PLAYING',
    score: 0,
    time: 0,
    speed: 100,
    player: {
      lane: 1,
      y: 0,
      z: 0,
      velocityZ: 0,
      state: 'RUNNING',
      stateTimer: 0,
      buffs: { magnetTimer: 0, shield: false, doubleScoreTimer: 0, jetpackTimer: 0, hoverboardTimer: 0, superSneakersTimer: 0, hoverboardCount: 0 },
      skinColor: 'blue',
      lastLane: 1,
      lastLaneChangeTime: 0,
      stumbleCount: 0,
      lastStumbleTime: 0
    },
    entities: [],
    saveData: { highScore: 0, totalCoins: 0, unlockedSkins: [] }
  };
}

// Simple AI logic from main.ts autopilot
function runAutopilot(ctx: GameContext) {
  if (ctx.player.state === 'JUMPING' || ctx.player.state === 'ROLLING') return;

  const lookAhead = 150;
  const playerY = ctx.player.y;
  const currentLane = ctx.player.lane;

  let danger = [false, false, false];
  let coins = [0, 0, 0];

  for (const entity of ctx.entities) {
    if (entity.isCollected) continue;
    if (entity.y < playerY - 10) continue;
    if (entity.y > playerY + lookAhead) continue;

    if (entity.type === 'COIN' || entity.type.endsWith('_ITEM')) {
      coins[entity.lane]++;
    } else {
      if (entity.type === 'LOW_OBSTACLE' && entity.y < playerY + 80) {
        if (entity.lane === currentLane) {
          handleInput(ctx, 'UP');
          return;
        }
      } else if (entity.type === 'HIGH_OBSTACLE' && entity.y < playerY + 80) {
        if (entity.lane === currentLane) {
          handleInput(ctx, 'DOWN');
          return;
        }
      } else {
        danger[entity.lane] = true;
      }
    }
  }

  if (danger[currentLane]) {
    if (currentLane === 1) {
      if (!danger[0]) handleInput(ctx, 'LEFT');
      else if (!danger[2]) handleInput(ctx, 'RIGHT');
      else handleInput(ctx, 'UP'); // Desperate jump
    } else if (currentLane === 0) {
      if (!danger[1]) handleInput(ctx, 'RIGHT');
      else handleInput(ctx, 'UP');
    } else {
      if (!danger[1]) handleInput(ctx, 'LEFT');
      else handleInput(ctx, 'UP');
    }
  } else {
    // Collect coins
    if (currentLane === 1) {
      if (coins[0] > coins[1] && !danger[0]) handleInput(ctx, 'LEFT');
      else if (coins[2] > coins[1] && !danger[2]) handleInput(ctx, 'RIGHT');
    } else if (currentLane === 0) {
      if (coins[1] > coins[0] && !danger[1]) handleInput(ctx, 'RIGHT');
    } else {
      if (coins[1] > coins[2] && !danger[1]) handleInput(ctx, 'LEFT');
    }
  }
}

async function playGames(numGames: number) {
  let totalScore = 0;
  const deathReasons = [];
  
  for (let i = 0; i < numGames; i++) {
    const ctx = createInitialState();
    const dt = 1 / 60;
    let frames = 0;
    
    while (ctx.state === 'PLAYING' && frames < 60000) { // Max ~16 minutes per game
      runAutopilot(ctx);
      updateSpawner(ctx);
      updateMovement(ctx, dt);
      checkCollisions(ctx);
      frames++;
    }
    
    // Find what killed the player
    let killer = 'Unknown';
    for (const e of ctx.entities) {
      if (Math.abs(ctx.player.y - e.y) < 20 && e.lane === ctx.player.lane && e.type !== 'COIN' && !e.type.endsWith('_ITEM')) {
        killer = e.type;
        break;
      }
    }
    
    if (ctx.player.stumbleCount >= 3) {
      killer = 'STUMBLE_DEATH';
    }
    
    console.log(`Game ${i+1}: Score: ${Math.floor(ctx.score)}, Time: ${Math.floor(ctx.time)}s, Died to: ${killer}`);
    totalScore += ctx.score;
  }
  console.log(`Average Score: ${totalScore / numGames}`);
}

playGames(10);
