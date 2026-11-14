import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ev='docs/evidence/PAO-16/calibration-refinement';
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
test('new refinement regions and labelled source ends render without modifying historical evidence',async({page,request})=>{
 const entry=await request.get('/tools/pao16-calibration/refinement-preview.html');expect(entry.ok()).toBeTruthy();expect(await entry.text()).toContain('PAO16 refinement');
 const report=await (await request.get('/docs/assets/pao16-calibration-refinement.json')).json();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const records:any[]=[];const files=['train_metro.glb','obstacle_slide_barrier.glb','train_ramp_or_car.glb','obstacle_hurdle_barrier.glb'];
 for(const [i,file] of files.entries()){
  const http=await request.get('/inputs/'+file);const local=readFileSync('.pao16-local/inputs/'+file);expect(sha(await http.body())).toBe(sha(local));
  expect(sha(local)).toBe(report.assets.find((a:any)=>a.file===file).sha256);
  await page.goto('/tools/pao16-calibration/refinement-preview.html?asset='+file);
  await page.waitForFunction(()=>(window as any).__REFINEMENT__?.ready,undefined,{timeout:60000});
  const status=await page.evaluate(()=>(window as any).__REFINEMENT__);
  expect(status.base5Error).toBeLessThan(1e-4);expect(status.restoreError).toBeLessThan(1e-4);expect(status.loaderMaxError).toBeLessThan(1e-5);expect(status.candidateAppliedError).toBeLessThan(1e-4);expect(status.visualRootCount).toBe(1);
  expect(status.logicalChildCount).toBe(file==='train_metro.glb'?2:1);expect(status.refinementOverlayCount).toBeGreaterThan(0);
  expect(status.cameraCount).toBeGreaterThan(0);if(file==='train_ramp_or_car.glb')expect(status.cameraCount).toBe(2);
  expect(status.continuousCertificate).toBe(false);records.push({...status,httpSHA256:sha(local)});
  if(i<3)await page.screenshot({path:`${ev}/${i+1}-${file}.png`});
 }
 const raw=await page.evaluate(async()=>(await import('/tools/pao16-calibration/refinement-preview.ts?raw')).default);
 expect(sha(raw)).toBe(sha(readFileSync('tools/pao16-calibration/refinement-preview.ts')));expect(errors).toEqual([]);
 writeFileSync(`${ev}/preview-verification.json`,JSON.stringify({records,rawSHA256:sha(raw),errors,mode:'RH isolated original GLB; no LH production approval; finite-grid fixture only'},null,2)+'\n');
});
