import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight,
  Color3, Color4, MeshBuilder, StandardMaterial, SceneLoader, AssetContainer, Mesh } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

type Pose = { name: string; frame: number };
const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.useRightHandedSystem = true; // Native glTF basis; no extra runtime handedness wrapper.
scene.clearColor = new Color4(.86, .91, .94, 1);
const camera = new ArcRotateCamera('camera', Math.PI / 2 + .2, 1.35, 3.65, new Vector3(0, .91, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 2.7; camera.upperRadiusLimit = 6;
const hemi = new HemisphericLight('sky', new Vector3(0, 1, 0), scene); hemi.intensity = 1.1;
const sun = new DirectionalLight('sun', new Vector3(-1, -2, -2), scene); sun.intensity = 1.5;
const ground = MeshBuilder.CreateGround('ground', { width: 5, height: 5 }, scene);
const mat = new StandardMaterial('ground', scene); mat.diffuseColor = new Color3(.74, .81, .82); mat.specularColor = Color3.Black(); ground.material = mat;
const lines: Vector3[][] = [];
for (let i = -8; i <= 8; i++) {
  lines.push([new Vector3(i / 4, .002, -2), new Vector3(i / 4, .002, 2)]);
  lines.push([new Vector3(-2, .002, i / 4), new Vector3(2, .002, i / 4)]);
}
const grid = MeshBuilder.CreateLineSystem('quarter-meter-grid', { lines }, scene); grid.color = new Color3(.5, .6, .62);
for (const [axis, color] of [[new Vector3(.7, 0, 0), Color3.Red()], [new Vector3(0, .7, 0), Color3.Green()], [new Vector3(0, 0, .7), Color3.Blue()]] as const) {
  const line = MeshBuilder.CreateLines('axis', { points: [new Vector3(0, .008, 0), axis.add(new Vector3(0, .008, 0))] }, scene); line.color = color;
}
let assets: AssetContainer | undefined;
let meshes: Mesh[] = [];
let rest = new Map<string, number[]>();
let poses: Pose[] = [];
const state = document.querySelector<HTMLElement>('#state')!;
const select = document.querySelector<HTMLSelectElement>('#pose')!;
const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const group = () => assets!.animationGroups[0];
const fps = () => group().targetedAnimations[0].animation.framePerSecond;

function info() {
  return { skeletons: scene.skeletons.length, jointCount: assets?.skeletons[0]?.bones.length ?? 0,
    groups: assets?.animationGroups.map(g => g.name) ?? [], skinnedMeshes: meshes.length,
    materials: assets?.materials.map(m => m.name) ?? [], frame: assets ? group().animatables[0]?.masterFrame ?? 0 : 0,
    from: assets ? group().from : 0, to: assets ? group().to : 0, fps: assets ? fps() : 0, handedness: 'RH native glTF, Y up, +Z front' };
}
function pose(name: string) {
  const p = poses.find(p => p.name === name);
  if (!p || !assets) throw Error(`Unknown pose or released asset: ${name}`);
  group().start(false, 1, group().from, group().to); group().pause();
  group().goToFrame(p.frame / 30 * fps());
  scene.render();
  const parts = meshes.map(m => {
    const data = m.getPositionData(true)!;
    const initial = rest.get(m.name)!;
    let maxDisplacementM = 0, movedVertices = 0;
    for (let i = 0; i < data.length; i += 3) {
      const d = Math.hypot(data[i] - initial[i], data[i + 1] - initial[i + 1], data[i + 2] - initial[i + 2]);
      if (d > 1e-4) movedVertices++;
      maxDisplacementM = Math.max(maxDisplacementM, d);
    }
    return { name: m.name, maxDisplacementM, movedVertices };
  });
  const root = assets.transformNodes.find(n => n.name === 'root_motionless')!;
  const result = { name, dccFrame: p.frame, maxDisplacementM: Math.max(...parts.map(p => p.maxDisplacementM)),
    rootPosition: root.position.asArray(), parts };
  state.textContent = `${name} · ${(p.frame / 30).toFixed(2)}s\n23 关节 / 34 蒙皮网格\n顶点最大变化 ${result.maxDisplacementM.toFixed(3)}m`;
  select.value = name;
  return result;
}
function dispose() {
  assets?.animationGroups.forEach(g => g.stop());
  assets?.dispose(); assets = undefined; meshes = []; rest.clear();
  select.disabled = true; playButton.disabled = true;
  state.textContent = '试样已释放';
  return { skeletons: scene.skeletons.length, skinnedMeshes: scene.meshes.filter(m => m.skeleton).length };
}
async function load() {
  if (assets) dispose();
  select.disabled = true; playButton.disabled = true;
  const report = await (await fetch('/docs/evidence/PAO-15/rig-spike/dcc-report.json')).json();
  poses = report.poses;
  assets = await SceneLoader.LoadAssetContainerAsync('/docs/evidence/PAO-15/rig-spike/', 'runner-rig-spike.glb', scene);
  assets.addAllToScene();
  meshes = assets.meshes.filter((m): m is Mesh => m instanceof Mesh && !!m.skeleton);
  await scene.whenReadyAsync();
  group().start(false); group().pause(); group().goToFrame(0); scene.render();
  rest = new Map(meshes.map(m => [m.name, Array.from(m.getPositionData(true)!)]));
  select.replaceChildren(...poses.map(p => { const o = document.createElement('option'); o.value = p.name; o.textContent = `${p.name} · f${p.frame}`; return o; }));
  pose('rest');
  select.disabled = false; playButton.disabled = false;
  return info();
}
function play() { if (!assets) return; group().stop(); group().start(false, 1, group().from, group().to); state.textContent = '播放诊断序列 · 5 秒\n非正式跑 / 跳 / 滑动作'; }
function view(name: string) { camera.alpha = name === 'side' ? .05 : Math.PI / 2 + .2; camera.beta = 1.35; camera.radius = 3.65; scene.render(); }
const probe = { ready: false, info, pose, play, view, dispose, load };
(window as unknown as { __RIG_PROBE__: typeof probe }).__RIG_PROBE__ = probe;
select.onchange = () => pose(select.value);
document.querySelector<HTMLButtonElement>('#play')!.onclick = play;
document.querySelector<HTMLButtonElement>('#front')!.onclick = () => view('front');
document.querySelector<HTMLButtonElement>('#side')!.onclick = () => view('side');
document.querySelector<HTMLButtonElement>('#dispose')!.onclick = dispose;
document.querySelector<HTMLButtonElement>('#reload')!.onclick = () => { void load(); };
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
load().then(() => { probe.ready = true; }).catch(error => { state.textContent = `导入失败：${error.message}`; throw error; });
