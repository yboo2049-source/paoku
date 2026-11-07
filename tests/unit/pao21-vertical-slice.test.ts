import { describe, expect, it } from 'vitest';
import { VERTICAL_SLICE_ID, runVerticalSliceWitness } from '../../src/systems/verticalSlice';

describe('PAO-21 Complete Playable M2 Vertical Slice Witness', () => {
  it('completes the full 65s (3900-tick) vertical slice witness across all 6 core phases', async () => {
    const report = await runVerticalSliceWitness();

    expect(report.version).toBe(VERTICAL_SLICE_ID);
    expect(report.ok).toBe(true);
    expect(Object.isFrozen(report)).toBe(true);
    expect(report.totalTicks).toBe(3900);
    expect(report.simulatedDurationSec).toBe(65);
    expect(report.phasesCompleted).toEqual([
      'START_AND_LANE_CHANGE',
      'JUMP_LOW_AND_ROLL_HIGH',
      'RAMP_ROOF_TRAVERSAL_AND_DROP',
      'ONCOMING_TRAIN_DODGE',
      'POWERUP_PICKUP_ACTIVE_AND_EXPIRY',
      'TERMINAL_COLLISION_SETTLEMENT_AND_RESTART',
    ]);
  });

  it('verifies motion facts, ramp ascent, roof support ticks, and ground landing cues', async () => {
    const report = await runVerticalSliceWitness({ durationSec: 65 });

    expect(report.motionFactsCount).toBeGreaterThan(20);
    expect(report.roofTicks).toBeGreaterThan(0);
    expect(report.maxHeightY).toBeGreaterThan(3.0);
    expect(report.audioDiagnosticsAfterReset.cueCounts.jump).toBeGreaterThan(0);
    expect(report.audioDiagnosticsAfterReset.cueCounts.roll).toBeGreaterThan(0);
    expect(report.audioDiagnosticsAfterReset.cueCounts.laneChange).toBeGreaterThanOrEqual(4);
    expect(report.audioDiagnosticsAfterReset.cueCounts.landing).toBeGreaterThan(0);
  });

  it('verifies all 4 power-ups activate, timed power-ups refresh and expire, and hoverboard shield shatters', async () => {
    const report = await runVerticalSliceWitness();

    expect(report.powerUpsActivated).toEqual([
      'MAGNET',
      'DOUBLE_SCORE',
      'SUPER_SNEAKERS',
      'HOVERBOARD',
    ]);
    expect(report.powerUpsExpired).toEqual(
      expect.arrayContaining(['MAGNET', 'DOUBLE_SCORE', 'SUPER_SNEAKERS'])
    );
    expect(report.shieldShattered).toBe(true);
    expect(report.coinsCollected).toBeGreaterThanOrEqual(30);
    expect(report.missionRewards).toBeGreaterThan(0);
    expect(report.audioDiagnosticsAfterReset.cueCounts.powerUp).toBeGreaterThanOrEqual(4);
    expect(report.audioDiagnosticsAfterReset.cueCounts.powerUpRefresh).toBeGreaterThanOrEqual(1);
    expect(report.audioDiagnosticsAfterReset.cueCounts.powerUpExpire).toBeGreaterThanOrEqual(3);
    expect(report.audioDiagnosticsAfterReset.cueCounts.shieldBreak).toBe(1);
  });

  it('verifies oncoming train warning, lane-change dodge, and pass Doppler cues without collision', async () => {
    const report = await runVerticalSliceWitness();

    expect(report.oncomingTrainsDodged).toBeGreaterThanOrEqual(1);
    expect(report.phasesCompleted).toContain('ONCOMING_TRAIN_DODGE');
    expect(report.audioDiagnosticsAfterReset.cueCounts.trainHorn).toBeGreaterThanOrEqual(1);
    expect(report.audioDiagnosticsAfterReset.cueCounts.trainPass).toBeGreaterThanOrEqual(1);
  });

  it('verifies terminal collision settlement, duplicate finish idempotency, clean restart, and zero audio residue (R-08)', async () => {
    const report = await runVerticalSliceWitness({ includeTerminalCollision: true });

    expect(report.settlementCommitted).toBe(true);
    expect(report.restartSucceeded).toBe(true);
    expect(report.audioDiagnosticsAfterReset).toMatchObject({
      initialized: true,
      lifecycleState: 'STOPPED',
      isBgmPlaying: false,
      hasBgmScheduler: false,
      activeBgmSourceCount: 0,
      isChasing: false,
      hasBarkTimer: false,
    });
    expect(report.audioDiagnosticsAfterReset.cueCounts.crash).toBe(1);
  });

  it('supports non-terminal 60s continuous survival mode and deterministic seed reproducibility', async () => {
    const nonTerminal = await runVerticalSliceWitness({
      seed: 0x12345678,
      durationSec: 60,
      includeTerminalCollision: false,
    });

    expect(nonTerminal.ok).toBe(true);
    expect(nonTerminal.totalTicks).toBe(3600);
    expect(nonTerminal.simulatedDurationSec).toBe(60);
    expect(nonTerminal.phasesCompleted).toEqual([
      'START_AND_LANE_CHANGE',
      'JUMP_LOW_AND_ROLL_HIGH',
      'RAMP_ROOF_TRAVERSAL_AND_DROP',
      'ONCOMING_TRAIN_DODGE',
      'POWERUP_PICKUP_ACTIVE_AND_EXPIRY',
    ]);
    expect(nonTerminal.settlementCommitted).toBe(false);
    expect(nonTerminal.restartSucceeded).toBe(false);
    expect(nonTerminal.audioDiagnosticsAfterReset.cueCounts.crash).toBe(0);

    const repeat = await runVerticalSliceWitness({
      seed: 0x12345678,
      durationSec: 60,
      includeTerminalCollision: false,
    });
    expect(repeat).toEqual(nonTerminal);
  });
});
