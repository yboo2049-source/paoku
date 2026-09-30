import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioEngine } from '../../src/systems/audio';

// —— Web Audio API 最小 Mock（Node 环境无 window.AudioContext）——
class MockParam {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class MockNode {
  connect = vi.fn();
}

class MockOscillator extends MockNode {
  type = 'sine';
  frequency = new MockParam();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain extends MockNode {
  gain = new MockParam();
}

class MockFilter extends MockNode {
  type = 'lowpass';
  Q = new MockParam();
  frequency = new MockParam();
}

class MockCompressor extends MockNode {
  threshold = new MockParam();
  knee = new MockParam();
  ratio = new MockParam();
  attack = new MockParam();
  release = new MockParam();
}

class MockPanner extends MockNode {
  pan = new MockParam();
}

class MockBufferSource extends MockNode {
  buffer: unknown = null;
  playbackRate = new MockParam();
  start = vi.fn();
  stop = vi.fn();
}

const ctxInstances: MockAudioContext[] = [];

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createGain = vi.fn(() => new MockGain());
  createOscillator = vi.fn(() => new MockOscillator());
  createBiquadFilter = vi.fn(() => new MockFilter());
  createDynamicsCompressor = vi.fn(() => new MockCompressor());
  createStereoPanner = vi.fn(() => new MockPanner());
  createBufferSource = vi.fn(() => new MockBufferSource());
  createBuffer = vi.fn((_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }));
  resume = vi.fn();

  constructor() {
    ctxInstances.push(this);
  }
}

let mockStore: Record<string, string>;

beforeEach(() => {
  ctxInstances.length = 0;
  mockStore = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in mockStore ? mockStore[k] : null),
    setItem: (k: string, v: string) => {
      mockStore[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStore[k];
    },
  };
  (globalThis as any).window = { AudioContext: MockAudioContext };
});

describe('AudioEngine (AC-PRD-08 Web Audio)', () => {
  it('should lazily create AudioContext only on first playback and reuse it', () => {
    const engine = new AudioEngine();
    expect(ctxInstances.length).toBe(0); // 尚未初始化

    engine.playJump();
    expect(ctxInstances.length).toBe(1); // 首次播放懒初始化

    engine.playCoin();
    expect(ctxInstances.length).toBe(1); // 复用同一上下文
  });

  it('should route SFX through oscillators (JUMP/COIN/POWERUP/CRASH)', () => {
    const engine = new AudioEngine();
    engine.playJump();
    expect(ctxInstances[0].createOscillator).toHaveBeenCalled();

    const before = ctxInstances[0].createOscillator.mock.calls.length;
    engine.playCrash();
    expect(ctxInstances[0].createOscillator.mock.calls.length).toBeGreaterThan(before);
  });

  it('should toggle mute and persist to localStorage', () => {
    const engine = new AudioEngine();
    expect(engine.getMuted()).toBe(false);

    engine.toggleMute();
    expect(engine.getMuted()).toBe(true);
    expect(mockStore['paoku_audio_master_muted']).toBe('1');
  });

  it('should suppress SFX playback when muted', () => {
    const engine = new AudioEngine();
    engine.toggleMute(); // muted = true

    engine.playJump();
    // 上下文已创建，但因静音不创建振荡器
    expect(ctxInstances[0].createOscillator).not.toHaveBeenCalled();
  });

  it('should clamp volumes to [0, 1]', () => {
    const engine = new AudioEngine();
    engine.setSfxVolume(1.5);
    expect(engine.getSfxVolume()).toBe(1);
    engine.setSfxVolume(-0.5);
    expect(engine.getSfxVolume()).toBe(0);

    engine.setBgmVolume(2);
    expect(engine.getBgmVolume()).toBe(1);
    engine.setBgmVolume(-1);
    expect(engine.getBgmVolume()).toBe(0);
  });

  it('should toggle BGM / SFX enable state independently', () => {
    const engine = new AudioEngine();
    expect(engine.getBgmEnabled()).toBe(true);
    expect(engine.getSfxEnabled()).toBe(true);

    engine.setBgmEnabled(false);
    engine.setSfxEnabled(false);
    expect(engine.getBgmEnabled()).toBe(false);
    expect(engine.getSfxEnabled()).toBe(false);
  });

  it('should start and stop chase sounds via setChaseState and stopChase', () => {
    const engine = new AudioEngine();
    engine.setChaseState(1.5, true);
    // 追逐已启动，应创建警笛节点
    expect(ctxInstances.length).toBe(1);
    expect(ctxInstances[0].createOscillator).toHaveBeenCalled();

    // 终止追逐
    engine.stopChase();
    // 再次调用 stopChase 应保持幂等无报错
    expect(() => engine.stopChase()).not.toThrow();
  });
});
