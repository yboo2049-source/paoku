import type { GameContext, RunLedger, RunSummary } from '../types';
import type { DeepReadonly, SimSnapshot } from '../types/contracts';

export function createRunLedger(): RunLedger {
  return { pickupCount: 0, pickupCoins: 0, rewardCoins: 0, rewardedMissionIds: [] };
}
/** New runs never derive historical pickup facts from the legacy display total. */
export function initializeRunLedger(ctx: GameContext): void {
  ctx.runLedger = createRunLedger();
  Object.defineProperty(ctx, 'coins', {
    configurable: true, enumerable: true,
    get: () => ctx.runLedger!.pickupCoins + ctx.runLedger!.rewardCoins,
  });
}

function integer(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }

/** Called only after the physical coin has transitioned to consumed. */
export function recordCoinPickup(ctx: GameContext): void {
  if (!ctx.runLedger) { ctx.coins += 1; return; }
  ctx.runLedger.pickupCount += 1;
  ctx.runLedger.pickupCoins += 1;
}

/** Register identity before publishing any completion fact, including reentrant listeners. */
export function awardMissionReward(ctx: GameContext, missionId: string, value: number): boolean {
  if (!missionId || !integer(value)) throw new Error('Invalid mission reward');
  if (!ctx.runLedger) { ctx.coins += value; return true; }
  const ledger = ctx.runLedger;
  if (ledger.rewardedMissionIds.includes(missionId)) return false;
  if (!integer(ledger.rewardCoins + value)) throw new Error('Run reward overflow');
  ledger.rewardedMissionIds.push(missionId);
  ledger.rewardCoins += value;
  return true;
}

/** Pure sealing from a committed value; no DOM, storage, or mutable-world references. */
export function createRunSummary(snapshot: DeepReadonly<SimSnapshot>, endReason: RunSummary['endReason']): Readonly<RunSummary> {
  const ledger = snapshot.context.runLedger;
  const scoreInt = Math.floor(snapshot.context.score);
  if (!snapshot.runId || !ledger || !integer(scoreInt) ||
      ![ledger.pickupCount, ledger.pickupCoins, ledger.rewardCoins].every(integer) ||
      !integer(ledger.pickupCoins + ledger.rewardCoins) ||
      !['COLLISION', 'QUIT'].includes(endReason) ||
      (endReason === 'COLLISION' && snapshot.phase !== 'ENDED')) {
    throw new Error('Invalid terminal run snapshot');
  }
  return Object.freeze({
    runId: snapshot.runId, scoreInt, pickupCount: ledger.pickupCount,
    pickupCoins: ledger.pickupCoins, rewardCoins: ledger.rewardCoins,
    earnedCoins: ledger.pickupCoins + ledger.rewardCoins, endReason,
  });
}
