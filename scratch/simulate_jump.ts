import { handleInput } from '../src/systems/input';
import { updateMovement } from '../src/systems/movement';
import type { GameContext } from '../src/types';

const ctx: GameContext = {
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
    skinColor: 'blue'
  },
  entities: [],
  saveData: { highScore: 0, totalCoins: 0, unlockedSkins: [] }
};

// Initiate normal jump
handleInput(ctx, 'UP');

let maxZ = 0;
const deltaTime = 1 / 60; // 60 FPS

// Simulate until landing
for (let i = 0; i < 100; i++) {
  updateMovement(ctx, deltaTime);
  if (ctx.player.z > maxZ) {
    maxZ = ctx.player.z;
  }
  if (ctx.player.state === 'RUNNING' && ctx.player.z === 0) {
    break; // Landed
  }
}

console.log('Normal Jump Max Z:', maxZ);

// Reset and try with Super Sneakers
ctx.player.z = 0;
ctx.player.state = 'RUNNING';
ctx.player.velocityZ = 0;
ctx.player.buffs.superSneakersTimer = 10;
handleInput(ctx, 'UP');

let maxZSuper = 0;
for (let i = 0; i < 100; i++) {
  updateMovement(ctx, deltaTime);
  if (ctx.player.z > maxZSuper) {
    maxZSuper = ctx.player.z;
  }
  if (ctx.player.state === 'RUNNING' && ctx.player.z === 0) {
    break;
  }
}

console.log('Super Sneakers Max Z:', maxZSuper);
