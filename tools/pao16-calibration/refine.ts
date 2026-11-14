/** New refinement output only; never invokes measure.ts or overwrites first-batch evidence. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseGlb,transform,logicalMarkers} from './core.ts';
import {buildRayIndex,indexHits,evidence,normal,sampleGrid,regions,sliceY,transitionBands} from './refinement-core.ts';
const root='D:/worker/paoku-sessions/glb-review';
const manifest=JSON.parse(fs.readFileSync(root+'/docs/assets/glb-manifest.json','utf8'));
const prior=JSON.parse(fs.readFileSync('docs/assets/pao16-calibration-spike.json','utf8'));
const hash=(b:any)=>crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync('.pao16-local/refinement',{recursive:true});
const assets=prior.assets.map((old:any)=>{
 const file=old.file,bytes=fs.readFileSync(root+'/public/models/'+file),sha256=hash(bytes);
 if(sha256!==old.sha256||sha256!==manifest.assets.find((a:any)=>a.file_name===file).sha256)throw Error('Input hash mismatch '+file);
 fs.mkdirSync('.pao16-local/inputs',{recursive:true});fs.writeFileSync('.pao16-local/inputs/'+file,bytes);
 const g=parseGlb(bytes),idx=buildRayIndex(g.triangles),truck=file==='train_metro.glb',car=file==='train_ramp_or_car.glb',high=file==='obstacle_slide_barrier.glb';
 const domain=[idx.min[0],idx.max[0],idx.min[1],idx.max[1]];
 const grid=sampleGrid(idx,domain,high?17:65,high?97:33);
 const threshold=g.bounds.min[1]+g.bounds.size[1]*.65;
 const mask=grid.cells.map(c=>!!c.top&&c.top.point[1]>=threshold&&Math.abs(c.top.normal[1])>=Math.cos(Math.PI/18));
 const groups=regions(mask,grid.nx,grid.nz);
 const regionList=groups.slice(0,8).map((indices,i)=>{
  const set=new Set(indices);const boundary=indices.filter(p=>{const x=p%grid.nx,z=Math.floor(p/grid.nx);return x===0||z===0||x===grid.nx-1||z===grid.nz-1||[p-1,p+1,p-grid.nx,p+grid.nx].some(q=>!set.has(q));});
  const stride=Math.max(1,Math.ceil(boundary.length/80));
  return {id:i,sampleCount:indices.length,boundaryCount:boundary.length,boundaryStride:stride,
   boundaryCandidates:boundary.filter((_,k)=>k%stride===0).map(p=>({gridIndex:p,...grid.cells[p].top!})),
   accepted:false,meaning:'Connected top-ray samples with normal <=10deg and height filter; not a continuous/traversable support polygon'};
 });
 const lows=grid.cells.flatMap((c,i)=>c.bottom&&c.bottom.point[1]<=g.bounds.min[1]+g.bounds.size[1]*.02?[i]:[]);
 const lowGroups=regions(grid.cells.map((_,i)=>lows.includes(i)),grid.nx,grid.nz);
 const contactCandidates=lowGroups.slice(0,12).map(group=>({sampleCount:group.length,points:group.filter((_,i)=>i%Math.max(1,Math.ceil(group.length/12))===0).map(i=>({gridIndex:i,...grid.cells[i].bottom!})),confidence:'low: lowest visible geometry only; wheel identification and rail plane not established'}));
 const sectionHeights=(high?[.01,.2,.5,.511,.7,.95]:[.01,.2,.5,.65,.73]).filter(y=>y<g.bounds.max[1]);
 const sections=sectionHeights.map(y=>{const segments=sliceY(g.triangles,y);return {height:y,segmentCount:segments.length,coplanarFaces:'omitted; no area/solid inference',segments:segments.filter((_,i)=>i%Math.max(1,Math.ceil(segments.length/120))===0),segmentStride:Math.max(1,Math.ceil(segments.length/120))};});
 let incline:any=null;
 if(truck){
  const profiles=[-.12,-.06,0,.06,.12].map(z=>{
   const points=Array.from({length:101},(_,i)=>{const x=idx.min[0]+(idx.max[0]-idx.min[0])*i/100;const hits=indexHits(idx,x,z);const h=hits.at(-1);if(!h)return {x,z,hit:null,kind:'missing'};
    const ev=evidence(h),slope=Math.abs(ev.normal[1])>1e-8?-ev.normal[0]/ev.normal[1]:null;
    const kind=slope!==null&&slope>.25&&slope<1?'incline':slope!==null&&Math.abs(slope)<.08?'flat':'other';return {x,z,hit:ev,slope,kind};});
   const runs:{kind:string;start:number;end:number}[]=[];points.forEach((p,i)=>{const last=runs.at(-1);if(last?.kind===p.kind)last.end=i;else runs.push({kind:p.kind,start:i,end:i});});
   const transitions=runs.slice(1).map((r,i)=>({from:runs[i].kind,to:r.kind,xBracket:[points[r.start-1].x,points[r.start].x],points:[points[r.start-1].hit,points[r.start].hit],semanticEndpoint:null}));
   return {z,bands:transitionBands(points),dx:(idx.max[0]-idx.min[0])/100,runs,transitions,points};
  });
  const sideSamples=Array.from({length:grid.nx},(_,x)=>{const cells=grid.cells.filter((c,i)=>i%grid.nx===x&&c.top&&Math.abs(c.top.normal[1])>1e-8&&-c.top.normal[0]/c.top.normal[1]>.25&&-c.top.normal[0]/c.top.normal[1]<1);return {x:grid.cells[x].x,left:cells[0]?.top??null,right:cells.at(-1)?.top??null};}).filter(c=>c.left);
  incline={profiles,sideSamples,sideBoundaryCertificate:null,sideSamplingSpacing:grid.spacing,footCandidates:profiles.map(p=>({z:p.z,xBracket:p.bands.footBracket})),roofJoinCandidates:profiles.map(p=>({z:p.z,xBracket:p.bands.roofJoinBracket})),warning:'Normal bands and top-surface changes can represent trim/rounded transitions, not certified semantic endpoints; fixed one-pass thresholds, no parameter search'};
 }
 let clearance:any=null;
 if(high){
  const coarse=sampleGrid(idx,domain,9,49);const inverseThreshold=(1.2-old.candidate.combined[13])/old.candidate.scale;
  const pass=(c:any)=>!!c.bottom&&c.bottom.point[1]>=inverseThreshold;
  const free=grid.cells.map(pass),coarseFree=coarse.cells.filter(pass).length;
  const count=free.filter(Boolean).length;
  clearance={domain,axisMeaning:'X=source depth, Z=source gate width; complete projected source envelope scanned, not all interior points',sourceBasePlane:0,sourceBasePlaneVerified:false,
   inheritedProbeTargetBeamY:1.2,sourceRequiredHeightUnderInheritedMatrix:inverseThreshold,
   coarse:{nx:9,nz:49,spacing:coarse.spacing,freeSamples:coarseFree,missing:coarse.cells.filter(c=>!c.bottom).length},
   fine:{nx:grid.nx,nz:grid.nz,spacing:grid.spacing,freeSamples:count,missing:grid.cells.filter(c=>!c.bottom).length},
   sharedNodeDisagreement:coarse.cells.filter((c,i)=>pass(c)!==free[Math.floor(i/9)*2*grid.nx+(i%9)*2]).length,
   passMask:free,components:regions(free,grid.nx,grid.nz).map(a=>({sampleCount:a.length,indices:a})),
   lowestMeshHits:grid.cells.map(c=>c.bottom?.point[1]??null),continuousCertificate:false,fullWidthFullDepthPass:null,
   samplingError:{coordinateTolerance:1e-8,halfCell:[grid.spacing[0]/2,grid.spacing[1]/2],unseenFeaturesBound:null,explanation:'Two finite nested grids cover stated rectangular domain at nodes only; no Lipschitz/min-feature bound, therefore no continuous free-space proof. Coarse/fine shared nodes only verify consistency, not convergence.'}};
 }
 const ends=car?[-1,1].map(sign=>{
  const x=sign<0?idx.min[0]+.03:idx.max[0]-.03;
  const patches=g.triangles.filter(t=>{try{const n=normal(t),cx=t.points.reduce((s,p)=>s+p[0],0)/3;return Math.abs(n[0])>.7&&sign*cx>.35;}catch{return false;}});
  return {sourceSide:sign<0?'-X':'+X',sectionX:x,faceNormalThreshold:.7,faceCount:patches.length,representativeFaces:patches.filter((_,i)=>i%Math.max(1,Math.ceil(patches.length/16))===0).map(t=>({node:t.node,mesh:t.mesh,primitive:t.primitive,triangle:t.triangle,points:t.points,normal:normal(t)})),frontProbability:null,reason:'Geometric end-facing patches do not identify headlights/cab semantics; inspect labelled +/-X real preview, no texture atlas scan'};
 }):null;
 const rawPath='.pao16-local/refinement/'+file+'.samples.json';fs.writeFileSync(rawPath,JSON.stringify({grid,coarseDomain:domain})+'\n');
 return {file,sha256,sourceReviewCommit:'7a2fb29',sourceNodeTransforms:g.nodes,sourceUnits:'normalized, not metres',scanDomain:domain,domainIsNotSupportBoundary:true,
  roofCandidateRegions:regionList,roofSampling:{nx:grid.nx,nz:grid.nz,spacing:grid.spacing,heightFilter:threshold,normalThresholdDegrees:10,acceptedSamples:mask.filter(Boolean).length,componentCount:groups.length,mask,topHeights:grid.cells.map(c=>c.top?.point[1]??null),continuousCertificate:false,walkableBoundary:null},
  contactCandidates,railContactLine:null,endFeatures:ends,semanticForward:null,incline,clearance,structuralSections:sections,
  inheritedDisplayCandidate:old.candidate,logicalTarget:old.target,nonzeroYCheck:{base0:logicalMarkers(),base5:logicalMarkers(5),rule:'only world translation Y+5; source/asset/logical geometry unchanged'},
  priorInvestigationPriority:old.classification,classification:'POINTS_REQUIRE_REVIEW',classificationReason:'New sampled geometry narrows candidate regions, but semantic endpoints/clearance/forward still not certified. Previous repair label was investigation priority, not necessity proof.',
  semanticEndpoints:{rampFoot:null,rampTop:null,roofJoin:null,walkableRoofBoundary:null,fullClearance:null},productionAccepted:false,
  rawEvidence:{path:rawPath,sha256:hash(fs.readFileSync(rawPath)),purpose:'complete sample refs/local/barycentric/normal kept ignored; committed region/transition references independently reproducible'}};
});
const report={schema:'pao16-refinement-v1',baseline:'3de6e543ff5b5d29a2c624c8d482e5acb8865444',status:'LOCAL_AUTOMATIC_REFINEMENT_ONLY',parameterSearch:false,
 sourceTransform:'Full authored scene node TRS once; inherited RH diagnostic matrices only, no game integration or LH production approval',
 sourceCorrection:'Author confirmed original DCC does not exist; future editable files must be provenance-labelled reconstructed derivatives; none created this round. Prior spike evidence preserved.',assets};
fs.writeFileSync('docs/assets/pao16-calibration-refinement.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/art/pao16-calibration-todo.md','# PAO-16 自动细化后 TODO\n\n2026-11-02：原作者已确认原始DCC不存在。未来建立标明现有GLB来源的重建派生工程，不再索取不存在的原始源；本轮无修整、建模、烘焙、LOD或云上传。首批证据旧文字不改写。\n\n'+assets.map((a:any)=>`## ${a.file} — ${a.classification}\n\n- [ ] 复核新法向/剖面/连通采样候选；不把边界采样当端点或连续空间证书。\n- [ ] ${a.endFeatures?'车头正负仍缺自动语义特征；查看带源轴标记的双端预览。':'源部件语义及两侧/全深范围仍须复核。'}\n- [ ] 接地/轮轨线、可走车顶、正式代理与生产LH边界未获接入验收。\n`).join('\n')+'\n具体美术/许可适用项/真机预算另审；不修改M1尺寸/容差，不标Done，不解锁下游。\n');
console.log(assets.map((a:any)=>({file:a.file,roofRegions:a.roofSampling.componentCount,contactGroups:a.contactCandidates.length,clearance:a.clearance?.fine,classification:a.classification})));
