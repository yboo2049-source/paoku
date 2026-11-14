import type { DeepReadonly, SimSnapshot } from '../types/contracts';

/** Copy all values; freezing a native Map alone does not freeze its entries. */
export function immutableCopy<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== 'object') return value as DeepReadonly<T>;
  if (value instanceof Map) {
    const target = new Map([...value].map(([k, v]) => [immutableCopy(k), immutableCopy(v)]));
    const reject = () => { throw new TypeError('Committed snapshot is read-only'); };
    const proxy = new Proxy(target, { get(map, key) {
      if (key === 'set' || key === 'delete' || key === 'clear') return reject;
      if (key === 'forEach') return (fn: Function, thisArg?: unknown) => map.forEach((v, k) => fn.call(thisArg, v, k, proxy));
      const result = Reflect.get(map, key, map);
      // Only native Map readers need the target receiver. Binding inherited
      // valueOf would return that mutable target and bypass this proxy.
      return typeof result === 'function' && (key === Symbol.iterator || ['get', 'has', 'entries', 'keys', 'values'].includes(String(key))) ? result.bind(map) : result;
    } });
    return Object.freeze(proxy) as DeepReadonly<T>;
  }
  if (Array.isArray(value)) return Object.freeze(value.map(v => immutableCopy(v))) as DeepReadonly<T>;
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, immutableCopy(v)]))) as DeepReadonly<T>;
}

type Position = { x: number; y: number; z: number };
type SpatialContext = { player: Position; obstacles?: readonly (Position & { id: string })[]; coinEntities?: readonly (Position & { id: string })[]; powerUpEntities?: readonly (Position & { id: string })[] };
/** Accepts a legacy value frame as well as the metadata envelope. No physics consumes this. */
export function interpolateSnapshots<T extends { runId: string; discontinuity?: boolean; phase?: string }>(previous: T | null, current: T, alpha: number): DeepReadonly<T> {
  if (!previous || previous.runId !== current.runId || current.discontinuity || (current.phase !== undefined && current.phase !== 'RUNNING')) return immutableCopy(current);
  const t = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
  const before = ('context' in previous ? previous.context : previous) as SpatialContext;
  const latest = ('context' in current ? current.context : current) as SpatialContext;
  const blend = (a: Position, b: Position) => ({ ...b, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
  const context = { ...latest, player: blend(before.player, latest.player) };
  for (const key of ['obstacles', 'coinEntities', 'powerUpEntities'] as const) {
    if (!latest[key]) continue;
    const oldById = new Map(before[key]?.map(v => [v.id, v]));
    context[key] = latest[key].map(v => oldById.has(v.id) ? blend(oldById.get(v.id)!, v) as Position & { id: string } : v);
  }
  return immutableCopy(('context' in current ? { ...current, context } : { ...current, ...context }) as T);
}
export type CommittedSnapshot = DeepReadonly<SimSnapshot>;
