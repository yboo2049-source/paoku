import { chromium } from '@playwright/test';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = resolve('docs/evidence/PAO-8');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'] });
const report = process.env.PAO8_RESUME === '1' ? JSON.parse(await readFile(resolve(out,'measurements.json'),'utf8')) : { at: new Date().toISOString(), browser: browser.version(), url: 'http://127.0.0.1:5178', caveats: ['localhost Vite development server; warmed optimizer', 'headless desktop hardware; mobile viewport is not phone', 'rAF intervals are not CPU/GPU execution durations', 'heap sampled without forced GC; counts are scene totals, not draw calls'], runs: [] };
const pct = (a, q) => [...a].sort((x,y)=>x-y)[Math.max(0, Math.ceil(a.length*q)-1)] ?? null;
async function stats(page, cdp) {
  const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  const state = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(r => r.name.includes('/@babylonjs_core.js?')).name;
    const m = await import(url); const engine = m.Engine.Instances[0]; const s = engine.scenes[0];
    const gl = document.querySelector('canvas').getContext('webgl2'); const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return { state: window.__GAME_SENSOR__.getGameState(), position: window.__GAME_SENSOR__.getPlayerPos(), speed: window.__GAME_SENSOR__.getSpeed(), obstacles: window.__GAME_SENSOR__.getActiveObstaclesCount(), meshes: s.meshes.length, activeMeshes: s.getActiveMeshes().length, sceneTriangles: s.meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0), materials: s.materials.length, textures: s.textures.length, texturePixels: s.textures.reduce((n,t)=>{const z=t.getSize();return n+z.width*z.height;},0), particles: s.particleSystems.reduce((n,p)=>n+(p.getActiveCount?.()??0),0), particleCapacity: s.particleSystems.reduce((n,p)=>n+(p.getCapacity?.()??0),0), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, layout: {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,dpr:devicePixelRatio,canvasWidth:engine.getRenderWidth(),canvasHeight:engine.getRenderHeight()}, resources: performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,duration:r.duration})) };
  });
  return { ...state, jsHeapUsedBytes: metrics.JSHeapUsedSize, jsHeapTotalBytes: metrics.JSHeapTotalSize, documents: metrics.Documents, nodes: metrics.Nodes, listeners: metrics.JSEventListeners };
}
async function sample(page, ms) {
  const values = await page.evaluate(ms => new Promise(resolve => { const values=[]; let prev, start; function f(t){start??=t;if(prev!==undefined)values.push(t-prev);prev=t;if(t-start>=ms)resolve(values);else requestAnimationFrame(f);}requestAnimationFrame(f);}), ms);
  return { samples: values.length, elapsedMs: values.reduce((n,x)=>n+x,0), p50Ms:pct(values,.5),p95Ms:pct(values,.95),p99Ms:pct(values,.99),over50ms:values.filter(x=>x>50).length,maxMs:Math.max(...values),intervalsMs:values };
}
try {
  if(process.env.PAO8_ORIGIN==='1'){
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
      const context=await browser.newContext({viewport,deviceScaleFactor:1});const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const run={viewport,logs:[]};report.runs.push(run);
      page.on('pageerror',e=>run.logs.push({type:'pageerror',message:e.message}));
      await page.addInitScript(()=>{window.__QA_MODE__=true;});await page.goto(report.url);await page.waitForFunction(()=>!!window.__GAME_SENSOR__);await page.click('#start-btn');
      await page.evaluate(async()=>{const {spawnerSystem:s}=await import('/src/systems/spawner.ts');window.__GAME_SENSOR__.setGodMode(true);window.__GAME_SENSOR__.setPlayerPos(0,0,0);s.update=function(z,o,c,p){o.length=0;c.length=0;p.length=0;for(let i=0;i<60;i++)o.push({id:'dense-o'+i,type:'STATIC_TRAIN',lane:i%3,x:(i%3-1)*3,y:0,z:z+8+Math.floor(i/3)*5,width:2.4,height:3,depth:4});for(let i=0;i<180;i++)c.push({id:'dense-c'+i,lane:i%3,x:(i%3-1)*3,y:4,z:z+8+Math.floor(i/3)*1.7,collected:false});};});
      await page.waitForTimeout(1000);run.before=await stats(page,cdp);run.frames=await sample(page,10000);run.after=await stats(page,cdp);await page.screenshot({path:resolve(out,`${viewport.width}-dense-origin.png`)});await context.close();console.log(`${viewport.width} dense-origin done`);
    }
  } else {
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    if(report.runs.some(r=>r.viewport.width===viewport.width&&r.scenarios.length===3))continue;
    const context = await browser.newContext({viewport,deviceScaleFactor:1}); const page = await context.newPage(); const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
    const existing=report.runs.find(r=>r.viewport.width===viewport.width); const resume=!!existing;
    const run=existing??{viewport,logs:[],loading:[],scenarios:[]};if(!existing)report.runs.push(run);
    page.on('pageerror',e=>run.logs.push({type:'pageerror',message:e.message}));page.on('console',m=>{if(['warning','error'].includes(m.type()))run.logs.push({type:m.type(),message:m.text()});});page.on('requestfailed',r=>run.logs.push({type:'requestfailed',url:r.url(),message:r.failure()?.errorText}));
    await page.addInitScript(()=>{window.__QA_MODE__=true;});
    if(resume){await page.goto(report.url);await page.waitForFunction(()=>!!window.__GAME_SENSOR__);run.restartContext='fresh browser context after collision fixture wait timed out; preserved loading/long-run/dense samples; desktop initial static-train fixture and mobile retained long-run buffs were not reliable failure setups';}
    if(!resume)for(const phase of ['fresh-context','warm-reload']) {
      const t=Date.now(); if(phase==='fresh-context')await page.goto(report.url);else await page.reload();await page.waitForFunction(()=>!!window.__GAME_SENSOR__);await page.locator('#start-btn').waitFor({state:'visible'});
      run.loading.push({phase,nodeObservedReadyMs:Date.now()-t,stats:await stats(page,cdp),timing:await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation')[0].toJSON(),paint:performance.getEntriesByType('paint').map(x=>x.toJSON())}))});
    }
    if(!resume)await page.screenshot({path:resolve(out,`${viewport.width}-menu.png`),animations:'disabled'});
    await page.click('#start-btn');await page.evaluate(()=>window.__GAME_SENSOR__.setGodMode(true));
    if(!resume){const checkpoints=[];const start=Date.now();
    // Three minutes of wall time, production random spawner, god mode disclosed.
    for(let i=0;i<6;i++){const frames=await sample(page,30000);checkpoints.push({wallMs:Date.now()-start,frames,stats:await stats(page,cdp)});console.log(`${viewport.width} long-run ${i+1}/6`);}
    run.scenarios.push({name:'180s-random-god-mode',checkpoints});await page.screenshot({path:resolve(out,`${viewport.width}-long-run.png`)});
    // Dense fixture replenishes 60 trains + 180 coins ahead, in browser memory only.
    await page.evaluate(async()=>{const {spawnerSystem:s}=await import('/src/systems/spawner.ts');window.__originalUpdate=s.update;s.update=function(z,o,c,p){window.__world={o,c,p};o.length=0;c.length=0;p.length=0;for(let i=0;i<60;i++)o.push({id:'dense-o'+i,type:'STATIC_TRAIN',lane:i%3,x:(i%3-1)*3,y:0,z:z+8+Math.floor(i/3)*5,width:2.4,height:3,depth:4});for(let i=0;i<180;i++)c.push({id:'dense-c'+i,lane:i%3,x:(i%3-1)*3,y:4,z:z+8+Math.floor(i/3)*1.7,collected:false});};});
    await page.waitForTimeout(1000);const before=await stats(page,cdp);const frames=await sample(page,10000);const after=await stats(page,cdp);await page.screenshot({path:resolve(out,`${viewport.width}-dense.png`)});run.scenarios.push({name:'dense-60-trains-180-coins-god-mode',before,frames,after});}
    await page.evaluate(async()=>{const {spawnerSystem:s}=await import('/src/systems/spawner.ts');s.update=function(z,o,c,p){window.__world={o,c,p};};window.__GAME_SENSOR__.clearWorld();window.__GAME_SENSOR__.setGodMode(false);});
    await page.evaluate(async()=>{const {eventBus}=await import('/src/core/eventBus.ts');eventBus.emit('START_GAME');});
    await page.waitForFunction(()=>!!window.__world);const restartBefore=await stats(page,cdp);const cycles=[];
    for(let i=0;i<20;i++){
      await page.evaluate(()=>{const s=window.__GAME_SENSOR__;s.clearWorld();s.setPlayerLane(1);s.setPlayerPos(0,0,0);s.grantInvulnerable(0);window.__world.o.push({id:'fail',type:'LOW_OBSTACLE',lane:1,x:0,y:0,z:2,width:2.4,height:1.2,depth:2});});
      await page.waitForFunction(()=>window.__GAME_SENSOR__.getGameState()==='GAMEOVER');const t=Date.now();await page.click('#restart-btn');await page.waitForFunction(()=>window.__GAME_SENSOR__.getGameState()==='PLAYING');cycles.push({cycle:i+1,restartObservedMs:Date.now()-t,stats:await stats(page,cdp)});
    }
    run.scenarios.push({name:'20-forced-collision-real-button-restarts',before:restartBefore,cycles,after:await stats(page,cdp)});await page.screenshot({path:resolve(out,`${viewport.width}-restart20.png`)});await context.close();await writeFile(resolve(out,'measurements.json'),JSON.stringify(report,null,2));
  }
  }
} finally { await writeFile(resolve(out,process.env.PAO8_ORIGIN==='1'?'dense-origin.json':'measurements.json'),JSON.stringify(report,null,2));await browser.close(); }
