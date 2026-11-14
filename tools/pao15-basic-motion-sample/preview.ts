import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, Color3, Color4,
  MeshBuilder, StandardMaterial, SceneLoader, Mesh, VertexBuffer, AssetContainer, AnimationGroup, Quaternion } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { GLTFFileLoader, GLTFLoaderAnimationStartMode } from '@babylonjs/loaders/glTF/glTFFileLoader';
import { MarkerCursor } from './playback.mjs';
import { multiply } from '../pao15-rig-spike/validate.mjs';

const base = '/docs/evidence/PAO-15/basic-motion-sample/v1/';
const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine); scene.useRightHandedSystem = true; scene.clearColor = new Color4(.86,.91,.94,1);
const camera = new ArcRotateCamera('camera',Math.PI/2+.2,1.35,3.65,new Vector3(0,.86,0),scene);
camera.attachControl(canvas,true); camera.lowerRadiusLimit=2.6; camera.upperRadiusLimit=6;
new HemisphericLight('sky',new Vector3(0,1,0),scene).intensity=1.1;
new DirectionalLight('sun',new Vector3(-1,-2,-2),scene).intensity=1.5;
const ground=MeshBuilder.CreateGround('ground',{width:5,height:5},scene);
const material=new StandardMaterial('ground',scene); material.diffuseColor=new Color3(.74,.81,.82); material.specularColor=Color3.Black();ground.material=material;
const lines:Vector3[][]=[]; for(let i=-8;i<=8;i++){lines.push([new Vector3(i/4,.002,-2),new Vector3(i/4,.002,2)],[new Vector3(-2,.002,i/4),new Vector3(2,.002,i/4)]);}
MeshBuilder.CreateLineSystem('grid',{lines},scene).color=new Color3(.5,.6,.62);
for(const [axis,color] of [[new Vector3(.7,0,0),Color3.Red()],[new Vector3(0,.7,0),Color3.Green()],[new Vector3(0,0,.7),Color3.Blue()]] as const){MeshBuilder.CreateLines('axis',{points:[new Vector3(0,.008,0),axis.add(new Vector3(0,.008,0))]},scene).color=color;}

const select=document.querySelector<HTMLSelectElement>('#clip')!, slider=document.querySelector<HTMLInputElement>('#time')!, status=document.querySelector<HTMLElement>('#state')!;
const button=(id:string)=>document.querySelector<HTMLButtonElement>('#'+id)!;
let assets:AssetContainer|undefined, meshes:Mesh[]=[], current:AnimationGroup|undefined;
let manifest:any, dcc:any, structure:any, loopCount=0,lastFrame=0,playing=false;
let markerEvents:any[]=[];
let loading:Promise<unknown>|undefined;
let generation=0;
const cursor=new MarkerCursor();
let restNodes:{node:any;position:Vector3;rotation:Quaternion;scale:Vector3}[]=[];
let rawPositions=new Map<string,number[]>();
const fps=()=>current?.targetedAnimations[0].animation.framePerSecond??60;
const config=()=>manifest?.clips.find((c:any)=>c.name===current?.name);
const frame=()=>current?.animatables[0]?.masterFrame??lastFrame;
function controls(enabled:boolean){select.disabled=!enabled;slider.disabled=!enabled;for(const id of ['play','pause','resume','rest'])button(id).disabled=!enabled;}
function resources(){return {skeletons:scene.skeletons.length,groups:scene.animationGroups.length,skinnedMeshes:meshes.length,meshes:scene.meshes.length,geometries:scene.geometries.length,materials:scene.materials.length,textures:scene.textures.length,renderObservers:scene.onBeforeRenderObservable.observers.length};}
function info(){return {...resources(),clips:assets?.animationGroups.map(g=>({name:g.name,durationSec:(g.to-g.from)/g.targetedAnimations[0].animation.framePerSecond}))??[],clip:current?.name??null,frame:frame(),fps:fps(),loopCount,markerCount:markerEvents.length,playing,markers:markerEvents};}
function label(extra=''){const t=frame()/fps();const phase=config()?.phases.find((p:any)=>t*30>=p.frames[0]&&t*30<p.frames[1])?.name??(config()?.loop?'cycle':'hold_last');status.textContent=`${current?.name??'绑定姿态'}\n${t.toFixed(3)}s · 演示 ${phase}\n23关节 / 34网格 · 循环 ${loopCount}\n${extra||'技术样本；非自然动作签收'}`;slider.value=String(t);}
function restore(){playing=false;current=undefined;cursor.clear();assets?.animationGroups.forEach(g=>g.stop(true));for(const r of restNodes){r.node.position.copyFrom(r.position);r.node.rotationQuaternion=r.rotation.clone();r.node.scaling.copyFrom(r.scale);r.node.computeWorldMatrix(true);}scene.render();lastFrame=0;}
function selectClip(name:string){
  if(!assets)throw Error('sample released');restore();current=assets.animationGroups.find(g=>g.name===name);if(!current)throw Error('missing clip '+name);
  loopCount=0;lastFrame=0;markerEvents=[];cursor.select(name,config().durationSec,config().markers);
  current.start(config().loop,1,current.from,current.to);current.pause();current.goToFrame(0);cursor.pause();
  select.value=name;slider.max=String(config().durationSec);scene.render();label();
}
function measure(){
  let maxDisplacementM=0,minHeightM=Infinity;
  for(const m of meshes){const p=m.getPositionData(true)!,r=rawPositions.get(m.name)!;for(let i=0;i<p.length;i+=3){maxDisplacementM=Math.max(maxDisplacementM,Math.hypot(p[i]-r[i],p[i+1]-r[i+1],p[i+2]-r[i+2]));minHeightM=Math.min(minHeightM,p[i+1]);}}
  const root=assets?.transformNodes.find(n=>n.name==='root_motionless');return {maxDisplacementM,minHeightM,rootPosition:root?.getAbsolutePosition().asArray()??[0,0,0]};
}
function pause(){current?.pause();playing=false;cursor.pause();lastFrame=frame();label('暂停；不补跑墙钟');}
function resume(){if(!current)return;current.restart();playing=true;cursor.resume();}
function play(name=select.value,speed=1){selectClip(name);current!.speedRatio=speed;current!.restart();playing=true;cursor.resume();}
function seek(name:string,time:number){if(current?.name!==name)selectClip(name);pause();const t=Math.max(0,Math.min(config().durationSec,time));current!.goToFrame(t*fps());lastFrame=t*fps();cursor.seek(t,loopCount);scene.render();const result=measure();label(`局部顶点最大变化 ${result.maxDisplacementM.toFixed(3)}m`);return result;}
function rest(){restore();scene.render();label('归位至绑定姿态');return measure();}
function dispose(){generation++;restore();assets?.dispose();assets=undefined;meshes=[];restNodes=[];rawPositions.clear();markerEvents=[];controls(false);status.textContent='样本已释放';return resources();}
async function doLoad(){
  dispose();const epoch=generation;controls(false);
  [manifest,dcc,structure]=await Promise.all(['motion-manifest.json','dcc-report.json','structure.json'].map(async f=>(await fetch(base+f)).json()));
  // Capture genuine bind transforms, not a frame of the loader's default auto-playing first clip.
  SceneLoader.OnPluginActivatedObservable.addOnce(plugin=>{if(plugin.name==='gltf')(plugin as GLTFFileLoader).animationStartMode=GLTFLoaderAnimationStartMode.NONE;});
  const imported=await SceneLoader.LoadAssetContainerAsync(base,'runner-basic-motion-sample.glb',scene);
  if(epoch!==generation){imported.dispose();return resources();}
  assets=imported;assets.addAllToScene();await scene.whenReadyAsync();
  meshes=assets.meshes.filter((m):m is Mesh=>m instanceof Mesh&&!!m.skeleton);
  restNodes=assets.transformNodes.map(node=>({node,position:node.position.clone(),rotation:node.rotationQuaternion?.clone()??Quaternion.Identity(),scale:node.scaling.clone()}));
  rawPositions=new Map(meshes.map(m=>[m.name,Array.from(m.getVerticesData(VertexBuffer.PositionKind)!)]));
  for(const g of assets.animationGroups){g.onAnimationGroupLoopObservable.add(()=>{if(current===g)loopCount++;});g.onAnimationGroupEndObservable.add(()=>{if(current===g){lastFrame=g.to;markerEvents.push(...cursor.advance(config().durationSec,loopCount));playing=false;cursor.pause();label('hold_last；无模拟回写');}});}
  select.replaceChildren(...manifest.clips.map((c:any)=>{const o=document.createElement('option');o.value=c.name;o.textContent=`${c.name} · ${c.durationSec}s`;return o;}));
  controls(true);selectClip('tech_idle_v1');return info();
}
function load(){if(!loading)loading=doLoad().finally(()=>{loading=undefined;});return loading;}
function compareAll(){
  const results:any[]=[];
  for(const ref of dcc.samples){seek(ref.clip,ref.timeSec);let maxVertexErrorM=0,maxBoneMatrixError=0;
    for(const p of ref.parts){const m=meshes.find(m=>m.name+'#0'===p.name)!;const positions=m.getPositionData(true)!;const raw=rawPositions.get(m.name)!;
      p.samples.forEach((s:any,i:number)=>{const map=structure.vertexMap[p.name][i];const index=map.exportVertex*3;if(Math.hypot(raw[index]-s.rest[0],raw[index+1]-s.rest[1],raw[index+2]-s.rest[2])>1e-5)throw Error('HTTP geometry/index mapping mismatch');maxVertexErrorM=Math.max(maxVertexErrorM,Math.hypot(positions[index]-s.posed[0],positions[index+1]-s.posed[1],positions[index+2]-s.posed[2]));});
    }
    for(const joint of structure.jointFrames){const node=assets!.transformNodes.find(n=>n.name===joint.name)!;const matrix=multiply(Array.from(node.computeWorldMatrix(true).asArray()),joint.inverseBind);const expected=ref.boneDeformationMatrices[joint.name];maxBoneMatrixError=Math.max(maxBoneMatrixError,...matrix.map((v:number,i:number)=>Math.abs(v-expected[i])));}
    results.push({clip:ref.clip,frame:ref.frame,maxVertexErrorM,maxBoneMatrixError});
  }
  return {samples:results,maxVertexErrorM:Math.max(...results.map(r=>r.maxVertexErrorM)),maxBoneMatrixError:Math.max(...results.map(r=>r.maxBoneMatrixError))};
}
const nextFrame=()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
async function warmCycles(){const switches:any[]=[],loaded:any[]=[],released:any[]=[];for(let i=0;i<20;i++){const name=manifest.clips[i%4].name;play(name);await nextFrame();pause();seek(name,0);play(name);await nextFrame();switches.push(resources());}for(let i=0;i<10;i++){released.push(dispose());await load();await nextFrame();loaded.push(resources());}return {switches,loaded,released};}
function view(name:string){camera.alpha=name==='side'?.05:Math.PI/2+.2;scene.render();}
scene.onBeforeRenderObservable.add(()=>{if(current&&playing){lastFrame=frame();markerEvents.push(...cursor.advance(lastFrame/fps(),loopCount));label();}});
select.onchange=()=>seek(select.value,0);slider.oninput=()=>seek(select.value,Number(slider.value));button('play').onclick=()=>play();button('pause').onclick=pause;button('resume').onclick=resume;button('rest').onclick=rest;button('dispose').onclick=dispose;button('reload').onclick=()=>{void load();};button('front').onclick=()=>view('front');button('side').onclick=()=>view('side');
const probe={ready:false,info,resources,seek,play,pause,resume,rest,dispose,load,compareAll,warmCycles,view};(window as any).__BASIC_MOTION__=probe;
engine.runRenderLoop(()=>scene.render());window.addEventListener('resize',()=>engine.resize());load().then(()=>{probe.ready=true;}).catch(e=>{status.textContent='导入失败：'+e.message;throw e;});
