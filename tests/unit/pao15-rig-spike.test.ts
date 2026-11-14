import { describe, expect, it } from 'vitest';
import { validateRig, skinPositions, identity, multiply, interpolateKeys } from '../../tools/pao15-rig-spike/validate.mjs';

function fixture() {
  const ibm = identity();
  return {
    joints: [{ name: 'root_motionless', parent: -1, inverseBind: ibm },
      { name: 'elbow_l', parent: 0, inverseBind: ibm }],
    primitives: [{ positions: [[1, 0, 0], [0, 1, 0]],
      joints: [[0, 1, 0, 0], [0, 1, 0, 0]], weights: [[0.5, 0.5, 0, 0], [0.25, 0.75, 0, 0]] }],
    rootSamples: [{ translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }],
    triangles: 1,
  };
}

describe('PAO-15 rig structural guard and skin evaluation', () => {
  it('samples optimized constant and linear tracks without requiring a key at each diagnostic time', () => {
    expect(interpolateKeys([0, 5], [[0, 0, 0], [0, 0, 0]], .5, 'translation')).toEqual([0, 0, 0]);
    expect(interpolateKeys([0, 1], [[0, 0, 0], [2, 0, 0]], .5, 'translation')).toEqual([1, 0, 0]);
    expect(interpolateKeys([0, 1], [[0], [2]], 2, 'translation')).toEqual([2]);
  });
  it('keeps STEP tracks constant until the next timestamp', () => {
    expect(interpolateKeys([0, 1], [[0], [2]], .5, 'translation', 'STEP')).toEqual([0]);
    expect(interpolateKeys([0, 1], [[0], [2]], 1, 'translation', 'STEP')).toEqual([2]);
  });
  it('interpolates quaternion rotations on the shortest path including antipodal keys', () => {
    expect(interpolateKeys([0, 1], [[0, 0, 0, 1], [0, 0, 0, -1]], .5, 'rotation')).toEqual([0, 0, 0, 1]);
    const q = interpolateKeys([0, 1], [[0, 0, 0, 1], [0, 0, 1, 0]], .5, 'rotation');
    expect(q[2]).toBeCloseTo(Math.SQRT1_2); expect(q[3]).toBeCloseTo(Math.SQRT1_2);
  });
  it('accepts a valid normalized soft skin and measures actual joint deformation', () => {
    const rig = fixture();
    expect(validateRig(rig).vertexCount).toBe(2);
    const moved = identity(); moved[13] = 2;
    expect(skinPositions(rig.primitives[0], [identity(), moved], rig.joints.map(j => j.inverseBind)))
      .toEqual([[1, 1, 0], [0, 2.5, 0]]);
    expect(multiply(identity(), moved)).toEqual(moved);
  });
  it.each([NaN, -0.1, 1.5])('rejects invalid weights %s', value => {
    const rig = fixture(); rig.primitives[0].weights[0][0] = value;
    expect(() => validateRig(rig)).toThrow(/weight/i);
  });
  it('rejects unbound vertices and non-normalized weights', () => {
    const rig = fixture(); rig.primitives[0].weights[0] = [0, 0, 0, 0];
    expect(() => validateRig(rig)).toThrow(/weight/i);
    rig.primitives[0].weights[0] = [0.2, 0.2, 0, 0];
    expect(() => validateRig(rig)).toThrow(/weight/i);
  });
  it('rejects invalid skin joint index even when the matrix list exists', () => {
    const rig = fixture(); rig.primitives[0].joints[0][1] = 4;
    expect(() => validateRig(rig)).toThrow(/joint index/i);
  });
  it('rejects missing, non-finite and singular inverse bind matrices', () => {
    for (const bad of [[], Array(16).fill(NaN), Array(16).fill(0)]) {
      const rig = fixture(); rig.joints[0].inverseBind = bad;
      expect(() => validateRig(rig)).toThrow(/inverse bind/i);
    }
  });
  it('rejects hierarchy cycles and root drift', () => {
    const rig = fixture(); rig.joints[0].parent = 1;
    expect(() => validateRig(rig)).toThrow(/hierarchy/i);
    rig.joints[0].parent = -1; rig.rootSamples[0].translation[2] = 0.05;
    expect(() => validateRig(rig)).toThrow(/root/i);
  });
  it('rejects a rigid-only impostor with bone nodes but no soft joint transition', () => {
    const rig = fixture(); rig.primitives[0].weights = [[1, 0, 0, 0], [1, 0, 0, 0]];
    expect(() => validateRig(rig)).toThrow(/soft/i);
  });
  it('enforces the isolated spike triangle and joint limits', () => {
    const rig = fixture(); rig.triangles = 30001;
    expect(() => validateRig(rig)).toThrow(/triangle/i);
    rig.triangles = 1; while (rig.joints.length < 49) rig.joints.push({ name: 'extra', parent: 0, inverseBind: identity() });
    expect(() => validateRig(rig)).toThrow(/joint limit/i);
  });
});
