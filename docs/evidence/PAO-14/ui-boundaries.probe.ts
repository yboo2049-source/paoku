import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@babylonjs/core', () => ({ Vector3: class {} }));
vi.mock('../../../src/render/babylon', () => ({ BabylonRenderEngine: class {
  render() {} reset() {} triggerShatterFX() {}
} }));
vi.mock('../../../src/ui/dom', () => ({ UIManager: class { update() {} } }));
vi.mock('../../../src/systems/audio', () => ({ audioEngine: new Proxy({}, { get: () => () => {} }) }));
vi.mock('../../../src/systems/spawner', () => ({ spawnerSystem: { reset() {}, update() {} } }));
vi.mock('../../../src/systems/mission', () => ({ missionSystem: {
  initMissions: () => [], resetMissions() {}, update() {}, trackAction() {},
} }));
vi.mock('../../../src/systems/physics', () => {
  return { resetPhysicsContacts() {}, updatePhysics(ctx: any) {
    if ((globalThis as any).__terminalProbe) {
      ctx.score = 100;
      ctx.state = 'GAMEOVER';
      (globalThis as any).__emitCollision();
    }
  } };
});

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
async function boot() {
  const browser = new EventTarget() as any;
  const store = new Map<string, string>();
  browser.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) };
  let lockHeld = false;
  let release = () => {};
  vi.stubGlobal('navigator', { locks: { async request(_name: string, work: () => unknown) {
    if (lockHeld) await new Promise<void>(resolve => { release = resolve; });
    return work();
  } } });
  vi.stubGlobal('__terminalProbe', false);
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false, body: {}, getElementById: () => null }));
  const frames = new Map<number, FrameRequestCallback>(); let id = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  const main = await import('../../../src/main');
  const { eventBus } = await import('../../../src/core/eventBus');
  vi.stubGlobal('__emitCollision', () => eventBus.emit('COLLISION'));
  await flush();
  return { main, eventBus, sensor: browser.__GAME_SENSOR__,
    frame(time: number) { const ready = [...frames.values()]; frames.clear(); ready.forEach(cb => cb(time)); },
    key(key: string) { browser.dispatchEvent(Object.assign(new Event('keydown'), { key })); },
    holdLock() { lockHeld = true; }, releaseLock() { lockHeld = false; release(); },
  };
}

it('isolates input immediately when pause waits behind a durable audio transaction', async () => {
  const app = await boot();
  app.eventBus.emit('START_GAME'); await flush(); app.frame(0);
  const before = app.sensor.getSimulationSnapshot();
  app.holdLock();
  app.eventBus.emit('SET_AUDIO', { ...app.sensor.getAppSnapshot().audio, bgmVolume: 0.4 });
  await flush();
  app.eventBus.emit('TOGGLE_PAUSE'); app.key('w'); app.frame(1000 / 60); app.frame(2000 / 60);
  const pending = app.sensor.getSimulationSnapshot();
  app.releaseLock(); await flush();
  app.main.disposeGame();
  expect(pending.tick).toBe(before.tick);
  expect(pending.context.player.isJumping).toBe(false);
  expect(app.sensor.getInputLog()).toEqual([]);
});

it('defers a reentrant menu command until the same terminal tick has committed', async () => {
  const app = await boot();
  app.eventBus.emit('START_GAME'); await flush(); app.frame(0);
  (globalThis as any).__terminalProbe = true;
  const leave = () => app.eventBus.emit('GO_MENU', { runId: app.sensor.getSimulationSnapshot().runId });
  app.eventBus.on('COLLISION', leave);
  app.frame(1000 / 60); await flush();
  app.eventBus.off('COLLISION', leave);
  const snapshot = app.sensor.getAppSnapshot();
  app.main.disposeGame();
  expect(snapshot.summary).toMatchObject({ scoreInt: 100, endReason: 'COLLISION' });
  expect(snapshot.highScore).toBe(100);
});
