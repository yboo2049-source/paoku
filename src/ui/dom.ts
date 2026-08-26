import type { GameContext, GameState } from '../types';
import { CONSTANTS } from '../types';
import { eventBus } from '../core/eventBus';
import { audioEngine } from '../systems/audio';

export interface SkinConfig {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  price: number;
  description: string;
}

export const SKINS: SkinConfig[] = [
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    color: '#00f3ff',
    secondaryColor: '#0066ff',
    price: 0,
    description: 'Standard high-speed cyber runner suit.',
  },
  {
    id: 'pink',
    name: 'Neon Magenta',
    color: '#ff007f',
    secondaryColor: '#7928ca',
    price: 50,
    description: 'Vibrant neon synthwave pulse color.',
  },
  {
    id: 'gold',
    name: 'Cyber Gold',
    color: '#ffd700',
    secondaryColor: '#ff8800',
    price: 150,
    description: 'Luxury gold casing with high-voltage luster.',
  },
  {
    id: 'green',
    name: 'Matrix Emerald',
    color: '#00ff66',
    secondaryColor: '#008833',
    price: 300,
    description: 'Hacker-grade green matrix energy grid.',
  },
  {
    id: 'purple',
    name: 'Quantum Void',
    color: '#9d4edd',
    secondaryColor: '#3c096c',
    price: 500,
    description: 'Mysterious dark matter quantum armor.',
  },
];

const STORAGE_KEYS = {
  HIGH_SCORE: 'paoku_high_score',
  TOTAL_COINS: 'paoku_total_coins',
  SELECTED_SKIN: 'paoku_selected_skin',
  UNLOCKED_SKINS: 'paoku_unlocked_skins',
};

export class UIManager {
  private container: HTMLElement;

  // DOM Elements
  private menuEl!: HTMLElement;
  private hudEl!: HTMLElement;
  private pausedEl!: HTMLElement;
  private gameOverEl!: HTMLElement;
  private shopEl!: HTMLElement;

  // Dynamic Content Elements
  private hudScoreEl!: HTMLElement;
  private hudCoinsEl!: HTMLElement;
  private hudSpeedFillEl!: HTMLElement;
  private hudSpeedTextEl!: HTMLElement;
  private hudBuffsEl!: HTMLElement;

  private menuHighScoreEl!: HTMLElement;
  private menuTotalCoinsEl!: HTMLElement;

  private goFinalScoreEl!: HTMLElement;
  private goCoinsEarnedEl!: HTMLElement;
  private goHighScoreEl!: HTMLElement;
  private goBadgeEl!: HTMLElement;

  private shopCoinsEl!: HTMLElement;
  private skinsGridEl!: HTMLElement;

  // Storage & State
  private savedHighScore: number = 0;
  private savedTotalCoins: number = 0;
  private selectedSkinId: string = 'cyan';
  private unlockedSkinIds: string[] = ['cyan'];
  private processedGameOver: boolean = false;
  private isNewRecord: boolean = false;

  private pendingState: GameState | null = null;
  private lastState: GameState = 'MENU';

  constructor(container: HTMLElement) {
    this.container = container;
    this.loadPersistence();
    this.buildUI();
    this.setupGlobalEvents();
    this.emitSkinChange();
  }

  /**
   * 加载 localStorage 数据
   */
  private loadPersistence(): void {
    try {
      const hs = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
      if (hs) this.savedHighScore = parseInt(hs, 10) || 0;

      const tc = localStorage.getItem(STORAGE_KEYS.TOTAL_COINS);
      if (tc) this.savedTotalCoins = parseInt(tc, 10) || 0;

      const skin = localStorage.getItem(STORAGE_KEYS.SELECTED_SKIN);
      if (skin) this.selectedSkinId = skin;

      const unlocked = localStorage.getItem(STORAGE_KEYS.UNLOCKED_SKINS);
      if (unlocked) {
        this.unlockedSkinIds = JSON.parse(unlocked);
      }
    } catch (e) {
      console.warn('Failed to load persistence from localStorage', e);
    }
  }

  /**
   * 保存 localStorage 数据
   */
  private savePersistence(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, this.savedHighScore.toString());
      localStorage.setItem(STORAGE_KEYS.TOTAL_COINS, this.savedTotalCoins.toString());
      localStorage.setItem(STORAGE_KEYS.SELECTED_SKIN, this.selectedSkinId);
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_SKINS, JSON.stringify(this.unlockedSkinIds));
    } catch (e) {
      console.warn('Failed to save persistence to localStorage', e);
    }
  }

  /**
   * 获取当前皮肤配置
   */
  public getSelectedSkin(): SkinConfig {
    return SKINS.find((s) => s.id === this.selectedSkinId) || SKINS[0];
  }

  private emitSkinChange(): void {
    eventBus.emit('SKIN_CHANGED', this.getSelectedSkin());
  }

  private setupGlobalEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.lastState === 'PLAYING' || this.lastState === 'PAUSED') {
          eventBus.emit('TOGGLE_PAUSE');
        } else if (this.lastState === 'SHOP') {
          this.pendingState = 'MENU';
          eventBus.emit('GO_MENU');
        }
      }
    });
  }

  /**
   * 建立 UI 结构
   */
  private buildUI(): void {
    const existingUILayer = this.container.querySelector('#ui-layer');
    if (existingUILayer) {
      existingUILayer.remove();
    }

    const uiHTML = `
      <div id="ui-layer">
        
        <!-- HUD LAYER (PLAYING / PAUSED) -->
        <div id="hud-overlay" style="display: none;">
          <div class="hud-top-bar">
            <div class="hud-badge-group">
              <div class="hud-badge" aria-label="Score">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
                <div class="hud-val-container">
                  <span class="hud-val-title">SCORE</span>
                  <span id="hud-score" class="hud-val">0</span>
                </div>
              </div>
              <div class="hud-badge" aria-label="Coins">
                <svg class="icon gold" aria-hidden="true" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,4M11,16H13V18H11V16M12,6C13.66,6 15,7.34 15,9C15,10.66 14.12,11.53 13.06,12.44C12.33,13.08 12,13.67 12,14.5H12V15H10.5V14.5C10.5,13 11.5,12.18 12.44,11.36C13.19,10.71 13.5,10.27 13.5,9C13.5,8.17 12.83,7.5 12,7.5C11.17,7.5 10.5,8.17 10.5,9H9C9,7.34 10.34,6 12,6Z"/></svg>
                <div class="hud-val-container">
                  <span class="hud-val-title">COINS</span>
                  <span id="hud-coins" class="hud-val">0</span>
                </div>
              </div>
            </div>
            
            <div style="display: flex; gap: 8px;">
              <button id="audio-toggle-btn" class="pause-btn-hud" title="Toggle Sound" aria-label="Toggle sound">
                <svg aria-hidden="true" style="width: 20px; height: 20px; fill: currentColor;" viewBox="0 0 24 24"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.02C15.5,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg>
              </button>
              <button id="hud-pause-btn" class="pause-btn-hud" title="Pause Game (ESC)" aria-label="Pause game">
                <svg aria-hidden="true" style="width: 22px; height: 22px; fill: currentColor;" viewBox="0 0 24 24"><path d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>
              </button>
            </div>
          </div>

          <!-- Speedometer -->
          <div class="speedometer-wrap">
            <div class="speed-info">
              <span>RUN SPEED</span>
              <span id="hud-speed-text" class="speed-val-text">18 KM/H</span>
            </div>
            <div class="speed-track">
              <div id="hud-speed-fill" class="speed-fill"></div>
            </div>
          </div>

          <!-- Active Buffs -->
          <div id="hud-buffs" class="buffs-wrap">
            <!-- Dynamic Buffs Injected Here -->
          </div>
        </div>

        <!-- MENU SCREEN -->
        <div id="menu-screen" class="ui-screen animate-pop" role="dialog" aria-label="Main menu" style="display: flex;">
          <div class="ui-card">
            <h1 class="cyber-title">SUBWAY SURFERS</h1>
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">BEST SCORE</span>
                <span id="menu-high-score" class="stat-val">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">TOTAL CREDITS</span>
                <span id="menu-total-coins" class="stat-val gold">0</span>
              </div>
            </div>
            
            <button id="start-btn" class="cyber-btn">START RUN</button>
            <button id="open-shop-btn" class="cyber-btn secondary-btn">SHOP & SKINS</button>
            
            <div class="controls-hint">
              <span><span class="key-cap">A</span><span class="key-cap">D</span> / <span class="key-cap">←</span><span class="key-cap">→</span> Move</span>
              <span><span class="key-cap">W</span> / <span class="key-cap">SPACE</span> Jump</span>
              <span><span class="key-cap">S</span> Roll</span>
              <span><span class="key-cap">ESC</span> Pause</span>
            </div>

            <div class="audio-settings" style="margin-top: 18px; padding: 12px 14px; border: 1px solid var(--panel-border); border-radius: 10px; background: rgba(0,0,0,0.25);">
              <div style="font-family: var(--font-display); font-size: 0.875rem; letter-spacing: 0.12em; color: var(--primary-cyan); margin-bottom: 10px;">AUDIO SETTINGS</div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <button id="bgm-toggle-btn" class="audio-toggle" style="min-width: 92px; text-align: center; padding: 6px 10px; font-family: var(--font-display); font-size: 0.875rem; letter-spacing: 0.06em; color: var(--text-main); background: rgba(0,243,255,0.08); border: 1px solid var(--panel-border); border-radius: 6px; cursor: pointer;">MUSIC</button>
                <input id="bgm-volume" type="range" min="0" max="100" step="1" aria-label="Background music volume" style="flex: 1; accent-color: var(--primary-cyan);">
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <button id="sfx-toggle-btn" class="audio-toggle" style="min-width: 92px; text-align: center; padding: 6px 10px; font-family: var(--font-display); font-size: 0.875rem; letter-spacing: 0.06em; color: var(--text-main); background: rgba(0,243,255,0.08); border: 1px solid var(--panel-border); border-radius: 6px; cursor: pointer;">SFX</button>
                <input id="sfx-volume" type="range" min="0" max="100" step="1" aria-label="Sound effects volume" style="flex: 1; accent-color: var(--primary-cyan);">
              </div>
            </div>
          </div>
        </div>

        <!-- PAUSED SCREEN -->
        <div id="paused-screen" class="ui-screen animate-pop" role="dialog" aria-label="Paused" style="display: none;">
          <div class="ui-card">
            <h1 class="cyber-title">PAUSED</h1>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Game is currently paused.</p>
            <button id="resume-btn" class="cyber-btn">RESUME RUN</button>
            <button id="pause-restart-btn" class="cyber-btn secondary-btn">RESTART</button>
            <button id="pause-menu-btn" class="cyber-btn secondary-btn">MAIN MENU</button>
          </div>
        </div>

        <!-- GAME OVER SCREEN -->
        <div id="gameover-screen" class="ui-screen animate-pop" role="dialog" aria-label="Game over" style="display: none;">
          <div class="ui-card">
            <h1 class="cyber-title danger-title">GAME OVER</h1>
            <div id="go-new-record" class="new-record-badge" style="display: none;">NEW HIGH SCORE!</div>

            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">FINAL SCORE</span>
                <span id="go-final-score" class="stat-val">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">COINS EARNED</span>
                <span id="go-coins-earned" class="stat-val gold">+0</span>
              </div>
            </div>

            <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 16px;">
              BEST RECORD: <span id="go-high-score" style="color: var(--primary-cyan); font-weight: bold;">0</span>
            </div>

            <button id="restart-btn" class="cyber-btn danger-btn">REBOOT & RUN AGAIN</button>
            <button id="go-shop-btn" class="cyber-btn secondary-btn">CYBER SHOP</button>
            <button id="go-menu-btn" class="cyber-btn secondary-btn">MAIN MENU</button>
          </div>
        </div>

        <!-- SHOP SCREEN -->
        <div id="shop-screen" class="ui-screen animate-pop" role="dialog" aria-label="Shop" style="display: none;">
          <div class="ui-card shop-card">
            <h1 class="cyber-title">CYBER SHOP</h1>
            <div style="font-size: 0.9rem; color: var(--text-muted);">
              AVAILABLE CREDITS: <span id="shop-coins" class="stat-val gold" style="font-size: 1.1rem;">0</span>
            </div>

            <div id="skins-grid" class="skins-grid">
              <!-- Rendered Dynamically -->
            </div>

            <button id="close-shop-btn" class="cyber-btn secondary-btn">BACK TO MENU</button>
          </div>
        </div>

      </div>
    `;
    this.container.insertAdjacentHTML('beforeend', uiHTML);

    // Query Elements
    this.menuEl = document.getElementById('menu-screen')!;
    this.hudEl = document.getElementById('hud-overlay')!;
    this.pausedEl = document.getElementById('paused-screen')!;
    this.gameOverEl = document.getElementById('gameover-screen')!;
    this.shopEl = document.getElementById('shop-screen')!;

    this.hudScoreEl = document.getElementById('hud-score')!;
    this.hudCoinsEl = document.getElementById('hud-coins')!;
    this.hudSpeedFillEl = document.getElementById('hud-speed-fill')!;
    this.hudSpeedTextEl = document.getElementById('hud-speed-text')!;
    this.hudBuffsEl = document.getElementById('hud-buffs')!;

    this.menuHighScoreEl = document.getElementById('menu-high-score')!;
    this.menuTotalCoinsEl = document.getElementById('menu-total-coins')!;

    this.goFinalScoreEl = document.getElementById('go-final-score')!;
    this.goCoinsEarnedEl = document.getElementById('go-coins-earned')!;
    this.goHighScoreEl = document.getElementById('go-high-score')!;
    this.goBadgeEl = document.getElementById('go-new-record')!;

    this.shopCoinsEl = document.getElementById('shop-coins')!;
    this.skinsGridEl = document.getElementById('skins-grid')!;

    // Bind Event Listeners
    document.getElementById('start-btn')?.addEventListener('click', () => {
      eventBus.emit('START_GAME');
    });

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      eventBus.emit('RESTART');
    });

    document.getElementById('pause-restart-btn')?.addEventListener('click', () => {
      eventBus.emit('RESTART');
    });

    document.getElementById('hud-pause-btn')?.addEventListener('click', () => {
      eventBus.emit('TOGGLE_PAUSE');
    });

    document.getElementById('audio-toggle-btn')?.addEventListener('click', () => {
      eventBus.emit('TOGGLE_AUDIO');
    });

    // 监听任务完成 Toast 弹出 + 提示音
    eventBus.on('MISSION_COMPLETED', (payload: any) => {
      this.showToast(`MISSION COMPLETE: ${payload?.title} (+${payload?.reward} ¢)`);
      audioEngine.playMissionComplete();
    });

    document.getElementById('resume-btn')?.addEventListener('click', () => {
      eventBus.emit('TOGGLE_PAUSE');
    });

    const openShop = () => {
      this.pendingState = 'SHOP';
      eventBus.emit('OPEN_SHOP');
    };

    document.getElementById('open-shop-btn')?.addEventListener('click', openShop);
    document.getElementById('go-shop-btn')?.addEventListener('click', openShop);

    const backToMenu = () => {
      this.pendingState = 'MENU';
      eventBus.emit('GO_MENU');
    };

    document.getElementById('close-shop-btn')?.addEventListener('click', backToMenu);
    document.getElementById('pause-menu-btn')?.addEventListener('click', backToMenu);
    document.getElementById('go-menu-btn')?.addEventListener('click', backToMenu);

    this.bindAudioSettings();

    this.renderShop();
  }

  /**
   * 每帧更新 UI 状态与数值
   */
  public update(ctx: GameContext): void {
    if (this.pendingState !== null) {
      ctx.state = this.pendingState;
      this.pendingState = null;
    }

    this.lastState = ctx.state;

    // 同步内存持久化值至 ctx
    ctx.highScore = Math.max(ctx.highScore, this.savedHighScore);
    ctx.totalCoins = this.savedTotalCoins;

    // 屏幕显隐控制
    this.menuEl.style.display = ctx.state === 'MENU' ? 'flex' : 'none';
    this.hudEl.style.display = ctx.state === 'PLAYING' || ctx.state === 'PAUSED' ? 'block' : 'none';
    this.pausedEl.style.display = ctx.state === 'PAUSED' ? 'flex' : 'none';
    this.gameOverEl.style.display = ctx.state === 'GAMEOVER' ? 'flex' : 'none';
    this.shopEl.style.display = ctx.state === 'SHOP' ? 'flex' : 'none';

    // MENU 状态下数据
    if (ctx.state === 'MENU') {
      this.menuHighScoreEl.textContent = this.savedHighScore.toString();
      this.menuTotalCoinsEl.textContent = this.savedTotalCoins.toString();
      this.processedGameOver = false;
    }

    // PLAYING 状态重置 GAMEOVER 标记
    if (ctx.state === 'PLAYING') {
      this.processedGameOver = false;
    }

    // HUD 实时更新
    if (ctx.state === 'PLAYING' || ctx.state === 'PAUSED') {
      this.hudScoreEl.textContent = Math.floor(ctx.score).toString();
      this.hudCoinsEl.textContent = ctx.coins.toString();

      // Speedometer 计算
      const speedPct = Math.min(
        100,
        Math.max(
          0,
          ((ctx.speed - CONSTANTS.BASE_SPEED) / (CONSTANTS.MAX_SPEED - CONSTANTS.BASE_SPEED)) * 100
        )
      );
      this.hudSpeedFillEl.style.width = `${speedPct.toFixed(1)}%`;
      this.hudSpeedTextEl.textContent = `${Math.floor(ctx.speed)} KM/H`;

      // Buffs 渲染
      this.renderBuffs(ctx);
    }

    // GAMEOVER 处理与持久化保存
    if (ctx.state === 'GAMEOVER') {
      if (!this.processedGameOver) {
        this.processedGameOver = true;
        const finalScore = Math.floor(ctx.score);
        const coinsEarned = ctx.coins;

        this.isNewRecord = finalScore > this.savedHighScore;
        if (this.isNewRecord) {
          this.savedHighScore = finalScore;
          audioEngine.playNewRecord();
        }

        this.savedTotalCoins += coinsEarned;
        this.savePersistence();

        // 更新 UI
        this.goFinalScoreEl.textContent = finalScore.toString();
        this.goCoinsEarnedEl.textContent = `+${coinsEarned}`;
        this.goHighScoreEl.textContent = this.savedHighScore.toString();
        this.goBadgeEl.style.display = this.isNewRecord ? 'inline-block' : 'none';
      }
    }

    // SHOP 状态下刷新余额
    if (ctx.state === 'SHOP') {
      this.shopCoinsEl.textContent = this.savedTotalCoins.toString();
    }
  }

  /**
   * 渲染 Active PowerUps (Buffs)
   */
  private renderBuffs(ctx: GameContext): void {
    let html = '';

    if (ctx.player.hoverboardActive) {
      html += `
        <div class="buff-pill">
          <svg aria-hidden="true" style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="M19,13H5V11H19V13Z"/></svg>
          <span>HOVERBOARD ACTIVE</span>
        </div>
      `;
    }

    if (ctx.player.activePowerUps) {
      ctx.player.activePowerUps.forEach((timer, type) => {
        if (timer > 0) {
          html += `
            <div class="buff-pill">
              <span>${type}</span>
              <span style="font-size: 0.875rem; opacity: 0.8;">(${timer.toFixed(1)}s)</span>
            </div>
          `;
        }
      });
    }

    this.hudBuffsEl.innerHTML = html;
  }

  /**
   * 渲染 Shop 皮肤列表
   */
  private renderShop(): void {
    let html = '';

    SKINS.forEach((skin) => {
      const isUnlocked = this.unlockedSkinIds.includes(skin.id);
      const isSelected = this.selectedSkinId === skin.id;

      let btnText = 'EQUIP';
      let btnClass = 'cyber-btn skin-action-btn';
      let isDisabled = false;

      if (isSelected) {
        btnText = 'EQUIPPED';
        btnClass += ' secondary-btn disabled';
        isDisabled = true;
      } else if (!isUnlocked) {
        const canAfford = this.savedTotalCoins >= skin.price;
        btnText = `BUY [${skin.price} ¢]`;
        btnClass += canAfford ? '' : ' secondary-btn disabled';
        isDisabled = !canAfford;
      }

      html += `
        <div class="skin-item ${isSelected ? 'selected' : ''}">
          <div class="skin-preview-circle" style="background: radial-gradient(circle at 30% 30%, ${skin.color}, ${skin.secondaryColor});"></div>
          <div class="skin-title">${skin.name}</div>
          <div class="skin-desc">${skin.description}</div>
          <button data-skin-id="${skin.id}" class="${btnClass}" ${isDisabled ? 'disabled' : ''}>
            ${btnText}
          </button>
        </div>
      `;
    });

    this.skinsGridEl.innerHTML = html;

    // 绑定 Skin 按钮点击
    this.skinsGridEl.querySelectorAll('button[data-skin-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const skinId = target.getAttribute('data-skin-id');
        if (!skinId) return;

        this.handleSkinAction(skinId);
      });
    });
  }

  /**
   * 处理皮肤解锁或装备
   */
  private handleSkinAction(skinId: string): void {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return;

    const isUnlocked = this.unlockedSkinIds.includes(skinId);

    if (isUnlocked) {
      this.selectedSkinId = skinId;
      this.savePersistence();
      this.emitSkinChange();
      this.renderShop();
    } else if (this.savedTotalCoins >= skin.price) {
      this.savedTotalCoins -= skin.price;
      this.unlockedSkinIds.push(skinId);
      this.selectedSkinId = skinId;
      this.savePersistence();
      this.emitSkinChange();
      this.renderShop();
    }
  }

  /**
   * 绑定音频设置控件（BGM / SFX 独立开关 + 音量滑块）
   */
  private bindAudioSettings(): void {
    const bgmToggleBtn = document.getElementById('bgm-toggle-btn');
    const sfxToggleBtn = document.getElementById('sfx-toggle-btn');
    const bgmVolume = document.getElementById('bgm-volume') as HTMLInputElement | null;
    const sfxVolume = document.getElementById('sfx-volume') as HTMLInputElement | null;

    const renderControls = () => {
      if (bgmToggleBtn) bgmToggleBtn.textContent = `MUSIC: ${audioEngine.getBgmEnabled() ? 'ON' : 'OFF'}`;
      if (sfxToggleBtn) sfxToggleBtn.textContent = `SFX: ${audioEngine.getSfxEnabled() ? 'ON' : 'OFF'}`;
      if (bgmVolume) bgmVolume.value = String(Math.round(audioEngine.getBgmVolume() * 100));
      if (sfxVolume) sfxVolume.value = String(Math.round(audioEngine.getSfxVolume() * 100));
    };

    bgmToggleBtn?.addEventListener('click', () => {
      audioEngine.setBgmEnabled(!audioEngine.getBgmEnabled());
      renderControls();
    });

    sfxToggleBtn?.addEventListener('click', () => {
      audioEngine.setSfxEnabled(!audioEngine.getSfxEnabled());
      renderControls();
    });

    bgmVolume?.addEventListener('input', () => {
      audioEngine.setBgmVolume(Number(bgmVolume.value) / 100);
    });

    sfxVolume?.addEventListener('input', () => {
      audioEngine.setSfxVolume(Number(sfxVolume.value) / 100);
    });

    renderControls();
  }

  /**
   * 动态显示 Cyber 风格任务 Toast 通知
   */
  public showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'cyber-toast animate-pop';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <svg aria-hidden="true" style="width:20px;height:20px;fill:#ffd700;" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
      <span>${message}</span>
    `;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
}

