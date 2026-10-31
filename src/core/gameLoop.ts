export interface LoopOptions {
  stepSec?: number;
  maxSteps?: number;
  render?: (alpha: number) => void;
}

/** Display-clock accumulator. Hidden/paused wall time never becomes simulation time. */
export class GameLoop {
  readonly stepSec: number;
  readonly maxSteps: number;
  readonly diagnostics = { invalidDeltas: 0, droppedSteps: 0, droppedSec: 0 };
  private accumulator = 0;
  private lastTime: number | null = null;
  private isRunning = false;
  private paused = false;
  private disposed = false;
  private animId: number | null = null;
  private generation = 0;
  private updateFn: (dt: number) => void;
  private renderFn?: (alpha: number) => void;

  constructor(updateFn: (dt: number) => void, options: LoopOptions = {}) {
    this.updateFn = updateFn;
    this.stepSec = options.stepSec ?? 1 / 60;
    this.maxSteps = options.maxSteps ?? 5;
    if (!Number.isFinite(this.stepSec) || this.stepSec <= 0 || !Number.isSafeInteger(this.maxSteps) || this.maxSteps < 1) throw new Error('Invalid fixed-step configuration');
    this.renderFn = options.render;
  }

  resetClock(): void { this.lastTime = null; this.accumulator = 0; }
  setPaused(paused: boolean): void { this.paused = paused; this.resetClock(); }

  /** Also usable by a replay/test clock, without creating a browser animation loop. */
  advance(dt: number): number {
    if (!Number.isFinite(dt) || dt < 0) { this.diagnostics.invalidDeltas++; return 0; }
    if (this.paused || this.disposed) return 0;
    this.accumulator += dt;
    const due = Math.floor((this.accumulator + this.stepSec * 1e-9) / this.stepSec);
    const count = Math.min(due, this.maxSteps);
    // Remove the entire whole-step backlog first: retain only the fractional remainder.
    this.accumulator = Math.max(0, this.accumulator - due * this.stepSec);
    this.diagnostics.droppedSteps += due - count;
    this.diagnostics.droppedSec += (due - count) * this.stepSec;
    const generation = this.generation;
    for (let i = 0; i < count; i++) {
      this.updateFn(this.stepSec);
      if (generation !== this.generation || this.paused || this.disposed) break;
    }
    return Math.max(0, Math.min(1, this.accumulator / this.stepSec));
  }

  start(): void {
    if (this.isRunning || this.disposed) return;
    this.isRunning = true; this.resetClock();
    this.schedule();
  }
  stop(): void {
    this.isRunning = false; this.generation++; this.resetClock();
    if (this.animId !== null) { cancelAnimationFrame(this.animId); this.animId = null; }
  }
  dispose(): void { if (this.disposed) return; this.stop(); this.disposed = true; }
  private schedule(): void {
    const generation = this.generation;
    this.animId = requestAnimationFrame(time => this.loop(time, generation));
  }
  private loop(time: number, generation: number): void {
    if (!this.isRunning || this.disposed || generation !== this.generation) return;
    this.animId = null;
    const dt = this.lastTime === null ? 0 : (time - this.lastTime) / 1000;
    // A clock rollback cannot make the following frame count the same interval twice.
    if (Number.isFinite(time)) this.lastTime = this.lastTime === null ? time : Math.max(time, this.lastTime);
    const alpha = this.advance(dt);
    this.renderFn?.(alpha);
    if (this.isRunning && !this.disposed && generation === this.generation) this.schedule();
  }
}
