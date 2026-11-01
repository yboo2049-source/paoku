import { afterEach, expect, it, vi } from 'vitest';
import { UIManager } from '../../../src/ui/dom';

vi.mock('../../../src/systems/audio', () => ({ audioEngine: {} }));
afterEach(() => vi.unstubAllGlobals());

it('preserves the focused native range draft while the committed audio snapshot is unchanged', () => {
  const range = { value: '61' };
  const otherRange = { value: '30' };
  const page = {
    activeElement: range as unknown,
    getElementById(id: string) {
      return id === 'bgm-volume' ? range : id === 'sfx-volume' ? otherRange : null;
    },
  };
  vi.stubGlobal('document', page);
  const view = {
    readApp: () => ({ audio: { masterMuted: false, bgmEnabled: true, sfxEnabled: true, bgmVolume: 0.6, sfxVolume: 0.9 } }),
  };
  const render = () => (UIManager.prototype as any).renderAudioControls.call(view);
  render();
  expect(range.value).toBe('61');
  expect(otherRange.value).toBe('90');
  // Blur discards any uncommitted presentation draft and reveals authority again.
  page.activeElement = null;
  render();
  expect(range.value).toBe('60');
});
