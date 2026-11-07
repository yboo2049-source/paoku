import { describe, expect, it } from 'vitest';
import { LayoutLease, normalizeOcclusion, toBufferGeometry, clipRect, quantizeOutward } from '../../src/presentation/hudSafeArea';
import type { MeasureBasis, UiLayoutSnapshot } from '../../src/presentation/hudSafeArea';

const basis = (sampleFrame = 1): MeasureBasis => ({
  sampleFrame, page: 'PLAYING', runId: 'run-1',
  viewport: { layoutWidth: 500, layoutHeight: 1000, visual: { x: 10, y: 0, width: 480, height: 1000 }, visualScale: 2 },
  canvasRect: { x: 30, y: 20, width: 390, height: 844 },
});
const measurement = () => ({ deviceInsets: { top: 0, right: 0, bottom: 0, left: 0 }, surfaces: [
  { id: 'score', kind: 'readout' as const, edge: 'top' as const, clientRect: { x: 46, y: 44, width: 100, height: 48 } },
] });
const snapshot = (): UiLayoutSnapshot => ({ ...basis(), ...measurement(), producerId: 'ui-1', epoch: 0, layoutRevision: 1, status: 'READY', profile: 'gameplay', modal: 'none', reason: null });

describe('H01/H08/H11 neutral geometry', () => {
  it('normalizes the approved offset example without subtracting visual offset or multiplying zoom', () => {
    const value = normalizeOcclusion(snapshot());
    expect(value.status).toBe('READY');
    expect(value.reservedRects).toEqual([{ x: 16, y: 24, width: 100, height: 48 }]);
    expect(value.framingInsets.top).toBe(76);
    const buffer = toBufferGeometry(value, 780, 1688);
    expect(buffer.status).toBe('READY');
    expect(buffer.rawReservedRects).toEqual([{ x: 32, y: 48, width: 200, height: 96 }]);
    expect(buffer.reservedRects).toEqual([{ x: 24, y: 40, width: 216, height: 112 }]);
    expect(toBufferGeometry(value, 390, 844).rawReservedRects).toEqual(value.reservedRects);
    expect(toBufferGeometry(value, 1170, 2532).rawReservedRects[0].x).toBe(48);
  });
  it('intersects each overflow axis independently and quantizes outwards', () => {
    expect(clipRect({ x: -10, y: -20, width: 50, height: 60 }, { x: 0, y: 0, width: 20, height: 20 }, true, false)).toEqual({ x: 0, y: -20, width: 20, height: 60 });
    expect(quantizeOutward({ x: .01, y: .02, width: 1, height: 1 })).toEqual({ x: 0, y: .015625, width: 1.015625, height: 1.015625 });
  });
  it('max-combines device/visual boundaries and only top-tagged surfaces form a framing band', () => {
    const s = snapshot();
    const value = normalizeOcclusion({ ...s, deviceInsets: { top: 47, right: 0, bottom: 34, left: 0 }, surfaces: [...s.surfaces, { id: 'buff', kind: 'powerup', edge: 'none', clientRect: { x: 46, y: 600, width: 100, height: 48 } }] });
    expect(value.safeInsets).toEqual({ top: 27, right: 0, bottom: 0, left: 0 });
    expect(value.framingInsets).toEqual({ top: 76, right: 0, bottom: 0, left: 0 });
    expect(value.reservedRects[1].y).toBe(580);
    const clipped = normalizeOcclusion({ ...s, viewport: { ...s.viewport, visual: { x: 40, y: 30, width: 200, height: 500 } } });
    expect(clipped.safeInsets).toEqual({ left: 10, top: 10, right: 180, bottom: 334 });
  });
  it.each([NaN, Infinity, -1])('rejects an invalid surface width %s instead of silently dropping it', width => {
    const s = snapshot();
    expect(normalizeOcclusion({ ...s, surfaces: [{ ...s.surfaces[0], clientRect: { ...s.surfaces[0].clientRect, width } }] })).toMatchObject({ status: 'UNREADY', reason: 'INVALID_RECT' });
  });
  it('reports zero canvas, no visible canvas, unsupported transforms and buffer mismatch', () => {
    const s = snapshot();
    expect(normalizeOcclusion({ ...s, canvasRect: { ...s.canvasRect, width: 0 } })).toMatchObject({ status: 'UNREADY', reason: 'ZERO_CANVAS' });
    expect(normalizeOcclusion({ ...s, canvasRect: { ...s.canvasRect, x: 1000 } })).toMatchObject({ status: 'UNREADY', reason: 'NO_VISIBLE_CANVAS' });
    expect(normalizeOcclusion({ ...s, canvasTransform: 'matrix(0,1,-1,0,0,0)' })).toMatchObject({ status: 'UNREADY', reason: 'UNSUPPORTED_TRANSFORM' });
    expect(toBufferGeometry(normalizeOcclusion(s), 780, 1200)).toMatchObject({ status: 'UNREADY', reason: 'BUFFER_ASPECT_MISMATCH' });
    expect(toBufferGeometry(normalizeOcclusion(s), 0, 0).status).toBe('UNREADY');
    expect(normalizeOcclusion({ ...s, status: 'RELEASED', reason: 'DISPOSED' }).status).toBe('RELEASED');
  });
  it('returns deep immutable copies without freezing or retaining caller-owned input', () => {
    const s = snapshot(); const v = normalizeOcclusion(s);
    expect(Object.isFrozen(v)).toBe(true); expect(Object.isFrozen(v.reservedRects[0])).toBe(true);
    expect(Object.isFrozen(s)).toBe(false);
    (s.surfaces[0].clientRect as { x: number }).x = 999;
    expect(v.reservedRects[0].x).toBe(16);
  });
});

describe('H10/H12 layout leases and explicit read scheduling', () => {
  it('caches stable reads and synchronously revokes a dirty snapshot with one notification', () => {
    const lease = new LayoutLease('one'); let reads = 0; const notices: string[] = [];
    lease.subscribe(n => notices.push(n.status));
    expect(lease.read()).toBeNull();
    const sample = lease.sample(basis(), () => { reads++; return measurement(); });
    expect(sample.status).toBe('READY');
    expect(lease.sample(basis(2), () => { reads++; return measurement(); })).toBe(sample);
    expect(reads).toBe(1);
    lease.invalidate(); lease.invalidate();
    expect(lease.read()).toMatchObject({ status: 'UNREADY', reason: 'DIRTY' });
    expect(notices).toEqual(['UNREADY']);
    const second = lease.sample(basis(2), () => { reads++; return measurement(); });
    expect(second.status).toBe('READY'); expect(reads).toBe(2);
    expect(second.layoutRevision).toBeGreaterThan(sample.layoutRevision);
  });
  it('does not read DOM twice in a sample frame after a late invalidation or basis change', () => {
    const lease = new LayoutLease('one'); let reads = 0;
    const take = () => { reads++; return measurement(); };
    lease.sample(basis(), take); lease.invalidate();
    expect(lease.sample(basis(), take).status).toBe('UNREADY'); expect(reads).toBe(1);
    expect(lease.sample(basis(2), take).status).toBe('READY');
    expect(lease.sample({ ...basis(2), page: 'PAUSED' }, take).status).toBe('UNREADY');
    expect(reads).toBe(2);
    expect(lease.sample({ ...basis(3), page: 'PAUSED' }, take).profile).toBe('modal');
  });
  it('retires old epochs on reset and cannot revive after repeated disposal', () => {
    const lease = new LayoutLease('one'); const old = lease.sample(basis(), measurement);
    lease.reset(); expect(lease.read()?.status).toBe('UNREADY');
    const current = lease.sample(basis(2), measurement);
    expect(current.epoch).toBeGreaterThan(old.epoch);
    const notices: string[] = []; const off = lease.subscribe(n => notices.push(n.status));
    lease.dispose(); lease.dispose(); lease.reset(); lease.invalidate();
    expect(lease.sample(basis(3), measurement)).toMatchObject({ status: 'RELEASED', reason: 'DISPOSED' });
    expect(notices).toEqual(['RELEASED']); off(); off();
    expect(new LayoutLease('two').sample(basis(), measurement).producerId).not.toBe(old.producerId);
  });
  it('never commits a sample invalidated during its read and rejects stale page/run baselines', () => {
    const lease = new LayoutLease('one');
    const invalid = lease.sample(basis(), () => { lease.invalidate(); return measurement(); });
    expect(invalid).toMatchObject({ status: 'UNREADY', reason: 'DIRTY' });
    expect(lease.sample({ ...basis(2), page: 'MENU', runId: null }, measurement)).toMatchObject({ status: 'READY', profile: 'menu', runId: null });
    expect(lease.sample({ ...basis(3), canvasRect: { ...basis().canvasRect, width: 0 } }, measurement).status).toBe('UNREADY');
  });
  it('returns unavailable rather than null when reset/dispose reenters the first read', () => {
    const disposed = new LayoutLease('disposed');
    expect(disposed.sample(basis(), () => { disposed.dispose(); return measurement(); })).toMatchObject({ status: 'RELEASED', reason: 'DISPOSED' });
    const reset = new LayoutLease('reset');
    expect(reset.sample(basis(), () => { reset.reset(); return measurement(); })).toMatchObject({ status: 'UNREADY', epoch: 1 });
  });
  it('does not let a malformed or backwards sample frame reuse a ready cache', () => {
    const lease = new LayoutLease('one'); lease.sample(basis(10), measurement);
    expect(lease.sample(basis(9), measurement)).toMatchObject({ status: 'UNREADY', reason: 'STALE_LAYOUT' });
    expect(lease.sample(basis(NaN), measurement).status).toBe('UNREADY');
  });
  it('keeps a disposal made by a reset listener terminal', () => {
    const lease = new LayoutLease('one'); lease.sample(basis(), measurement);
    lease.subscribe(n => { if (n.reason === 'RESET') lease.dispose(); }); lease.reset();
    expect(lease.read()).toMatchObject({ status: 'RELEASED', reason: 'DISPOSED' });
  });
  it('converts a failed measurement read into an explicit unavailable result', () => {
    const lease = new LayoutLease('one');
    expect(lease.sample(basis(), () => { throw Error('F measurement failure'); })).toMatchObject({ status: 'UNREADY', reason: 'MEASUREMENT_FAILED' });
  });
  it('coalesces a reset requested recursively by a reset observer', () => {
    const lease = new LayoutLease('one'); lease.sample(basis(), measurement);
    lease.subscribe(n => { if (n.reason === 'RESET') lease.reset(); }); lease.reset();
    expect(lease.read()).toMatchObject({ status: 'UNREADY', epoch: 1 });
  });
  it('rejects malformed CSS values and a second buffer conversion at the pure adapter boundary', () => {
    const value = normalizeOcclusion(snapshot());
    expect(toBufferGeometry({ ...value, width: NaN }, 780, 1688).status).toBe('UNREADY');
    expect(toBufferGeometry({ ...value, framingInsets: { ...value.framingInsets, top: Infinity } }, 780, 1688).status).toBe('UNREADY');
    expect(toBufferGeometry({ ...value, reservedRects: [{ x: 0, y: 0, width: -1, height: 2 }] }, 780, 1688).status).toBe('UNREADY');
    expect(toBufferGeometry(toBufferGeometry(value, 780, 1688) as unknown as typeof value, 780, 1688).status).toBe('UNREADY');
  });
});
