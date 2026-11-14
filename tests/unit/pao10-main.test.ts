import { afterEach, expect, it, vi } from 'vitest';

// Keep the production scheduler/input/simulation wired together; replace only
// presentation and unrelated legacy systems so lifecycle tests need no WebGL.
vi.mock('@babylonjs/core', () => ({ Vector3: class {} }));
vi.mock('../../src/render/babylon', () => ({ BabylonRenderEngine: class {
  render() {} reset() {} triggerShatterFX() {}
} }));
vi.mock('../../src/ui/dom', () => ({ UIManager: class {
  update(ctx: any) { ctx.highScore = 123; ctx.totalCoins = 456; }
} }));
vi.mock('../../src/systems/audio', () => ({ audioEngine: new Proxy({}, { get: () => () => {} }) }));
vi.mock('../../src/systems/spawner', () => ({ spawnerSystem: { reset() {}, update() {} } }));
vi.mock('../../src/systems/mission', () => ({ missionSystem: {
  initMissions: () => [], resetMissions() {}, update() {}, trackAction() {},
} }));

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

async function boot() {
  const browser = new EventTarget() as EventTarget & { __GAME_SENSOR__: any };
  const page = Object.assign(new EventTarget(), { hidden: false, body: {}, getElementById: () => null });
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', page);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  const main = await import('../../src/main');
  const { eventBus } = await import('../../src/core/eventBus');
  return { main, browser, page, frames, eventBus, sensor: browser.__GAME_SENSOR__,
    frame(time: number) { const ready = [...frames.values()]; frames.clear(); ready.forEach(cb => cb(time)); },
    key(key: string) { browser.dispatchEvent(Object.assign(new Event('keydown'), { key })); },
  };
}

it('exposes immutable committed diagnostics/snapshots while real input waits for the next production tick', async () => {
  const app = await boot();
  expect(app.sensor.getSimulationSnapshot).toBeTypeOf('function');
  expect(app.sensor.getSimulationDiagnostics).toBeTypeOf('function');
  expect(app.sensor.getInputLog).toBeTypeOf('function');
  app.eventBus.emit('START_GAME'); app.frame(0);
  app.key('a');
  expect(app.sensor.getSimulationSnapshot().tick).toBe(0);
  expect(app.sensor.getPlayerState().lane).toBe(1);
  app.frame(1000 / 60);
  const snapshot = app.sensor.getSimulationSnapshot();
  expect(snapshot.tick).toBe(1);
  expect(snapshot.context.player.lane).toBe(0);
  expect(app.sensor.getInputLog()).toMatchObject([{ tick: 1, sequence: 1, action: 'LEFT' }]);
  expect(() => { snapshot.context.player.x = 999; }).toThrow();
  const diagnostic = app.sensor.getSimulationDiagnostics();
  expect(() => { diagnostic.scheduler.droppedSteps = 999; }).toThrow();
  expect(app.sensor.getSimulationDiagnostics().scheduler.droppedSteps).toBe(0);
  expect(snapshot.context.highScore).toBe(0);
  expect(snapshot.context.totalCoins).toBe(0);
  app.main.disposeGame();
});

it('clears pending real input on blur and resumes without accumulating hidden wall time', async () => {
  const app = await boot();
  app.eventBus.emit('START_GAME'); app.frame(0);
  app.key('a'); app.browser.dispatchEvent(new Event('blur'));
  expect(app.sensor.getGameState()).toBe('PAUSED');
  app.frame(10_000); app.frame(20_000);
  expect(app.sensor.getSimulationSnapshot().tick).toBe(0);
  app.eventBus.emit('TOGGLE_PAUSE');
  app.frame(30_000); app.frame(30_000 + 1000 / 60);
  expect(app.sensor.getSimulationSnapshot().tick).toBe(1);
  expect(app.sensor.getPlayerState().lane).toBe(1);
  expect(app.sensor.getInputLog()).toHaveLength(0);
  app.main.disposeGame();
});

it('disposes its event bus subscriptions as well as input and rAF before a replacement entry is loaded', async () => {
  const app = await boot();
  expect(app.main.disposeGame).toBeTypeOf('function');
  app.eventBus.emit('START_GAME'); app.frame(0); app.frame(1000 / 60);
  const before = app.sensor.getSimulationSnapshot();
  app.main.disposeGame(); app.main.disposeGame();
  expect(app.frames.size).toBe(0);
  app.eventBus.emit('START_GAME'); app.eventBus.emit('TOGGLE_PAUSE'); app.key('a');
  expect(app.sensor.getSimulationSnapshot()).toBe(before);
});
