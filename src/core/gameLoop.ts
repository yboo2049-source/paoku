

export class GameLoop {
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private animId: number | null = null;
  private updateFn: (dt: number) => void;

  constructor(updateFn: (dt: number) => void) {
    this.updateFn = updateFn;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private loop = (time: number): void => {
    if (!this.isRunning) return;
    const dt = Math.max(0, Math.min((time - this.lastTime) / 1000, 0.1));
    this.lastTime = time;

    this.updateFn(dt);

    this.animId = requestAnimationFrame(this.loop);
  };
}
