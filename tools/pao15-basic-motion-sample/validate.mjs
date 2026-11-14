// Fixed 64c4f31 parser/math/skin primitives are reused without editing the old tool.
import { accessor, validateRig, worldMatrices, multiply, identity, interpolateKeys, skinPositions } from '../pao15-rig-spike/validate.mjs';
export const CLIPS = {
  tech_idle_v1: { fps: 30, N: 60, durationSec: 2, loop: true },
  tech_run_v1: { fps: 30, N: 24, durationSec: .8, loop: true },
  tech_jump_v1: { fps: 30, N: 36, durationSec: 1.2, loop: false },
  tech_slide_v1: { fps: 30, N: 36, durationSec: 1.2, loop: false },
};
export function assertSourceHash(actual, expected) { if (actual !== expected) throw Error('source hash mismatch'); }
const difference = (a, b) => a.length !== b.length ? Infinity : Math.max(0, ...a.map((x, i) => Math.abs(x - b[i])));
const norm = a => Math.hypot(...a);
function fixed(s) {
  if (![...s.translation, ...s.rotation, ...s.scale].every(Number.isFinite) || norm(s.translation) > 1e-4 || norm(s.rotation.slice(0, 3)) > 1e-4 || Math.abs(Math.abs(s.rotation[3]) - 1) > 1e-4 || difference(s.scale, [1, 1, 1]) > 1e-6) throw Error('root/parent transform drift');
}
export function assertBoundRig(actual, source) {
  validateRig(actual); validateRig(source);
  if (actual.joints.length !== source.joints.length || actual.triangles !== source.triangles || actual.primitives.length !== source.primitives.length) throw Error('source skeleton/geometry changed');
  for (const a of actual.joints) {
    const b = source.joints.find(j => j.name === a.name);
    if (!b || (actual.joints[a.parent]?.name ?? null) !== (source.joints[b.parent]?.name ?? null)) throw Error('source bone name/parent changed');
    if (difference(a.inverseBind, b.inverseBind) > 1e-5) throw Error('source inverse bind changed');
  }
  actual.primitives.forEach((p, i) => {
    const b = source.primitives.find(s => s.name === p.name) ?? source.primitives[i];
    if (p.positions.length !== b.positions.length) throw Error('source vertex coverage changed');
    p.positions.forEach((v, n) => {
      if (difference(v, b.positions[n]) > 1e-5) throw Error('source vertex/rest geometry changed');
      const weightMap = (r, q) => Object.fromEntries(q.weights[n].map((w, k) => [r.joints[q.joints[n][k]].name, w]).filter(([, w]) => w > 0).sort(([a], [b]) => a.localeCompare(b)));
      const aw = weightMap(actual, p), bw = weightMap(source, b);
      if (Object.keys(aw).join() !== Object.keys(bw).join() || Object.keys(aw).some(k => Math.abs(aw[k] - bw[k]) > 1e-6)) throw Error('source weights changed');
    });
  });
}
export function assertClipSet(names) {
  if (names.length !== 4 || new Set(names).size !== 4 || names.some(n => !CLIPS[n])) throw Error('four clip set mismatch');
}
function conjugate(q) { return [-q[0], -q[1], -q[2], q[3]]; }
function qmul(a, b) {
  const [x, y, z, w] = a, [X, Y, Z, W] = b;
  return [w * X + x * W + y * Z - z * Y, w * Y - x * Z + y * W + z * X, w * Z + x * Y - y * X + z * W, w * W - x * X - y * Y - z * Z];
}
function rotationDelta(a, b) {
  let q = qmul(conjugate(a), b); const l = norm(q); q = q.map(v => v / l);
  if (q[3] < 0) q = q.map(v => -v);
  const s = norm(q.slice(0, 3)); if (s < 1e-12) return [0, 0, 0];
  const angle = 2 * Math.atan2(s, q[3]); return q.slice(0, 3).map(v => v * angle / s);
}
export function boundaryMetrics(c) {
  const width = c.kind === 'rotation' ? 4 : 3;
  if ([c.start, c.next, c.previous, c.end].some(v => v.length !== width || !v.every(Number.isFinite))) throw Error('non-finite loop channel');
  const delta = c.kind === 'rotation' ? rotationDelta : (a, b) => b.map((v, i) => v - a[i]);
  const dt = c.dt ?? 1 / 30, before = delta(c.previous, c.end).map(v => v / dt), after = delta(c.start, c.next).map(v => v / dt);
  return { poseError: norm(delta(c.start, c.end)), speedError: norm(after.map((v, i) => v - before[i])) };
}
export function assertClip(c) {
  const spec = CLIPS[c.name]; if (!spec) throw Error('unknown clip');
  for (const times of c.timeTracks) {
    if (!times.length || times.some((v, i) => !Number.isFinite(v) || (i && v <= times[i - 1])) || Math.abs(times[0]) > 1e-6 || Math.abs(times.at(-1) - spec.durationSec) > 1e-5) throw Error('duration/boundary key missing');
  }
  if (!c.timeTracks.length || !c.rootSamples.length || !c.wrapperSamples.length) throw Error('missing root/track evidence');
  [...c.rootSamples, ...c.wrapperSamples].forEach(fixed);
  const metrics = spec.loop ? c.loopChannels.map(channel => ({ ...boundaryMetrics(channel), kind: channel.kind, bone: channel.bone })) : [];
  for (const m of metrics) {
    if (m.poseError > (m.kind === 'rotation' ? 1e-3 : 1e-4)) throw Error('loop pose discontinuity');
    if (m.speedError > (m.kind === 'rotation' ? .05 : .01)) throw Error('loop signed velocity discontinuity');
  }
  return { ...spec, metrics };
}

export function extractRig(doc) {
  const j = doc.json, skin = j.skins?.[0]; if (j.skins?.length !== 1 || skin.inverseBindMatrices === undefined) throw Error('skin/IBM missing');
  const ibm = accessor(doc, skin.inverseBindMatrices); if (ibm.length !== skin.joints.length) throw Error('IBM coverage');
  const parents = j.nodes.map(() => -1); j.nodes.forEach((n, i) => n.children?.forEach(c => { parents[c] = i; }));
  const joints = skin.joints.map((n, i) => {
    let p = parents[n]; while (p !== -1 && !skin.joints.includes(p)) p = parents[p];
    return { name: j.nodes[n].name, node: n, parent: skin.joints.indexOf(p), inverseBind: ibm[i] };
  });
  if (new Set(joints.map(j => j.name)).size !== joints.length) throw Error('duplicate bone name');
  const primitives = []; let triangles = 0;
  j.nodes.forEach((n, node) => {
    if (n.mesh === undefined) return;
    if (n.skin !== 0) throw Error('unskinned mesh');
    j.meshes[n.mesh].primitives.forEach((p, pi) => {
      if (p.attributes.JOINTS_1 !== undefined || p.attributes.WEIGHTS_1 !== undefined) throw Error('more than four weights');
      primitives.push({ name: `${n.name}#${pi}`, node, positions: accessor(doc, p.attributes.POSITION), joints: accessor(doc, p.attributes.JOINTS_0), weights: accessor(doc, p.attributes.WEIGHTS_0) });
      triangles += (p.indices === undefined ? primitives.at(-1).positions.length : j.accessors[p.indices].count) / 3;
    });
  });
  const root = j.nodes.findIndex(n => n.name === 'root_motionless'); if (root < 0) throw Error('root missing');
  const pose = n => ({ translation: n.translation ?? [0, 0, 0], rotation: n.rotation ?? [0, 0, 0, 1], scale: n.scale ?? [1, 1, 1] });
  const rig = { joints, primitives, rootSamples: [pose(j.nodes[root])], triangles };
  const stats = validateRig(rig), world = worldMatrices(j);
  const error = Math.max(...skin.joints.map((n, i) => difference(multiply(world[n], ibm[i]), identity())));
  if (error > 1e-4) throw Error('IBM/rest matrix invalid');
  const wrappers = []; let p = parents[root]; while (p !== -1) { wrappers.push(p); p = parents[p]; }
  return { rig, skin, root, wrappers, pose, stats: { ...stats, restIbmError: error } };
}
export function sampleAnimation(doc, animation, time) {
  const overrides = new Map();
  for (const c of animation.channels) {
    const s = animation.samplers[c.sampler], mode = s.interpolation ?? 'LINEAR';
    if (!['LINEAR', 'STEP'].includes(mode)) throw Error('unsupported sample interpolation');
    const v = interpolateKeys(accessor(doc, s.input).map(t => t[0]), accessor(doc, s.output), time, c.target.path, mode);
    if (!v.every(Number.isFinite)) throw Error('non-finite animation value');
    const o = overrides.get(c.target.node) ?? {}; o[c.target.path] = v; overrides.set(c.target.node, o);
  }
  return { overrides, world: worldMatrices(doc.json, overrides) };
}
export function inspectMotion(doc, source) {
  assertClipSet(doc.json.animations?.map(a => a.name) ?? []);
  const extracted = extractRig(doc), baseline = extractRig(source);
  assertBoundRig(extracted.rig, baseline.rig);
  const clips = doc.json.animations.map(a => {
    const T = CLIPS[a.name].durationSec;
    const timeTracks = a.samplers.map(s => accessor(doc, s.input).map(t => t[0]));
    const cache = new Map();
    const at = t => { if (!cache.has(t)) cache.set(t, sampleAnimation(doc, a, t)); return cache.get(t); };
    const moments = [...new Set(timeTracks.flat())].sort((a, b) => a - b);
    const local = (n, sample) => extracted.pose({ ...doc.json.nodes[n], ...(sample.overrides.get(n) ?? {}) });
    const rootSamples = moments.map(t => local(extracted.root, at(t)));
    const wrapperSamples = moments.flatMap(t => extracted.wrappers.map(n => local(n, at(t))));
    if (!wrapperSamples.length) wrapperSamples.push(extracted.pose({}));
    const loopChannels = [];
    if (CLIPS[a.name].loop) for (const c of a.channels) {
      if (!['translation', 'rotation'].includes(c.target.path)) continue;
      const values = [0, 1 / 30, T - 1 / 30, T].map(t => local(c.target.node, at(t))[c.target.path]);
      loopChannels.push({ kind: c.target.path, bone: doc.json.nodes[c.target.node].name, start: values[0], next: values[1], previous: values[2], end: values[3] });
    }
    return { name: a.name, ...assertClip({ name: a.name, timeTracks, rootSamples, wrapperSamples, loopChannels }), samplerCount: a.samplers.length };
  });
  return { ...extracted, clips };
}
export function evaluatedParts(doc, extracted, animation, time) {
  const { world } = sampleAnimation(doc, animation, time);
  return extracted.rig.primitives.map(p => ({ name: p.name, positions: skinPositions(p, extracted.skin.joints.map(n => world[n]), extracted.rig.joints.map(j => j.inverseBind)) }));
}
