/** Presentation-only values. This module has no DOM, renderer or business dependencies. */
export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type Insets = Readonly<{ top: number; right: number; bottom: number; left: number }>;
export type Page = 'MENU' | 'PLAYING' | 'PAUSED' | 'SHOP' | 'GAMEOVER';
export type MeasureBasis = Readonly<{ sampleFrame: number; page: Page; runId: string | null; canvasRect: Rect; canvasTransform?: string; viewport: Readonly<{ layoutWidth: number; layoutHeight: number; visual: Rect; visualScale: number }> }>;
export type Surface = Readonly<{ id: string; kind: 'readout' | 'control' | 'powerup' | 'toast' | 'feedback' | 'card'; edge: 'top' | 'none'; clientRect: Rect }>;
export type UiLayoutSnapshot = MeasureBasis & Readonly<{ producerId: string; epoch: number; layoutRevision: number; status: 'READY' | 'UNREADY' | 'RELEASED'; profile: 'gameplay' | 'menu' | 'modal'; modal: 'none' | 'dimmed'; deviceInsets: Insets; surfaces: readonly Surface[]; reason: string | null }>;
type Identity = Pick<UiLayoutSnapshot, 'producerId' | 'epoch' | 'layoutRevision' | 'page' | 'runId' | 'sampleFrame' | 'profile' | 'modal' | 'status' | 'reason'>;
export type CanvasLayout = Identity & Readonly<{ space: 'canvas-css'; width: number; height: number; reservedRects: readonly Rect[]; safeInsets: Insets; framingInsets: Insets }>;
export type BufferGeometry = Identity & Readonly<{ space: 'buffer'; width: number; height: number; rawReservedRects: readonly Rect[]; reservedRects: readonly Rect[]; safeArea: Insets }>;
export type Measurement = Readonly<{ deviceInsets: Insets; surfaces: readonly Surface[]; reason?: string | null }>;
export type LayoutNotice = Pick<UiLayoutSnapshot, 'producerId' | 'epoch' | 'layoutRevision' | 'status' | 'reason'>;
const zero = (): Insets => ({ top: 0, right: 0, bottom: 0, left: 0 });
const finite = (...values: number[]) => values.every(Number.isFinite);
const validRect = (r: Rect) => !!r && finite(r.x, r.y, r.width, r.height, r.x + r.width, r.y + r.height) && r.width > 0 && r.height > 0;
const validInsets = (i: Insets) => !!i && Object.values(i).length === 4 && Object.values(i).every(n => Number.isFinite(n) && n >= 0);

/** Copies before freezing: producer/caller data never becomes a live shared reference. */
export function immutableValue<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(immutableValue)) as T;
  if (value && typeof value === 'object') return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, immutableValue(v)]))) as T;
  return value;
}

export function clipRect(a: Rect, b: Rect, clipX = true, clipY = true): Rect | null {
  const x = clipX ? Math.max(a.x, b.x) : a.x, y = clipY ? Math.max(a.y, b.y) : a.y;
  const right = clipX ? Math.min(a.x + a.width, b.x + b.width) : a.x + a.width;
  const bottom = clipY ? Math.min(a.y + a.height, b.y + b.height) : a.y + a.height;
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

export function quantizeOutward(r: Rect): Rect {
  const x = Math.floor(r.x * 64) / 64, y = Math.floor(r.y * 64) / 64;
  return { x, y, width: Math.ceil((r.x + r.width) * 64) / 64 - x, height: Math.ceil((r.y + r.height) * 64) / 64 - y };
}

export function axisAlignedTransform(transform = 'none'): boolean {
  if (transform === 'none') return true;
  const match = /^matrix\(([^)]+)\)$/.exec(transform);
  if (!match) return false;
  const values = match[1].split(',').map(Number);
  return values.length === 6 && finite(...values) && values[0] > 0 && values[3] > 0 && values[1] === 0 && values[2] === 0;
}

function basisError(b: MeasureBasis): string | null {
  if (!b.canvasRect || !finite(b.canvasRect.width, b.canvasRect.height)) return 'INVALID_RECT';
  if (b.canvasRect.width === 0 || b.canvasRect.height === 0) return 'ZERO_CANVAS';
  if (!validRect(b.canvasRect) || !b.viewport || !validRect(b.viewport.visual) || !finite(b.viewport.layoutWidth, b.viewport.layoutHeight, b.viewport.visualScale) || b.viewport.layoutWidth <= 0 || b.viewport.layoutHeight <= 0 || b.viewport.visualScale <= 0 || !Number.isSafeInteger(b.sampleFrame) || b.sampleFrame < 0) return 'INVALID_RECT';
  if (!['MENU', 'PLAYING', 'PAUSED', 'SHOP', 'GAMEOVER'].includes(b.page)) return 'STALE_LAYOUT';
  if (!axisAlignedTransform(b.canvasTransform)) return 'UNSUPPORTED_TRANSFORM';
  return null;
}

const identity = (s: Identity): Identity => ({ producerId: s.producerId, epoch: s.epoch, layoutRevision: s.layoutRevision, page: s.page, runId: s.runId, sampleFrame: s.sampleFrame, profile: s.profile, modal: s.modal, status: s.status, reason: s.reason });

export function normalizeOcclusion(s: UiLayoutSnapshot): CanvasLayout {
  const unavailable = (reason: string | null, status: UiLayoutSnapshot['status'] = 'UNREADY'): CanvasLayout => immutableValue({ ...identity(s), status, reason, space: 'canvas-css', width: 0, height: 0, reservedRects: [], safeInsets: zero(), framingInsets: zero() });
  if (s.status !== 'READY') return unavailable(s.reason, s.status);
  const error = basisError(s);
  if (error) return unavailable(error);
  if (!validInsets(s.deviceInsets) || s.surfaces.some(r => !validRect(r.clientRect)) || new Set(s.surfaces.map(r => r.id)).size !== s.surfaces.length) return unavailable('INVALID_RECT');
  const c = s.canvasRect, v = s.viewport, i = s.deviceInsets;
  const device = { x: i.left, y: i.top, width: v.layoutWidth - i.left - i.right, height: v.layoutHeight - i.top - i.bottom };
  const visible = clipRect(c, v.visual);
  const safe = visible && validRect(device) ? clipRect(visible, device) : null;
  if (!safe) return unavailable('NO_VISIBLE_CANVAS');
  const safeInsets = { left: safe.x - c.x, top: safe.y - c.y, right: c.x + c.width - safe.x - safe.width, bottom: c.y + c.height - safe.y - safe.height };
  const rects: Rect[] = []; let top = safeInsets.top;
  for (const surface of s.surfaces) {
    const clipped = clipRect(surface.clientRect, visible!);
    if (!clipped) continue;
    const local = quantizeOutward({ x: clipped.x - c.x, y: clipped.y - c.y, width: clipped.width, height: clipped.height });
    const bounded = clipRect(local, { x: 0, y: 0, width: c.width, height: c.height })!;
    rects.push(bounded);
    if (surface.edge === 'top') top = Math.max(top, Math.min(c.height, bounded.y + bounded.height + 4));
  }
  return immutableValue({ ...identity(s), space: 'canvas-css', width: c.width, height: c.height, reservedRects: rects, safeInsets, framingInsets: { ...safeInsets, top } });
}

/** Pure prospective adapter only; no production camera consumer is wired in this phase. */
export function toBufferGeometry(s: CanvasLayout, width: number, height: number): BufferGeometry {
  const fail = (reason: string | null, status: UiLayoutSnapshot['status'] = 'UNREADY'): BufferGeometry => immutableValue({ ...identity(s), status, reason, space: 'buffer', width: 0, height: 0, rawReservedRects: [], reservedRects: [], safeArea: zero() });
  if (s.status !== 'READY') return fail(s.reason, s.status);
  if (s.space !== 'canvas-css' || !finite(width, height, s.width, s.height) || width <= 0 || height <= 0 || s.width <= 0 || s.height <= 0 || !validInsets(s.framingInsets) || !validInsets(s.safeInsets) || s.reservedRects.some(r => !validRect(r) || r.x < 0 || r.y < 0 || r.x + r.width > s.width || r.y + r.height > s.height)) return fail('INVALID_RECT');
  const sx = width / s.width, sy = height / s.height;
  if (Math.abs(sx - sy) * Math.max(s.width, s.height) > 2) return fail('BUFFER_ASPECT_MISMATCH');
  const scale = (r: Rect): Rect => ({ x: r.x * sx, y: r.y * sy, width: r.width * sx, height: r.height * sy });
  const expanded = s.reservedRects.map(r => clipRect({ x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8 }, { x: 0, y: 0, width: s.width, height: s.height })!);
  const i = s.framingInsets;
  return immutableValue({ ...identity(s), space: 'buffer', width, height, rawReservedRects: s.reservedRects.map(scale), reservedRects: expanded.map(scale), safeArea: { left: i.left * sx, right: i.right * sx, top: i.top * sy, bottom: i.bottom * sy } });
}

/** Explicit host-driven read phase; invalidation never schedules a second game loop. */
export class LayoutLease {
  private snapshot: UiLayoutSnapshot | null = null;
  private epoch = 0;
  private revision = 0;
  private dirty = true;
  private generation = 0;
  private disposed = false;
  private resetting = false;
  private lastReadFrame = -1;
  private lastFrame = -1;
  private basisKey = '';
  private listeners = new Set<(notice: LayoutNotice) => void>();
  private producerId: string;
  constructor(id: string) { this.producerId = id; }
  read(): UiLayoutSnapshot | null { return this.snapshot; }
  subscribe(listener: (notice: LayoutNotice) => void): () => void {
    if (this.disposed) return () => {};
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  }
  private notice(status: UiLayoutSnapshot['status'], reason: string): void {
    const n = immutableValue({ producerId: this.producerId, epoch: this.epoch, layoutRevision: this.revision, status, reason });
    // One observer cannot prevent the other leases from being revoked.
    for (const listener of [...this.listeners]) { try { listener(n); } catch { /* subscriber owns its failure */ } }
  }
  private commit(b: MeasureBasis, m: Measurement, status: UiLayoutSnapshot['status'], reason: string | null): UiLayoutSnapshot {
    const value = { ...b, producerId: this.producerId, epoch: this.epoch, layoutRevision: ++this.revision, status, reason, profile: b.page === 'PLAYING' ? 'gameplay' : b.page === 'MENU' ? 'menu' : 'modal', modal: b.page === 'PLAYING' || b.page === 'MENU' ? 'none' : 'dimmed', deviceInsets: m.deviceInsets, surfaces: [...m.surfaces].sort((a, z) => a.id.localeCompare(z.id)) } as UiLayoutSnapshot;
    this.snapshot = immutableValue(value); return this.snapshot;
  }
  invalidate(reason = 'DIRTY'): void {
    if (this.disposed) return;
    this.generation++;
    if (this.dirty) return;
    this.dirty = true;
    if (this.snapshot) this.commit(this.snapshot, { deviceInsets: zero(), surfaces: [] }, 'UNREADY', reason);
    this.notice('UNREADY', reason);
  }
  sample(b: MeasureBasis, read: () => Measurement): UiLayoutSnapshot {
    if (this.disposed) return this.snapshot ?? this.commit(b, { deviceInsets: zero(), surfaces: [] }, 'RELEASED', 'DISPOSED');
    const error = basisError(b);
    if (error || b.sampleFrame < this.lastFrame) {
      this.invalidate(error ?? 'STALE_LAYOUT');
      return this.commit(b, { deviceInsets: zero(), surfaces: [] }, 'UNREADY', error ?? 'STALE_LAYOUT');
    }
    this.lastFrame = b.sampleFrame;
    const { sampleFrame: _frame, ...rest } = b; const key = JSON.stringify(rest);
    if (key !== this.basisKey) this.invalidate('STALE_LAYOUT');
    if (!this.dirty && this.snapshot) return this.snapshot;
    if (b.sampleFrame <= this.lastReadFrame) return this.snapshot ?? this.commit(b, { deviceInsets: zero(), surfaces: [] }, 'UNREADY', 'DIRTY');
    this.lastReadFrame = b.sampleFrame;
    const generation = this.generation, epoch = this.epoch;
    let m: Measurement;
    try { m = read(); } catch { m = { deviceInsets: zero(), surfaces: [], reason: 'MEASUREMENT_FAILED' }; }
    if (this.disposed) return this.snapshot ?? this.commit(b, { deviceInsets: zero(), surfaces: [] }, 'RELEASED', 'DISPOSED');
    if (epoch !== this.epoch) return this.snapshot ?? this.commit(b, { deviceInsets: zero(), surfaces: [] }, 'UNREADY', 'DIRTY');
    if (generation !== this.generation) return this.commit(b, { deviceInsets: zero(), surfaces: [] }, 'UNREADY', 'DIRTY');
    const candidate = { ...b, ...m, producerId: this.producerId, epoch, layoutRevision: this.revision, status: 'READY', reason: null, profile: 'gameplay', modal: 'none' } as UiLayoutSnapshot;
    const reason = m.reason ?? normalizeOcclusion(candidate).reason;
    this.basisKey = key; this.dirty = false;
    return this.commit(b, m, reason ? 'UNREADY' : 'READY', reason);
  }
  reset(): void {
    if (this.disposed || this.resetting) return;
    this.resetting = true;
    try {
      const oldNotice = immutableValue({ producerId: this.producerId, epoch: this.epoch, layoutRevision: this.revision, status: 'RELEASED' as const, reason: 'RESET' });
      this.epoch++; this.generation++; this.dirty = true; this.lastReadFrame = this.lastFrame = -1; this.basisKey = '';
      if (this.snapshot) this.commit(this.snapshot, { deviceInsets: zero(), surfaces: [] }, 'UNREADY', 'DIRTY');
      for (const listener of [...this.listeners]) { try { listener(oldNotice); } catch { /* subscriber owns its failure */ } }
    } finally { this.resetting = false; }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.generation++;
    if (this.snapshot) this.commit(this.snapshot, { deviceInsets: zero(), surfaces: [] }, 'RELEASED', 'DISPOSED');
    this.notice('RELEASED', 'DISPOSED'); this.listeners.clear();
  }
}
