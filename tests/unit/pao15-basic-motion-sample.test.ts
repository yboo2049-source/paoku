import { describe, expect, it } from 'vitest';
import { assertBoundRig, assertSourceHash, assertClipSet, assertClip, boundaryMetrics } from '../../tools/pao15-basic-motion-sample/validate.mjs';
import { identity } from '../../tools/pao15-rig-spike/validate.mjs';
import { MarkerCursor } from '../../tools/pao15-basic-motion-sample/playback.mjs';

const root = () => ({ translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
const rig = () => ({ joints: [{ name: 'root_motionless', parent: -1, inverseBind: identity() }, { name: 'pelvis', parent: 0, inverseBind: identity() }],
  primitives: [{ name: 'body', positions: [[0, 1, 0]], joints: [[0, 1, 0, 0]], weights: [[.5, .5, 0, 0]] }], rootSamples: [root()], triangles: 1 });
const clip = () => ({ name: 'tech_run_v1', timeTracks: [[0, .8]], rootSamples: [root()], wrapperSamples: [root()],
  loopChannels: [{ kind: 'translation', start: [0, 0, 0], next: [.001, 0, 0], previous: [-.001, 0, 0], end: [0, 0, 0] }] });

describe('PAO-15 basic motion file guards', () => {
  it('rejects a wrong immutable source hash', () => {
    expect(() => assertSourceHash('wrong', 'approved')).toThrow(/source/i);
    expect(() => assertSourceHash('approved', 'approved')).not.toThrow();
  });
  it('accepts unchanged rest/skin but rejects renamed bones, changed parents or IBM', () => {
    const source = rig(); expect(() => assertBoundRig(rig(), source)).not.toThrow();
    for (const field of ['name', 'parent', 'inverseBind']) {
      const changed = rig();
      if (field === 'name') changed.joints[1].name = 'fake_pelvis';
      if (field === 'parent') changed.joints[1].parent = -1;
      if (field === 'inverseBind') changed.joints[1].inverseBind[12] = .1;
      expect(() => assertBoundRig(changed, source)).toThrow();
    }
  });
  it('rejects changed normalized weights as well as malformed weights and indexes', () => {
    for (const weights of [[.4, .6, 0, 0], [.2, .2, 0, 0], [NaN, .5, 0, 0]]) {
      const changed = rig(); changed.primitives[0].weights[0] = weights;
      expect(() => assertBoundRig(changed, rig())).toThrow(/weight/i);
    }
    const changed = rig(); changed.primitives[0].joints[0][0] = 3;
    expect(() => assertBoundRig(changed, rig())).toThrow(/joint/i);
  });
  it('requires exactly four named samples without the old diagnostic clip', () => {
    const names = ['tech_idle_v1', 'tech_run_v1', 'tech_jump_v1', 'tech_slide_v1'];
    expect(() => assertClipSet(names)).not.toThrow();
    expect(() => assertClipSet(names.slice(0, 3))).toThrow(/clip/i);
    expect(() => assertClipSet([...names, 'rig_diagnostic'])).toThrow(/clip/i);
  });
  it('rejects a shortened real sampler despite a correct duration label', () => {
    expect(() => assertClip(clip())).not.toThrow();
    const changed = clip(); changed.timeTracks.push([0, 23 / 30]);
    expect(() => assertClip(changed)).toThrow(/duration|boundary/i);
  });
  it('rejects root and parent-wrapper movement, scale or rotation', () => {
    const a = clip(); a.rootSamples[0].translation[1] = .1;
    expect(() => assertClip(a)).toThrow(/root/i);
    const b = clip(); b.wrapperSamples[0].translation[2] = 1;
    expect(() => assertClip(b)).toThrow(/root/i);
    const c = clip(); c.rootSamples[0].scale[0] = 1.01;
    expect(() => assertClip(c)).toThrow(/root/i);
  });
  it('detects opposite signed seam velocities even with identical endpoints', () => {
    const c = clip(); c.loopChannels[0].previous = [.001, 0, 0];
    expect(() => assertClip(c)).toThrow(/velocity/i);
  });
  it('rejects non-finite non-root animation values rather than passing NaN comparisons', () => {
    const c = clip(); c.loopChannels[0].next[0] = NaN;
    expect(() => assertClip(c)).toThrow(/finite/i);
  });
  it('treats q and -q as one orientation and checks signed quaternion log velocity', () => {
    const same = boundaryMetrics({ kind: 'rotation', start: [0, 0, 0, 1], next: [0, 0, 0, -1], previous: [0, 0, 0, -1], end: [0, 0, 0, 1] });
    expect(same.poseError).toBeCloseTo(0); expect(same.speedError).toBeCloseTo(0);
    const q = [Math.sin(.02), 0, 0, Math.cos(.02)];
    const wrong = boundaryMetrics({ kind: 'rotation', start: [0, 0, 0, 1], next: q, previous: q, end: [0, 0, 0, 1] });
    expect(wrong.speedError).toBeGreaterThan(1);
  });
});

describe('isolated motion marker lifecycle', () => {
  it('emits f0 once per loop and never double-emits a repeated render frame', () => {
    const c = new MarkerCursor(); c.select('run', .8, [{ id: 'left', time: 0 }, { id: 'right', time: .4 }]);
    expect(c.advance(.01, 0).map(m => m.marker)).toEqual(['left']);
    expect(c.advance(.01, 0)).toEqual([]);
    expect(c.advance(.45, 0).map(m => m.marker)).toEqual(['right']);
    expect(c.advance(.02, 1).map(m => m.marker)).toEqual(['left']);
  });
  it('freezes paused markers and seek never replays history', () => {
    const c = new MarkerCursor(); c.select('jump', 1.2, [{ id: 'takeoff', time: .2 }]);
    c.advance(.1, 0); c.pause(); expect(c.advance(.7, 0)).toEqual([]);
    c.resume(); expect(c.advance(.1, 0)).toEqual([]);
    c.seek(.8); expect(c.advance(.81, 0)).toEqual([]);
  });
  it('new selection creates a new identity and disposed cursors emit nothing', () => {
    const c = new MarkerCursor(); c.select('run', .8, [{ id: 'left', time: 0 }]); const a = c.advance(.01, 0)[0].id;
    c.select('run', .8, [{ id: 'left', time: 0 }]); const b = c.advance(.01, 0)[0].id;
    expect(a).not.toBe(b); c.clear(); expect(c.advance(.6, 0)).toEqual([]);
  });
});
