import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, Color3, Color4, MeshBuilder, Matrix, TransformNode, VertexBuffer, SceneLoader, Viewport } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

const files = ['train_metro.glb', 'train_ramp_or_car.glb', 'obstacle_hurdle_barrier.glb', 'obstacle_slide_barrier.glb'];
const file = new URLSearchParams(location.search).get('asset') || files[0];
if (!files.includes(file)) throw new Error('Input outside four-asset allowlist');
const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.useRightHandedSystem = true; // loader performs no LH handedness conversion; nodes retain authored TRS once.
scene.clearColor = new Color4(.12, .16, .20, 1);
new HemisphericLight('sky', new Vector3(0, 1, 0), scene).intensity = 1.5;
const sun = new DirectionalLight('sun', new Vector3(-1, -2, 1), scene); sun.intensity = 2;
const camera = new ArcRotateCamera('camera', -Math.PI / 3, Math.PI / 2.8, 22, Vector3.Zero(), scene);
camera.attachControl(canvas, true); camera.minZ = .01; camera.wheelPrecision = 10;

const report = await (await fetch('/docs/assets/pao16-calibration-refinement.json')).json();
const refinement = report.assets.find((a: any) => a.file === file);
const asset = refinement ? {...refinement,candidate:refinement.inheritedDisplayCandidate,markers:[]} : null;
if (!asset) throw new Error('Missing measured asset diagnostic');
const loaded = await SceneLoader.ImportMeshAsync('', '/inputs/', file, scene);
const sourceMeshes = loaded.meshes.filter(m => m.getTotalVertices() > 0);
for (const m of loaded.meshes) m.computeWorldMatrix(true);
// Verify actual loader world positions against independent Node parser full scene positions.
const { parseGlb } = await import('./core.ts');
const raw = new Uint8Array(await (await fetch('/inputs/' + file)).arrayBuffer());
const offline: any = parseGlb(raw);
const root = new TransformNode('one-visual-root', scene);
let loaderMaxError = 0;
// Geometry identity is evaluated before any candidate transform. Quantised set comparison avoids loader mesh ordering assumptions.
const key = (p: number[]) => p.map(v => Math.floor(v / .00001)).join(',');
const offlinePoints: number[][] = offline.vertices;
const buckets = new Map<string, number[][]>();
for (const p of offlinePoints) { const k = key(p); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k)!.push(p); }
let compared = 0;
const loaderSamples: { mesh: typeof sourceMeshes[number]; local: Vector3; source: Vector3 }[] = [];
for (const m of sourceMeshes) {
  const positions = m.getVerticesData(VertexBuffer.PositionKind)!;
  const wm = m.getWorldMatrix();
  const localSample = Vector3.FromArray(positions, 0);
  loaderSamples.push({mesh:m,local:localSample,source:Vector3.TransformCoordinates(localSample,wm)});
  for (let i = 0; i < positions.length; i += 3) {
    const v = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), wm);
    const cell = v.asArray().map(n => Math.floor(n / .00001));
    let nearest = Infinity;
    for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) for (let dz=-1;dz<=1;dz++) {
      const candidates = buckets.get([cell[0]+dx,cell[1]+dy,cell[2]+dz].join(',')) || [];
      for (const p of candidates) nearest = Math.min(nearest, Vector3.Distance(v, Vector3.FromArray(p)));
    }
    loaderMaxError = Math.max(loaderMaxError, nearest);
    compared++;
  }
}
if (!compared || !offlinePoints.length) throw new Error('No geometry identity samples');
const c = asset.candidate;
const matrix = Matrix.FromArray(c.sourceToAsset).multiply(Matrix.FromArray(c.assetToLogic)).multiply(Matrix.FromArray(c.logicToWorld));
root.setPreTransformMatrix(matrix);
for (const m of loaded.meshes.filter(m => !m.parent)) m.parent = root;
let candidateAppliedError = 0;
for (const sample of loaderSamples) {
  const actual = Vector3.TransformCoordinates(sample.local,sample.mesh.computeWorldMatrix(true));
  const expected = Vector3.TransformCoordinates(sample.source,Matrix.FromArray(c.combined));
  candidateAppliedError = Math.max(candidateAppliedError, Vector3.Distance(actual,expected));
}
let base5Error=0,restoreError=0;
root.setPreTransformMatrix(matrix.multiply(Matrix.Translation(0,5,0)));
for(const sample of loaderSamples){const actual=Vector3.TransformCoordinates(sample.local,sample.mesh.computeWorldMatrix(true));const expected=Vector3.TransformCoordinates(sample.source,Matrix.FromArray(c.combined)).add(new Vector3(0,5,0));base5Error=Math.max(base5Error,Vector3.Distance(actual,expected));}
root.setPreTransformMatrix(matrix);
for(const sample of loaderSamples){const actual=Vector3.TransformCoordinates(sample.local,sample.mesh.computeWorldMatrix(true));const expected=Vector3.TransformCoordinates(sample.source,Matrix.FromArray(c.combined));restoreError=Math.max(restoreError,Vector3.Distance(actual,expected));}
const logicalChildren = (file === 'train_metro.glb' ? ['RAMP', 'ROOF'] : ['TARGET']).map(kind => new TransformNode('logical-' + kind, scene));
const cyan = new Color3(.2, .95, 1), orange = new Color3(1, .55, .13);
function line(name: string, points: number[][], color = cyan) {
  const l = MeshBuilder.CreateLines(name, { points: points.map(p => Vector3.FromArray(p)) }, scene); l.color = color; return l;
}
function box(name: string, min: number[], max: number[]) {
  const [x,y,z] = min, [X,Y,Z] = max;
  const corners = [[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  edges.forEach((e,i) => line(name+i, [corners[e[0]],corners[e[1]]]));
}
if (file === 'train_metro.glb') {
  box('ramp-proxy',[-1.2,0,67],[1.2,3,73]); box('roof-proxy',[-1.2,0,73],[1.2,3,85]);
  line('logical-ramp-surface',[[-1.2,0,67],[-1.2,3,73],[1.2,3,73],[1.2,0,67],[-1.2,0,67]]);
  line('roof-surface',[[-1.2,3,73],[-1.2,3,85],[1.2,3,85],[1.2,3,73]]);
} else if (file === 'train_ramp_or_car.glb') box('carriage-target',[-1.2,0,-6],[1.2,3,6]);
else if (file === 'obstacle_slide_barrier.glb') box('high-beam-target',[-1.1,1.2,114.75],[1.1,3,115.25]);
else box('low-target',[-1.1,0,69.75],[1.1,1,70.25]);
const center = file === 'train_metro.glb' ? new Vector3(0,1.5,76) : new Vector3(0,1.5,file === 'obstacle_slide_barrier.glb' ? 115 : file === 'obstacle_hurdle_barrier.glb' ? 70 : 0);
camera.target = center; camera.radius = file.startsWith('train') ? 22 : 6;
if (file === 'obstacle_slide_barrier.glb') { camera.alpha = -Math.PI/2; camera.beta = Math.PI/2.1; }
if (file === 'train_metro.glb') { camera.alpha = -.28; camera.beta = Math.PI/2.6; }
document.querySelector('#status')!.textContent = `${file}\n${asset.classification}\nRH loader identity max error: ${loaderMaxError.toExponential(2)} source units\nRigid/uniform diagnostic only; game LH loader remains unverified.\nUnknown support / semantic front / clearance remains TODO.`;
let refinementOverlayCount=0;
const lineSets:{points:Vector3[][];color:Color3}[]=[];
for(const region of refinement.roofCandidateRegions){
 const ps=region.boundaryCandidates.map((m:any)=>Vector3.TransformCoordinates(Vector3.FromArray(m.point),matrix));
 lineSets.push({points:ps.map((p:Vector3)=>[p.add(new Vector3(-.025,0,0)),p.add(new Vector3(.025,0,0))]),color:new Color3(.2,1,.45)});
}
if(refinement.incline){
 for(const profile of refinement.incline.profiles){
  const ps=profile.points.filter((p:any)=>p.hit).map((p:any)=>Vector3.TransformCoordinates(Vector3.FromArray(p.hit.point),matrix));
  line('refined-profile-'+profile.z,ps.map((p:Vector3)=>p.asArray()),orange);refinementOverlayCount++;
 }
 for(const side of refinement.incline.sideSamples){
  const ps=[side.left,side.right].filter(Boolean).map((m:any)=>Vector3.TransformCoordinates(Vector3.FromArray(m.point),matrix));
  if(ps.length===2)line('sampled-lateral-span-'+side.x,ps.map((p:Vector3)=>p.asArray()),new Color3(1,.3,.5));
 }
}
for(const set of lineSets){if(!set.points.length)continue;const m=MeshBuilder.CreateLineSystem('roof-candidate-samples',{lines:set.points},scene);m.color=set.color;refinementOverlayCount++;}
if(file==='obstacle_hurdle_barrier.glb'){
 for(const section of refinement.structuralSections){
  const lines=section.segments.map((s:any)=>s.points.map((p:number[])=>Vector3.TransformCoordinates(Vector3.FromArray(p),matrix)));
  if(lines.length){const m=MeshBuilder.CreateLineSystem('actual-horizontal-sections',{lines},scene);m.color=orange;refinementOverlayCount++;}
 }
}
const panel=document.querySelector<HTMLCanvasElement>('#map')!;const ctx=panel.getContext('2d')!;
ctx.fillStyle='#172330';ctx.fillRect(0,0,panel.width,panel.height);ctx.font='13px system-ui';ctx.fillStyle='white';
if(refinement.clearance){
 const c=refinement.clearance;ctx.fillText('Inherited probe: X depth / Z width',10,18);
 const nx=c.fine.nx,nz=c.fine.nz;
 for(let i=0;i<c.passMask.length;i++){ctx.fillStyle=c.lowestMeshHits[i]===null?'#77818c':c.passMask[i]?'#46d890':'#ed6b68';ctx.fillRect(15+(i%nx)*18,30+Math.floor(i/nx)*1.5,16,1.5);}
 ctx.fillStyle='white';ctx.fillText('green pass / red blocked / grey unknown',10,197);ctx.fillText('No continuous clearance certificate',10,216);refinementOverlayCount++;
}else if(refinement.incline){
 ctx.fillText('Five actual top-ray sections (source X,Y)',10,18);
 for(const [j,p] of refinement.incline.profiles.entries()){ctx.strokeStyle=['#fff','#53daab','#f7b356','#e782d7','#62b7ff'][j];ctx.beginPath();let first=true;for(const v of p.points){if(!v.hit)continue;const x=20+(v.x+.5)*310,y=190-v.hit.point[1]*470;if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);}ctx.stroke();}
 ctx.fillText('Rounded transition = interval, not endpoint',10,216);
}else{ctx.fillText('Top candidate patches / contact samples',10,18);ctx.fillText('Semantics remain unverified',10,39);ctx.fillText('Labelled source -X and +X views below',10,60);}
if(file==='train_ramp_or_car.glb'){
 camera.alpha=-Math.PI/3;camera.beta=Math.PI/2.7;camera.radius=19;camera.target=new Vector3(0,2.5,0);camera.viewport=new Viewport(0,0,.5,1);
 const opposite=new ArcRotateCamera('source-positive-X-end',Math.PI/3,Math.PI/2.7,19,camera.target.clone(),scene);opposite.minZ=.01;opposite.viewport=new Viewport(.5,0,.5,1);
 scene.activeCameras=[camera,opposite];document.querySelector('#ends')!.textContent='LEFT: source -X end  |  RIGHT: source +X end (RH, inherited yaw -90deg; no semantic forward approval)';
}
document.querySelector('#status')!.textContent=`${file}\nREFINEMENT: ${refinement.roofSampling.componentCount} top sample regions\nContact groups: ${refinement.contactCandidates.length}; exact semantics null\nRH loader error ${loaderMaxError.toExponential(2)}; one visual root\nGreen = sampled candidate, never continuous proof`;
engine.runRenderLoop(() => scene.render());
await new Promise(resolve => setTimeout(resolve, 600));
(window as any).__REFINEMENT__ = { ready:true,file,meshes:sourceMeshes.length,loaderMaxError,candidateAppliedError,base5Error,restoreError,rightHanded:scene.useRightHandedSystem,visualRootCount:scene.transformNodes.filter(n => n.name === 'one-visual-root').length,logicalChildCount:logicalChildren.filter(n => !n.isDisposed()).length,compared,refinementOverlayCount,cameraCount:scene.activeCameras?.length||1,continuousCertificate:false };
window.addEventListener('resize',()=>engine.resize());
