

export class GameLoop {
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private updateFn: (dt: number) => void;

  constructor(updateFn: (dt: number) => void) {
    this.updateFn = updateFn;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.isRunning = false;
  }

  private loop = (time: number): void => {
    if (!this.isRunning) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.updateFn(dt);

    requestAnimationFrame(this.loop);
  };
}
