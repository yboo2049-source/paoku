import type { ObstacleEntity, PlayerEntity } from '../types';
import { CONSTANTS } from '../types';
/** Numerical endpoint tolerance, not a gameplay snap distance (metres). */
export const SURFACE_EPSILON = 1e-6;
export interface Surface {
    readonly id: string;
    readonly ownerEntityId: string;
    readonly kind: 'GROUND' | 'RAMP' | 'ROOF';
    readonly origin: {
        x: number;
        y: number;
        z: number;
    };
    readonly localBounds: {
        xMin: number;
        xMax: number;
        zMin: number;
        zMax: number;
    };
    readonly startHeight: number;
    readonly endHeight: number;
}
export const GROUND: Surface = { id: 'ground', ownerEntityId: 'ground', kind: 'GROUND', origin: { x: 0, y: 0, z: 0 }, localBounds: { xMin: -Infinity, xMax: Infinity, zMin: -Infinity, zMax: Infinity }, startHeight: 0, endHeight: 0 };
export function obstacleSurface(o: ObstacleEntity): Surface | null {
    if (!['RAMP', 'STATIC_TRAIN', 'MOVING_TRAIN'].includes(o.type) || o.depth <= 0 || o.width <= 0)
        return null;
    const ramp = o.type === 'RAMP';
    return { id: o.id + (ramp ? ':ramp' : ':roof'), ownerEntityId: o.id, kind: ramp ? 'RAMP' : 'ROOF', origin: { x: o.x, y: o.y, z: o.z }, localBounds: { xMin: -o.width / 2, xMax: o.width / 2, zMin: -o.depth / 2, zMax: o.depth / 2 }, startHeight: ramp ? 0 : o.height, endHeight: o.height };
}
export function sampleSurface(s: Surface, x: number, z: number): number | null {
    if (s.kind === 'GROUND')
        return 0;
    const b = s.localBounds, lx = x - s.origin.x, lz = z - s.origin.z;
    if (lx < b.xMin - SURFACE_EPSILON || lx > b.xMax + SURFACE_EPSILON || lz < b.zMin - SURFACE_EPSILON || lz > b.zMax + SURFACE_EPSILON)
        return null;
    return s.origin.y + s.startHeight + (s.endHeight - s.startHeight) * (lz - b.zMin) / (b.zMax - b.zMin);
}
/** A segment can continue onto another surface only across a common endpoint.
 * This tests geometric seams, not obstacle damage sweeps. */
function connects(a: Surface, b: Surface, from: {
    x: number;
    z: number;
}, to: {
    x: number;
    z: number;
}): boolean {
    if (a.id === b.id)
        return true;
    if (a.kind === 'GROUND' && b.kind === 'GROUND')
        return true;
    const dz = to.z - from.z;
    if (Math.abs(dz) <= SURFACE_EPSILON)
        return false;
    const boundary = b.kind === 'GROUND' ? a.origin.z + (dz > 0 ? a.localBounds.zMax : a.localBounds.zMin) : b.origin.z + (dz > 0 ? b.localBounds.zMin : b.localBounds.zMax);
    const t = (boundary - from.z) / dz;
    if (t < -SURFACE_EPSILON || t > 1 + SURFACE_EPSILON)
        return false;
    const x = from.x + (to.x - from.x) * t;
    const ha = sampleSurface(a, x, boundary), hb = sampleSurface(b, x, boundary);
    return ha !== null && hb !== null && Math.abs(ha - hb) <= SURFACE_EPSILON;
}
export function resolveSupport(player: PlayerEntity, dt: number, before: readonly Surface[], after: readonly Surface[]): boolean {
    const previous = player.supportSample;
    const old = before.find(s => s.id === player.supportSurfaceId);
    const rising = player.vy > 0;
    const validOld = old && previous && Math.abs(previous.y - player.y) <= SURFACE_EPSILON && sampleSurface(old, previous.x, previous.z) !== null;
    // For legacy callers first placement exactly on a surface establishes contact.
    const y0 = player.y;
    const vy = player.vy + CONSTANTS.GRAVITY * dt;
    const y1 = y0 + vy * dt;
    let best: {
        s: Surface;
        y: number;
    } | null = null;
    for (const s of after) {
        const h = sampleSurface(s, player.x, player.z);
        if (h === null)
            continue;
        const continuous = !rising && !player.isJumping && validOld && connects(old, s, previous, player);
        const touching = !rising && Math.abs(y0 - h) <= SURFACE_EPSILON;
        const previousSurface = before.find(b => b.id === s.id);
        const previousHeight = previous && previousSurface && Math.abs(y0 - previous.y) <= SURFACE_EPSILON ? sampleSurface(previousSurface, previous.x, previous.z) : null;
        const previousGap = previousHeight === null ? y0 - h : previous!.y - previousHeight;
        const nextGap = y1 - h;
        // Compare signed distances in the surface frame: a rising ramp may
        // overtake feet whose world-space vertical velocity is still positive.
        const relativeDescending = previousHeight === null ? !rising : nextGap <= previousGap;
        const crossing = dt > 0 && relativeDescending && previousGap >= -SURFACE_EPSILON && nextGap <= SURFACE_EPSILON;
        if ((continuous || touching || crossing) && (!best || h > best.y || (h === best.y && (s.id === player.supportSurfaceId || (best.s.id !== player.supportSurfaceId && s.id < best.s.id)))))
            best = { s, y: h };
    }
    const wasAirborne = player.contact === 'AIRBORNE' || player.isJumping;
    if (best) {
        player.y = best.y;
        player.vy = 0;
        player.isJumping = false;
        player.supportSurfaceId = best.s.id;
        player.contact = 'SUPPORTED';
    }
    else {
        player.y = y1;
        player.vy = vy;
        player.supportSurfaceId = null;
        player.contact = 'AIRBORNE';
        player.isJumping = true;
    }
    if (!best && validOld && old.kind === 'ROOF' && previous) {
        const b = old.localBounds;
        const side = player.z > old.origin.z + b.zMax ? 'REAR' : player.x < old.origin.x + b.xMin ? 'LEFT' : player.x > old.origin.x + b.xMax ? 'RIGHT' : null;
        if (side)
            player.supportDeparture = { ownerEntityId: old.ownerEntityId, side, y: previous.y };
    }
    if (best)
        player.supportDeparture = null;
    const departure = player.supportDeparture;
    if (departure) {
        const owner = after.find(s => s.ownerEntityId === departure.ownerEntityId);
        if (!owner || player.y > departure.y + SURFACE_EPSILON ||
            player.x - CONSTANTS.PLAYER_WIDTH / 2 >= owner.origin.x + owner.localBounds.xMax ||
            player.x + CONSTANTS.PLAYER_WIDTH / 2 <= owner.origin.x + owner.localBounds.xMin ||
            player.z - CONSTANTS.PLAYER_DEPTH / 2 >= owner.origin.z + owner.localBounds.zMax ||
            player.z + CONSTANTS.PLAYER_DEPTH / 2 <= owner.origin.z + owner.localBounds.zMin)
            player.supportDeparture = null;
    }
    player.supportSample = { x: player.x, y: player.y, z: player.z };
    player.supportRampExit = best?.s.kind === 'RAMP' ? {
        xMin: best.s.origin.x + best.s.localBounds.xMin, xMax: best.s.origin.x + best.s.localBounds.xMax,
        z: best.s.origin.z + best.s.localBounds.zMax, y: best.s.origin.y + best.s.endHeight,
    } : null;
    return !!best && wasAirborne;
}
