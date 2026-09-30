import type { PlayerEntity, ObstacleEntity, CoinEntity, PowerUpEntity, GameContext } from '../types';
import { CONSTANTS } from '../types';
import { eventBus } from '../core/eventBus';

export interface BoundingBox {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export function getPlayerBoundingBox(player: PlayerEntity): BoundingBox {
  const height = player.isRolling ? CONSTANTS.PLAYER_HEIGHT / 2 : CONSTANTS.PLAYER_HEIGHT;
  return {
    x: player.x,
    y: player.y,
    z: player.z,
    width: CONSTANTS.PLAYER_WIDTH,
    height: height,
    depth: CONSTANTS.PLAYER_DEPTH,
  };
}

export function checkAABBCollision(p: BoundingBox, o: BoundingBox): boolean {
  const pMinX = p.x - p.width / 2;
  const pMaxX = p.x + p.width / 2;
  const pMinY = p.y;
  const pMaxY = p.y + p.height;
  const pMinZ = p.z - p.depth / 2;
  const pMaxZ = p.z + p.depth / 2;

  const oMinX = o.x - o.width / 2;
  const oMaxX = o.x + o.width / 2;
  const oMinY = o.y;
  const oMaxY = o.y + o.height;
  const oMinZ = o.z - o.depth / 2;
  const oMaxZ = o.z + o.depth / 2;

  return (
    pMinX < oMaxX &&
    pMaxX > oMinX &&
    pMinY < oMaxY &&
    pMaxY > oMinY &&
    pMinZ < oMaxZ &&
    pMaxZ > oMinZ
  );
}

export function isPlayerOverlappingObstacleZ(player: PlayerEntity, obs: ObstacleEntity): boolean {
  const pMinZ = player.z - CONSTANTS.PLAYER_DEPTH / 2;
  const pMaxZ = player.z + CONSTANTS.PLAYER_DEPTH / 2;
  const oMinZ = obs.z - obs.depth / 2;
  const oMaxZ = obs.z + obs.depth / 2;
  return pMinZ < oMaxZ && pMaxZ > oMinZ;
}

export function checkObstacleCollision(player: PlayerEntity, obs: ObstacleEntity): boolean {
  // 无敌保护帧处理（含 QA 上帝模式保护）
  if (player.invulnerableTimer > 0 || (player as any).godMode) return false;

  const pBox = getPlayerBoundingBox(player);
  const oBox: BoundingBox = {
    x: obs.x,
    y: obs.y,
    z: obs.z,
    width: obs.width,
    height: obs.height,
    depth: obs.depth,
  };

  if (!checkAABBCollision(pBox, oBox)) {
    return false;
  }

  // AC-PRD-01: LOW_OBSTACLE
  if (obs.type === 'LOW_OBSTACLE') {
    if (player.y > 1.2) {
      return false;
    }
    return true;
  }

  // AC-PRD-02: HIGH_OBSTACLE
  if (obs.type === 'HIGH_OBSTACLE') {
    if (player.isRolling) {
      return false;
    }
    return true;
  }

  if (obs.type === 'RAMP') {
    return false;
  }

  if (obs.type === 'STATIC_TRAIN' || obs.type === 'MOVING_TRAIN') {
    const trainTopY = obs.y + obs.height;
    if (player.y >= trainTopY - 0.35) {
      return false;
    }
  }

  return true;
}

export function updatePhysics(
  playerOrCtx: PlayerEntity | GameContext,
  dt: number,
  obstaclesOverride?: ObstacleEntity[]
): void {
  let player: PlayerEntity;
  let obstacles: ObstacleEntity[];
  let coins: CoinEntity[] = [];
  let powerUps: PowerUpEntity[] = [];
  let ctx: GameContext | null = null;

  if ('player' in playerOrCtx) {
    ctx = playerOrCtx;
    player = playerOrCtx.player;
    obstacles = playerOrCtx.obstacles;
    coins = playerOrCtx.coinEntities || [];
    powerUps = playerOrCtx.powerUpEntities || [];
  } else {
    player = playerOrCtx;
    obstacles = obstaclesOverride || [];
  }

  // 确保 player.activePowerUps 初始化
  if (!player.activePowerUps) {
    player.activePowerUps = new Map();
  }

  // 0. 更新道具 Active PowerUps 倒计时
  player.activePowerUps.forEach((timer, type) => {
    if (timer > 0) {
      player.activePowerUps.set(type, Math.max(0, timer - dt));
    }
  });

  // 0.1 更新无敌护盾计时
  if (player.invulnerableTimer > 0) {
    player.invulnerableTimer = Math.max(0, player.invulnerableTimer - dt);
  }

  // 1. 动态移动障碍物 (MOVING_TRAIN)
  for (const obs of obstacles) {
    if (obs.type === 'MOVING_TRAIN' && obs.speedZ) {
      obs.z += obs.speedZ * dt;
    }
  }

  // 2. 左右切道插值
  player.x += (player.targetX - player.x) * Math.min(dt * 15, 1.0);

  // 3. 确定当前脚下的支撑面高度 targetGroundY (地面 0 或 火车顶部 3.0 或 RAMP 平滑过渡)
  let targetGroundY = 0;

  for (const obs of obstacles) {
    if (
      Math.abs(player.x - obs.x) < obs.width / 2 + CONSTANTS.PLAYER_WIDTH / 2 &&
      isPlayerOverlappingObstacleZ(player, obs)
    ) {
      if (obs.type === 'STATIC_TRAIN' || obs.type === 'MOVING_TRAIN') {
        const trainTopY = obs.y + obs.height;
        if (player.y >= trainTopY - 0.2) {
          targetGroundY = Math.max(targetGroundY, trainTopY);
        }
      } else if (obs.type === 'RAMP') {
        const rampStartZ = obs.z - obs.depth / 2;
        const rampEndZ = obs.z + obs.depth / 2;
        const progress = Math.max(0, Math.min(1, (player.z - rampStartZ) / (rampEndZ - rampStartZ)));
        const rampY = progress * obs.height;
        targetGroundY = Math.max(targetGroundY, rampY);
      }
    }
  }

  // 4. 垂直重力与地面/车顶平面响应
  if (player.isJumping || player.y > targetGroundY || player.vy !== 0) {
    player.vy += CONSTANTS.GRAVITY * dt;
    player.y += player.vy * dt;

    if (player.y <= targetGroundY) {
      const didLand = player.isJumping;
      player.y = targetGroundY;
      player.vy = 0;
      player.isJumping = false;
      if (didLand) {
        eventBus.emit('PLAYER_LANDED', { y: player.y });
      }
    }
  } else {
    player.y = targetGroundY;
  }

  // 5. 翻滚计时器
  if (player.isRolling) {
    player.rollTimer -= dt;
    if (player.rollTimer <= 0) {
      player.isRolling = false;
      player.rollTimer = 0;
    }
  }

  // 6. AC-PRD-04: 磁铁 (MAGNET) 寻路吸附
  const isMagnetActive = (player.activePowerUps.get('MAGNET') || 0) > 0;
  for (const coin of coins) {
    if (coin.collected) continue;

    const dx = player.x - coin.x;
    const dy = player.y + 0.8 - coin.y;
    const dz = player.z - coin.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (isMagnetActive && distSq <= CONSTANTS.MAGNET_RADIUS * CONSTANTS.MAGNET_RADIUS) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.1) {
        const step = CONSTANTS.MAGNET_SPEED * dt;
        coin.x += (dx / dist) * step;
        coin.y += (dy / dist) * step;
        coin.z += (dz / dist) * step;
      }
    }

    // 金币拾取判定
    if (Math.abs(player.x - coin.x) < 1.2 && Math.abs(player.z - coin.z) < 1.2 && Math.abs(player.y - coin.y) < 1.8) {
      coin.collected = true;
      if (ctx) ctx.coins += 1;
      eventBus.emit('COIN_COLLECTED', { value: 1, total: ctx ? ctx.coins : 0 });
    }
  }

  // 7. 道具 (PowerUp) 拾取判定
  for (const p of powerUps) {
    if (p.collected) continue;

    if (Math.abs(player.x - p.x) < 1.5 && Math.abs(player.z - p.z) < 1.5 && Math.abs(player.y - p.y) < 2.0) {
      p.collected = true;

      if (p.type === 'HOVERBOARD') {
        player.hasHoverboard = true;
        player.hoverboardActive = true;
      } else {
        player.activePowerUps.set(p.type, 10.0); // 持续 10 秒
      }

      eventBus.emit('POWERUP_ACTIVATED', { type: p.type, duration: 10 });
    }
  }

  // 8. 障碍物碰撞与滑板免死护盾 (Shield Protection)
  for (const obs of obstacles) {
    if (checkObstacleCollision(player, obs)) {
      if (player.hoverboardActive || player.hasHoverboard) {
        // 抵扣滑板，免除死亡！
        player.hoverboardActive = false;
        player.hasHoverboard = false;
        player.invulnerableTimer = 1.2; // 给予 1.2 秒无敌闪烁 protection

        eventBus.emit('HOVERBOARD_SHIELD_SHATTER', {
          position: { x: player.x, y: player.y + 0.8, z: player.z },
        });
        break;
      } else {
        // 游戏结束！
        if (ctx) ctx.state = 'GAMEOVER';
        eventBus.emit('COLLISION', { targetType: obs.type, position: { x: player.x, y: player.y, z: player.z } });
        break;
      }
    }
  }
}
