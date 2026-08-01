import type { GameContext } from './types';
import { handleInput, bindTouchControls } from './systems/input';
import type { InputCommand } from './systems/input';
import { updateMovement } from './systems/movement';
import { checkCollisions } from './systems/collision';
import { updateSpawner } from './systems/spawner';
import { updateMagnet } from './systems/magnet';
import { UIManager } from './ui/dom';
import { ThreeRenderer } from './render/three';
import { loadSaveData, saveSaveData } from './core/storage';
import { playJump, playCoin, playCrash, playPowerup } from './core/audio';
import { submitScore } from './core/leaderboard';
import './style.css';

function createInitialState(): GameContext {
  const saveData = loadSaveData();
  return {
    state: 'MENU',
    score: 0,
    time: 0,
    speed: 300,
    player: {
      lane: 1,
      y: 0,
      z: 0,
      velocityZ: 0,
      state: 'RUNNING',
      stateTimer: 0,
      buffs: {
        magnetTimer: 0,
        shield: false,
        doubleScoreTimer: 0,
        jetpackTimer: 0,
        hoverboardTimer: 0,
        superSneakersTimer: 0,
        hoverboardCount: 0
      },
      skinColor: saveData.unlockedSkins.includes('red') ? 'red' : saveData.unlockedSkins[0]
    },
    entities: [],
    saveData
  };
}

let context = createInitialState();
let lastTime = performance.now();
let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

let autopilot = false;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new ThreeRenderer(canvas);
const ui = new UIManager(() => {
  context = createInitialState();
  context.state = 'PLAYING';
  autopilot = false;
});

const autopilotBtn = document.getElementById('autopilot-btn');
if (autopilotBtn) {
  autopilotBtn.addEventListener('click', () => {
    context = createInitialState();
    context.state = 'PLAYING';
    autopilot = true;
  });
}

function onCommand(command: InputCommand) {
  if (context.state !== 'PLAYING') return;
  const prevState = context.player.state;
  handleInput(context, command);
  if (context.player.state === 'JUMPING' && prevState !== 'JUMPING') {
    playJump();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (context.state === 'PLAYING') {
      context.state = 'PAUSED';
    } else if (context.state === 'PAUSED') {
      context.state = 'PLAYING';
      lastTime = performance.now();
    }
    return;
  }
  
  let command: InputCommand | null = null;
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': command = 'LEFT'; break;
    case 'ArrowRight': case 'd': case 'D': command = 'RIGHT'; break;
    case 'ArrowUp': case 'w': case 'W': command = 'UP'; break;
    case 'ArrowDown': case 's': case 'S': command = 'DOWN'; break;
  }
  
  if (command) {
    onCommand(command);
  }
});

bindTouchControls(document.body, onCommand);

function loop(currentTime: number) {
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); 
  lastTime = currentTime;
  
  frameCount++;
  if (currentTime - lastFpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsTime = currentTime;
  }
  
  let transitionedToGameOver = false;
  
  if (context.state === 'PLAYING') {
    context.time += deltaTime;
    context.speed = Math.min(1000, 150 + context.player.y * 0.015);
    
    updateMagnet(context, deltaTime);
    updateMovement(context, deltaTime);
    updateSpawner(context);

    const prevScore = context.score;
    const prevMagnet = context.player.buffs.magnetTimer;
    const prevShield = context.player.buffs.shield;
    const prevDouble = context.player.buffs.doubleScoreTimer;

    checkCollisions(context);
    
    if (context.score > prevScore) playCoin();
    
    if (
      (context.player.buffs.magnetTimer > 0 && prevMagnet <= 0) ||
      (context.player.buffs.shield && !prevShield) ||
      (context.player.buffs.doubleScoreTimer > 0 && prevDouble <= 0)
    ) {
      playPowerup();
    }

    if ((context.state as any) === 'GAMEOVER') {
      transitionedToGameOver = true;
      autopilot = false;
    }
  }

  // --- AI Autopilot Logic ---
  if (autopilot && context.state === 'PLAYING') {
    const safeDistance = 300 + context.speed * 0.4;
    const playerY = context.player.y;
    
    // Detect danger in current lane
    const danger = context.entities.find(e => 
      (e.type === 'OBSTACLE' || e.type === 'MOVING_TRAIN' || e.type === 'LOW_OBSTACLE' || e.type === 'HIGH_OBSTACLE') &&
      e.lane === context.player.lane &&
      e.y > playerY &&
      (e.y - playerY) < safeDistance &&
      !e.isCollected
    );

    if (danger) {
      if (danger.type === 'HIGH_OBSTACLE') {
        // Roll under it
        onCommand('DOWN');
      } else {
        // Find a safe lane
        let targetLane = -1;
        for (let l = 0; l <= 2; l++) {
          if (l === context.player.lane) continue;
          const threat = context.entities.find(e => 
            (e.type === 'OBSTACLE' || e.type === 'MOVING_TRAIN' || e.type === 'LOW_OBSTACLE' || e.type === 'HIGH_OBSTACLE') &&
            e.lane === l &&
            e.y > playerY &&
            (e.y - playerY) < safeDistance &&
            !e.isCollected
          );
          if (!threat) {
            targetLane = l;
            break; // Found safe lane
          }
        }
        
        if (targetLane !== -1) {
          if (targetLane < context.player.lane) onCommand('LEFT');
          if (targetLane > context.player.lane) onCommand('RIGHT');
        } else {
          // No safe lane, attempt a jump
          if (context.player.state !== 'JUMPING') onCommand('UP');
        }
      }
    } else {
      // Seek coins if safe
      const goodItem = context.entities.find(e => 
        (e.type === 'COIN' || e.type.endsWith('_ITEM')) &&
        e.lane !== context.player.lane &&
        e.y > playerY &&
        (e.y - playerY) < safeDistance &&
        !e.isCollected
      );
      if (goodItem) {
        // Check if moving to that lane is safe
        const threat = context.entities.find(e => 
          (e.type === 'OBSTACLE' || e.type === 'MOVING_TRAIN' || e.type === 'LOW_OBSTACLE' || e.type === 'HIGH_OBSTACLE') &&
          e.lane === goodItem.lane &&
          e.y > playerY &&
          (e.y - playerY) < safeDistance &&
          !e.isCollected
        );
        if (!threat) {
          if (goodItem.lane < context.player.lane) onCommand('LEFT');
          if (goodItem.lane > context.player.lane) onCommand('RIGHT');
        }
      }
    }
  }
  // --------------------------

  if (transitionedToGameOver) {
    playCrash();
    submitScore(context.score).catch(console.error);
  }
    
  if (context.state === 'GAMEOVER') {
    if (context.score > context.saveData.highScore) {
      context.saveData.highScore = context.score;
      saveSaveData(context.saveData);
    }
  }
  
  renderer.render(context);
  ui.update(context, currentFps);
  
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
