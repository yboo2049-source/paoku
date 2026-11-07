// Web Audio API 纯代码合成音效 + Synth BGM 引擎
// - 混音总线：masterGain -> Compressor(限幅) -> destination；bgmBus / sfxBus 分轨
// - 闪避(Ducking)：关键 SFX 触发时压低 bgmBus
// - BGM 采用采样级 lookahead 调度（消除 setInterval 节拍抖动），支持淡入淡出
// - 独立 BGM / SFX 音量开关与音量值，localStorage 持久化
// - 追逐音：监听 CHASE_STATE_CHANGED，驱动警官警笛 loop 与警犬吠（距离衰减）

import { eventBus } from '../core/eventBus';
import type { AudioSettings } from '../application/types';

const AUDIO_STORAGE = {
  MASTER_MUTED: 'paoku_audio_master_muted',
  BGM_ENABLED: 'paoku_audio_bgm_enabled',
  SFX_ENABLED: 'paoku_audio_sfx_enabled',
  BGM_VOLUME: 'paoku_audio_bgm_volume',
  SFX_VOLUME: 'paoku_audio_sfx_volume',
} as const;

const DEFAULT_MASTER_GAIN = 0.9;
const DEFAULT_BGM_VOLUME = 0.6;
const DEFAULT_SFX_VOLUME = 0.9;

// BGM 音乐参数（Synthwave 脉冲低音，8 分音符，约 136 BPM）
const BGM_BASS_NOTES = [110, 110, 138.59, 138.59, 146.83, 146.83, 164.81, 164.81];
const BGM_STEP_DURATION = 60 / 136 / 2; // ≈ 0.2206s
const BGM_LOOKAHEAD = 0.12; // 调度前瞻窗口（秒）
const SCHEDULER_INTERVAL_MS = 25;

// 追逐音（警官警笛 + 警犬吠）参数
const SIREN_LEVEL = 0.18; // 警笛稳态响度（经 chaseBus 距离衰减）
const SIREN_BASE_FREQ = 800; // 警笛载波基频
const SIREN_LFO_FREQ = 0.8; // 警笛"呜-呜"扫频速率
const SIREN_LFO_DEPTH = 280; // 扫频幅度（基频 ±280Hz）

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export type AudioCueName =
  | 'jump'
  | 'roll'
  | 'laneChange'
  | 'landing'
  | 'coin'
  | 'powerUp'
  | 'powerUpRefresh'
  | 'powerUpExpire'
  | 'missionComplete'
  | 'newRecord'
  | 'shieldBreak'
  | 'crash'
  | 'trainHorn'
  | 'trainPass';

export type AudioLifecycleState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'STOPPED' | 'DISPOSED';

export interface AudioDiagnostics {
  readonly initialized: boolean;
  readonly lifecycleState: 'IDLE' | 'PLAYING' | 'PAUSED' | 'STOPPED' | 'DISPOSED';
  readonly isMuted: boolean;
  readonly bgmEnabled: boolean;
  readonly sfxEnabled: boolean;
  readonly bgmVolume: number;
  readonly sfxVolume: number;
  readonly isBgmPlaying: boolean;
  readonly hasBgmScheduler: boolean;
  readonly activeBgmSourceCount: number;
  readonly isChasing: boolean;
  readonly hasBarkTimer: boolean;
  readonly cueCounts: Readonly<Record<string, number>>;
}

function createInitialCueCounts(): Record<AudioCueName, number> {
  return {
    jump: 0,
    roll: 0,
    laneChange: 0,
    landing: 0,
    coin: 0,
    powerUp: 0,
    powerUpRefresh: 0,
    powerUpExpire: 0,
    missionComplete: 0,
    newRecord: 0,
    shieldBreak: 0,
    crash: 0,
    trainHorn: 0,
    trainPass: 0,
  };
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private bgmBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  // 静音 / 开关 / 音量状态
  private isMuted = false;
  private bgmEnabled = true;
  private sfxEnabled = true;
  private bgmVolume = DEFAULT_BGM_VOLUME;
  private sfxVolume = DEFAULT_SFX_VOLUME;

  // BGM 采样级调度状态
  private isBgmPlaying = false;
  private bgmSchedulerId: number | null = null;
  private nextBgmNoteTime = 0;
  private bgmStep = 0;
  private bgmActiveSources = new Set<OscillatorNode>();

  // 复用白噪声缓冲
  private noiseBuffer: AudioBuffer | null = null;

  // 追逐音（警官警笛 + 警犬吠）节点与状态
  private chaseBus: GainNode | null = null; // 距离衰减总线，接入 sfxBus
  private sirenOsc: OscillatorNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private sirenLfoDepth: GainNode | null = null;
  private sirenFilter: BiquadFilterNode | null = null;
  private sirenEnvGain: GainNode | null = null; // 淡入淡出
  private isChasing = false;
  private barkTimerId: number | null = null;

  // PAO-20 音效触发计数与生命周期状态
  private cueCounts: Record<AudioCueName, number> = createInitialCueCounts();
  private lifecycleState: AudioLifecycleState = 'IDLE';

  private readonly legacyPersistence: boolean;
  private readonly onChaseStateChanged = (payload: any) => {
    if (this.lifecycleState === 'DISPOSED') return;
    this.setChaseState(payload?.distance ?? 2.8, payload?.isNear === true);
  };
  private readonly onCollision = () => {
    this.stopChase();
  };
  private readonly onVisibilityChange = () => {
    if (this.lifecycleState === 'DISPOSED') return;
    if (typeof document !== 'undefined' && document.hidden) {
      this.pauseBgmScheduler();
    } else if (this.isBgmPlaying && this.ctx && this.lifecycleState !== 'PAUSED') {
      this.nextBgmNoteTime = this.ctx.currentTime + 0.05;
      this.startBgmScheduler();
    }
  };

  constructor(legacyPersistence = true) {
    this.legacyPersistence = legacyPersistence;
    if (this.legacyPersistence) this.loadPersistence();
    // 追逐状态：监听 CHASE_STATE_CHANGED，驱动警笛 loop 与警犬吠
    eventBus.on('CHASE_STATE_CHANGED', this.onChaseStateChanged);
    // 碰撞/游戏结束时，立即终止追逐警笛与警犬吠
    eventBus.on('COLLISION', this.onCollision);
    // 移动端/后台：页面隐藏时暂停调度，恢复时续排（避免后台节流造成空隙/跑拍）
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  // ===== 持久化 =====

  private loadPersistence(): void {
    try {
      this.isMuted = localStorage.getItem(AUDIO_STORAGE.MASTER_MUTED) === '1';
      this.bgmEnabled = localStorage.getItem(AUDIO_STORAGE.BGM_ENABLED) !== '0';
      this.sfxEnabled = localStorage.getItem(AUDIO_STORAGE.SFX_ENABLED) !== '0';
      const bv = localStorage.getItem(AUDIO_STORAGE.BGM_VOLUME);
      const sv = localStorage.getItem(AUDIO_STORAGE.SFX_VOLUME);
      if (bv !== null) this.bgmVolume = clamp01(parseFloat(bv));
      if (sv !== null) this.sfxVolume = clamp01(parseFloat(sv));
    } catch {
      // localStorage 不可用时使用默认值
    }
  }

  private savePersistence(): void {
    if (!this.legacyPersistence) return;
    try {
      localStorage.setItem(AUDIO_STORAGE.MASTER_MUTED, this.isMuted ? '1' : '0');
      localStorage.setItem(AUDIO_STORAGE.BGM_ENABLED, this.bgmEnabled ? '1' : '0');
      localStorage.setItem(AUDIO_STORAGE.SFX_ENABLED, this.sfxEnabled ? '1' : '0');
      localStorage.setItem(AUDIO_STORAGE.BGM_VOLUME, String(this.bgmVolume));
      localStorage.setItem(AUDIO_STORAGE.SFX_VOLUME, String(this.sfxVolume));
    } catch {
      // 忽略写入失败
    }
  }

  /** Preferences are applied only after the application commits the versioned save. */
  public applySettings(settings: Readonly<AudioSettings>): void {
    if (this.isMuted !== settings.masterMuted) this.toggleMute();
    if (this.bgmEnabled !== settings.bgmEnabled) this.setBgmEnabled(settings.bgmEnabled);
    if (this.sfxEnabled !== settings.sfxEnabled) this.setSfxEnabled(settings.sfxEnabled);
    if (this.bgmVolume !== settings.bgmVolume) this.setBgmVolume(settings.bgmVolume);
    if (this.sfxVolume !== settings.sfxVolume) this.setSfxVolume(settings.sfxVolume);
  }

  // ===== 上下文与总线初始化 =====

  private initCtx(): void {
    if (this.ctx || this.lifecycleState === 'DISPOSED') return;
    const AudioContextClass =
      typeof window !== 'undefined' ? window.AudioContext || (window as any).webkitAudioContext : undefined;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // 主总线：masterGain -> Compressor(限幅防削波) -> destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : DEFAULT_MASTER_GAIN, this.ctx.currentTime);

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -6;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    // BGM 分轨
    this.bgmBus = this.ctx.createGain();
    this.bgmBus.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume : 0, this.ctx.currentTime);
    this.bgmBus.connect(this.masterGain);

    // SFX 分轨
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.setValueAtTime(this.sfxEnabled ? this.sfxVolume : 0, this.ctx.currentTime);
    this.sfxBus.connect(this.masterGain);
  }

  public ensureContext(): void {
    this.initCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.isBgmPlaying && this.ctx) {
          this.nextBgmNoteTime = this.ctx.currentTime + 0.05;
        }
      });
    }
  }

  // ===== 静音 / 音量控制 =====

  /** 主静音（全局），用 setTargetAtTime 平滑过渡，避免爆音 */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.savePersistence();
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : DEFAULT_MASTER_GAIN, now, 0.03);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    this.savePersistence();
    this.applyBgmGain(enabled ? this.bgmVolume : 0, 0.1);
  }

  public getBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    this.savePersistence();
    this.applySfxGain(enabled ? this.sfxVolume : 0, 0.1);
  }

  public getSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setBgmVolume(v: number): void {
    this.bgmVolume = clamp01(v);
    this.savePersistence();
    this.applyBgmGain(this.bgmEnabled ? this.bgmVolume : 0, 0.05);
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setSfxVolume(v: number): void {
    this.sfxVolume = clamp01(v);
    this.savePersistence();
    this.applySfxGain(this.sfxEnabled ? this.sfxVolume : 0, 0.05);
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  private applyBgmGain(target: number, timeConstant = 0.15): void {
    if (!this.ctx || !this.bgmBus) return;
    this.bgmBus.gain.setTargetAtTime(target, this.ctx.currentTime, timeConstant);
  }

  private applySfxGain(target: number, timeConstant = 0.1): void {
    if (!this.ctx || !this.sfxBus) return;
    this.sfxBus.gain.setTargetAtTime(target, this.ctx.currentTime, timeConstant);
  }

  /** 闪避(Ducking)：关键 SFX 触发时快速压低 BGM，结束再平滑恢复 */
  private duckBgm(durationSec: number): void {
    if (!this.ctx || !this.bgmBus) return;
    const now = this.ctx.currentTime;
    const target = this.bgmEnabled ? this.bgmVolume : 0;
    const duckLevel = target * 0.3;
    this.bgmBus.gain.setTargetAtTime(duckLevel, now, 0.015);
    this.bgmBus.gain.setTargetAtTime(target, now + durationSec, 0.12);
  }

  // ===== 复用工具 =====

  /** 缓存白噪声缓冲（护盾破碎 / 切道 whoosh 复用） */
  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noiseBuffer) return this.noiseBuffer;
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /** 通用单音合成（支持可选立体声 pan），路由至 sfxBus */
  private playTone(
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    peakGain: number,
    pan = 0
  ): void {
    if (!this.ctx || !this.sfxBus) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);

    let dest: AudioNode = gain;
    if (pan !== 0) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      dest = panner;
    }

    dest.connect(this.sfxBus);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
        if (pan !== 0) (dest as StereoPannerNode).disconnect();
      } catch {}
    };
  }

  // ===== SFX 音效 =====

  public playJump(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.jump++;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.15);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.18);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  public playRoll(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.roll++;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.2);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /** 切道 whoosh（带左右 pan） */
  public playLaneChange(direction: -1 | 1): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;

    const buffer = this.getNoiseBuffer();
    if (!buffer) return;
    this.cueCounts.laneChange++;

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.16);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = direction < 0 ? -0.6 : 0.6;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxBus);

    source.start(now);
    source.stop(now + 0.2);
    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        panner.disconnect();
      } catch {}
    };
  }

  /** 落地闷响 */
  public playLanding(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.landing++;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.16);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  public playCoin(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.coin++;

    const now = this.ctx.currentTime;
    // 清脆双音 B5 -> E6
    this.playTone(987.77, 'sine', now, 0.08, 0.4);
    this.playTone(1318.51, 'sine', now + 0.06, 0.16, 0.4);
  }

  public playPowerUp(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.powerUp++;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A Major Arpeggio
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'square', now + idx * 0.06, 0.12, 0.2);
    });
  }

  /** 道具续时刷新提示音：上行双音 chime (D5 -> A5) */
  public playPowerUpRefresh(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.powerUpRefresh++;

    const now = this.ctx.currentTime;
    this.playTone(587.33, 'sine', now, 0.09, 0.25);
    this.playTone(880, 'triangle', now + 0.05, 0.14, 0.28);
  }

  /** 道具到期结束提示音：下行柔和三角波 (E5 -> E4) */
  public playPowerUpExpire(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.powerUpExpire++;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.2);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /** 迎面列车预警鸣笛：双音低频铜管号角 (A3 + C#4，带立体声 pan) */
  public playTrainHorn(pan = 0): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.trainHorn++;

    const clampedPan = Number.isFinite(pan) ? Math.max(-1, Math.min(1, pan)) : 0;
    const now = this.ctx.currentTime;
    this.duckBgm(0.28);
    this.playTone(220, 'sawtooth', now, 0.28, 0.26, clampedPan);
    this.playTone(277.18, 'triangle', now, 0.28, 0.22, clampedPan);
  }

  /** 迎面列车掠过呼啸：多普勒带通下扫 + 低频轰鸣 (900Hz -> 260Hz) */
  public playTrainPass(pan = 0): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;

    const buffer = this.getNoiseBuffer();
    if (!buffer) return;
    this.cueCounts.trainPass++;

    const clampedPan = Number.isFinite(pan) ? Math.max(-1, Math.min(1, pan)) : 0;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(260, now + 0.24);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.38, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = clampedPan;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxBus);

    source.start(now);
    source.stop(now + 0.26);
    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        panner.disconnect();
      } catch {}
    };

    this.playTone(110, 'triangle', now, 0.22, 0.18, clampedPan);
  }

  /** 任务完成提示音 */
  public playMissionComplete(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.missionComplete++;

    this.duckBgm(0.4);
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', now + idx * 0.07, 0.16, 0.22);
    });
  }

  /** 新纪录 fanfare */
  public playNewRecord(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.newRecord++;

    this.duckBgm(0.7);
    const now = this.ctx.currentTime;
    const seq = [392.0, 523.25, 659.25, 783.99]; // G4 C5 E5 G5 上行
    seq.forEach((freq, idx) => {
      this.playTone(freq, 'square', now + idx * 0.09, 0.18, 0.22);
    });
    // 结尾 C 大三和弦
    [523.25, 659.25, 783.99].forEach((freq) => {
      this.playTone(freq, 'triangle', now + 0.4, 0.5, 0.16);
    });
  }

  public playShieldBreak(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;

    const buffer = this.getNoiseBuffer();
    if (!buffer) return;
    this.cueCounts.shieldBreak++;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // 白噪声玻璃/护盾碎裂声（高通扫频）
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    noise.start(now);
    noise.stop(now + 0.32);
    noise.onended = () => {
      try {
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {}
    };

    this.duckBgm(0.3);
  }

  public playCrash(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.ensureContext();
    if (!this.ctx || !this.sfxBus || this.isMuted || !this.sfxEnabled) return;
    this.cueCounts.crash++;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // 低频爆炸沉重撞击声
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.45);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  // ===== 追逐音（警官警笛 loop + 警犬吠） =====

  /** 由 CHASE_STATE_CHANGED 驱动：isNear 转 true 淡入启动，转 false 淡出停止 */
  public setChaseState(distance: number, isNear: boolean): void {
    if (this.lifecycleState === 'DISPOSED') return;
    if (isNear && !this.isChasing) {
      this.isChasing = true;
      this.ensureContext();
      if (!this.ctx || !this.sfxBus) return;
      this.ensureChaseBus();
      this.updateChaseDistance(distance);
      this.startSiren();
      this.startBarkTimer();
    } else if (!isNear && this.isChasing) {
      this.isChasing = false;
      this.stopSiren();
      this.stopBarkTimer();
    } else if (isNear && this.isChasing) {
      this.updateChaseDistance(distance);
    }
  }

  /** 强制终止追逐警笛与警犬吠（撞击/暂停/返回菜单/重启时调用） */
  public stopChase(): void {
    if (this.isChasing || this.barkTimerId !== null) {
      this.isChasing = false;
      this.stopSiren();
      this.stopBarkTimer();
    }
  }

  private ensureChaseBus(): void {
    if (this.chaseBus) return;
    if (!this.ctx || !this.sfxBus) return;
    this.chaseBus = this.ctx.createGain();
    this.chaseBus.gain.value = 1;
    this.chaseBus.connect(this.sfxBus);
  }

  /** 逆距离衰减：越近越响，夹在 [0.25, 1] */
  private distanceGain(distance: number): number {
    const d = Math.max(0.5, distance);
    return clamp01(1.6 / d);
  }

  private updateChaseDistance(distance: number): void {
    if (!this.ctx || !this.chaseBus) return;
    this.chaseBus.gain.setTargetAtTime(this.distanceGain(distance), this.ctx.currentTime, 0.1);
  }

  /** 构建警笛节点图（一次性，复用振荡器，用 sirenEnvGain 控制淡入淡出） */
  private ensureSiren(): void {
    if (this.sirenOsc) return;
    if (!this.ctx || !this.chaseBus) return;

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.value = SIREN_BASE_FREQ;

    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.type = 'sine';
    this.sirenLfo.frequency.value = SIREN_LFO_FREQ;

    this.sirenLfoDepth = this.ctx.createGain();
    this.sirenLfoDepth.gain.value = SIREN_LFO_DEPTH;

    this.sirenLfo.connect(this.sirenLfoDepth);
    this.sirenLfoDepth.connect(this.sirenOsc.frequency);

    this.sirenFilter = this.ctx.createBiquadFilter();
    this.sirenFilter.type = 'lowpass';
    this.sirenFilter.frequency.value = 1600;

    this.sirenEnvGain = this.ctx.createGain();
    this.sirenEnvGain.gain.value = 0;

    this.sirenOsc.connect(this.sirenFilter);
    this.sirenFilter.connect(this.sirenEnvGain);
    this.sirenEnvGain.connect(this.chaseBus);

    this.sirenOsc.start();
    this.sirenLfo.start();
  }

  private startSiren(): void {
    this.ensureSiren();
    if (!this.ctx || !this.sirenEnvGain) return;
    this.sirenEnvGain.gain.setTargetAtTime(SIREN_LEVEL, this.ctx.currentTime, 0.15);
  }

  private stopSiren(): void {
    if (!this.ctx || !this.sirenEnvGain) return;
    this.sirenEnvGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  private startBarkTimer(): void {
    if (this.barkTimerId !== null) return;
    const scheduleNext = () => {
      if (!this.isChasing) return;
      this.playBark();
      const delay = 700 + Math.random() * 900; // 0.7~1.6s 随机间隔
      this.barkTimerId = setTimeout(scheduleNext, delay) as unknown as number;
    };
    this.barkTimerId = setTimeout(scheduleNext, 200) as unknown as number;
  }

  private stopBarkTimer(): void {
    if (this.barkTimerId !== null) {
      clearTimeout(this.barkTimerId);
      this.barkTimerId = null;
    }
  }

  /** 低频犬吠：噪声 burst + 带通下扫，经 chaseBus 做距离衰减 */
  private playBark(): void {
    if (!this.ctx || !this.chaseBus || this.isMuted || !this.sfxEnabled) return;
    const buffer = this.getNoiseBuffer();
    if (!buffer) return;

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 0.7 + Math.random() * 0.4;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.5;
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.14);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.45, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.chaseBus);

    src.start(now);
    src.stop(now + 0.18);
    src.onended = () => {
      try {
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  // ===== BGM 采样级调度 =====

  public startBGM(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    if (this.isBgmPlaying) {
      this.lifecycleState = 'PLAYING';
      return;
    }
    this.ensureContext();
    if (!this.ctx || !this.bgmBus) return;

    this.isBgmPlaying = true;
    this.lifecycleState = 'PLAYING';
    this.bgmStep = 0;
    this.nextBgmNoteTime = this.ctx.currentTime + 0.05;

    // 淡入
    this.applyBgmGain(this.bgmEnabled ? this.bgmVolume : 0, 0.25);
    this.startBgmScheduler();
  }

  public stopBGM(): void {
    this.pauseBgmScheduler();
    if (!this.isBgmPlaying) return;
    this.isBgmPlaying = false;
    // 淡出（已排期音符经由衰减后的 bgmBus 自然收尾）
    this.applyBgmGain(0, 0.08);
  }

  /** R-08 暂停所有持续音频与调度，保持可恢复状态 */
  public pauseAll(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.pauseBgmScheduler();
    this.applyBgmGain(0, 0.08);
    this.stopChase();
    this.lifecycleState = 'PAUSED';
  }

  /** R-08 从暂停恢复音频调度 */
  public resumeAll(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.lifecycleState = 'PLAYING';
    this.ensureContext();
    if (this.isBgmPlaying && this.ctx) {
      this.nextBgmNoteTime = this.ctx.currentTime + 0.05;
      this.applyBgmGain(this.bgmEnabled ? this.bgmVolume : 0, 0.15);
      this.startBgmScheduler();
    }
  }

  /** R-08 结束/返回菜单/重开时清空所有持续音、调度器与活跃音源 */
  public resetLifecycle(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.stopBGM();
    this.stopChase();
    this.bgmActiveSources.forEach((osc) => {
      try {
        osc.stop();
        (osc as any).disconnect?.();
      } catch {}
    });
    this.bgmActiveSources.clear();
    this.lifecycleState = 'STOPPED';
  }

  /** R-08 幂等销毁，彻底释放调度器、持续振荡器与全局监听 */
  public dispose(): void {
    if (this.lifecycleState === 'DISPOSED') return;
    this.resetLifecycle();
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        (this.sirenOsc as any).disconnect?.();
      } catch {}
      this.sirenOsc = null;
    }
    if (this.sirenLfo) {
      try {
        this.sirenLfo.stop();
        (this.sirenLfo as any).disconnect?.();
      } catch {}
      this.sirenLfo = null;
    }
    this.sirenLfoDepth = null;
    this.sirenFilter = null;
    this.sirenEnvGain = null;
    eventBus.off('CHASE_STATE_CHANGED', this.onChaseStateChanged);
    eventBus.off('COLLISION', this.onCollision);
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.lifecycleState = 'DISPOSED';
  }

  /** 返回冻结的音频诊断快照 */
  public getDiagnostics(): AudioDiagnostics {
    return Object.freeze({
      initialized: this.ctx !== null,
      lifecycleState: this.lifecycleState,
      isMuted: this.isMuted,
      bgmEnabled: this.bgmEnabled,
      sfxEnabled: this.sfxEnabled,
      bgmVolume: this.bgmVolume,
      sfxVolume: this.sfxVolume,
      isBgmPlaying: this.isBgmPlaying,
      hasBgmScheduler: this.bgmSchedulerId !== null,
      activeBgmSourceCount: this.bgmActiveSources.size,
      isChasing: this.isChasing,
      hasBarkTimer: this.barkTimerId !== null,
      cueCounts: Object.freeze({ ...this.cueCounts }),
    });
  }

  private startBgmScheduler(): void {
    if (this.bgmSchedulerId !== null) return;
    this.bgmSchedulerId = setInterval(() => this.scheduleBgm(), SCHEDULER_INTERVAL_MS) as unknown as number;
  }

  private pauseBgmScheduler(): void {
    if (this.bgmSchedulerId !== null) {
      clearInterval(this.bgmSchedulerId);
      this.bgmSchedulerId = null;
    }
  }

  /** 前瞻调度：用 AudioContext 时钟排期，消除 setInterval 抖动/后台跑拍 */
  private scheduleBgm(): void {
    if (!this.isBgmPlaying || !this.ctx || !this.bgmBus || this.ctx.state === 'suspended') return;
    while (this.nextBgmNoteTime < this.ctx.currentTime + BGM_LOOKAHEAD) {
      this.scheduleBgmNote(this.nextBgmNoteTime, this.bgmStep % BGM_BASS_NOTES.length);
      this.nextBgmNoteTime += BGM_STEP_DURATION;
      this.bgmStep++;
    }
  }

  private scheduleBgmNote(time: number, noteIndex: number): void {
    if (!this.ctx || !this.bgmBus) return;

    const freq = BGM_BASS_NOTES[noteIndex];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.22, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.bgmBus);

    osc.start(time);
    osc.stop(time + 0.2);

    this.bgmActiveSources.add(osc);
    osc.onended = () => {
      this.bgmActiveSources.delete(osc);
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }
}

// Standalone instances keep the legacy settings adapter for existing clients.
// Production uses only the versioned application repository and injected settings.
export const audioEngine = new AudioEngine(false);
