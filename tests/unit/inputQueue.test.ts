import { describe, it, expect, vi } from 'vitest';
import { InputSystem } from '../../src/systems/input';

const modules = import.meta.glob('../../src/core/inputQueue.ts', { eager: true });
function queue() {
  const Constructor = (Object.values(modules)[0] as any)?.InputQueue;
  expect(Constructor, 'tick input queue behavior is not implemented').toBeTypeOf('function');
  return new Constructor('run-a');
}
const command = (sequence: number, tick = 1, runId = 'run-a') =>
  ({ runId, tick, sequence, action: 'LEFT', source: 'REPLAY' });

describe('PAO-10 tick input', () => {
  it('consumes opposite lane commands in sequence order, never arrival order', () => {
    const q = queue();
    q.enqueue(command(3), 0); q.enqueue({ ...command(1), action: 'RIGHT' }, 0); q.enqueue(command(2), 0);
    expect(q.consume(1).map((c: any) => c.sequence)).toEqual([1, 2, 3]);
    expect(q.consume(1)).toEqual([]);
  });
  it('rejects old runs, late ticks, duplicate pending and consumed sequences', () => {
    const q = queue();
    expect(q.enqueue(command(1, 1, 'old'), 0)).toBe(false);
    expect(q.enqueue(command(1, 0), 0)).toBe(false);
    expect(q.enqueue(command(2), 0)).toBe(true);
    expect(q.enqueue(command(2), 0)).toBe(false);
    q.consume(1);
    expect(q.enqueue(command(2, 2), 1)).toBe(false);
    expect(q.diagnostics).toMatchObject({ wrongRun: 1, late: 1, duplicate: 2 });
  });
  it('rejects paused actions and clears pending inputs on blur and run reset', () => {
    const q = queue();
    q.collect('LEFT', 'KEYBOARD', 0);
    q.clear();
    expect(q.consume(1)).toEqual([]);
    q.setAccepting(false);
    expect(q.collect('JUMP', 'KEYBOARD', 1)).toBe(false);
    q.reset('run-b');
    expect(q.enqueue(command(9, 2), 1)).toBe(false);
    expect(q.collect('RIGHT', 'TOUCH', 0)).toBe(true);
    expect(q.consume(1)[0]).toMatchObject({ runId: 'run-b', tick: 1, sequence: 1 });
  });
  it('rejects malformed time, action and sequence and diagnoses abandoned future commands', () => {
    const q = queue();
    expect(q.enqueue({ ...command(1), tick: NaN }, 0)).toBe(false);
    expect(q.enqueue({ ...command(1), action: 'ESCAPE' }, 0)).toBe(false);
    expect(q.enqueue(command(-1), 0)).toBe(false);
    q.enqueue(command(10, 3), 0);
    q.consume(4);
    expect(q.diagnostics).toMatchObject({ invalid: 3, late: 1 });
  });
  it('collects keyboard/touch without mutating player or emitting action facts, clears partial touch on blur', () => {
    const q = queue();
    const listeners = new Map<string, Function>();
    vi.stubGlobal('window', { addEventListener: (k: string, f: Function) => listeners.set(k, f), removeEventListener: vi.fn() });
    const input = new InputSystem();
    expect((input as any).initQueue, 'production input must collect commands').toBeTypeOf('function');
    (input as any).initQueue(q, () => 7);
    listeners.get('keydown')!({ key: 'a', preventDefault() {} });
    expect(q.consume(8)[0]).toMatchObject({ action: 'LEFT', source: 'KEYBOARD', tick: 8 });
    listeners.get('touchstart')!({ touches: [{ clientX: 200, clientY: 400 }] });
    listeners.get('touchend')!({ changedTouches: [{ clientX: 200, clientY: 200 }] });
    expect(q.consume(8)).toEqual([]); // already consumed tick: input is diagnosed late
    (input as any).initQueue(q, () => 8);
    listeners.get('touchstart')!({ touches: [{ clientX: 200, clientY: 400 }] });
    listeners.get('touchend')!({ changedTouches: [{ clientX: 200, clientY: 200 }] });
    expect(q.consume(9)[0]).toMatchObject({ action: 'JUMP', source: 'TOUCH' });
    listeners.get('touchstart')!({ touches: [{ clientX: 200, clientY: 400 }] });
    listeners.get('blur')!();
    listeners.get('touchend')!({ changedTouches: [{ clientX: 20, clientY: 400 }] });
    expect(q.consume(9)).toEqual([]);
    input.dispose(); input.dispose();
    vi.unstubAllGlobals();
  });
  it('queues vertical touch gestures instead of calling legacy actions without a player', () => {
    const q = queue();
    const listeners = new Map<string, Function>();
    vi.stubGlobal('window', { addEventListener: (k: string, f: Function) => listeners.set(k, f), removeEventListener: vi.fn() });
    const input = new InputSystem();
    input.initQueue(q, () => 0);
    const swipe = (endY: number) => {
      listeners.get('touchstart')!({ touches: [{ clientX: 200, clientY: 400 }] });
      listeners.get('touchend')!({ changedTouches: [{ clientX: 200, clientY: endY }] });
    };
    expect(() => { swipe(200); swipe(600); }).not.toThrow();
    expect(q.consume(1).map((c: any) => [c.action, c.source])).toEqual([['JUMP', 'TOUCH'], ['ROLL', 'TOUCH']]);
    input.dispose(); vi.unstubAllGlobals();
  });
});
