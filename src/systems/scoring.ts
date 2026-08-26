import type { PowerUpType } from '../types';

/**
 * AC-PRD-06: DOUBLE_SCORE 双倍得分
 * 纯函数抽取：奔跑得分乘数（激活 DOUBLE_SCORE 时 2.0x，否则 1.0x）。
 * 抽取为独立纯函数，便于单元测试覆盖，避免逻辑散落在 main.ts 主循环中不可测。
 */
export function computeScoreMultiplier(activePowerUps: Map<PowerUpType, number>): number {
  return (activePowerUps.get('DOUBLE_SCORE') || 0) > 0 ? 2.0 : 1.0;
}

/**
 * 单帧奔跑得分累计：score += speed * dt * 0.1 * multiplier
 * 与 main.ts 主循环中「奔跑得分累计」公式保持一致。
 */
export function accumulateScore(
  score: number,
  speed: number,
  dt: number,
  activePowerUps: Map<PowerUpType, number>
): number {
  return score + speed * dt * 0.1 * computeScoreMultiplier(activePowerUps);
}
