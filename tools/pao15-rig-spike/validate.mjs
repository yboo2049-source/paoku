export const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function multiply(a, b) {
  return Array.from({ length: 16 }, (_, i) => {
    const row = i % 4, col = Math.floor(i / 4);
    return [0, 1, 2, 3].reduce((s, k) => s + a[k * 4 + row] * b[col * 4 + k], 0);
  });
}
function determinant(a) {
  // Pivoted elimination also catches a finite but singular IBM.
  const rows = Array.from({ length: 4 }, (_, r) => [0, 1, 2, 3].map(c => a[c * 4 + r]));
  let det = 1;
  for (let c = 0; c < 4; c++) {
    let pivot = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(rows[r][c]) > Math.abs(rows[pivot][c])) pivot = r;
    if (Math.abs(rows[pivot][c]) < 1e-12) return 0;
    if (pivot !== c) { [rows[pivot], rows[c]] = [rows[c], rows[pivot]]; det *= -1; }
    const v = rows[c][c]; det *= v;
    for (let r = c + 1; r < 4; r++) {
      const f = rows[r][c] / v;
      for (let k = c; k < 4; k++) rows[r][k] -= f * rows[c][k];
    }
  }
  return det;
}
export function validateRig(rig) {
  if (!rig.joints?.length || rig.joints.length > 48) throw Error('joint limit');
  if (!Number.isInteger(rig.triangles) || rig.triangles < 1 || rig.triangles > 30000) throw Error('triangle limit');
  for (let i = 0; i < rig.joints.length; i++) {
    const j = rig.joints[i], seen = new Set([i]);
    if (j.inverseBind?.length !== 16 || !j.inverseBind.every(Number.isFinite) || Math.abs(determinant(j.inverseBind)) < 1e-12) throw Error('invalid inverse bind');
    let p = j.parent;
    while (p !== -1) {
      if (!Number.isInteger(p) || p < 0 || p >= rig.joints.length || seen.has(p)) throw Error('invalid hierarchy');
      seen.add(p); p = rig.joints[p].parent;
    }
  }
  let vertexCount = 0, softVertices = 0;
  for (const p of rig.primitives) {
    if (!p.positions.length || p.positions.length !== p.weights?.length || p.positions.length !== p.joints?.length) throw Error('vertex attribute coverage');
    p.positions.forEach((pos, i) => {
      if (pos.length !== 3 || !pos.every(Number.isFinite)) throw Error('invalid position');
      const w = p.weights[i], j = p.joints[i];
      if (w.length !== 4 || !w.every(v => Number.isFinite(v) && v >= 0 && v <= 1) || Math.abs(w.reduce((a, b) => a + b, 0) - 1) > 1e-4) throw Error('invalid weight normalization');
      if (j.length !== 4 || !j.every(v => Number.isInteger(v) && v >= 0 && v < rig.joints.length)) throw Error('invalid joint index');
      if (w.filter(v => v > 1e-4).length >= 2) softVertices++;
      vertexCount++;
    });
  }
  if (!softVertices) throw Error('no soft transition vertices');
  if (!rig.rootSamples?.length) throw Error('missing root samples');
  for (const s of rig.rootSamples) {
    if (s.translation?.length !== 3 || s.rotation?.length !== 4 || s.scale?.length !== 3 || ![...s.translation, ...s.rotation, ...s.scale].every(Number.isFinite) ||
      s.translation.some(v => Math.abs(v) > 1e-4) || s.rotation.slice(0, 3).some(v => Math.abs(v) > 1e-4) || Math.abs(Math.abs(s.rotation[3]) - 1) > 1e-4 || s.scale.some(v => Math.abs(v - 1) > 1e-6)) throw Error('root drift');
  }
  return { vertexCount, softVertices, jointCount: rig.joints.length, triangles: rig.triangles };
}
export function skinPositions(primitive, worldJoints, inverseBinds) {
  const matrices = worldJoints.map((m, i) => multiply(m, inverseBinds[i]));
  return primitive.positions.map((p, i) => {
    const out = [0, 0, 0];
    primitive.weights[i].forEach((w, k) => {
      if (!w) return;
      const m = matrices[primitive.joints[i][k]];
      for (let r = 0; r < 3; r++) out[r] += w * (m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
    });
    return out;
  });
}

export function interpolateKeys(times, values, time, kind, mode = 'LINEAR') {
  if (time <= times[0]) return [...values[0]];
  if (time >= times.at(-1)) return [...values.at(-1)];
  const next = times.findIndex(t => t > time), previous = next - 1;
  if (mode === 'STEP') return [...values[previous]];
  const t = (time - times[previous]) / (times[next] - times[previous]);
  const a = values[previous], b = [...values[next]];
  if (kind !== 'rotation') return a.map((v, i) => v * (1 - t) + b[i] * t);
  let dot = a.reduce((s, v, i) => s + v * b[i], 0);
  if (dot < 0) { for (let i = 0; i < 4; i++) b[i] *= -1; dot *= -1; }
  dot = Math.min(1, dot);
  if (dot > .9995) {
    const q = a.map((v, i) => v * (1 - t) + b[i] * t), length = Math.hypot(...q);
    return q.map(v => v / length);
  }
  const angle = Math.acos(dot), denominator = Math.sin(angle);
  return a.map((v, i) => (v * Math.sin((1 - t) * angle) + b[i] * Math.sin(t * angle)) / denominator);
}

export function parseGlb(bytes) {
  const b = Buffer.from(bytes);
  if (b.readUInt32LE(0) !== 0x46546c67 || b.readUInt32LE(4) !== 2 || b.readUInt32LE(8) !== b.length) throw Error('invalid GLB');
  let json, bin;
  for (let offset = 12; offset < b.length;) {
    const length = b.readUInt32LE(offset), type = b.readUInt32LE(offset + 4);
    const chunk = b.subarray(offset + 8, offset + 8 + length);
    if (chunk.length !== length) throw Error('truncated chunk');
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  if (!json || !bin) throw Error('missing GLB chunks');
  return { json, bin };
}
export function accessor(doc, index) {
  const a = doc.json.accessors[index], v = doc.json.bufferViews[a.bufferView];
  if (a.sparse || v.buffer !== 0) throw Error('unsupported accessor storage');
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const types = { 5121: [1, 'readUInt8'], 5123: [2, 'readUInt16LE'], 5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE'] };
  const [size, method] = types[a.componentType] ?? [];
  if (!size || !widths[a.type]) throw Error('unsupported accessor type');
  const width = widths[a.type], stride = v.byteStride ?? width * size;
  if (stride < width * size) throw Error('invalid accessor stride');
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, k) => {
    const offset = (v.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * stride + k * size;
    if (offset + size > (v.byteOffset ?? 0) + v.byteLength) throw Error('accessor out of bounds');
    const value = doc.bin[method](offset);
    return a.normalized && a.componentType !== 5126 ? value / (a.componentType === 5121 ? 255 : 65535) : value;
  }));
}
function trs(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1], s = node.scale ?? [1, 1, 1], t = node.translation ?? [0, 0, 0];
  return [(1 - 2 * y * y - 2 * z * z) * s[0], (2 * x * y + 2 * z * w) * s[0], (2 * x * z - 2 * y * w) * s[0], 0,
    (2 * x * y - 2 * z * w) * s[1], (1 - 2 * x * x - 2 * z * z) * s[1], (2 * y * z + 2 * x * w) * s[1], 0,
    (2 * x * z + 2 * y * w) * s[2], (2 * y * z - 2 * x * w) * s[2], (1 - 2 * x * x - 2 * y * y) * s[2], 0, ...t, 1];
}
export function worldMatrices(json, overrides = new Map()) {
  const parents = json.nodes.map(() => -1);
  json.nodes.forEach((n, i) => n.children?.forEach(c => { parents[c] = i; }));
  const cache = new Map(), active = new Set();
  const get = i => {
    if (cache.has(i)) return cache.get(i);
    if (active.has(i)) throw Error('node hierarchy cycle');
    active.add(i);
    const local = trs({ ...json.nodes[i], ...(overrides.get(i) ?? {}) });
    const m = parents[i] === -1 ? local : multiply(get(parents[i]), local);
    active.delete(i); cache.set(i, m); return m;
  };
  return json.nodes.map((_, i) => get(i));
}
export function inspectGlb(doc) {
  const { json } = doc;
  if (json.skins?.length !== 1 || json.animations?.length !== 1 || json.animations[0].name !== 'rig_diagnostic') throw Error('expected one skin and diagnostic clip');
  const skin = json.skins[0];
  if (skin.inverseBindMatrices === undefined) throw Error('missing inverse bind matrices');
  const ibm = accessor(doc, skin.inverseBindMatrices);
  if (ibm.length !== skin.joints.length) throw Error('inverse bind coverage');
  const parents = json.nodes.map(() => -1);
  json.nodes.forEach((n, i) => n.children?.forEach(c => { parents[c] = i; }));
  const joints = skin.joints.map((n, i) => {
    let p = parents[n]; while (p !== -1 && !skin.joints.includes(p)) p = parents[p];
    return { name: json.nodes[n].name, node: n, parent: skin.joints.indexOf(p), inverseBind: ibm[i] };
  });
  const primitives = [];
  let triangles = 0;
  for (const n of json.nodes.filter(n => n.mesh !== undefined)) {
    if (n.skin !== 0) throw Error('unskinned mesh');
    for (const p of json.meshes[n.mesh].primitives) {
      if (p.attributes.JOINTS_1 !== undefined || p.attributes.WEIGHTS_1 !== undefined) throw Error('more than four weight slots');
      primitives.push({ positions: accessor(doc, p.attributes.POSITION), joints: accessor(doc, p.attributes.JOINTS_0), weights: accessor(doc, p.attributes.WEIGHTS_0) });
      triangles += (p.indices === undefined ? primitives.at(-1).positions.length : json.accessors[p.indices].count) / 3;
    }
  }
  const root = json.nodes.findIndex(n => n.name === 'root_motionless');
  if (root === -1) throw Error('missing root');
  const n = json.nodes[root];
  const rootSamples = [{ translation: n.translation ?? [0, 0, 0], rotation: n.rotation ?? [0, 0, 0, 1], scale: n.scale ?? [1, 1, 1] }];
  for (const c of json.animations[0].channels.filter(c => c.target.node === root)) {
    for (const value of accessor(doc, json.animations[0].samplers[c.sampler].output)) rootSamples.push({ ...rootSamples[0], [c.target.path]: value });
  }
  const rig = { joints, primitives, rootSamples, triangles };
  const stats = validateRig(rig);
  const restWorld = worldMatrices(json);
  const restMaxError = Math.max(...skin.joints.map((j, i) => Math.max(...multiply(restWorld[j], ibm[i]).map((v, k) => Math.abs(v - identity()[k])))));
  if (restMaxError > 1e-4) throw Error('IBM does not cancel rest joint world matrix');
  return { rig, stats: { ...stats, restMaxError, rootSamples: rootSamples.length }, skin, restWorld };
}
