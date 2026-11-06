import type { PlayerEntity, ObstacleEntity, CoinEntity, PowerUpEntity, GameContext, PhysicsStepStart } from '../types';
import { CONSTANTS } from '../types';
import { eventBus } from '../core/eventBus';
import { GROUND, obstacleSurface, resolveSupport, sampleSurface, SURFACE_EPSILON } from './surfaces';
import { compareContacts, sweepAABB } from './contacts';
import type { SweptContact } from './contacts';
import { recordCoinPickup } from './runSettlement';
import type { MotionSink } from '../types/contracts';

/** Called only by run/QA discontinuity owners, never by presentation. */
export function resetPhysicsContacts(player: PlayerEntity): void {
  player.collisionEnded = false;
  player.supportSurfaceId = null;
  player.contact = 'AIRBORNE';
  delete player.supportSample;
  player.supportDeparture = null;
  player.supportRampExit = null;
}

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

  if (obs.type === 'RAMP') {
    return false;
  }

  if (obs.type === 'STATIC_TRAIN' || obs.type === 'MOVING_TRAIN') {
    const trainTopY = obs.y + obs.height;
    // A supported foot on a ramp can overlap the next car's front with its
    // body before reaching the common endpoint. Exempt only that exact seam.
    const departure = player.supportDeparture;
    if (departure?.ownerEntityId === obs.id && player.y <= departure.y+SURFACE_EPSILON && (
      (departure.side === 'REAR' && player.z > obs.z+obs.depth/2) ||
      (departure.side === 'LEFT' && player.x < obs.x-obs.width/2) ||
      (departure.side === 'RIGHT' && player.x > obs.x+obs.width/2))) return false;
    const exit = player.supportRampExit;
    if (player.contact === 'SUPPORTED' && exit &&
        Math.abs(exit.z - (obs.z - obs.depth / 2)) <= SURFACE_EPSILON &&
        Math.abs(exit.y - trainTopY) <= SURFACE_EPSILON &&
        player.x >= Math.max(exit.xMin, obs.x-obs.width/2) &&
        player.x <= Math.min(exit.xMax, obs.x+obs.width/2) && player.z <= exit.z) return false;
    if (player.y >= trainTopY - SURFACE_EPSILON) {
      return false;
    }
  }

  return true;
}

export function updatePhysics(
  playerOrCtx: PlayerEntity | GameContext,
  dt: number,
  obstaclesOverride?: ObstacleEntity[] | PhysicsStepStart,
  stepStart?: PhysicsStepStart,
  motion?: MotionSink,
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
    if (ctx.state === 'GAMEOVER') return;
  } else {
    player = playerOrCtx;
    obstacles = Array.isArray(obstaclesOverride) ? obstaclesOverride : [];
  }

  const from = stepStart ?? (!Array.isArray(obstaclesOverride) ? obstaclesOverride : undefined) ??
    { x: player.x, y: player.y, z: player.z };
  const beforePlayer = { ...player, ...from };
  const obstacleStarts = obstacles.map(o => ({ ...o }));
  const rollingDuration = player.isRolling ? Math.max(0, player.rollTimer) : 0;

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

  player.x += (player.targetX - player.x) * Math.min(dt * 15, 1.0);
  const surfacesBefore = [GROUND, ...obstacles.map(obstacleSurface).filter(s => s !== null)];
  const support = surfacesBefore.find(s => s.id === player.supportSurfaceId);
  const oldSample = player.supportSample;
  const carrier = support && obstacles.find(o => o.id === support.ownerEntityId);
  if (carrier?.type === 'MOVING_TRAIN' && oldSample && player.vy <= 0 && !player.isJumping &&
      Math.abs(player.y - oldSample.y) <= SURFACE_EPSILON &&
      sampleSurface(support!, oldSample.x, oldSample.z) !== null &&
      sampleSurface(support!, player.x, player.z) !== null) {
    player.z += (carrier.speedZ ?? 0) * dt;
  }
  for (const obs of obstacles) {
    if (obs.type === 'MOVING_TRAIN') obs.z += (obs.speedZ ?? 0) * dt;
  }

  const surfacesAfter = [GROUND, ...obstacles.map(obstacleSurface).filter(s => s !== null)];
  const didLand = resolveSupport(player, dt, surfacesBefore, surfacesAfter);
  if (didLand) {
    if (motion) {
      const surface = surfacesAfter.find(s => s.id === player.supportSurfaceId);
      motion.landed({ surfaceId: player.supportSurfaceId ?? null, surfaceKind: surface?.kind ?? null,
        position: { x: player.x, y: player.y, z: player.z }, relativeImpactSpeedMps: null,
        impactStatus: 'NOT_EXPOSED_BY_CURRENT_SOLVER', supportStatus: surface ? 'KNOWN' : 'MISSING' });
    } else eventBus.emit('PLAYER_LANDED', { y: player.y });
  }
  // 5. 翻滚计时器
  if (player.isRolling) {
    player.rollTimer -= dt;
    if (player.rollTimer <= 0) {
      player.isRolling = false;
      player.rollTimer = 0;
    }
  }

  // Pure geometric contacts precede pickups and damage. Stance is piecewise
  // constant: rolling until its timer boundary, then standing for the remainder.
  const contacts: { contact: SweptContact; obstacle: ObstacleEntity; position: PhysicsStepStart }[] = [];
  const departures: { contact: SweptContact; departure: NonNullable<PlayerEntity['supportDeparture']> }[] = [];
  const lerp = (a: PhysicsStepStart, b: PhysicsStepStart, t: number): PhysicsStepStart => ({
    x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
  });
  const rollEnd = beforePlayer.isRolling && rollingDuration > 0 ? (dt > 0 ? Math.min(rollingDuration / dt, 1) : 1) : 0;
  const phases = rollEnd > 0 ? [{ start: 0, end: rollEnd, rolling: true }] : [];
  if (rollEnd < 1) phases.push({ start: rollEnd, end: 1, rolling: false });
  // Expiry exactly at t=1 still changes the committed pose at that endpoint.
  else if (!player.isRolling) phases.push({ start: 1, end: 1, rolling: false });
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i], obs0 = obstacleStarts[i];
    if (obs.type === 'RAMP') continue;
    // An accepted top-edge contact can continue within later stance segments,
    // but one obstacle must not mutate another obstacle's query inputs.
    const afterForObstacle = { ...player };
    for (const phase of phases) {
      const start = lerp(from, player, phase.start), end = lerp(from, player, phase.end);
      const obstacle0 = { ...obs0, ...lerp(obs0, obs, phase.start) };
      const obstacle1 = { ...obs, ...lerp(obs0, obs, phase.end) };
      const p0 = getPlayerBoundingBox({ ...player, ...start, isRolling: phase.rolling });
      const p1 = { ...p0, ...end };
      const local = sweepAABB(p0, p1, obstacle0, obstacle1, obs.id);
      if (!local) continue;
      const time = phase.start + local.time * (phase.end - phase.start);
      const position = lerp(from, player, time);
      const atObstacle = { ...obs, ...lerp(obs0, obs, time) };
      if (isSupportSweep(beforePlayer, afterForObstacle, position, atObstacle, local, obs.z - obs0.z)) {
        const departure = afterForObstacle.supportDeparture;
        if (departure && departure !== player.supportDeparture &&
            player.x - CONSTANTS.PLAYER_WIDTH / 2 < obs.x + obs.width / 2 &&
            player.x + CONSTANTS.PLAYER_WIDTH / 2 > obs.x - obs.width / 2 &&
            player.z - CONSTANTS.PLAYER_DEPTH / 2 < obs.z + obs.depth / 2 &&
            player.z + CONSTANTS.PLAYER_DEPTH / 2 > obs.z - obs.depth / 2) {
          departures.push({ contact: { ...local, time }, departure });
        }
        continue;
      }
      contacts.push({ contact: { ...local, time }, obstacle: obs, position });
      break;
    }
  }
  contacts.sort((a, b) => compareContacts(a.contact, b.contact));
  departures.sort((a, b) => compareContacts(a.contact, b.contact));
  if (departures[0]) player.supportDeparture = departures[0].departure;

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
      if (ctx) recordCoinPickup(ctx);
      eventBus.emit('COIN_COLLECTED', { value: 1, total: ctx ? ctx.coins : 0 });
    }
  }

  // 7. 道具 (PowerUp) 拾取判定
  for (const p of [...powerUps].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
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
  if ((ctx ? ctx.state !== 'GAMEOVER' : !player.collisionEnded) &&
      !(player.invulnerableTimer > 0) && !(player as PlayerEntity & { godMode?: boolean }).godMode) {
    const hit = contacts[0];
    if (hit) {
      if (player.hoverboardActive || player.hasHoverboard) {
        // 抵扣滑板，免除死亡！
        player.hoverboardActive = false;
        player.hasHoverboard = false;
        player.invulnerableTimer = 1.2; // 给予 1.2 秒无敌闪烁 protection

        eventBus.emit('HOVERBOARD_SHIELD_SHATTER', {
          position: { x: hit.position.x, y: hit.position.y + 0.8, z: hit.position.z },
        });
      } else {
        // 游戏结束！
        if (ctx) ctx.state = 'GAMEOVER';
        else player.collisionEnded = true;
        eventBus.emit('COLLISION', { targetType: hit.obstacle.type, position: { ...hit.position },
          obstacleId: hit.obstacle.id, time: hit.contact.time, normal: hit.contact.normal });
      }
    }
  }
}

/** Support exceptions are geometric at the contact, never based on final height alone. */
function isSupportSweep(before: PlayerEntity, after: PlayerEntity, at: PhysicsStepStart,
  obstacle: ObstacleEntity, contact: SweptContact, obstacleDeltaZ: number): boolean {
  if (obstacle.type !== 'STATIC_TRAIN' && obstacle.type !== 'MOVING_TRAIN') return false;
  const top = obstacle.y + obstacle.height;
  // A downward top contact (including departure gravity) is support, not damage.
  if (contact.normal.y === 1 && at.y >= top - SURFACE_EPSILON) {
    // A jump can cross the finite roof's top plane just outside its foot bounds
    // while the trailing body still overlaps. Remember only that proven top
    // contact, not arbitrary initial overlaps, until this body separates.
    const side = at.z > obstacle.z + obstacle.depth / 2 && after.z - before.z >= obstacleDeltaZ ? 'REAR' :
      at.x < obstacle.x - obstacle.width / 2 && after.x <= before.x ? 'LEFT' :
      at.x > obstacle.x + obstacle.width / 2 && after.x >= before.x ? 'RIGHT' : null;
    if (side) after.supportDeparture = { ownerEntityId: obstacle.id, side, y: top };
    return true;
  }
  for (const p of [before, after]) {
    const departure = p.supportDeparture;
    if (departure?.ownerEntityId === obstacle.id && at.y <= departure.y + SURFACE_EPSILON && (
      (departure.side === 'REAR' && at.z > obstacle.z + obstacle.depth / 2 && after.z - before.z >= obstacleDeltaZ) ||
      (departure.side === 'LEFT' && at.x < obstacle.x - obstacle.width / 2 && after.x <= before.x) ||
      (departure.side === 'RIGHT' && at.x > obstacle.x + obstacle.width / 2 && after.x >= before.x))) return true;
    const exit = p.supportRampExit;
    if (p.contact === 'SUPPORTED' && exit &&
      Math.abs(exit.z - (obstacle.z - obstacle.depth / 2)) <= SURFACE_EPSILON &&
      Math.abs(exit.y - top) <= SURFACE_EPSILON && at.z <= exit.z &&
      at.x >= Math.max(exit.xMin, obstacle.x - obstacle.width / 2) &&
      at.x <= Math.min(exit.xMax, obstacle.x + obstacle.width / 2)) return true;
  }
  return false;
}
