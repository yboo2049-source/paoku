/** Pure handoff data. No GLB is loaded or measured by simulation. */
export interface ModelBinding {
  definitionId: string;
  visualPrefabId: string;
  modelPath: string;
  assetCommit: string;
  calibration: 'UNCALIBRATED';
  fallback: 'LEGACY_PRIMITIVES';
  transform: null;
}
const ASSET_COMMIT = '622e7daa2262015f34e511e59628a3653273994d';
export const MODEL_BINDINGS: Readonly<Record<string, Readonly<ModelBinding>>> = Object.freeze({
  carriage: Object.freeze({ definitionId: 'carriage', visualPrefabId: 'ordinary-carriage', modelPath: '/models/train_ramp_or_car.glb', assetCommit: ASSET_COMMIT, calibration: 'UNCALIBRATED', fallback: 'LEGACY_PRIMITIVES', transform: null }),
  'ramp-truck': Object.freeze({ definitionId: 'ramp-truck', visualPrefabId: 'ramp-engineering-truck', modelPath: '/models/train_metro.glb', assetCommit: ASSET_COMMIT, calibration: 'UNCALIBRATED', fallback: 'LEGACY_PRIMITIVES', transform: null }),
});
