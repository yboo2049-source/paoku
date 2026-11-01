import { describe, it, expect } from 'vitest';
import { speedLabel, powerUps, ToastQueue, Receipts, InteractionScope } from '../../src/ui/views/models';
describe('PAO19 readonly presentation R01-R05',()=>{
 it('uses truthful units',()=>{expect(speedLabel(18)).toBe('18.0 m/s');expect(speedLabel(45)).toBe('45.0 m/s');});
 it('projects named icons and frozen seconds without ticking',()=>{const p={hoverboardActive:true,activePowerUps:new Map([['MAGNET',1.1],['DOUBLE_SCORE',3],['SUPER_SNEAKERS',0]])};const before=JSON.stringify([...p.activePowerUps]);expect(powerUps(p).map(x=>x.label)).toEqual(['磁铁','双倍得分','悬浮滑板']);expect(powerUps(p).map(x=>x.time)).toEqual(['2秒','3秒','保护中']);expect(JSON.stringify([...p.activePowerUps])).toBe(before);});
 it('bounds and deduplicates queue, pauses time while hidden',()=>{const q=new ToastQueue();q.add('same',0);q.add('same',100);expect(q.items.length).toBe(1);for(let i=0;i<20;i++)q.add('<b>'+i,200);expect(q.items.length).toBe(4);expect(q.items[0].text).toBe('same');q.advance(4000,true);expect(q.items.length).toBe(4);q.advance(8000,true);q.advance(8100,false);expect(q.items.length).toBe(4);q.advance(11200,false);expect(q.items.length).toBe(3);q.clear();expect(q.items).toEqual([]);});
 it('associates results by command and origin, ignores duplicate or old result',()=>{const r=new Receipts();r.begin({commandId:'old',type:'GO_MENU',runId:'a'},0);r.begin({commandId:'new',type:'GO_MENU',runId:'b'},0);r.end({commandId:'old',ok:false,errorCode:'SAVE_FAILED'},'b');expect(r.pending.has('new')).toBe(true);expect(r.error).toBe('');r.end({commandId:'new',ok:false,errorCode:'SAVE_FAILED'},'b');expect(r.error).toContain('保存');r.end({commandId:'new',ok:true},'b');expect(r.error).toContain('保存');});
 it('deduplicates pending and never expires into an automatic retry',()=>{const r=new Receipts();const p={commandId:'id',type:'UPDATE_AUDIO',runId:null} as const;r.begin(p,0);r.begin(p,100);expect(r.pending.size).toBe(1);expect(r.message(299)).toBe('');expect(r.message(300)).toContain('正在');expect(r.message(5000)).toContain('仍在');expect(r.pending.size).toBe(1);});
});

// B integration: real application/main boundary, presentation and WebGL only are replaced.
import {vi,afterEach} from 'vitest';
const lifecycle=vi.hoisted(()=>[] as any[]);
vi.mock('@babylonjs/core',()=>({Vector3:class{}}));
vi.mock('../../src/render/babylon',()=>({BabylonRenderEngine:class{render(){}reset(){}triggerShatterFX(){}}}));
vi.mock('../../src/ui/dom',()=>({UIManager:class{
 update(){} showToast(message:string){lifecycle.push({toast:message});}
 notifyCommandPending(p:any){lifecycle.push({pending:p,state:(window as any).__GAME_SENSOR__?.getGameState()});}
 notifyCommandResult(r:any){lifecycle.push({result:r});return true;}
}}));
vi.mock('../../src/systems/audio',()=>({audioEngine:new Proxy({},{get:()=>()=>{}})}));
vi.mock('../../src/systems/spawner',()=>({spawnerSystem:{reset(){},update(){}}}));
vi.mock('../../src/systems/mission',()=>({missionSystem:{initMissions:()=>[],resetMissions(){},update(){},trackAction(){}}}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();lifecycle.length=0;});
it('B I-01 notifies before dispatch and correlates success/failure without duplicate toast',async()=>{
 const browser=new EventTarget();vi.stubGlobal('window',browser);vi.stubGlobal('document',Object.assign(new EventTarget(),{hidden:false,body:{},getElementById:()=>null}));vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 const main=await import('../../src/main');const {eventBus}=await import('../../src/core/eventBus');await new Promise(r=>setTimeout(r,0));lifecycle.length=0;
 eventBus.emit('START_GAME',{commandId:'p19-start'});await new Promise(r=>setTimeout(r,0));
 expect(lifecycle[0]).toMatchObject({pending:{commandId:'p19-start',type:'START_RUN'},state:'MENU'});expect(lifecycle.some(x=>x.result?.commandId==='p19-start'&&x.result.ok)).toBe(true);
 eventBus.emit('GO_MENU',{commandId:'stale',runId:'old'});await new Promise(r=>setTimeout(r,0));expect(lifecycle.some(x=>x.result?.commandId==='stale'&&!x.result.ok)).toBe(true);expect(lifecycle.filter(x=>x.toast)).toEqual([]);main.disposeGame();
});


it('R02 does not advertise a spent hoverboard when a stale timer remains',()=>{
 expect(powerUps({hoverboardActive:false,activePowerUps:new Map([['HOVERBOARD',5]])})).toEqual([]);
});
it('P2 UI scopes expire each menu visit but preserve a run terminal retry',()=>{
 const scope=new InteractionScope();
 expect(scope.enter({appState:'MENU',activeRunId:null})).toBe(true);const menu=scope.generation;
 expect(scope.enter({appState:'MENU',activeRunId:null})).toBe(false);
 expect(scope.enter({appState:'PLAYING',activeRunId:'run'})).toBe(true);
 expect(scope.enter({appState:'PAUSED',activeRunId:'run'})).toBe(false);
 expect(scope.enter({appState:'GAMEOVER',activeRunId:'run'})).toBe(false);
 expect(scope.enter({appState:'MENU',activeRunId:null})).toBe(true);expect(scope.generation).toBeGreaterThan(menu);
});
