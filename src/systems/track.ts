import type { CoinEntity, GameContext, ObstacleEntity, PowerUpEntity } from '../types';
import { CONSTANTS } from '../types';
import { updatePhysics } from './physics';
import { applyInputAction } from './input';
import { MODEL_BINDINGS } from '../data/modelBindings';
import type { TrackCommand, TrackSegmentDefinition } from '../data/trackSegments';
import { SUPPORTED_POWER_UPS, TRACK_CONTENT_REVISION } from '../data/trackSegments';

export const MAX_SEGMENTS_PER_UPDATE = 2;
export const MAX_WITNESS_STEPS = 3600;
export const MAX_SEQUENCE_SEGMENTS = 4;
export const TRACK_VARIANTS = 8;
export interface TrackVisualRoot {
  id: string; combinationId: string; visualPrefabId: string; childEntityIds: string[];
  commonEndpoint: { x: number; y: number; z: number };
  calibration: 'UNCALIBRATED'; fallback: 'LEGACY_PRIMITIVES';
}
export interface TrackSegmentInstance {
  id: string; definitionId: string; revision: number; contentRevision: string; startZ: number; length: number; variant: number;
  obstacles: ObstacleEntity[]; coins: CoinEntity[]; powerUps: PowerUpEntity[]; visualRoots: TrackVisualRoot[];
}
export function reactionWindowSec(distance: number, speed: number, obstacleSpeedZ: number): number {
  const relative = speed - obstacleSpeedZ;
  return relative > 0 ? Math.max(0, distance) / relative : Infinity;
}

/** Structural admission is cheap and side-effect free; physical witnesses run in tests/tooling. */
export function validateTrackDefinition(d: TrackSegmentDefinition): string[] {
  const issues: string[] = [];
  const finite = (v: number) => Number.isFinite(v);
  if (!d || !d.definitionId || d.revision !== 1 || !finite(d.length) || d.length < 150 || d.length > 200) return ['invalid definition/length'];
  if (!Array.isArray(d.obstacles) || !Array.isArray(d.rewards) || !Array.isArray(d.routes) || !Array.isArray(d.stages)) return ['invalid content arrays'];
  if (d.minSpeed !== 18 || d.maxSpeed !== 45) issues.push('unsupported speed range');
  for (const port of [d.entry, d.exit]) if (!port || ![0, 1, 2].includes(port.lane) || !finite(port.height) || port.height < 0 || !['GROUND', 'ROOF'].includes(port.surface)) issues.push('invalid port');
  if (d.obstacles.length > 12 || d.rewards.length > 24 || d.routes.length !== 1 || !d.routes[0] || !Array.isArray(d.routes[0].commands) || d.routes[0].commands.length > 8) return ['content budget'];
  const ids = new Set<string>();
  for (const o of d.obstacles) {
    if (!o) { issues.push('invalid obstacle'); continue; }
    if (ids.has(o.localId)) issues.push('duplicate entity ID'); ids.add(o.localId);
    if (!['LOW_OBSTACLE', 'HIGH_OBSTACLE', 'STATIC_TRAIN', 'MOVING_TRAIN', 'RAMP'].includes(o.type)) issues.push('unknown obstacle kind');
    const expectedDefinition = o.type === 'RAMP' || o.combinationId ? 'ramp-truck' : o.type === 'LOW_OBSTACLE' ? 'low-barrier' : o.type === 'HIGH_OBSTACLE' ? 'high-barrier' : 'carriage';
    if (o.definitionId !== expectedDefinition) issues.push('unknown obstacle definition');
    const acceptedDimensions: Record<string, readonly number[]> = { RAMP: [2.4, 3, 6], STATIC_TRAIN: [2.4, 3, 12], MOVING_TRAIN: [2.4, 3, 12], LOW_OBSTACLE: [2.2, 1, 0.5], HIGH_OBSTACLE: [2.2, 1.8, 0.5] };
    const size = acceptedDimensions[o.type];
    if (size && (o.width !== size[0] || o.height !== size[1] || o.depth !== size[2])) issues.push('unaccepted logical dimensions');
    if (![0, 1, 2].includes(o.lane) || ![o.y, o.z, o.width, o.height, o.depth, o.speedZ ?? 0].every(finite) || o.width <= 0 || o.height <= 0 || o.depth <= 0 || o.y < 0 || o.z - o.depth / 2 < 0 || o.z + o.depth / 2 > d.length) issues.push('invalid obstacle bounds');
    if (o.type === 'MOVING_TRAIN' && (o.speedZ ?? 0) >= 0) issues.push('unsupported moving direction');
    if (o.type === 'MOVING_TRAIN' && reactionWindowSec(o.z - o.depth / 2 - CONSTANTS.PLAYER_DEPTH / 2, d.maxSpeed, o.speedZ ?? 0) < 1.5) issues.push('relative reaction window');
  }
  for (const child of d.obstacles.filter(o => o?.combinationId)) {
    const group = d.obstacles.filter(o => o?.combinationId === child.combinationId);
    if (group.length !== 2 || group.filter(o => o.type === 'RAMP').length !== 1 || group.filter(o => o.type === 'STATIC_TRAIN').length !== 1) issues.push('orphan combination child');
  }
  for (const r of d.rewards) {
    if (!r) { issues.push('invalid reward'); continue; }
    if (ids.has(r.localId)) issues.push('duplicate reward ID'); ids.add(r.localId);
    if (r.kind !== 'COIN' && !SUPPORTED_POWER_UPS.includes(r.kind)) issues.push('unknown reward kind');
    if (![0, 1, 2].includes(r.lane) || ![r.y, r.z].every(finite) || r.y < 0.3 || r.z < 1 || r.z > d.length - 2) issues.push('invalid reward bounds');
    if (!d.routes.some(route => route?.id === r.routeId)) issues.push('missing reward route');
    for (const o of d.obstacles.filter(o => o)) {
      if (o.lane !== r.lane || Math.abs(r.z - o.z) >= o.depth / 2 + 0.25) continue;
      const top = o.type === 'RAMP' ? o.y + o.height * Math.max(0, Math.min(1, (r.z - (o.z - o.depth / 2)) / o.depth)) : o.y + o.height;
      if (r.y + 0.25 > o.y && r.y - 0.25 < top) issues.push('reward embedded in obstacle');
    }
  }
  for (const ramp of d.obstacles.filter(o => o?.type === 'RAMP')) {
    const children = d.obstacles.filter(o => o && o.combinationId === ramp.combinationId && o.combinationId);
    if (children.length !== 2 || children.filter(o => o.type === 'RAMP').length !== 1 || children.filter(o => o.type === 'STATIC_TRAIN').length !== 1) issues.push('combination requires one ramp and one roof');
    const roof = children.find(o => o.type === 'STATIC_TRAIN');
    if (!roof || Math.abs(ramp.z + ramp.depth / 2 - (roof.z - roof.depth / 2)) > 1e-6 || Math.abs(ramp.y + ramp.height - roof.y - roof.height) > 1e-6 || ramp.lane !== roof.lane) issues.push('ramp roof endpoint');
    if (ramp.definitionId !== 'ramp-truck' || roof?.definitionId !== 'ramp-truck') issues.push('combination binding');
  }
  for (const route of d.routes) for (const command of route.commands) {
    if (!command) { issues.push('invalid route command'); continue; }
    if (!['LEFT', 'RIGHT', 'JUMP', 'ROLL'].includes(command.action) || !finite(command.atZ) || !finite(command.leadSec) || command.leadSec < 0 || command.atZ < 0 || command.atZ > d.length) issues.push('invalid route command');
  }
  return issues;
}

export function instantiateTrackSegment(d: TrackSegmentDefinition, options: { runId: string; cursor: number; startZ: number; variant: number }): TrackSegmentInstance {
  const errors = validateTrackDefinition(d);
  if (errors.length) throw new Error(errors.join('; '));
  const { runId, cursor, startZ } = options;
  if (!runId || !Number.isSafeInteger(cursor) || cursor < 0 || !Number.isFinite(startZ) || !Number.isInteger(options.variant) || options.variant < 0 || options.variant >= TRACK_VARIANTS) throw new Error('invalid segment instance');
  const variant = options.variant;
  const id = `${runId}/${TRACK_CONTENT_REVISION}/segment-${cursor}`;
  const obstacles: ObstacleEntity[] = d.obstacles.map(o => ({ ...o, id: `${id}/${o.localId}`, x: CONSTANTS.LANE_X[o.lane], z: startZ + o.z, segmentInstanceId: id,
    ...(o.combinationId ? { combinationId: `${id}/${o.combinationId}`, visualRootId: `${id}/${o.combinationId}/visual` } : {}) }));
  const rewardEntities = d.rewards.map(r => ({ id: `${id}/${r.localId}`, lane: r.lane, x: CONSTANTS.LANE_X[r.lane], y: r.y, z: startZ + r.z, collected: false, segmentInstanceId: id, routeId: r.routeId }));
  const coins: CoinEntity[] = rewardEntities.filter((_, i) => d.rewards[i].kind === 'COIN');
  const powerUps: PowerUpEntity[] = rewardEntities.filter((_, i) => d.rewards[i].kind !== 'COIN').map(r => ({ ...r, type: d.rewards[rewardEntities.indexOf(r)].kind as PowerUpEntity['type'] }));
  for (const coin of coins) if (coin.y < 1 && variant % 2) coin.z += 1;
  if (variant >= 2) powerUps.push({ id: `${id}/tail-power`, type: SUPPORTED_POWER_UPS[(variant - 2) % 4], lane: 1, x: 0, y: 0.8, z: startZ + 153, collected: false, segmentInstanceId: id, routeId: 'main' });
  const visualRoots: TrackVisualRoot[] = [];
  for (const ramp of obstacles.filter(o => o.type === 'RAMP')) {
    const children = obstacles.filter(o => o.combinationId === ramp.combinationId);
    const binding = MODEL_BINDINGS['ramp-truck'];
    visualRoots.push({ id: ramp.visualRootId!, combinationId: ramp.combinationId!, visualPrefabId: binding.visualPrefabId, childEntityIds: children.map(o => o.id), commonEndpoint: { x: ramp.x, y: ramp.y + ramp.height, z: ramp.z + ramp.depth / 2 }, calibration: binding.calibration, fallback: binding.fallback });
  }
  return { id, definitionId: d.definitionId, revision: d.revision, contentRevision: TRACK_CONTENT_REVISION, startZ, length: d.length, variant, obstacles, coins, powerUps, visualRoots };
}

export interface TrackWitnessOptions { seed: number; speed: number; variant?: number; spawnLead?: number; maxSteps?: number }
export interface TrackWitness {
  ok: boolean; reason: string; seed: number; definitionIds: string[]; speed: number; steps: number;
  commands: (TrackCommand & { worldZ: number; tick?: number })[];
  trace: { x: number; y: number; z: number; supportSurfaceId: string | null; contact: string }[];
  uncollectedRewardIds: string[];
}
/** Tool/test-only real physical witness. May emit legacy physics events; never called by runtime spawner. */
export function validateTrackSequence(definitions: readonly TrackSegmentDefinition[], options: TrackWitnessOptions): TrackWitness {
  const result: TrackWitness = { ok: false, reason: '', seed: options.seed, definitionIds: definitions.map(d => d?.definitionId ?? 'missing'), speed: options.speed, steps: 0, commands: [], trace: [], uncollectedRewardIds: [] };
  const fail = (reason: string) => { result.reason = reason; return result; };
  if (!definitions.length || definitions.length > MAX_SEQUENCE_SEGMENTS) return fail('sequence budget');
  if (!Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff || !Number.isFinite(options.speed)) return fail('invalid seed/speed');
  const lead = options.spawnLead ?? 150;
  if (!Number.isFinite(lead) || lead < 0 || lead > 150) return fail('spawn lead budget');
  for (const d of definitions) {
    const errors = validateTrackDefinition(d); if (errors.length) return fail(errors.join('; '));
    if (options.speed < d.minSpeed || options.speed > d.maxSpeed) return fail('unsupported speed');
  }
  for (let i = 1; i < definitions.length; i++) if (JSON.stringify(definitions[i - 1].exit) !== JSON.stringify(definitions[i].entry)) return fail('disconnected ports');
  const instances: TrackSegmentInstance[] = []; let offset = 0;
  for (const [i, d] of definitions.entries()) {
    instances.push(instantiateTrackSegment(d, { runId: `witness-${options.seed}`, cursor: i, startZ: offset, variant: options.variant ?? 0 }));
    for (const c of d.routes[0].commands) result.commands.push({ ...c, worldZ: offset + c.atZ - options.speed * c.leadSec });
    offset += d.length;
  }
  const entry = definitions[0].entry;
  const ctx: GameContext = { state: 'PLAYING', score: 0, highScore: 0, coins: 0, totalCoins: 0, speed: options.speed, distance: 0, missions: [], chase: { distance: 2.8, isNear: false },
    player: { lane: entry.lane, x: CONSTANTS.LANE_X[entry.lane], targetX: CONSTANTS.LANE_X[entry.lane], y: entry.height, z: -lead, vy: 0, isJumping: false, isRolling: false, rollTimer: 0, hasHoverboard: false, hoverboardActive: false, invulnerableTimer: 0, activePowerUps: new Map() },
    obstacles: instances.flatMap(i => i.obstacles), coinEntities: instances.flatMap(i => i.coins), powerUpEntities: instances.flatMap(i => i.powerUps) };
  const budget = Math.min(MAX_WITNESS_STEPS, options.maxSteps ?? MAX_WITNESS_STEPS);
  if (!Number.isSafeInteger(budget) || budget < 1) return fail('invalid witness budget');
  const dt = 1 / 60;
  for (let tick = 1; tick <= budget; tick++) {
    for (const command of result.commands) if (command.tick === undefined && ctx.player.z >= command.worldZ) { command.tick = tick; applyInputAction(ctx.player, command.action); }
    const from = { x: ctx.player.x, y: ctx.player.y, z: ctx.player.z };
    ctx.player.z += options.speed * dt;
    updatePhysics(ctx, dt, undefined, from);
    result.steps = tick;
    result.trace.push({ x: ctx.player.x, y: ctx.player.y, z: ctx.player.z, supportSurfaceId: ctx.player.supportSurfaceId ?? null, contact: ctx.player.contact ?? 'AIRBORNE' });
    if (ctx.state === 'GAMEOVER' || ctx.player.invulnerableTimer > 0) return fail('collision on candidate route');
    for (const reward of [...ctx.coinEntities, ...ctx.powerUpEntities].filter(r => !r.collected)) {
      for (const obstacle of ctx.obstacles.filter(o => o.type === 'MOVING_TRAIN')) {
        if (Math.abs(reward.x - obstacle.x) < obstacle.width / 2 + 0.25 && Math.abs(reward.z - obstacle.z) < obstacle.depth / 2 + 0.25 && reward.y + 0.25 > obstacle.y && reward.y - 0.25 < obstacle.y + obstacle.height) return fail('reward embedded during movement');
      }
    }
    if (ctx.player.z >= offset) {
      const exit = definitions.at(-1)!.exit;
      if (Math.abs(ctx.player.y - exit.height) > 1e-6 || Math.abs(ctx.player.x - CONSTANTS.LANE_X[exit.lane]) > 1e-6 || ctx.player.contact !== 'SUPPORTED') return fail('exit is not reachable');
      result.uncollectedRewardIds = [...ctx.coinEntities, ...ctx.powerUpEntities].filter(r => !r.collected).map(r => r.id);
      if (result.uncollectedRewardIds.length) return fail('reward not reached by candidate route');
      result.ok = true; return result;
    }
  }
  return fail('witness step budget exhausted');
}
