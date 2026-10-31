/** Axis-aligned logical geometry: X/Z centre, Y bottom; all lengths in metres. */
export interface ContactBox {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}
export interface SweptContact {
  readonly entityId: string;
  /** Normalized time within this integration segment, in [0,1]. */
  readonly time: number;
  /** Outward obstacle normal. Tied axes use X, then Y, then Z. */
  readonly normal: { readonly x: number; readonly y: number; readonly z: number };
  readonly initialOverlap: boolean;
}

/** Linear relative translation of fixed-size AABBs. Tangency alone has no volume. */
export function sweepAABB(player0: ContactBox, player1: ContactBox,
  obstacle0: ContactBox, obstacle1: ContactBox, entityId: string): SweptContact | null {
  const axes = ['x', 'y', 'z'] as const;
  const p0 = [player0.x - player0.width / 2, player0.y, player0.z - player0.depth / 2];
  const pMax = [player0.x + player0.width / 2, player0.y + player0.height, player0.z + player0.depth / 2];
  const o0 = [obstacle0.x - obstacle0.width / 2, obstacle0.y, obstacle0.z - obstacle0.depth / 2];
  const oMax = [obstacle0.x + obstacle0.width / 2, obstacle0.y + obstacle0.height, obstacle0.z + obstacle0.depth / 2];
  const overlap = p0.every((min, i) => min < oMax[i] && pMax[i] > o0[i]);
  let enter = -Infinity, exit = Infinity, normalAxis = 0, normalSign = -1;
  let minimumPenetration = Infinity;
  for (let i = 0; i < 3; i++) {
    const axis = axes[i];
    const relative = player1[axis] - player0[axis] - (obstacle1[axis] - obstacle0[axis]);
    if (overlap) {
      const negative = pMax[i] - o0[i], positive = oMax[i] - p0[i];
      const penetration = Math.min(negative, positive);
      if (penetration < minimumPenetration) {
        minimumPenetration = penetration; normalAxis = i;
        normalSign = negative <= positive ? -1 : 1;
      }
    }
    if (relative === 0) {
      if (p0[i] >= oMax[i] || pMax[i] <= o0[i]) return null;
      continue;
    }
    const t0 = (o0[i] - pMax[i]) / relative;
    const t1 = (oMax[i] - p0[i]) / relative;
    const axisEnter = Math.min(t0, t1), axisExit = Math.max(t0, t1);
    if (!overlap && axisEnter > enter) {
      normalAxis = i; normalSign = relative > 0 ? -1 : 1;
    }
    enter = Math.max(enter, axisEnter); exit = Math.min(exit, axisExit);
  }
  // Strict interval intersection excludes touching while moving away and grazing.
  if (!overlap && (Math.max(enter, 0) >= Math.min(exit, 1))) return null;
  const normal = { x: 0, y: 0, z: 0 };
  normal[axes[normalAxis]] = normalSign;
  return { entityId, time: overlap ? 0 : Math.max(0, enter), normal, initialOverlap: overlap };
}

/** Locale-independent total order for deterministic same-time contact decisions. */
export function compareContacts(a: SweptContact, b: SweptContact): number {
  return a.time - b.time || (a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0);
}
