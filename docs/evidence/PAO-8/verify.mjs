import { readFile, writeFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir = new URL('./', import.meta.url);
const data = JSON.parse(await readFile(new URL('measurements.json', dir), 'utf8'));
const summary=[];
assert.equal(data.runs.length,2);
for(const run of data.runs){
  assert.equal(run.loading.length,2);assert.equal(run.scenarios.length,3);
  const long=run.scenarios.find(s=>s.name==='180s-random-god-mode');const dense=run.scenarios.find(s=>s.name.startsWith('dense'));const restarts=run.scenarios.find(s=>s.name.startsWith('20-'));
  assert.equal(long.checkpoints.length,6);assert.equal(restarts.cycles.length,20);assert(long.checkpoints.at(-1).wallMs>=180000);
  const samples=[...long.checkpoints.map(c=>c.frames),dense.frames];
  for(const f of samples){assert(f.samples>0);assert.equal(f.samples,f.intervalsMs.length);for(const k of ['elapsedMs','p50Ms','p95Ms','p99Ms','maxMs'])assert(Number.isFinite(f[k]));assert.equal(f.over50ms,f.intervalsMs.filter(x=>x>50).length);}
  const snapshots=[...long.checkpoints.map(c=>c.stats),dense.before,dense.after,...restarts.cycles.map(c=>c.stats)];
  for(const s of snapshots){assert.equal(s.state,'PLAYING');for(const k of ['meshes','activeMeshes','sceneTriangles','materials','textures','texturePixels','particles','particleCapacity','jsHeapUsedBytes'])assert(Number.isFinite(s[k])&&s[k]>=0,`${k} invalid`);}
  assert.equal(run.logs.filter(l=>l.type==='pageerror').length,0);
  for(const suffix of ['menu','long-run','dense','restart20'])await access(new URL(`${run.viewport.width}-${suffix}.png`,dir));
  const compact=s=>({state:s.state,z:s.position.z,speed:s.speed,heapMiB:s.jsHeapUsedBytes/2**20,meshes:s.meshes,activeMeshes:s.activeMeshes,sceneTriangles:s.sceneTriangles,materials:s.materials,textures:s.textures,texturePixels:s.texturePixels,particles:s.particles,particleCapacity:s.particleCapacity,nodes:s.nodes,listeners:s.listeners});
  summary.push({viewport:run.viewport,renderer:run.loading[0].stats.renderer,layout:run.loading[0].stats.layout,loading:run.loading.map(x=>({phase:x.phase,observedReadyMs:x.nodeObservedReadyMs,navigationLoadMs:x.timing.navigation.loadEventEnd,resourceCount:x.stats.resources.length,transferBytes:x.stats.resources.reduce((n,r)=>n+r.transferSize,0)})),longRun:long.checkpoints.map(c=>({wallMs:c.wallMs,...Object.fromEntries(Object.entries(c.frames).filter(([k])=>k!=='intervalsMs')),...compact(c.stats)})),dense:{...Object.fromEntries(Object.entries(dense.frames).filter(([k])=>k!=='intervalsMs')),before:compact(dense.before),after:compact(dense.after)},restarts:{count:restarts.cycles.length,minMs:Math.min(...restarts.cycles.map(c=>c.restartObservedMs)),maxMs:Math.max(...restarts.cycles.map(c=>c.restartObservedMs)),before:compact(restarts.before),after:compact(restarts.after)},logs:run.logs});
}
const origin=JSON.parse(await readFile(new URL('dense-origin.json',dir),'utf8'));
assert.equal(origin.runs.length,2);
for(const run of origin.runs){assert.equal(run.before.state,'PLAYING');assert.equal(run.after.state,'PLAYING');assert(run.before.position.z<100);assert(run.after.position.z<500);assert.equal(run.frames.samples,run.frames.intervalsMs.length);assert(run.frames.samples>0);assert(run.frames.elapsedMs>=10000);for(const k of ['p50Ms','p95Ms','p99Ms','maxMs'])assert(Number.isFinite(run.frames[k]));assert.equal(run.frames.over50ms,run.frames.intervalsMs.filter(x=>x>50).length);assert.equal(run.logs.length,0);await access(new URL(`${run.viewport.width}-dense-origin.png`,dir));}
await writeFile(new URL('summary.json',dir),JSON.stringify({browser:data.browser,at:data.at,runs:summary,denseOrigin:origin.runs.map(r=>({viewport:r.viewport,frames:Object.fromEntries(Object.entries(r.frames).filter(([k])=>k!=='intervalsMs')),before:r.before,after:r.after}))},null,2));
await writeFile(new URL('validation.json',dir),JSON.stringify({at:new Date().toISOString(),passed:true,checks:['two viewports','two loading observations per viewport','six PLAYING long-run checkpoints and >=180s per viewport','twenty PLAYING restarts per viewport','nonempty rAF samples and exact >50ms counts','finite nonnegative resource and heap counts','zero pageerror','ten screenshots present','two additional 10s PLAYING dense-origin runs with z<500 and zero logged pageerror']},null,2));
console.log(JSON.stringify(summary,null,2));
