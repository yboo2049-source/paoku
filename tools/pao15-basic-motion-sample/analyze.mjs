import fs from 'node:fs';
import crypto from 'node:crypto';
import { parseGlb, multiply } from '../pao15-rig-spike/validate.mjs';
import { inspectMotion, evaluatedParts, sampleAnimation, assertSourceHash } from './validate.mjs';

const dir = 'docs/evidence/PAO-15/basic-motion-sample/v1';
const file = process.argv[2] ?? `${dir}/runner-basic-motion-sample.glb`;
const doc = parseGlb(fs.readFileSync(file));
const sourceBytes = fs.readFileSync('docs/evidence/PAO-15/rig-spike/runner-rig-spike.glb');
assertSourceHash(crypto.createHash('sha256').update(sourceBytes).digest('hex'), 'cb84cfb9a308c54245ac49627383aa6643c8d40efc9c2a6929334dc60c7348f5');
const source = parseGlb(sourceBytes);
const inspected = inspectMotion(doc, source);
const dcc = JSON.parse(fs.readFileSync(`${dir}/dcc-report.json`, 'utf8'));
const vertexMap = {};
for (const part of dcc.samples[0].parts) {
  const p = inspected.rig.primitives.find(p => p.name === part.name);
  if (!p) throw Error(`Missing primitive ${part.name}`);
  vertexMap[part.name] = part.samples.map(sample => {
    let vertex = -1, minError = Infinity;
    p.positions.forEach((position, i) => {
      const distance = Math.hypot(...position.map((v, k) => v - sample.rest[k]));
      if (distance < minError) { minError = distance; vertex = i; }
    });
    if (minError > 1e-5) throw Error('No matching exported rest vertex');
    return { sourceVertex: sample.sourceVertex, exportVertex: vertex, restErrorM: minError };
  });
}
const samples = dcc.samples.map(reference => {
  const animation = doc.json.animations.find(a => a.name === reference.clip);
  const parts = evaluatedParts(doc, inspected, animation, reference.timeSec);
  const { world } = sampleAnimation(doc, animation, reference.timeSec);
  let maxVertexErrorM = 0, maxBoneMatrixError = 0;
  for (const [name, expected] of Object.entries(reference.boneDeformationMatrices)) {
    const joint = inspected.rig.joints.find(j => j.name === name);
    const deformation = multiply(world[joint.node], joint.inverseBind);
    maxBoneMatrixError = Math.max(maxBoneMatrixError, ...expected.map((v, k) => Math.abs(v - deformation[k])));
  }
  for (const ref of reference.parts) {
    const part = parts.find(p => p.name === ref.name);
    for (const [i, sample] of ref.samples.entries()) {
      const actual = part.positions[vertexMap[ref.name][i].exportVertex];
      maxVertexErrorM = Math.max(maxVertexErrorM, Math.hypot(...actual.map((v, k) => v - sample.posed[k])));
    }
  }
  if (maxVertexErrorM > 1e-4 || maxBoneMatrixError > 1e-4) throw Error(`DCC/CPU discrepancy ${reference.clip}@${reference.frame}: ${maxVertexErrorM}/${maxBoneMatrixError}`);
  const maxDisplacementM = Math.max(...reference.parts.map(p => p.maxDisplacementM));
  return { clip: reference.clip, frame: reference.frame, timeSec: reference.timeSec, maxVertexErrorM, maxBoneMatrixError, maxDisplacementM };
});
for (const c of inspected.clips) if (Math.max(...samples.filter(s => s.clip === c.name).map(s => s.maxDisplacementM)) < 1e-5) throw Error('No real local deformation');
const report = { file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  stats: inspected.stats, preservedSourceRestWeightsGeometry: true, clips: inspected.clips,
  jointFrames: inspected.rig.joints,
  vertexMap, samples, maxVertexErrorM: Math.max(...samples.map(s => s.maxVertexErrorM)),
  maxBoneMatrixError: Math.max(...samples.map(s => s.maxBoneMatrixError)), quality: 'numerical validity only; manual quality deferred' };
fs.writeFileSync(process.argv[3] ?? `${dir}/structure.json`, JSON.stringify(report, null, 2) + '\n');
if (!process.argv[2]) {
  const markers = { tech_idle_v1: [], tech_run_v1: [{ id:'left_contact_pose_hint',frame:0 },{ id:'right_contact_pose_hint',frame:12 }],
    tech_jump_v1:[{id:'takeoff_pose',frame:6},{id:'tuck_peak',frame:15},{id:'landing_pose',frame:24}],
    tech_slide_v1:[{id:'low_pose_enter',frame:6},{id:'recovery_pose_begin',frame:24}] };
  const manifest = { documentVersion:'1.0',artifactKind:'technical_motion_sample',sampleVersion:'v1',
    executionBase:dcc.executionBase,sourceCommit:dcc.sourceCommit,sourceKind:'derived_reconstruction',
    sourceDerivedBlendHash:dcc.sourceBlendSha256,sourceDiagnosticGlbHash:'cb84cfb9a308c54245ac49627383aa6643c8d40efc9c2a6929334dc60c7348f5',
    derivedBlendHash:dcc.derivedBlendSha256,exportHash:report.sha256,exportFile:'runner-basic-motion-sample.glb',
    sourceRigName:dcc.rig,skeletonVersion:'rig-spike-v1@64c4f31',restSkinFingerprint:dcc.restSkinFingerprintBefore,
    joints:inspected.rig.joints.map(j=>({name:j.name,parent:inspected.rig.joints[j.parent]?.name??null,node:j.node})),
    coordinates:{units:'m',up:'+Y',forward:'+Z',origin:'sole_center',sourceDcc:'Z-up/-Y',normalizationAppliedAgain:false,loaderHandedness:'RH_native_gltf_preview',runtimeConversionStatus:'not_validated'},
    rootPolicy:'fixed_bind_TRS',move_delta:[0,0,0],simulationAuthority:'none',markersArePresentationOnly:true,attackWindow:'N/A',artInvulnerability:'N/A',footContactVerified:false,
    resourceProfile:{name:'single_runner_rig_spike',triangles:report.stats.triangles,joints:report.stats.jointCount,triangleLimit:30000,jointLimit:48,weightLimit:4,textures:'source two 4096x4096; not a production budget pass'},
    clips:report.clips.map(c=>({name:c.name,clipVersion:'v1',fps:c.fps,N:c.N,durationSec:c.durationSec,playbackRange:[0,c.N],boundaryKeyTimeSec:c.durationSec,loop:c.loop,holdLast:!c.loop,cancel_from:0,
      phases:c.loop?[]:[{name:c.name.includes('jump')?'prepare':'enter',frames:[0,6]},{name:c.name.includes('jump')?'air_pose':'hold_pose',frames:[6,24]},{name:c.name.includes('jump')?'buffer_pose':'exit',frames:[24,36]}],
      markers:markers[c.name].map(m=>({...m,time:m.frame/30,presentationOnly:true})),interpolation:'sampled LINEAR; STEP constants accepted',boundaryVelocityPolicy:c.loop?'symmetric tangent guard f1/fN-1':'bounded smooth source, sampled LINEAR',drivenBoneNames:inspected.rig.joints.map(j=>j.name)})),
    pipelineStatus:'numerically_validated',qualityClass:'unverified_new_motion',knownIssues:['MAN-01 shoulder/hood leakage','MAN-02 elbow/torso leakage','MAN-03/04 opposite leg influence and knee compression','MAN-05 accessories unverified','MAN-08 no foot locking or natural motion polish'],commercialUseConditions:{value:null,reason:'not obtained'},productionApproval:false };
  if (dcc.exportSha256 !== report.sha256) throw Error('DCC export hash does not match parsed file');
  fs.writeFileSync(`${dir}/motion-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
}
console.log({ clips: report.clips.map(c => c.name), samples: samples.length, maxVertexErrorM: report.maxVertexErrorM, maxBoneMatrixError: report.maxBoneMatrixError });
