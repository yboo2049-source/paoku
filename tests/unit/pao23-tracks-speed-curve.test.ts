import { describe, expect, it } from 'vitest';
import {
  ALL_TRACK_SEGMENTS,
  EXTENDED_TRACK_CONTENT_REVISION,
  EXTENDED_TRACK_SEGMENTS,
  THEME_ZONE_SPAN_M,
  THEME_ZONES,
  resolveThemeZone,
} from '../../src/data/extendedTrackSegments';
import { TRACK_SEGMENTS } from '../../src/data/trackSegments';
import {
  instantiateTrackSegment,
  validateTrackDefinition,
  validateTrackSequence,
} from '../../src/systems/track';
import {
  elapsedSecToMaxSpeed,
  evaluateSpeedCurve,
  stepSpeedCurve,
} from '../../src/systems/speedCurve';

describe('PAO-23 Extended Track Segments & Physical Witnesses', () => {
  it('defines 6 frozen extended segments and 10 total segments without mutating base TRACK_SEGMENTS', () => {
    expect(TRACK_SEGMENTS).toHaveLength(4);
    expect(EXTENDED_TRACK_SEGMENTS).toHaveLength(6);
    expect(ALL_TRACK_SEGMENTS).toHaveLength(10);
    expect(EXTENDED_TRACK_CONTENT_REVISION).toBe('pao23-extended-track-v1');

    expect(Object.isFrozen(EXTENDED_TRACK_SEGMENTS)).toBe(true);
    expect(Object.isFrozen(ALL_TRACK_SEGMENTS)).toBe(true);

    const ids = ALL_TRACK_SEGMENTS.map((s) => s.definitionId);
    expect(new Set(ids).size).toBe(10);

    for (const seg of EXTENDED_TRACK_SEGMENTS) {
      expect(Object.isFrozen(seg)).toBe(true);
      expect(validateTrackDefinition(seg)).toEqual([]);
      expect(seg.entry).toEqual({ lane: 1, height: 0, surface: 'GROUND' });
      expect(seg.exit).toEqual({ lane: 1, height: 0, surface: 'GROUND' });
      expect(seg.minSpeed).toBe(18);
      expect(seg.maxSpeed).toBe(45);
    }
  });

  it.each([18, 30, 45])(
    'physically validates every extended segment across all 8 variants at %sm/s',
    (speed) => {
      for (const seg of EXTENDED_TRACK_SEGMENTS) {
        for (let variant = 0; variant < 8; variant++) {
          const witness = validateTrackSequence([seg], { seed: 23, speed, variant });
          expect(witness.ok, `${seg.definitionId} v=${variant} @${speed}: ${witness.reason}`).toBe(
            true,
          );
          expect(witness.uncollectedRewardIds).toEqual([]);
        }
      }
    },
  );

  it.each([18, 30, 45])(
    'physically validates all 10x10 ordered pairs across ALL_TRACK_SEGMENTS at %sm/s',
    (speed) => {
      for (const left of ALL_TRACK_SEGMENTS) {
        for (const right of ALL_TRACK_SEGMENTS) {
          const witness = validateTrackSequence([left, right], {
            seed: 23,
            speed,
            variant: 0,
          });
          expect(
            witness.ok,
            `${left.definitionId}->${right.definitionId} v=0 @${speed}: ${witness.reason}`,
          ).toBe(true);
          expect(witness.uncollectedRewardIds).toEqual([]);
        }
      }
    },
    20000,
  );

  it('instantiates maintenance-ramp with calibrated visualRoot and traverses roof + high barrier cleanly', () => {
    const maint = EXTENDED_TRACK_SEGMENTS.find((s) => s.definitionId === 'maintenance-ramp')!;
    const instance = instantiateTrackSegment(maint, {
      runId: 'pao23-run',
      cursor: 3,
      startZ: 480,
      variant: 3,
    });
    expect(instance.visualRoots).toHaveLength(1);
    expect(instance.visualRoots[0].commonEndpoint).toEqual({ x: 0, y: 3, z: 543 });

    const witness = validateTrackSequence([maint], { seed: 23, speed: 45, variant: 3 });
    expect(witness.ok).toBe(true);
    expect(witness.trace.some((p) => Math.abs(p.y - 3) < 1e-6)).toBe(true);
    expect(witness.trace.at(-1)?.y).toBe(0);
  });
});

describe('PAO-23 Deterministic Theme Zones & Speed Difficulty Curve', () => {
  it('maps playerZ deterministically across the 3 bright rail theme zones every 360m', () => {
    expect(THEME_ZONES).toHaveLength(3);
    expect(THEME_ZONE_SPAN_M).toBe(360);

    const z0 = resolveThemeZone(0);
    expect(z0.id).toBe('STATION_PLATFORM');
    expect(z0.zoneIndex).toBe(0);
    expect(z0.localProgress).toBeCloseTo(0);

    const z180 = resolveThemeZone(180);
    expect(z180.id).toBe('STATION_PLATFORM');
    expect(z180.localProgress).toBeCloseTo(0.5);

    const z400 = resolveThemeZone(400);
    expect(z400.id).toBe('STREET_RAIL');
    expect(z400.zoneIndex).toBe(1);

    const z800 = resolveThemeZone(800);
    expect(z800.id).toBe('MAINTENANCE_YARD');
    expect(z800.zoneIndex).toBe(2);

    const z1080 = resolveThemeZone(1080);
    expect(z1080.id).toBe('STATION_PLATFORM');
    expect(z1080.zoneIndex).toBe(0);

    // Negative / non-finite values clamp safely to 0
    expect(resolveThemeZone(-50).id).toBe('STATION_PLATFORM');
    expect(resolveThemeZone(Number.NaN).id).toBe('STATION_PLATFORM');
  });

  it('evaluates V(t) = min(18 + 0.25*t, 45) and difficulty tiers accurately', () => {
    expect(elapsedSecToMaxSpeed()).toBe(108);

    const s0 = evaluateSpeedCurve(0);
    expect(s0).toEqual({
      elapsedSec: 0,
      speedMps: 18,
      speedKmh: 64.8,
      speedRatio: 0,
      difficultyTier: 'NOVICE',
      minReactionWindowSec: 1.5,
    });

    const s20 = evaluateSpeedCurve(20);
    expect(s20.speedMps).toBeCloseTo(23);
    expect(s20.difficultyTier).toBe('INTERMEDIATE');

    const s48 = evaluateSpeedCurve(48);
    expect(s48.speedMps).toBeCloseTo(30);
    expect(s48.speedKmh).toBeCloseTo(108);
    expect(s48.difficultyTier).toBe('EXPERT');

    const s108 = evaluateSpeedCurve(108);
    expect(s108).toEqual({
      elapsedSec: 108,
      speedMps: 45,
      speedKmh: 162,
      speedRatio: 1,
      difficultyTier: 'MAX_SPEED',
      minReactionWindowSec: 1.0,
    });

    const s200 = evaluateSpeedCurve(200);
    expect(s200.speedMps).toBe(45);
    expect(s200.speedRatio).toBe(1);
    expect(s200.difficultyTier).toBe('MAX_SPEED');

    // Stepwise integration over 108s at 60Hz reaches 45m/s
    let current = 18;
    for (let i = 0; i < 108 * 60; i++) {
      current = stepSpeedCurve(current, 1 / 60);
    }
    expect(current).toBeCloseTo(45, 5);
    expect(stepSpeedCurve(45, 1)).toBe(45);
  });
});
