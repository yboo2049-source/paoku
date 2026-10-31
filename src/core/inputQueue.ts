import type { InputCommand, InputAction, InputSource } from '../types/contracts';
export class InputQueue {
  readonly diagnostics = { wrongRun: 0, late: 0, duplicate: 0, paused: 0, invalid: 0, cleared: 0 };
  private pending: InputCommand[] = [];
  private seen = new Set<number>();
  private sequence = 0;
  private consumedSequence = 0;
  private consumedTick = 0;
  private accepting = true;
  private runId: string;
  constructor(runId: string) { this.runId = runId; }
  get isAccepting(): boolean { return this.accepting; }
  reset(runId: string): void {
    this.clear(); this.runId = runId; this.seen.clear(); this.sequence = 0;
    this.consumedSequence = 0; this.consumedTick = 0; this.accepting = true;
  }
  setAccepting(value: boolean): void { this.accepting = value; if (!value) this.clear(); }
  clear(): void { this.diagnostics.cleared += this.pending.length; this.pending = []; }
  collect(action: InputAction, source: InputSource, currentTick: number): boolean {
    return this.enqueue({ runId: this.runId, tick: currentTick + 1, sequence: this.sequence + 1, action, source }, currentTick);
  }
  enqueue(command: InputCommand, currentTick: number): boolean {
    if (!this.accepting) { this.diagnostics.paused++; return false; }
    if (!Number.isSafeInteger(command.tick) || command.tick < 1 || !Number.isSafeInteger(command.sequence) || command.sequence < 1 || !Number.isSafeInteger(currentTick) || currentTick < 0 || !['LEFT', 'RIGHT', 'JUMP', 'ROLL'].includes(command.action) || !['KEYBOARD', 'TOUCH', 'REPLAY', 'QA'].includes(command.source)) {
      // tick0 is specifically a late command, rather than a malformed positive tick.
      if (command.tick === 0 && command.sequence > 0) this.diagnostics.late++; else this.diagnostics.invalid++;
      return false;
    }
    if (command.runId !== this.runId) { this.diagnostics.wrongRun++; return false; }
    if (command.tick <= Math.max(currentTick, this.consumedTick)) { this.diagnostics.late++; return false; }
    if (this.seen.has(command.sequence) || command.sequence <= this.consumedSequence) { this.diagnostics.duplicate++; return false; }
    this.pending.push({ ...command }); this.seen.add(command.sequence);
    this.sequence = Math.max(this.sequence, command.sequence); return true;
  }
  consume(tick: number): readonly InputCommand[] {
    this.consumedTick = Math.max(this.consumedTick, tick);
    const due = this.pending.filter(c => c.tick === tick).sort((a, b) => a.sequence - b.sequence);
    this.diagnostics.late += this.pending.filter(c => c.tick < tick).length;
    this.pending = this.pending.filter(c => c.tick > tick);
    const valid = due.filter(c => {
      if (c.sequence <= this.consumedSequence) { this.diagnostics.duplicate++; return false; }
      this.consumedSequence = c.sequence; return true;
    });
    // Keep future/pending IDs only. Consumed IDs are rejected by the high water mark.
    this.seen = new Set(this.pending.map(c => c.sequence));
    return valid;
  }
}
