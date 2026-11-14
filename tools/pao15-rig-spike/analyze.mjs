import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseGlb, inspectGlb, accessor, worldMatrices, skinPositions, interpolateKeys } from './validate.mjs';

const root = process.cwd();
const out = path.join(root, 'docs/evidence/PAO-15/rig-spike');
const file = process.argv[2] ?? path.join(out, 'runner-rig-spike.glb');
const doc = parseGlb(fs.readFileSync(file));
const inspected = inspectGlb(doc);
const dcc = JSON.parse(fs.readFileSync(path.join(out, 'dcc-report.json'), 'utf8'));
const animation = doc.json.animations[0];
const poses = dcc.poses.map(pose => {
  const time = pose.frame / 30, overrides = new Map();
  for (const channel of animation.channels) {
    const sampler = animation.samplers[channel.sampler];
    const times = accessor(doc, sampler.input).map(t => t[0]);
    if (sampler.interpolation !== undefined && !['LINEAR', 'STEP'].includes(sampler.interpolation)) throw Error('Unsupported diagnostic interpolation');
    const value = interpolateKeys(times, accessor(doc, sampler.output), time, channel.target.path, sampler.interpolation);
    const override = overrides.get(channel.target.node) ?? {};
    override[channel.target.path] = value;
    overrides.set(channel.target.node, override);
  }
  const world = worldMatrices(doc.json, overrides);
  if (world.some(m => !m.every(Number.isFinite))) throw Error(`Non-finite pose matrix ${pose.name}`);
  const parts = inspected.rig.primitives.map((primitive, i) => {
    const skinned = skinPositions(primitive, inspected.skin.joints.map(j => world[j]), inspected.rig.joints.map(j => j.inverseBind));
    const distances = skinned.map((p, j) => Math.hypot(...p.map((v, k) => v - primitive.positions[j][k])));
    return { primitive: i, maxDisplacementM: Math.max(...distances), movedVertices: distances.filter(d => d > 1e-4).length };
  });
  const maxDisplacementM = Math.max(...parts.map(p => p.maxDisplacementM));
  const dccMaxErrorM = Math.abs(maxDisplacementM - pose.maxDisplacementM);
  if (dccMaxErrorM > 1e-4) throw Error(`DCC/GLB skin discrepancy ${pose.name}: ${dccMaxErrorM}`);
  if (!pose.name.startsWith('rest') && maxDisplacementM < .03) throw Error(`No actual joint deformation ${pose.name}`);
  const rootIndex = doc.json.nodes.findIndex(n => n.name === 'root_motionless');
  const rootTranslation = world[rootIndex].slice(12, 15);
  if (rootTranslation.some(v => Math.abs(v) > 1e-4)) throw Error('Root world drift');
  return { name: pose.name, frame: pose.frame, timeSec: time, maxDisplacementM, dccMaxErrorM, rootTranslation, parts };
});
const restBounds = [0, 1, 2].map(k => {
  const values = inspected.rig.primitives.flatMap(p => p.positions.map(v => v[k]));
  return { min: Math.min(...values), max: Math.max(...values) };
});
const report = {
  file: path.relative(root, file), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  ...inspected.stats, animations: doc.json.animations.map(a => ({ name: a.name, channels: a.channels.length })),
  restBounds,
  poses, maxDccGlbDiscrepancyM: Math.max(...poses.map(p => p.dccMaxErrorM)),
  joints: inspected.rig.joints, quality: 'Structural and numerical validation only; visual quality requires independent review.'
};
const target = process.argv[3] ?? path.join(out, 'structure.json');
fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ joints: report.jointCount, vertices: report.vertexCount, softVertices: report.softVertices,
  triangles: report.triangles, poses: poses.length, maxDccGlbDiscrepancyM: report.maxDccGlbDiscrepancyM, target }));
