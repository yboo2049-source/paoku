import type { ObstacleEntity, CoinEntity, PowerUpEntity, TrackGenerationFrame, TrackGenerationState } from '../types';
import type { VersionedRng } from '../types/contracts';
import { TRACK_SEGMENTS, TRACK_CONTENT_REVISION, stageForCursor } from '../data/trackSegments';
import { ALL_TRACK_SEGMENTS } from '../data/extendedTrackSegments';
import { instantiateTrackSegment, MAX_SEGMENTS_PER_UPDATE, TRACK_VARIANTS, validateTrackDefinition } from './track';
import type { TrackSegmentInstance } from './track';

export type PatternType = 'ZigZag_Trains' | 'Under_Over' | 'Moving_Rush' | 'Coin_Frenzy';
/** Standalone compatibility RNG; production receives the simulation's versioned stream. */
function localRng(seed: number): VersionedRng {
  let state = seed >>> 0;
  return { algorithmVersion: 'mulberry32-v1', get state() { return state; }, next() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  } };
}
export class SpawnerSystem {
  private state!: TrackGenerationState;
  private rng!: VersionedRng;
  private instances: TrackSegmentInstance[] = [];
  private segments: readonly TrackSegmentDefinition[];
  constructor(segments: readonly TrackSegmentDefinition[] = TRACK_SEGMENTS) {
    this.segments = segments;
    this.reset();
  }
  get generationState(): TrackGenerationState { return { ...this.state, rngState: this.rng.state }; }
  /** Bounded active metadata for future presentation; no models loaded here. */
  get activeSegments(): readonly TrackSegmentInstance[] { return structuredClone(this.instances); }
  reset(runId = 'standalone', seed = 0x50414f10): void {
    if (!runId || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('invalid generation identity');
    this.rng = localRng(seed); this.instances = [];
    this.state = { runId, seed, contentRevision: TRACK_CONTENT_REVISION, rngAlgorithmVersion: this.rng.algorithmVersion, rngState: seed, cursor: 0, nextZ: 30, lastTick: 0, stage: 'INTRO', lastSegmentId: null, fallbackCount: 0 };
  }
  update(playerZ: number, obstacles: ObstacleEntity[], coins: CoinEntity[], powerUps: PowerUpEntity[], frame?: TrackGenerationFrame): void {
    if (!Number.isFinite(playerZ)) throw new Error('invalid player position');
    if (frame) {
      if (frame.runId !== this.state.runId || frame.seed !== this.state.seed) this.reset(frame.runId, frame.seed);
      if (!Number.isSafeInteger(frame.tick) || frame.tick < this.state.lastTick || !Number.isFinite(frame.speed) || frame.speed < 18 || frame.speed > 45) throw new Error('invalid generation frame');
      this.rng = frame.rng; this.state.lastTick = frame.tick; this.state.rngAlgorithmVersion = frame.rng.algorithmVersion;
    }
    for (let n = 0; n < MAX_SEGMENTS_PER_UPDATE && this.state.nextZ - playerZ < 150; n++) {
      const stage = stageForCursor(this.state.cursor);
      const candidates = this.segments.filter(d => d.stages.includes(stage));
      let d = candidates[Math.floor(this.rng.next() * candidates.length)];
      const variant = Math.floor(this.rng.next() * TRACK_VARIANTS);
      if (!d || validateTrackDefinition(d).length) { d = this.segments[0]; this.state.fallbackCount++; }
      const instance = instantiateTrackSegment(d, { runId: this.state.runId, cursor: this.state.cursor, startZ: this.state.nextZ, variant });
      obstacles.push(...instance.obstacles); coins.push(...instance.coins); powerUps.push(...instance.powerUps);
      this.instances.push(instance); this.state.cursor++; this.state.nextZ += d.length;
      this.state.stage = stage; this.state.lastSegmentId = instance.id;
    }
    for (let i = obstacles.length - 1; i >= 0; i--) if (obstacles[i].z + obstacles[i].depth / 2 < playerZ - 15) obstacles.splice(i, 1);
    for (let i = coins.length - 1; i >= 0; i--) if (coins[i].z < playerZ - 15) coins.splice(i, 1);
    for (let i = powerUps.length - 1; i >= 0; i--) if (powerUps[i].z < playerZ - 15) powerUps.splice(i, 1);
    this.instances = this.instances.filter(i => i.startZ + i.length >= playerZ - 15);
  }
  spawnPattern(spawnZ: number, obstacles: ObstacleEntity[], coins: CoinEntity[], powerUps: PowerUpEntity[], forcedPattern?: PatternType): void {
    const names: PatternType[] = ['ZigZag_Trains', 'Under_Over', 'Moving_Rush', 'Coin_Frenzy'];
    const name = forcedPattern ?? names[Math.floor(this.rng.next() * names.length)];
    const definitionId = ({ ZigZag_Trains: 'ramp-truck', Under_Over: 'under-over', Moving_Rush: 'moving-rush', Coin_Frenzy: 'calm' } as const)[name];
    if (!definitionId) throw new Error('unknown pattern');
    const d = this.segments.find(d => d.definitionId === definitionId)!;
    const instance = instantiateTrackSegment(d, { runId: this.state.runId, cursor: this.state.cursor++, startZ: spawnZ, variant: 0 });
    obstacles.push(...instance.obstacles); coins.push(...instance.coins); powerUps.push(...instance.powerUps);
  }
}
export const spawnerSystem = new SpawnerSystem(ALL_TRACK_SEGMENTS);
