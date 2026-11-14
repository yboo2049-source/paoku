import { afterEach, expect, it, vi } from 'vitest';
import { NullEngine, Scene, MeshBuilder, StandardMaterial } from '@babylonjs/core';
const captured = vi.hoisted(() => ({ hooks: null as any, renderer: null as any }));
vi.mock('../../src/core/gameLoop', () => ({ GameLoop: class {
  diagnostics = {};
  constructor(_step: unknown, hooks: unknown) { captured.hooks = hooks; }
  setPaused() {} start() {} resetClock() {} dispose() {}
} }));
vi.mock('../../src/render/babylon', () => {
  return { BabylonRenderEngine: class {
    engine = new NullEngine(); scene = new Scene(this.engine); frames: any[] = [];
    constructor() { captured.renderer = this; MeshBuilder.CreateBox('owned', {}, this.scene).material = new StandardMaterial('owned-material', this.scene); }
    render(context: unknown, identity: unknown) { this.frames.push({ context, identity }); }
    reset() {} triggerShatterFX() {}
    dispose() { this.scene.dispose(); this.engine.dispose(); }
  } };
});
vi.mock('../../src/ui/dom', () => ({ UIManager: class { update() {} } }));
vi.mock('../../src/systems/audio', () => ({ audioEngine: new Proxy({}, { get: () => () => {} }) }));
vi.mock('../../src/systems/spawner', () => ({ spawnerSystem: { reset() {}, update() {}, generationState: {} } }));
vi.mock('../../src/systems/mission', () => ({ missionSystem: { initMissions: () => [], resetMissions() {}, update() {}, trackAction() {} } }));
let main: typeof import('../../src/main') | undefined;
afterEach(() => { main?.disposeGame(); captured.renderer?.dispose(); captured.hooks = null; captured.renderer = null; main = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.resetModules(); });
async function boot() {
  const win = new EventTarget(); const doc = Object.assign(new EventTarget(), { hidden: false, body: {}, getElementById: () => null });
  vi.stubGlobal('window', win); vi.stubGlobal('document', doc);
  main = await import('../../src/main'); await Promise.resolve(); await Promise.resolve();
  return main;
}
it('executes main render with exactly one presentation sample and one app projection, keeping identity/context paired', async () => {
  await boot();
  const { Simulation } = await import('../../src/core/simulation');
  const { AppService } = await import('../../src/application/appService');
  const original = Simulation.prototype.presentation; let samples = 0;
  const presentation = vi.spyOn(Simulation.prototype, 'presentation').mockImplementation(function(alpha) {
    const base = original.call(this, alpha); const n = ++samples;
    return { ...base, runId: `sample-${n}`, tick: n, discontinuity: true,
      context: { ...base.context, player: { ...base.context.player, x: 1.125, z: n * 100 + alpha } } };
  });
  const app = vi.spyOn(AppService.prototype, 'snapshot', 'get');
  captured.hooks.render(0.25);
  const { context, identity } = captured.renderer.frames.at(-1);
  expect(presentation).toHaveBeenCalledTimes(1);
  expect(identity).toEqual({ runId: 'sample-1', tick: 1, discontinuity: true, appState: context.state });
  expect(context.player.z).toBe(100.25); expect(context.player.x).toBe(1.125);
  expect(app).toHaveBeenCalledTimes(1);
});
it('executes disposeGame through the renderer release bridge and frees its owned scene resources', async () => {
  const entry = await boot(); const r = captured.renderer;
  expect(r.scene.meshes.length).toBe(1); entry.disposeGame(); entry.disposeGame();
  expect(r.scene.isDisposed).toBe(true); expect(r.scene.meshes.length).toBe(0); expect(r.scene.materials.length).toBe(0);
});
