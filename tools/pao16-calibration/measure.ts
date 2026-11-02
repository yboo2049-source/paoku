/** Run with node --experimental-strip-types tools/pao16-calibration/measure.ts */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { parseGlb, rayY, transform, trs, multiply, identity, fitUniform, logicalMarkers, visualRoots } from './core.ts';
import type { V } from './core.ts';

const sourceRoot='D:/worker/paoku-sessions/glb-review';
const files=['train_ramp_or_car.glb','train_metro.glb','obstacle_hurdle_barrier.glb','obstacle_slide_barrier.glb'];
const manifest=JSON.parse(fs.readFileSync(`${sourceRoot}/docs/assets/glb-manifest.json`,'utf8'));
const hash=(b:Uint8Array)=>crypto.createHash('sha256').update(b).digest('hex');
const round=(n:number)=>Number(n.toFixed(9));
const assets=files.map(file=>{
  const bytes=fs.readFileSync(`${sourceRoot}/public/models/${file}`),sha256=hash(bytes);
  if(sha256!==manifest.assets.find((a:any)=>a.file_name===file).sha256)throw Error(`Hash mismatch: ${file}`);
  fs.mkdirSync('.pao16-local/inputs',{recursive:true});fs.writeFileSync(`.pao16-local/inputs/${file}`,bytes);
  const g=parseGlb(bytes); const truck=file==='train_metro.glb',car=file==='train_ramp_or_car.glb',high=file==='obstacle_slide_barrier.glb';
  const markers:any[]=[],profiles:any[]=[];
  const mark=(name:string,hit:ReturnType<typeof rayY>[number]|undefined,confidence:string,method:string)=>{
    if(!hit)return null;const t=hit.triangle;const local=[0,1,2].map(i=>t.local.reduce((s,p,k)=>s+p[i]*hit.barycentric[k],0));
    const m={name,scene:hit.point.map(round),local:local.map(round),node:t.node,mesh:t.mesh,primitive:t.primitive,triangle:t.triangle,indices:t.indices,barycentric:hit.barycentric.map(round),confidence,method};markers.push(m);return m;
  };
  const sample=(name:string,x:number,z:number,which:'top'|'bottom'='top')=>{const hits=rayY(g.triangles,x,z);return mark(name,which==='top'?hits.at(-1):hits[0],'medium','Vertical line/actual triangle barycentric intersection; geometric hit, not certified walkable surface');};
  const axis=high?2:0;
  for(let i=1;i<20;i++){const p=g.bounds.min[axis]+g.bounds.size[axis]*i/20;const hits=rayY(g.triangles,axis===0?p:0,axis===2?p:0);profiles.push({axisPosition:p,hits:hits.map(h=>({y:h.point[1],node:h.triangle.node,primitive:h.triangle.primitive,triangle:h.triangle.triangle}))});}
  let fitSource:V[]=[],fitTarget:V[]=[],fitLabels:string[]=[],forward:any=null,clearance:any=null;
  const yaw=high?Math.PI/2:car||truck?-Math.PI/2:0;
  const rotation=trs([0,0,0],[0,Math.sin(yaw/2),0,Math.cos(yaw/2)]);
  if(truck){
    const low=sample('incline_sample_low',-.42,0),mid=sample('incline_sample_mid',-.25,0),top=sample('incline_sample_high',-.08,0);
    sample('incline_left_sample',-.25,-.09);sample('incline_right_sample',-.25,.09);
    const roofA=sample('roof_entry_sample',.08,0),roofB=sample('roof_exit_sample',.45,0);sample('roof_left_sample',.25,-.08);sample('roof_right_sample',.25,.08);
    if(low&&mid&&top&&low.scene[1]<mid.scene[1]&&mid.scene[1]<top.scene[1]){forward={sourceDirection:[1,0,0],yawRadians:yaw,confidence:'high',basis:'three upward triangle-ray hits rise monotonically along +X; -90deg RH Y maps +X to game+Z',heightSamples:[low.scene[1],mid.scene[1],top.scene[1]]};}
    // Correspondences are deliberately diagnostic patch samples, not asserted semantic endpoints.
    if(low&&top&&roofA&&roofB){fitSource=[low.scene,top.scene,roofA.scene,roofB.scene].map(p=>transform(rotation,p));fitTarget=[[0,0,-3],[0,3,3],[0,3,3],[0,3,15]];fitLabels=['incline interior low → provisional foot','incline interior high → provisional top','roof interior entry → provisional seam','roof interior exit → provisional exit'];}
  }else if(car){
    sample('roof_center_outer_hit',0,0);sample('roof_left_outer_hit',0,-.1);sample('roof_right_outer_hit',0,.1);sample('roof_front_outer_hit',-.4,0);sample('roof_back_outer_hit',.4,0);
    sample('wheel_underbody_left_hit',-.32,-.145,'bottom');sample('wheel_underbody_right_hit',.32,.145,'bottom');
  }else if(high){
    const beam=sample('center_beam_underside',0,0,'bottom');sample('center_beam_top',0,0);
    const left=sample('left_post_ground_hit',0,-.26,'bottom'),right=sample('right_post_ground_hit',0,.26,'bottom');
    sample('left_span_underside',0,-.15,'bottom');sample('right_span_underside',0,.15,'bottom');
    if(beam&&left&&right){const ground=(left.scene[1]+right.scene[1])/2;clearance={sourceCenter:beam.scene[1]-ground,sourceBeamBottom:beam.scene[1],sourceGround:ground,confidence:'medium',method:'Center ray first mesh hit minus two actual post underside hits; local center aperture only, not whole gate certificate'};fitSource=[left.scene,right.scene,beam.scene].map(p=>transform(rotation,p));fitTarget=[[-1.1,-1.2,0],[1.1,-1.2,0],[0,0,0]];fitLabels=['left ground→provisional left boundary','right ground→provisional right boundary','center beam underside→1.2m clearance'];}
  }else{
    sample('crossbar_low_underside',0,0,'bottom');sample('crossbar_top',0,0);sample('left_foot_hit',-.46,0,'bottom');sample('right_foot_hit',.46,0,'bottom');
  }
  // For objects lacking semantic correspondences, a width-only scale is explicitly a display probe.
  const displayScale=high?2.2/.52:car?12/g.bounds.size[0]:truck?18/g.bounds.size[0]:2.2/g.bounds.size[0];
  let sourceToAsset=multiply(trs([0,0,0],[0,0,0,1],[displayScale,displayScale,displayScale]),rotation),assetToLogic=identity(),logicToWorld=trs(truck?[0,0,70]:high?[0,1.2,115]:car?[0,0,0]:[0,0,70]);
  let fitting:any=null;
  if(fitSource.length){fitting=fitUniform(fitSource,fitTarget);fitting.labels=fitLabels;sourceToAsset=multiply(trs([0,0,0],[0,0,0,1],[fitting.scale,fitting.scale,fitting.scale]),rotation);assetToLogic=trs(fitting.translation);}
  else if(car){assetToLogic=trs([0,-g.bounds.min[1]*displayScale,0]);}
  const combined=multiply(logicToWorld,multiply(assetToLogic,sourceToAsset));
  const pairedNames=truck?['incline_sample_low','incline_sample_high','roof_entry_sample','roof_exit_sample']:high?['left_post_ground_hit','right_post_ground_hit','center_beam_underside']:[];
  let rigidDiagnostic:any=null;
  if(fitSource.length){
    const translation=[0,1,2].map(i=>fitTarget.reduce((a,p,k)=>a+p[i]-fitSource[k][i],0)/fitTarget.length);
    const residuals=fitSource.map((p,k)=>{const predicted=p.map((n,i)=>n+translation[i]);return {label:fitLabels[k],predictedLogic:predicted,targetLogic:fitTarget[k],distance:Math.hypot(...predicted.map((n,i)=>n-fitTarget[k][i]))};});
    rigidDiagnostic={rotation,translation,scale:1,residuals,rms:Math.sqrt(residuals.reduce((a,r)=>a+r.distance**2,0)/residuals.length),warning:'Fixed-axis rigid diagnostic on provisional interior correspondences, not certified endpoint fit'};
  }
  if(fitting)fitting.residuals=fitting.residuals.map((r:any,i:number)=>({...r,label:fitLabels[i],space:'logic',targetWorld:transform(logicToWorld,r.target),predictedWorld:transform(logicToWorld,r.predicted)}));
  const worldMarkers=markers.map(m=>({...m,targetWorld:pairedNames.includes(m.name)?transform(logicToWorld,fitTarget[pairedNames.indexOf(m.name)]):null,targetStatus:pairedNames.includes(m.name)?'PROVISIONAL interior-to-endpoint correspondence; not measured endpoint error':null,world:transform(combined,m.scene).map(round),worldBaseY5:transform(combined,m.scene).map((n,i)=>round(n+(i===1?5:0)))}));
  const c=car?'POINTS_REQUIRE_REVIEW':high?'NEEDS_DERIVED_REPAIR':truck?'NEEDS_DERIVED_REPAIR':'NEEDS_DERIVED_REPAIR';
  const target=truck?{ramp:{width:2.4,height:3,depth:6,origin:[0,0,70]},roof:{width:2.4,height:3,depth:12,origin:[0,0,79]}}:car?{width:2.4,height:3,depth:12,origin:[0,0,0]}:high?{width:2.2,height:1.8,depth:.5,origin:[0,1.2,115]}:{width:2.2,height:1,depth:.5,origin:[0,0,70]};
  const todo=truck?['Exact ramp foot/top and roof seam semantic boundary remain null: rounded transition; measured interior patches cannot certify endpoints.','Sampled incline interior lies above source ground; exact foot/undercarriage relationship remains unverified; no physics change.','Original DCC is confirmed unavailable; any future editable asset must be a provenance-labelled reconstructed derivative. No repair in this probe.']:car?['Long axis X confirmed; semantic front/back is unresolved by the automatic geometry detector; the rendered cab needs an explicit signed source marker. Both ±90deg remain candidates; displayed -90deg is arbitrary, not forward approval.','Wheel/rail contact line and certified traversable roof boundary remain null; ray hits include roof attachments.']:high?['Center underside measured but full width/depth clearance needs continuous aperture analysis; side posts must not become new gameplay obstacles.','Yaw +90deg maps source Z span to game X; face/sign not semantically approved.']:['Low hurdle contains multiple horizontal bars; effective blocking shape differs from solid logic envelope.','Foot/rod primitive grouping and usable low-obstacle outline require review; do not shrink logic or jump height.'];
  return {file,sha256,sourceCommit:manifest.assets.find((a:any)=>a.file_name===file).source_commit,sceneBounds:g.bounds,triangles:g.triangles.length,nodes:g.nodes,sourceUnits:'normalized; physical metres unknown',sourceForward:forward,yawAlternatives:car?[-Math.PI/2,Math.PI/2]:high?[-Math.PI/2,Math.PI/2]:[yaw],markers:worldMarkers,profiles,semanticEndpoints:{groundContactLine:null,rampFoot:null,rampTop:null,roofEntry:null,roofExit:null,fullWidthClearance:null},clearance,candidate:{rigidDiagnostic,provisionalCorrespondencesOnly:true,warning: fitSource.length ? 'Residuals of assumed correspondences do not prove every rigid/uniform endpoint fit impossible' : 'Display probe only; no semantic fitting',sourceToAsset,assetToLogic,logicToWorld,combined,scale:fitting?.scale??displayScale,yawRadians:yaw,kind:fitting?'uniform diagnostic patch correspondence fit':'uniform display probe; bounds used only for framing/scale, not support surfaces',residuals:fitting?.residuals??null,labels:fitLabels,rms:fitting?.rms??null,accepted:false,appliedCount:1,proxyTransformCount:0},target,classification:c,classificationIsProvisional:true,classificationBasis:truck?'Diagnostic patch-to-logical correspondence uniform residual is large; exact semantic endpoints still unverified':high?'Ground-post plus center aperture simultaneous uniform fit cannot satisfy target without residual':car?'Forward/contact/roof semantics unresolved; source proportions also differ substantially':'Uniform width fit yields height incompatible with current low barrier, evidence is geometry envelope only, not collider',outerEnvelopeDiagnostic:{warning:'AABB only diagnoses proportions; never support/collision dimensions',uniformScale:displayScale,scaledSize:g.bounds.size.map(v=>v*displayScale)},visualRoot:truck?visualRoots()[0]:{prefab:file,loadCount:1,children:[]},todo};
});
const report={schemaVersion:'pao16-spike-v1',status:'TECHNICAL_SPIKE_ONLY_NOT_RUNTIME_CONFIG',sourceReviewCommit:'7a2fb2963deae061d15deae4019910a15f0dfbcf',baseline:'dd82d2232614c0ad4bdcfbb2222dd3e3fe84549e',transformConvention:'column-major column-vector pW=logicToWorld*assetToLogic*sourceToAsset*pScene; scene includes node TRS once',loader:{scene:'right-handed',glTFHandednessConversion:'identity in independent RH preview; loader roots observed separately by preview E2E',gameLeftHandedBoundary:'not applied; no game integration'},logical:{base0:logicalMarkers(),base5:logicalMarkers(5),surfaceEpsilonUnchanged:1e-6},assets};
fs.mkdirSync('docs/assets',{recursive:true});fs.writeFileSync('docs/assets/pao16-calibration-spike.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/art/pao16-calibration-todo.md','# PAO-16 技术标定 Spike TODO\n\n此批只诊断，不是正式资产或PAO-17放行。source→asset→logic→world矩阵见诊断JSON；完整源节点TRS保留，未知端点不由AABB补齐。\n\n'+assets.map(a=>`## ${a.file} — ${a.classification}\n\n${a.todo.map(t=>'- [ ] '+t).join('\n')}\n`).join('\n')+'\n- [ ] 原始DCC已确认不存在；未来另建标明来源的重建派生工程，许可适用项另审。正式修整/烘焙/LOD/贴图分档仍待批准。\n- [ ] 具体美术与真机预算未签收，不因技术预览通过而冻结。\n- [ ] 本批未接游戏；后续接入仍须审查生产元数据、唯一组合根、回退与真实脚底连续性。\n');
console.log(assets.map(a=>({file:a.file,classification:a.classification,rms:a.candidate.rms,clearance:a.clearance?.sourceCenter??null})));
