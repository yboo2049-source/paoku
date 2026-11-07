import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = process.env.PAO19_INTEGRATION_OUT || 'D:/worker/paoku-diagnostics/pao18-pao19-integration-20261106/integration';
test.use({ video:'on' });
test.beforeEach(async ({ page }) => {
  await mkdir(out,{recursive:true});
  const errors:string[]=[];(page as any).__integrationErrors=errors;
  page.on('pageerror',e=>errors.push(e.message));
});
test.afterEach(async ({ page })=>{expect((page as any).__integrationErrors).toEqual([]);});
async function capture(page:Page, fixture=false) {
  if(fixture) await page.addInitScript(()=>{(window as any).__QA_MODE__=true;});
  await page.goto('/');await page.waitForFunction(()=>!!(window as any).__GAME_SENSOR__);
  await page.evaluate(async()=>{
    const load=(url:string)=>import(/* @vite-ignore */ url);
    const {UIManager}=await load('/src/ui/dom.ts'),{BabylonRenderEngine}=await load('/src/render/babylon.ts');
    const w=window as any;w.__integration={frames:[],order:[],maximal:false,dirty:false,throwUi:false};
    const f=w.__integration,update=UIManager.prototype.update,measure=UIManager.prototype.measureOcclusion,render=BabylonRenderEngine.prototype.render;
    UIManager.prototype.update=function(ctx:any) {
      f.ui=this;f.view=ctx;f.order=['update'];
      if(f.throwUi){f.throwUi=false;throw Error('F injected UI error');}
      const value=f.maximal&&ctx.state==='PLAYING'?{...ctx,score:123456789012345,coins:123456789012345,
        player:{...ctx.player,hoverboardActive:true,activePowerUps:new Map([['MAGNET',12],['DOUBLE_SCORE',2],['SUPER_SNEAKERS',3],['HOVERBOARD',4]])}}:ctx;
      update.call(this,value);
    };
    UIManager.prototype.measureOcclusion=function(b:any){
      f.order.push('measure');const s=measure.call(this,b);f.sample=s;
      if(f.dirty){f.dirty=false;this.invalidateLayout();}return s;
    };
    BabylonRenderEngine.prototype.render=function(ctx:any,identity:any,hud:any){
      f.renderer=this;f.order.push('render');const receipt=render.call(this,ctx,identity,hud);
      f.frames.push({order:[...f.order],sameView:ctx===f.view,identity,hud,diagnostics:this.hudDiagnostics,
        stamp:w.__GAME_SENSOR__.getSimulationSnapshot().motionStamp});
      if(f.frames.length>120)f.frames.shift();return receipt;
    };
  });
  await page.waitForFunction(()=>!!(window as any).__integration.renderer?.playerLease);
  await page.evaluate(async()=>{await document.fonts.ready;});
}
async function playing(page:Page) {
  await page.click('#start-btn');
  await page.waitForFunction(()=>{const h=(window as any).__GAME_SENSOR__.getHudBridge();return h.renderer?.page==='PLAYING'&&h.renderer.status==='READY';});
}
async function report(page:Page) {return page.evaluate(()=>(window as any).__GAME_SENSOR__.getHudBridge());}
async function save(page:Page,name:string,value:unknown,shot=false) {
  await writeFile(resolve(out,name+'.json'),JSON.stringify(value,null,2));
  if(shot)await page.screenshot({path:resolve(out,name+'.png')});
}
function visible(h:any) {
  expect(h.renderer.status).toBe('READY');expect(h.renderer.projection.actors.map((a:any)=>a.name)).toEqual(['player','officer','dog']);
  for(const a of h.renderer.projection.actors){expect(a.front).toBe(true);expect(a.safe,JSON.stringify({actor:a,hud:h.renderer})).toBe(true);}
  expect(h.renderer.safe).toBe(true);
}
for(const width of [1440,390])test('I01/I02 N production input, final three actors and real animation freeze '+width,async({page,context})=>{
  await page.setViewportSize({width,height:width===390?844:900});await capture(page);
  let touch:any=null;
  if(width===390){touch=await context.newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});}
  const activate=async(selector:string)=>{
    if(!touch){await page.click(selector);return;}const r=await page.locator(selector).boundingBox();if(!r)throw Error('missing button');
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await activate('#start-btn');
  await page.waitForFunction(()=>(window as any).__GAME_SENSOR__.getHudBridge().renderer?.page==='PLAYING');
  await page.waitForTimeout(100);const initial=await report(page);visible(initial);
  const order=await page.evaluate(()=>(window as any).__integration.frames.at(-1));
  expect(order.order).toEqual(['update','measure','render']);expect(order.sameView).toBe(true);
  expect(order.identity.tick).toBe(order.identity.motion.through.throughTick);
  if(touch) {
    for(const [x,y,dx,dy] of [[230,450,-110,0],[180,500,0,-120],[180,350,0,120]]){
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
    }
  } else {await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowUp');await page.waitForTimeout(120);await page.keyboard.press('ArrowDown');}
  await activate('#hud-pause-btn');await expect(page.locator('#paused-screen')).toBeVisible();
  await page.waitForTimeout(80);
  const frozen=await report(page),groups=await page.evaluate(()=>(window as any).__GAME_SENSOR__.getMotionBridge().render.groupsPaused);
  await page.waitForTimeout(120);const later=await report(page);
  expect(groups).toBe(true);expect(later.renderer.pose).toEqual(frozen.renderer.pose);
  expect(later.host.frameId).toBeGreaterThan(frozen.host.frameId);
  await activate('#pause-restart-btn');await expect(page.locator('#hud-pause-btn')).toBeVisible();
  await page.waitForFunction(()=>(window as any).__GAME_SENSOR__.getHudBridge().renderer?.page==='PLAYING');
  const restarted=await report(page);expect(restarted.layout.runId).not.toBe(initial.layout.runId);
  await save(page,'N-production-'+width,{initial,order,frozen,later,restarted,mode:'N real inputs; F read-only observation'},true);
});
for(const width of [1440,390])test('I02/I03 F same-frame maximal real DOM and final projection '+width,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:900});await capture(page,true);
  await playing(page);
  await page.evaluate(()=>{const f=(window as any).__integration;f.maximal=true;f.ui.showToast('测试任务提示：同帧最大HUD');});
  await page.waitForTimeout(100);const h=await report(page);
  expect(h.layout.surfaces.filter((s:any)=>s.kind==='powerup')).toHaveLength(4);
  expect(h.layout.surfaces.filter((s:any)=>s.kind==='toast')).toHaveLength(1);visible(h);
  const actual=await page.locator('#hud-score').evaluate(el=>{const r=el.closest('.hud-badge')!.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});
  const measured=h.layout.surfaces.find((s:any)=>s.id==='score').clientRect;
  expect(measured.x).toBeCloseTo(actual.x,1);expect(measured.width).toBeCloseTo(actual.width,1);
  await save(page,'F-maximal-'+width,{mode:'F UI-only long numbers, four buffs and toast; original simulation/renderer facts',h,actual},true);
});
test('I04/I05/I08 F unavailable UI preserves facts, then paused rotation freezes real groups and pose',async({page})=>{
  await page.setViewportSize({width:390,height:844});await capture(page,true);await playing(page);
  await page.evaluate(()=>{const w=window as any;w.__integration.dirty=true;w.__GAME_SENSOR__.driveMotionForQa([['JUMP'],['ROLL'],['LEFT']],true);});
  const dirty=await page.evaluate(()=>{const f=(window as any).__integration;return f.frames.findLast((x:any)=>x.diagnostics.status==='UNREADY');});
  expect(dirty).toBeDefined();expect(dirty.diagnostics.safe).toBe(false);expect(dirty.diagnostics.holding).toBe(true);
  const receipt=await page.evaluate(()=>(window as any).__GAME_SENSOR__.getMotionBridge());
  const actions=receipt.committedItems.filter((x:any)=>x.type==='ACTION_STARTED');
  for(const a of actions)expect(receipt.render.items.some((i:any)=>i.eventId===a.eventId)).toBe(true);
  const failures=receipt.render.failures;
  await page.evaluate(()=>{const w=window as any;w.__integration.throwUi=true;w.__GAME_SENSOR__.driveMotionForQa([[]],true);});
  const uiError=await page.evaluate(()=>(window as any).__integration.frames.findLast((x:any)=>x.hud?.unavailableReason==='HOST_MEASUREMENT_FAILED'));
  expect(uiError).toBeDefined();expect((await page.evaluate(()=>(window as any).__GAME_SENSOR__.getMotionBridge())).render.failures).toBe(failures);
  await page.keyboard.press('Escape');await expect(page.locator('#paused-screen')).toBeVisible();await page.waitForTimeout(100);
  const before=await report(page);await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);const rotated=await report(page);
  expect(rotated.renderer.pose).toEqual(before.renderer.pose);expect(rotated.renderer.frozen).toBe(true);
  expect(rotated.renderer.input.width).toBe(844);expect(rotated.renderer.input.height).toBe(390);
  expect((await page.evaluate(()=>(window as any).__GAME_SENSOR__.getMotionBridge())).render.groupsPaused).toBe(true);
  await save(page,'F-paused-rotation',{mode:'F fault/QA commands and viewport rotation',dirty,uiError,receipt,before,rotated},true);
});
test.describe('I06 actual buffer and DPR',()=>{
  test.use({deviceScaleFactor:2});
  test('F offset content and real non-default backbuffer are scaled once',async({page})=>{
    await page.setViewportSize({width:500,height:1000});await capture(page,true);await playing(page);
    await page.evaluate(()=>{const f=(window as any).__integration;document.querySelector<HTMLElement>('#game-container')!.style.cssText='position:relative;left:30px;top:20px;width:390px;height:844px';f.renderer.engine.setSize(780,1688);f.ui.invalidateLayout();});
    await page.waitForTimeout(120);const h=await report(page);
    expect(h.layout.canvasRect).toEqual({x:30,y:20,width:390,height:844});expect(h.renderer.status).toBe('READY');
    expect(h.renderer.input).toMatchObject({width:780,height:1688});
    const score=h.layout.surfaces.find((s:any)=>s.id==='score'),index=h.layout.surfaces.findIndex((s:any)=>s.id==='score');
    expect(h.renderer.rawReservedRects[index].x).toBeCloseTo((score.clientRect.x-30)*2,4);
    expect(h.renderer.rawReservedRects[index].width).toBeCloseTo(score.clientRect.width*2,4);
    await save(page,'F-buffer-DPR2',{mode:'F explicit actual engine buffer/offset; device DPR2',h});
  });
});
test('I07/I09/I11 F warm host resource stability for 20 rounds, 10 resets and terminal dispose',async({page})=>{
  await capture(page,true);await playing(page);
  const sample=()=>page.evaluate(()=>{
    const f=(window as any).__integration,s=f.renderer.scene,h=(window as any).__GAME_SENSOR__.getHudBridge();
    return{host:h.host,probe:document.querySelectorAll('[data-hud-safe-area-probe]').length,meshes:s.meshes.length,materials:s.materials.length,textures:s.textures.length,groups:s.animationGroups.length,skeletons:s.skeletons.length};
  });
  const before=await sample(),rounds:any[]=[],resets:any[]=[];
  for(let i=0;i<20;i++){
    await page.evaluate(()=>{const f=(window as any).__integration;f.ui.invalidateLayout();f.ui.showToast('布局失效样本');});
    await page.waitForTimeout(20);rounds.push(await sample());
  }
  for(let i=0;i<10;i++){
    await page.keyboard.press('Escape');await expect(page.locator('#paused-screen')).toBeVisible();
    await page.click('#pause-restart-btn');await page.waitForFunction(()=>(window as any).__GAME_SENSOR__.getHudBridge().renderer?.page==='PLAYING');
    resets.push(await sample());
    // B19 triggerRestart rejects a second click within its fixed 300ms transition guard.
    await page.waitForTimeout(300);
  }
  const after=await sample();
  expect(after.host.listeners).toBe(before.host.listeners);expect(after.host.observers).toBe(before.host.observers);expect(after.host.subscriptions).toBe(1);expect(after.probe).toBe(1);
  expect(after.meshes).toBe(before.meshes);expect(after.materials).toBe(before.materials);expect(after.textures).toBe(before.textures);
  expect(after.groups).toBe(before.groups);expect(after.skeletons).toBe(before.skeletons);
  const disposed=await page.evaluate(async()=>{
    const load=(url:string)=>import(/* @vite-ignore */ url),main=await load('/src/main.ts');main.disposeGame();main.disposeGame();
    const w=window as any,f=w.__integration;document.fonts.dispatchEvent(new Event('loadingdone'));window.dispatchEvent(new Event('resize'));
    return {h:w.__GAME_SENSOR__.getHudBridge(),probe:document.querySelectorAll('[data-hud-safe-area-probe]').length,sceneDisposed:f.renderer.scene.isDisposed};
  });
  expect(disposed.h.host).toMatchObject({listeners:0,observers:0,subscriptions:0,disposed:true});expect(disposed.probe).toBe(0);expect(disposed.sceneDisposed).toBe(true);
  expect(disposed.h.renderer.status).toBe('RELEASED');
  await save(page,'F-resources',{mode:'F read-only counters and actual lifecycle inputs; late font/resize after dispose',before,rounds,resets,after,disposed});
});
