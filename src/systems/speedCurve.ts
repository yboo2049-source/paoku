import { CONSTANTS } from '../types';

export type DifficultyTier = 'NOVICE' | 'INTERMEDIATE' | 'EXPERT' | 'MAX_SPEED';

export interface SpeedCurveSample {
  readonly elapsedSec: number;
  readonly speedMps: number;
  readonly speedKmh: number;
  readonly speedRatio: number;
  readonly difficultyTier: DifficultyTier;
  readonly minReactionWindowSec: number;
}

export function elapsedSecToMaxSpeed(): number {
  return (CONSTANTS.MAX_SPEED - CONSTANTS.BASE_SPEED) / CONSTANTS.ACCELERATION;
}

export function stepSpeedCurve(currentSpeedMps: number, dt: number): number {
  const safeCurrent = Number.isFinite(currentSpeedMps)
    ? Math.max(CONSTANTS.BASE_SPEED, currentSpeedMps)
    : CONSTANTS.BASE_SPEED;
  const safeDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  return Math.min(CONSTANTS.MAX_SPEED, safeCurrent + CONSTANTS.ACCELERATION * safeDt);
}

export function evaluateSpeedCurve(elapsedSec: number): SpeedCurveSample {
  const safeElapsed = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  const speedMps = Math.min(
    CONSTANTS.MAX_SPEED,
    CONSTANTS.BASE_SPEED + CONSTANTS.ACCELERATION * safeElapsed,
  );
  const speedKmh = Math.round(speedMps * 3.6 * 10) / 10;
  const rawRatio =
    (speedMps - CONSTANTS.BASE_SPEED) / (CONSTANTS.MAX_SPEED - CONSTANTS.BASE_SPEED);
  const speedRatio = Math.max(0, Math.min(1, rawRatio));

  let difficultyTier: DifficultyTier = 'MAX_SPEED';
  if (safeElapsed < 15) {
    difficultyTier = 'NOVICE';
  } else if (safeElapsed < 45) {
    difficultyTier = 'INTERMEDIATE';
  } else if (safeElapsed < 108) {
    difficultyTier = 'EXPERT';
  }

  const minReactionWindowSec = Math.round((1.5 - 0.5 * speedRatio) * 1000) / 1000;

  return {
    elapsedSec: safeElapsed,
    speedMps,
    speedKmh,
    speedRatio,
    difficultyTier,
    minReactionWindowSec,
  };
}
