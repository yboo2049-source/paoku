import { afterEach, describe, expect, it, vi } from 'vitest';
const host = vi.hoisted(() => ({
  order: [] as string[], draws: [] as any[], views: [] as any[], pending: [] as any[], results: [] as any[],
  loop: null as any, ui: null as any, renderer: null as any, throwUi: false, lateDirty: false,
}));
vi.mock('@babylonjs/core', async original => {
  const core = await original<typeof import('@babylonjs/core')>();
  return { ...core, Engine: class extends core.NullEngine {} };
});

// As with the existing facade tests, module loading belongs to collection, not a timed renderer assertion.
const actualBabylon = await vi.importActual<typeof import('../../src/render/babylon')>('../../src/render/babylon');

describe('I04/I05/I06/I09 real Babylon numeric boundary', () => {
  async function rendererHost() {
    const core = await import('@babylonjs/core');
    const context = { createLinearGradient:()=>({addColorStop(){}}),fillRect(){},clearRect(){} };
    const canvas=()=>({width:390,height:844,style:{},getContext:()=>context,remove(){}});
    vi.stubGlobal('document',Object.assign(new EventTarget(),{createElement:canvas}));
    vi.stubGlobal('window',Object.assign(new EventTarget(),{innerWidth:390,innerHeight:844}));
    vi.spyOn(core.SceneLoader,'LoadAssetContainerAsync').mockImplementation(()=>new Promise(()=>{}));
    const r:any = new actualBabylon.BabylonRenderEngine({querySelector:()=>null,appendChild(){},clientWidth:390,clientHeight:844} as any);
    const engine = r.engine as import('@babylonjs/core').Engine;
    let size = { width:390, height:844 };
    vi.spyOn(engine,'getRenderWidth').mockImplementation(()=>size.width);
    vi.spyOn(engine,'getRenderHeight').mockImplementation(()=>size.height);
    vi.spyOn(engine,'setSize').mockImplementation((width,height)=>{size={width,height};return true;});
    vi.spyOn(r.scene,'render').mockImplementation(()=>{}); vi.spyOn(r.engine,'getDeltaTime').mockReturnValue(16);
    const ctx:any={state:'PLAYING',score:0,speed:18,player:{x:0,y:0,z:20,targetX:0,contact:'SUPPORTED',supportSample:{y:0},
      isJumping:false,isRolling:false,vy:0,activePowerUps:new Map()},chase:{distance:2.8},obstacles:[],coinEntities:[],powerUpEntities:[]};
    const frame={runId:'unit-run',tick:1,discontinuity:false,appState:'PLAYING'};
    const geometry:any={space:'buffer',producerId:'p',epoch:0,layoutRevision:1,page:'PLAYING',runId:'unit-run',sampleFrame:1,
      status:'READY',reason:null,profile:'gameplay',modal:'none',width:390,height:844,
      rawReservedRects:[{x:0,y:0,width:20,height:50}],reservedRects:[{x:0,y:0,width:24,height:54}],safeArea:{top:54,bottom:8,left:8,right:8}};
    const hud=(g:any=geometry,frameId=1)=>({frameId,consumerGeneration:0,page:'PLAYING',runId:'unit-run',geometry:g,unavailableReason:g?null:'DIRTY'});
    return {r,ctx,frame,geometry,hud};
  }
  afterEach(()=>vi.restoreAllMocks());
  it('uses third-parameter geometry and real buffer dimensions while preserving reducedMotion',async()=>{
    const {r,ctx,frame,geometry,hud}=await rendererHost();
    try {
      r.setPresentationOptions({reducedMotion:true,width:1,height:1});
      r.render(ctx,frame,hud());
      expect(r.hudDiagnostics).toBeDefined();
      expect(r.hudDiagnostics.input).toMatchObject({width:390,height:844,reducedMotion:true,safeArea:geometry.safeArea,reservedRects:geometry.reservedRects});
      expect(r.hudDiagnostics.projection.actors.map((a:any)=>a.name)).toEqual(['player','officer','dog']);
      r.render(ctx,frame,hud({...geometry,width:780,height:1688},2));
      expect(r.hudDiagnostics).toMatchObject({status:'UNREADY',reason:'BUFFER_SIZE_CHANGED',holding:true,safe:false});
    } finally { r.dispose(); }
  });
  it('holds final camera pose on unavailable layout and recomputes modal projection after resize',async()=>{
    const {r,ctx,frame,hud}=await rendererHost();
    const pose=()=>({position:r.camera.position.asArray(),rotation:r.camera.rotation.asArray(),target:r.camera.getTarget().asArray(),fov:r.camera.fov});
    const samePose = (before: ReturnType<typeof pose>) => {
      const after = pose(); expect(after.position).toEqual(before.position);expect(after.rotation).toEqual(before.rotation);expect(after.fov).toBe(before.fov);
      after.target.forEach((n:number,i:number)=>expect(n).toBeCloseTo(before.target[i],5));
    };
    try {
      r.render(ctx,frame,hud());
      const before=pose(); ctx.player.z+=2;
      r.render(ctx,frame,hud(null,2));
      expect(r.hudDiagnostics).toBeDefined();
      expect(r.hudDiagnostics).toMatchObject({status:'UNREADY',holding:true,safe:false});samePose(before);
      r.engine.setSize(844,390);ctx.state='PAUSED';
      r.render(ctx,{...frame,appState:'PAUSED'},{...hud(null,3),page:'PAUSED'});
      samePose(before);
      expect(r.hudDiagnostics.input).toMatchObject({width:844,height:390});
      expect(r.hudDiagnostics.projection.actors).toHaveLength(3);
      r.dispose();expect(r.hudDiagnostics).toMatchObject({status:'RELEASED',safe:false});
    } finally { r.dispose(); }
  });
});

vi.mock('../../src/core/gameLoop', () => ({ GameLoop: class {
  diagnostics = {}; constructor(public step: () => void, public options: any) { host.loop = this; }
  start() {} setPaused() {} resetClock() {} dispose() {}
} }));
vi.mock('../../src/render/babylon', () => ({ BabylonRenderEngine: class {
  constructor() { host.renderer = this; }
  getPresentationSize() { return { width: 780, height: 1688 }; }
  render(ctx: any, frame: any, hud: any) {
    host.order.push('render'); host.draws.push({ ctx, frame, hud });
    return frame?.motion ? { status: 'COMPLETE', through: frame.motion.through, items: [] } : undefined;
  }
  reset() {} dispose() {} triggerShatterFX() {} motionDiagnostics = {};
} }));
vi.mock('../../src/ui/dom', () => ({ UIManager: class {
  listeners = new Set<(notice: any) => void>(); snapshot: any = null; epoch = 0;
  constructor(_el: any, public readApp: () => any) { host.ui = this; }
  update(ctx: any) { host.order.push('update'); host.views.push({ ctx, app: this.readApp() }); if (host.throwUi) throw Error('UI injected'); }
  measureOcclusion(b: any) {
    host.order.push('measure');
    this.snapshot = { ...b, producerId: 'unit-layout', epoch: this.epoch, layoutRevision: b.sampleFrame,
      status: 'READY', profile: b.page === 'PLAYING' ? 'gameplay' : 'menu', modal: 'none',
      deviceInsets: { top:0,right:0,bottom:0,left:0 }, surfaces: [], reason:null };
    if (host.lateDirty) this.invalidateLayout();
    return this.snapshot;
  }
  readOcclusion() { return this.snapshot; }
  invalidateLayout(reason='DIRTY') { if (this.snapshot) this.snapshot = { ...this.snapshot, status:'UNREADY', reason }; this.listeners.forEach(f => f({ producerId:'unit-layout',epoch:this.epoch,status:'UNREADY',reason })); }
  subscribeLayoutInvalidation(f: any) { this.listeners.add(f); return () => this.listeners.delete(f); }
  resetLayout() { this.epoch++; this.invalidateLayout(); }
  disposeLayout() { this.listeners.clear(); }
  notifyCommandPending(p: any) { host.pending.push({ ...p, state:this.readApp().appState }); }
  notifyCommandResult(r: any) { host.results.push(r); return true; }
  showToast() {} markNewRecord() {}
} }));
vi.mock('../../src/systems/audio', () => ({ audioEngine: new Proxy({}, { get: (_t, key) => key === 'then' ? undefined : () => {} }) }));
vi.mock('../../src/systems/input', () => ({ inputSystem: { initQueue() {}, clear() {}, dispose() {} } }));
vi.mock('../../src/systems/spawner', () => ({ spawnerSystem: { reset() {}, update() {} } }));
vi.mock('../../src/systems/mission', () => ({ missionSystem: { initMissions:()=>[], resetMissions() {}, update() {}, trackAction() {} } }));
let game: typeof import('../../src/main') | undefined;
async function mount() {
  const canvas = { isConnected:true, getBoundingClientRect:()=>({x:0,y:0,width:390,height:844}) };
  const el = { isConnected:true, clientWidth:390, clientHeight:844, querySelector:()=>canvas };
  const buttons: Record<string, EventTarget & { disabled: boolean }> = {
    'pause-restart-btn': Object.assign(new EventTarget(), { disabled: false }),
    'restart-btn': Object.assign(new EventTarget(), { disabled: false }),
  };
  const store = new Map<string, string>();
  const localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
  vi.stubGlobal('navigator', { locks: { request: (_name: string, work: () => any) => Promise.resolve().then(work) } });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { innerWidth:390,innerHeight:844,visualViewport:null,localStorage }));
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden:false, body:el,documentElement:{clientWidth:390,clientHeight:844},getElementById:(id: string)=>buttons[id] ?? el }));
  vi.stubGlobal('getComputedStyle', () => ({ transform:'none',borderLeftWidth:'0',borderRightWidth:'0',borderTopWidth:'0',borderBottomWidth:'0',paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0' }));
  game = await import('../../src/main'); await new Promise(r=>setTimeout(r,0));
  host.order.length=host.draws.length=host.views.length=host.pending.length=host.results.length=0;
  return { sensor:(window as any).__GAME_SENSOR__, bus:(await import('../../src/core/eventBus')).eventBus, buttons };
}
afterEach(() => {
  game?.disposeGame(); game=undefined; vi.resetModules(); vi.unstubAllGlobals();
  host.order.length=host.draws.length=host.views.length=host.pending.length=host.results.length=0; host.throwUi=false;host.lateDirty=false;
});
describe('I01/I08/I10 real main host integration', () => {
  it('writes UI, measures once, then draws the same view/app and committed stamp', async () => {
    await mount();
    const { AppService } = await import('../../src/application/appService');
    const snapshot = vi.spyOn(AppService.prototype,'snapshot','get');
    host.loop.options.render(0.5);
    expect(snapshot).toHaveBeenCalledTimes(1);
    const app = snapshot.mock.results[0].value;
    expect(host.order).toEqual(['update','measure','render']);
    expect(host.draws[0].ctx).toBe(host.views[0].ctx); expect(host.views[0].app).toBe(app);
    expect(host.draws[0].hud).toMatchObject({frameId:1,page:'MENU',runId:null});
    expect(host.draws[0].frame.motion.through.throughTick).toBe(host.draws[0].frame.tick);
  });
  it('accounts UI exceptions separately while still delivering the committed render facts', async () => {
    const { sensor } = await mount(); host.throwUi=true;
    expect(()=>host.loop.options.render(0)).not.toThrow();
    expect(host.draws).toHaveLength(1);
    expect(host.draws[0].hud).toMatchObject({geometry:null,unavailableReason:'HOST_MEASUREMENT_FAILED'});
    expect(sensor.getMotionBridge().render.failures).toBe(0);
  });
  it('notifies pending before application dispatch and preserves original command identity', async () => {
    const { bus } = await mount();
    bus.emit('START_GAME',{commandId:'integration-start'});
    await new Promise(r=>setTimeout(r,0));
    expect(host.pending[0]).toMatchObject({commandId:'integration-start',type:'START_RUN',state:'MENU'});
    expect(host.results).toContainEqual(expect.objectContaining({commandId:'integration-start',ok:true}));
  });
  it('revokes a late-dirty sample without measuring twice or blocking the draw',async()=>{
    await mount();host.lateDirty=true;host.loop.options.render(0);
    expect(host.order).toEqual(['update','measure','render']);
    expect(host.draws[0].hud.geometry?.status).not.toBe('READY');
    expect(host.draws).toHaveLength(1);
  });
  it('dispatches fallback restart when start-btn transition window swallows pause-restart-btn, and cleans up on disposeGame',async()=>{
    const { sensor, bus, buttons } = await mount();
    bus.emit('START_GAME',{commandId:'start-before-fault'});
    await new Promise(r=>setTimeout(r,0));
    bus.emit('TOGGLE_PAUSE',{commandId:'pause-after-fault'});
    await new Promise(r=>setTimeout(r,0));
    expect(sensor.getGameState()).toBe('PAUSED');
    host.pending.length=0; host.results.length=0;
    buttons['pause-restart-btn'].dispatchEvent(new Event('click'));
    await new Promise(r=>setTimeout(r,0));
    expect(host.pending).toContainEqual(expect.objectContaining({type:'RESTART_RUN'}));
    expect(sensor.getGameState()).toBe('PLAYING');
    expect(sensor.getHudBridge().host.listeners).toBe(2);
    // Rapid second click within 300ms after a restart is ignored even if PAUSED again
    bus.emit('TOGGLE_PAUSE',{commandId:'pause-2'});
    await new Promise(r=>setTimeout(r,0));
    host.pending.length=0;
    buttons['pause-restart-btn'].dispatchEvent(new Event('click'));
    expect(host.pending).toHaveLength(0);
    game?.disposeGame();
    buttons['pause-restart-btn'].dispatchEvent(new Event('click'));
    expect(host.pending).toHaveLength(0);
  });
});
