import type { GlobalSaveData } from '../types';

const STORAGE_KEY = 'paoku_save_data_v2';

export const defaultSaveData: GlobalSaveData = {
  highScore: 0,
  totalCoins: 0,
  unlockedSkins: ['#0f3460'] // 默认皮肤颜色
};

export function loadSaveData(): GlobalSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultSaveData, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load save data', e);
  }
  return { ...defaultSaveData };
}

export function saveSaveData(data: GlobalSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data', e);
  }
}
