import type { CameraInput } from '../render/cameraRig';
import type { BufferGeometry, Page } from './hudSafeArea';

export type HudCameraFrame = Readonly<{
  frameId: number;
  consumerGeneration: number;
  page: Page;
  runId: string | null;
  geometry: BufferGeometry | null;
  unavailableReason: string | null;
}>;

/** Already-buffer-space input only. No DOM, scaling, event delivery or options mutation. */
export function hudCameraInput(
  options: Partial<CameraInput>, width: number, height: number, page: Page, hud?: HudCameraFrame,
) {
  const base: CameraInput = { ...options, width, height };
  if (!hud) return { input: base, status: 'LEGACY' as const, reason: null, ready: false };
  const unavailable = (reason: string, status: 'UNREADY' | 'RELEASED' = 'UNREADY') => ({
    input: { ...base, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, reservedRects: [] } as CameraInput,
    status, reason, ready: false,
  });
  if (!Number.isSafeInteger(hud.frameId) || hud.frameId < 0 ||
      !Number.isSafeInteger(hud.consumerGeneration) || hud.consumerGeneration < 0 || hud.page !== page)
    return unavailable('STALE_LAYOUT');
  const g = hud.geometry;
  if (!g) return unavailable(hud.unavailableReason ?? 'DIRTY');
  if (g.status !== 'READY') return unavailable(g.reason ?? 'DIRTY', g.status === 'RELEASED' ? 'RELEASED' : 'UNREADY');
  if (g.space !== 'buffer' || g.page !== page || g.runId !== hud.runId ||
      !g.producerId || !Number.isSafeInteger(g.epoch) || g.epoch < 0 ||
      !Number.isSafeInteger(g.layoutRevision) || g.layoutRevision < 0 ||
      !Number.isSafeInteger(g.sampleFrame) || g.sampleFrame < 0 || g.sampleFrame > hud.frameId ||
      (page === 'PLAYING' && g.profile !== 'gameplay')) return unavailable('STALE_LAYOUT');
  if (g.width !== width || g.height !== height) return unavailable('BUFFER_SIZE_CHANGED');
  const insets = g.safeArea, rects = [...g.rawReservedRects, ...g.reservedRects];
  if (![width, height].every(n => Number.isFinite(n) && n > 0) ||
      !insets || !['top','right','bottom','left'].every(k => Number.isFinite(insets[k as keyof typeof insets]) && insets[k as keyof typeof insets] >= 0) ||
      rects.some(r => ![r.x,r.y,r.width,r.height].every(Number.isFinite) || r.width <= 0 || r.height <= 0 ||
        r.x < 0 || r.y < 0 || r.x + r.width > width + 1e-8 || r.y + r.height > height + 1e-8))
    return unavailable('INVALID_RECT');
  return { input: { ...base, safeArea: { ...insets }, reservedRects: g.reservedRects.map(r => ({ ...r })) },
    status: 'READY' as const, reason: null, ready: true };
}
